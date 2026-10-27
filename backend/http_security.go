package backend

import (
	"crypto/sha256"
	"crypto/subtle"
	"fmt"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type securityConfig struct {
	production bool
	origin     string
	host       string
	username   string
	password   string
}

func loadSecurityConfig() (securityConfig, error) {
	c := securityConfig{production: os.Getenv("APP_ENV") == "production", username: os.Getenv("ACCESS_USERNAME"), password: os.Getenv("ACCESS_PASSWORD")}
	if env := os.Getenv("APP_ENV"); env != "" && env != "development" && env != "production" {
		return c, fmt.Errorf("APP_ENV doit être development ou production")
	}
	if raw := strings.TrimSpace(os.Getenv("PUBLIC_ORIGIN")); raw != "" {
		u, err := url.Parse(raw)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" {
			return c, fmt.Errorf("PUBLIC_ORIGIN doit être une origine HTTP(S), sans chemin ni identifiants")
		}
		if c.production && u.Scheme != "https" {
			return c, fmt.Errorf("PUBLIC_ORIGIN doit utiliser HTTPS en production")
		}
		c.origin = u.Scheme + "://" + strings.ToLower(u.Host)
		c.host = strings.ToLower(u.Host)
	}
	if (c.username == "") != (c.password == "") {
		return c, fmt.Errorf("ACCESS_USERNAME et ACCESS_PASSWORD doivent être définis ensemble")
	}
	if c.production && (c.origin == "" || len(c.username) < 3 || len(c.password) < 16) {
		return c, fmt.Errorf("production : PUBLIC_ORIGIN HTTPS et accès protégé (utilisateur >= 3 caractères, mot de passe >= 16) requis")
	}
	if c.production {
		timeout, err := strconv.Atoi(getenvDefault("RUNNER_TIMEOUT_SECONDS", "10"))
		if err != nil || timeout < 1 || timeout > 60 {
			return c, fmt.Errorf("production : RUNNER_TIMEOUT_SECONDS doit être compris entre 1 et 60")
		}
		cpus, err := strconv.ParseFloat(getenvDefault("RUNNER_CPUS", "1"), 64)
		if err != nil || !(cpus >= 0.1 && cpus <= 2) {
			return c, fmt.Errorf("production : RUNNER_CPUS doit être compris entre 0.1 et 2")
		}
		pids, err := strconv.Atoi(getenvDefault("RUNNER_PIDS_LIMIT", "128"))
		if err != nil || pids < 16 || pids > 256 {
			return c, fmt.Errorf("production : RUNNER_PIDS_LIMIT doit être compris entre 16 et 256")
		}
		switch strings.ToLower(getenvDefault("RUNNER_MEMORY", "512m")) {
		case "256m", "512m", "768m", "1g":
		default:
			return c, fmt.Errorf("production : RUNNER_MEMORY doit valoir 256m, 512m, 768m ou 1g")
		}
	}
	return c, nil
}
func localHost(host string) bool {
	h := host
	if parsed, _, err := net.SplitHostPort(host); err == nil {
		h = parsed
	}
	h = strings.Trim(h, "[]")
	return h == "localhost" || h == "127.0.0.1" || h == "::1"
}
func constantEqual(a, b string) bool {
	x, y := sha256.Sum256([]byte(a)), sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(x[:], y[:]) == 1
}

// The proxy must preserve Host. Forwarded headers are deliberately not trusted.
func securityHeaders(next http.Handler, c securityConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c.production {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		// CodeMirror and the palette use inline styles, but scripts remain same-origin files.
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Cache-Control", "no-store")
		}
		host := strings.ToLower(r.Host)
		if !(host == c.host && c.host != "") && !localHost(host) {
			securityError(w, r, "Hôte non autorisé", http.StatusForbidden)
			return
		}
		if c.username != "" {
			user, pass, ok := r.BasicAuth()
			userOK, passOK := constantEqual(user, c.username), constantEqual(pass, c.password)
			if !ok || !userOK || !passOK {
				if !authFailureLimiter.allow(runClientKey(r), time.Now()) {
					w.Header().Set("Retry-After", "5")
					securityError(w, r, "Trop de tentatives de connexion", http.StatusTooManyRequests)
					return
				}
				w.Header().Set("WWW-Authenticate", `Basic realm="Z01 Fake Exam", charset="UTF-8"`)
				securityError(w, r, "Authentification requise", http.StatusUnauthorized)
				return
			}
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
				securityError(w, r, "Requête intersite refusée", http.StatusForbidden)
				return
			}
			if origin := r.Header.Get("Origin"); origin != "" {
				expected := "http://" + host
				if r.TLS != nil {
					expected = "https://" + host
				}
				if c.origin != "" {
					expected = c.origin
				}
				if origin != expected {
					securityError(w, r, "Origine non autorisée", http.StatusForbidden)
					return
				}
			}
		}
		if r.URL.Path == "/api/run" && r.Method == http.MethodPost {
			if !submissionLimiter.allow(runClientKey(r), time.Now()) {
				w.Header().Set("Retry-After", "5")
				writeRunError(w, http.StatusTooManyRequests, "Trop de corrections : patiente quelques secondes.")
				return
			}
			kind, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
			if err != nil || kind != "application/json" {
				securityError(w, r, "Content-Type application/json requis", http.StatusUnsupportedMediaType)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func securityError(w http.ResponseWriter, r *http.Request, message string, status int) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		writeRunError(w, status, message)
		return
	}
	http.Error(w, message, status)
}
func writeRunError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	WriteRunResponse(w, false, message)
}

type rateBucket struct {
	tokens  float64
	updated time.Time
}
type runRateLimiter struct {
	mu      sync.Mutex
	clients map[string]rateBucket
}

var authFailureLimiter = runRateLimiter{clients: make(map[string]rateBucket)}

var submissionLimiter = runRateLimiter{clients: make(map[string]rateBucket)}

func (l *runRateLimiter) allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	for k, b := range l.clients {
		if now.Sub(b.updated) > 10*time.Minute {
			delete(l.clients, k)
		}
	}
	b, ok := l.clients[key]
	if !ok {
		if len(l.clients) >= 4096 {
			return false
		}
		b = rateBucket{tokens: 6, updated: now}
	}
	b.tokens += now.Sub(b.updated).Seconds() / 5
	if b.tokens > 6 {
		b.tokens = 6
	}
	b.updated = now
	allowed := b.tokens >= 1
	if allowed {
		b.tokens--
	}
	l.clients[key] = b
	return allowed
}
func runClientKey(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return h
	}
	return r.RemoteAddr
}
func newHTTPServer(address string, handler http.Handler, c securityConfig) *http.Server {
	return &http.Server{Addr: address, Handler: securityHeaders(handler, c), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 5 * time.Second, WriteTimeout: runTimeout() + 15*time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
}
