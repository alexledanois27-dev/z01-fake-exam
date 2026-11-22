package backend

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestVersionReportsBinaryRevision(t *testing.T) {
	previousSHA, previousDirty := BuildSHA, BuildDirty
	t.Cleanup(func() { BuildSHA, BuildDirty = previousSHA, previousDirty })
	BuildSHA, BuildDirty = "1234567890abcdef1234567890abcdef12345678", true
	for _, mode := range []string{"monolith", "catalog", "runner", "web"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("CATALOG_SERVICE_URL", "http://127.0.0.1:1")
			t.Setenv("RUNNER_SERVICE_URL", "http://127.0.0.1:2")
			mux, err := newServiceMux(mode)
			if err != nil {
				t.Fatal(err)
			}
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, httptest.NewRequest("GET", "/api/version", nil))
			var got struct {
				Application string `json:"application"`
				SHA         string `json:"sha"`
				Dirty       bool   `json:"dirty"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if response.Code != 200 || got.Application != "z01-fake-exam" || got.SHA != BuildSHA || !got.Dirty || response.Header().Get("Cache-Control") != "no-store" {
				t.Fatalf("incorrect version response: %s", response.Body.String())
			}
		})
	}
}
