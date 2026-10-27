package backend

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
)

var runnerSlots = make(chan struct{}, 2)

func handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if strings.ToLower(strings.TrimSpace(os.Getenv("RUNNER_MODE"))) != "docker" {
		writeRunError(w, http.StatusServiceUnavailable, "Exécution désactivée: RUNNER_MODE doit être 'docker'.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 256<<10)
	defer r.Body.Close()
	var req RunRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		status := http.StatusBadRequest
		var large *http.MaxBytesError
		if errors.As(err, &large) {
			status = http.StatusRequestEntityTooLarge
		}
		writeRunError(w, status, "Requête invalide: "+err.Error())
		return
	}
	if Trim(req.Code) == "" {
		writeRunError(w, http.StatusBadRequest, "Aucun code fourni.\nIndice: écris une première version de la fonction attendue puis relance les tests.")
		return
	}

	if req.Mode != "" && req.Mode != "tests" && req.Mode != "example" && req.Mode != "preview" {
		writeRunError(w, http.StatusBadRequest, "Mode d’exécution inconnu.")
		return
	}
	// Validate and finish reading the bounded body before acquiring an execution slot.
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		writeRunError(w, http.StatusBadRequest, "Un seul objet JSON est accepté")
		return
	}
	select {
	case runnerSlots <- struct{}{}:
		defer func() { <-runnerSlots }()
	default:
		w.Header().Set("Retry-After", "2")
		writeRunError(w, http.StatusTooManyRequests, "Correcteur occupé : réessaie dans quelques secondes.")
		return
	}
	if req.Mode == "example" {
		req.Example = nil
		req.Args = nil
		req.Stdin = ""
		req.TestMode = "harness"
	}
	if req.Mode == "preview" {
		req.Example = nil
		req.Stdin = ""
		req.TestMode = "auto"
	}
	// Keep language lookup order stable; every runner shares the same response contract.
	for _, runner := range []struct {
		track   string
		catalog []Exercise
		run     func(Exercise, string) (bool, string)
	}{
		{"go", exercises, RunExercise},
		{"js", jsExercises, RunJSExercise},
		{"rust", rustExercises, RunRustExercise},
		{"java", javaExercises, RunJavaExercise},
	} {
		ex := FindExercise(runner.catalog, req.ExerciseID)
		if ex == nil {
			continue
		}
		var ok bool
		var out string
		if req.Mode == "example" || req.Mode == "preview" {
			ok, out = RunManualExample(runner.track, *ex, req)
		} else {
			ok, out = runner.run(*ex, req.Code)
		}
		WriteRunResponse(w, ok, out)
		return
	}
	writeRunError(w, http.StatusNotFound, "Exercice inconnu: "+req.ExerciseID)
}
