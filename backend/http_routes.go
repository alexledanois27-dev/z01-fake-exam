package backend

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

func newServiceMux(mode string) (*http.ServeMux, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/version", handleVersion)
	switch mode {
	case serviceModeMonolith:
		mux.HandleFunc("/api/exercises", handleExercises)
		mux.HandleFunc("/api/run", handleRun)
		mux.HandleFunc("/", handleStatic)
	case serviceModeCatalog:
		mux.HandleFunc("/api/exercises", handleExercises)
		mux.HandleFunc("/internal/runner-catalog", handleRunnerCatalog)
	case serviceModeRunner:
		mux.HandleFunc("/api/run", handleRun)
	case serviceModeWeb:
		catalogProxy, err := serviceProxy("CATALOG_SERVICE_URL")
		if err != nil {
			return nil, err
		}
		runnerProxy, err := serviceProxy("RUNNER_SERVICE_URL")
		if err != nil {
			return nil, err
		}
		mux.Handle("/api/exercises", catalogProxy)
		mux.Handle("/api/run", runnerProxy)
		mux.HandleFunc("/", handleStatic)
	}
	return mux, nil
}

func serviceProxy(envName string) (http.Handler, error) {
	rawURL := strings.TrimSpace(os.Getenv(envName))
	if rawURL == "" {
		return nil, fmt.Errorf("%s est requis par le composant web", envName)
	}
	target, err := url.Parse(rawURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("%s doit être une URL absolue valide", envName)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = runTimeout() + 10*time.Second
	transport.TLSHandshakeTimeout = 5 * time.Second
	transport.IdleConnTimeout = 30 * time.Second
	transport.MaxConnsPerHost = 8
	transport.MaxIdleConnsPerHost = 4
	proxy.Transport = transport
	return proxy, nil
}
