package backend

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestProductionConfigurationFailsClosed(t *testing.T) {
	for _, key := range []string{"APP_ENV", "PUBLIC_ORIGIN", "ACCESS_USERNAME", "ACCESS_PASSWORD"} {
		t.Setenv(key, "")
	}
	if _, err := loadSecurityConfig(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("APP_ENV", "production")
	if _, err := loadSecurityConfig(); err == nil {
		t.Fatal("unprotected production accepted")
	}
	t.Setenv("PUBLIC_ORIGIN", "https://exam.example")
	t.Setenv("ACCESS_USERNAME", "tester")
	t.Setenv("ACCESS_PASSWORD", strings.Repeat("test-", 5))
	if _, err := loadSecurityConfig(); err != nil {
		t.Fatal(err)
	}
	for _, origin := range []string{"http://exam.example", "https://user:pass@exam.example", "https://exam.example/private", "https://exam.example?x=1"} {
		t.Setenv("PUBLIC_ORIGIN", origin)
		if _, err := loadSecurityConfig(); err == nil {
			t.Fatal("invalid origin accepted:", origin)
		}
	}
}
func TestHTTPBoundaryRejectsCrossSiteAndNonJSON(t *testing.T) {
	c := securityConfig{}
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusAccepted) })
	handler := securityHeaders(next, c)
	for _, tc := range []struct {
		name, host, origin, site, content string
		want                              int
	}{
		{"same-origin", "127.0.0.1:8092", "http://127.0.0.1:8092", "same-origin", "application/json", 202},
		{"cli-json", "localhost:8080", "", "", "application/json; charset=utf-8", 202},
		{"foreign-origin", "localhost:8080", "https://evil.example", "", "application/json", 403},
		{"fetch-metadata", "localhost:8080", "", "cross-site", "application/json", 403},
		{"null-origin", "localhost:8080", "null", "", "application/json", 403},
		{"rebinding-host", "evil.example", "http://evil.example", "same-origin", "application/json", 403},
		{"plain-text", "localhost:8080", "", "", "text/plain", 415},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/run", strings.NewReader(`{}`))
			req.Host = tc.host
			req.RemoteAddr = "127.0.0.1:" + tc.name
			req.Header.Set("Origin", tc.origin)
			req.Header.Set("Sec-Fetch-Site", tc.site)
			req.Header.Set("Content-Type", tc.content)
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.want {
				t.Fatalf("got %d: %s", res.Code, res.Body)
			}
			if res.Header().Get("X-Frame-Options") != "DENY" || !strings.Contains(res.Header().Get("Content-Security-Policy"), "frame-ancestors 'none'") {
				t.Fatal("security headers missing")
			}
		})
	}
}
func TestProductionAuthenticationAndProxyOrigin(t *testing.T) {
	c := securityConfig{production: true, origin: "https://exam.example", host: "exam.example", username: "tester", password: strings.Repeat("test-", 5)}
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(202) }), c)
	for _, authenticated := range []bool{false, true} {
		req := httptest.NewRequest("POST", "http://exam.example/api/run", strings.NewReader(`{}`))
		req.RemoteAddr = "auth-test:1"
		req.Header.Set("Origin", c.origin)
		req.Header.Set("Content-Type", "application/json")
		if authenticated {
			req.SetBasicAuth(c.username, c.password)
		}
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		want := 401
		if authenticated {
			want = 202
		}
		if res.Code != want {
			t.Fatalf("auth=%v got %d: %s", authenticated, res.Code, res.Body)
		}
		if res.Header().Get("Strict-Transport-Security") == "" {
			t.Fatal("missing HTTPS policy")
		}
	}
}
func TestBoundedRateLimiterDoesNotTrustForwardedHeaders(t *testing.T) {
	limiter := runRateLimiter{clients: map[string]rateBucket{}}
	now := time.Now()
	for i := 0; i < 6; i++ {
		if !limiter.allow("client", now) {
			t.Fatal("burst rejected")
		}
	}
	if limiter.allow("client", now) {
		t.Fatal("unbounded burst")
	}
	if !limiter.allow("client", now.Add(5*time.Second)) {
		t.Fatal("rate did not refill")
	}
	if !limiter.allow("other", now) {
		t.Fatal("clients not isolated")
	}
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:123"
	req.Header.Set("X-Forwarded-For", "203.0.113.2")
	if runClientKey(req) != "192.0.2.1" {
		t.Fatal("untrusted forwarding header accepted")
	}
}

type blockedBody struct {
	started chan struct{}
	release chan struct{}
}

func (b *blockedBody) Read(p []byte) (int, error) { close(b.started); <-b.release; return 0, io.EOF }
func (b *blockedBody) Close() error               { return nil }
func TestBodyReadDoesNotReserveRunnerSlot(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	body := &blockedBody{started: make(chan struct{}), release: make(chan struct{})}
	request := httptest.NewRequest("POST", "/api/run", nil)
	request.Body = body
	done := make(chan struct{})
	go func() { defer close(done); handleRun(httptest.NewRecorder(), request) }()
	<-body.started
	held := len(runnerSlots)
	close(body.release)
	<-done
	if held != 0 {
		t.Fatal("slow body reserved execution slot")
	}
	server := newHTTPServer("127.0.0.1:0", http.NotFoundHandler(), securityConfig{})
	if server.ReadTimeout <= 0 || server.WriteTimeout <= runTimeout() || server.MaxHeaderBytes > 32<<10 {
		t.Fatal("HTTP limits missing")
	}
}
func TestRunRejectsTrailingJSON(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	request := httptest.NewRequest("POST", "/api/run", bytes.NewBufferString(`{"exerciseId":"x","code":"x"} {}`))
	res := httptest.NewRecorder()
	handleRun(res, request)
	if res.Code != 400 || len(runnerSlots) != 0 {
		t.Fatal("trailing body accepted or slot leaked")
	}
}

func TestProductionRefusesDisabledResourceLimits(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("PUBLIC_ORIGIN", "https://exam.example")
	t.Setenv("ACCESS_USERNAME", "tester")
	t.Setenv("ACCESS_PASSWORD", strings.Repeat("test-", 5))
	for _, key := range []string{"RUNNER_CPUS", "RUNNER_MEMORY", "RUNNER_PIDS_LIMIT", "RUNNER_TIMEOUT_SECONDS"} {
		t.Run(key, func(t *testing.T) {
			t.Setenv(key, "0")
			if _, err := loadSecurityConfig(); err == nil {
				t.Fatal("disabled production limit accepted")
			}
		})
	}
}
