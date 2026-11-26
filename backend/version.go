package backend

import (
	"encoding/json"
	"net/http"
	"runtime/debug"
)

// BuildSHA is embedded by the release build, never read from the live checkout.
var BuildSHA string
var BuildDirty bool

func handleVersion(w http.ResponseWriter, r *http.Request) {
	sha, dirty := BuildSHA, BuildDirty
	if sha == "" {
		if info, ok := debug.ReadBuildInfo(); ok {
			for _, setting := range info.Settings {
				switch setting.Key {
				case "vcs.revision":
					sha = setting.Value
				case "vcs.modified":
					dirty = setting.Value == "true"
				}
			}
		}
	}
	if sha == "" {
		sha = "unknown"
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(struct {
		Application string `json:"application"`
		SHA         string `json:"sha"`
		Dirty       bool   `json:"dirty"`
	}{"z01-fake-exam", sha, dirty})
}
