package backend

import (
	"encoding/json"
	"net/http"
	"strings"
)

func handleExercises(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}
	track := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("track")))
	list := exercises
	if track == "js" {
		list = jsExercises
	} else if track == "rust" {
		list = rustExercises
	} else if track == "java" {
		list = javaExercises
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func handleRunnerCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(RunnerCatalog{
		Go: runnerExercises(exercises), JS: runnerExercises(jsExercises),
		Rust: runnerExercises(rustExercises), Java: runnerExercises(javaExercises),
	})
}
