package backend

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

// Real HTTP requests exercise middleware and routing together, without invoking a runner.
func TestAdversarialHTTPRequests(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	mux, err := newServiceMux(serviceModeMonolith)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(securityHeaders(mux, securityConfig{}))
	defer server.Close()
	cases := []struct {
		path, body, origin, content, host string
		status                            int
	}{
		{"/api/run", `{"exerciseId":"$(touch /tmp/injected);../x","code":"x"}`, "", "application/json", "", 404},
		{"/api/run", `{"code":42}`, "", "application/json", "", 400},
		{"/api/run", `{"code":"x","mode":"shell"}`, "", "application/json", "", 400},
		{"/api/run", `{"code":"x"} {}`, "", "application/json", "", 400},
		{"/api/run", `{"code":"` + strings.Repeat("x", 270<<10) + `"}`, "", "application/json", "", 413},
		{"/api/run", `{}`, "https://evil.example", "application/json", "", 403},
		{"/api/run", `{}`, "null", "application/json", "", 403},
		{"/api/run", `{}`, "", "text/plain", "", 415},
		{"/api/run", `{}`, "", "application/json", "localhost.evil.example", 403},
	}
	for i, tc := range cases {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			// Separate buckets make this a validation test, not a rate-limit test.
			submissionLimiter.mu.Lock()
			submissionLimiter.clients = map[string]rateBucket{}
			submissionLimiter.mu.Unlock()
			req, _ := http.NewRequest("POST", server.URL+tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", tc.content)
			req.Header.Set("Origin", tc.origin)
			if tc.host != "" {
				req.Host = tc.host
			}
			res, err := server.Client().Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != tc.status {
				t.Fatalf("status=%d want=%d", res.StatusCode, tc.status)
			}
			if !strings.Contains(res.Header.Get("Content-Type"), "application/json") {
				t.Fatal("API error is not JSON")
			}
		})
	}
}

func TestAdversarialDockerIsolationIntegration(t *testing.T) {
	if os.Getenv("RUN_HARDENING_INTEGRATION") != "1" {
		t.Skip("opt-in Docker probes")
	}
	args := append([]string{"run", "--rm"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	script := `const fs=require('fs'), net=require('net');
function check(b,m){if(!b)throw Error(m)}
check(!fs.existsSync('/var/run/docker.sock'),'Docker socket exposed');
check(!fs.existsSync('/home/alexandre'),'host home exposed');
const status=fs.readFileSync('/proc/self/status','utf8');
check(/CapEff:\s+0+\n/.test(status),'effective capabilities');
check(/NoNewPrivs:\s+1/.test(status),'privilege escalation enabled');
check(/Seccomp:\s+2/.test(status),'seccomp missing');
try { fs.writeFileSync('/etc/security-probe','x'); throw Error('root writable') } catch(e) {check(e.code==='EROFS','unexpected root write result')}
const routes=fs.readFileSync('/proc/net/route','utf8').trim().split('\n');
check(routes.length===1,'external network route present');
const s=net.connect({host:'192.0.2.1',port:80});
s.setTimeout(1000,()=>{s.destroy();throw Error('network probe did not fail promptly')});
s.on('connect',()=>{throw Error('external connection succeeded')});
s.on('error',()=>{console.log('isolation probes passed')});`
	args = append(args, "--entrypoint", "node", officialImage("module-js"), "-e", script)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	out, err := dockerRunCommand(ctx, args).CombinedOutput()
	if err != nil || !strings.Contains(string(out), "isolation probes passed") {
		t.Fatalf("%v: %s", err, out)
	}
	// A real endless process must be removed, not just detached from the client.
	ctx2, cancel2 := context.WithTimeout(context.Background(), time.Second)
	defer cancel2()
	args2 := append([]string{"run", "--rm"}, baseDockerRunArgs("")...)
	args2 = withOptionalCPULimit(args2)
	args2 = append(args2, "--entrypoint", "node", officialImage("module-js"), "-e", "setInterval(()=>{},1000)")
	cmd := dockerRunCommand(ctx2, args2)
	if cmd.Run() == nil || ctx2.Err() != context.DeadlineExceeded {
		t.Fatal("deadline not enforced")
	}
	if exec.Command("docker", "inspect", cmd.Args[3]).Run() == nil {
		t.Fatal("container survived timeout")
	}
}

func TestAdversarialAuthenticationBurst(t *testing.T) {
	c := securityConfig{host: "exam.example", username: "probe", password: "not-a-real-password-for-tests"}
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }), c)
	for i := 0; i < 8; i++ {
		req := httptest.NewRequest("GET", "http://exam.example/api/version", nil)
		req.RemoteAddr = "auth-adversarial:1"
		req.SetBasicAuth("probe", "wrong")
		req.Header.Set("X-Forwarded-For", fmt.Sprintf("192.0.2.%d", i))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		want := 401
		if i >= 6 {
			want = 429
		}
		if res.Code != want {
			t.Fatalf("attempt %d: %d", i, res.Code)
		}
	}
	req := httptest.NewRequest("GET", "http://exam.example/api/version", nil)
	req.RemoteAddr = "auth-adversarial:1"
	req.SetBasicAuth(c.username, c.password)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != 204 {
		t.Fatal("valid credentials locked out")
	}
}

func TestAdversarialRealOutputFloodIntegration(t *testing.T) {
	if os.Getenv("RUN_HARDENING_INTEGRATION") != "1" {
		t.Skip("opt-in Docker probe")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	args := append([]string{"run", "--rm"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	args = append(args, "--entrypoint", "node", officialImage("module-js"), "-e", `process.stdout.write('X'.repeat(4*1024*1024)); process.stderr.write('Y'.repeat(4*1024*1024))`)
	cmd := dockerRunCommand(ctx, args)
	var stdout, stderr limitedOutput
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		t.Fatal(err)
	}
	for _, out := range []*limitedOutput{&stdout, &stderr} {
		if out.Len() != maxRunnerOutput || !out.truncated {
			t.Fatal("output flood escaped cap")
		}
	}
}

func FuzzRunnerMetadataBoundary(f *testing.F) {
	for _, seed := range []string{"../escape", "/tmp/escape", "safe.go", "src/lib.rs", "$(id)", "x;id", "a\x00b", "a\\b"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, s string) {
		ex := Exercise{ID: s, Runner: s, ExpectedFiles: []string{s}}
		if validateRunnerExercise(ex) == nil && (strings.ContainsAny(s, "/\\;:$\x00") || s == "..") {
			t.Fatalf("unsafe metadata accepted %q", s)
		}
	})
}

func TestAdversarialSlowBodyOverTCP(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	server := httptest.NewUnstartedServer(securityHeaders(http.HandlerFunc(handleRun), securityConfig{}))
	server.Config.ReadTimeout = 150 * time.Millisecond
	server.Start()
	defer server.Close()
	conn, err := net.Dial("tcp", server.Listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(2 * time.Second))
	fmt.Fprintf(conn, "POST /api/run HTTP/1.1\r\nHost: %s\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n{", server.Listener.Addr())
	started := time.Now()
	response, err := io.ReadAll(conn)
	if err != nil || time.Since(started) > time.Second {
		t.Fatalf("slow body not released: %v", err)
	}
	if !strings.Contains(string(response), "400 Bad Request") || len(runnerSlots) != 0 {
		t.Fatalf("slow body accepted or reserved runner: %.200s", response)
	}
}
