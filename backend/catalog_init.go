package backend

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

func initializeCatalog() error {
	var err error
	jsInstructionsDir = resolveJSInstructionsDir(rootDir)

	exercises, err = LoadGoExercises()
	if err != nil {
		fmt.Println("Catalogue Go indisponible:", err)
		exercises = []Exercise{}
	}
	jsExercises, err = LoadJSExercises(jsInstructionsDir)
	if err != nil {
		return fmt.Errorf("chargement exercices JS: %w", err)
	}
	rustExercises, err = LoadRustExercises()
	if err != nil {
		fmt.Println("Catalogue Rust indisponible:", err)
		rustExercises = []Exercise{}
	}
	javaExercises, err = LoadJavaExercises()
	if err != nil {
		fmt.Println("Catalogue Java indisponible:", err)
		javaExercises = []Exercise{}
	}
	return nil
}

func loadRunnerCatalog() error {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("CATALOG_SERVICE_URL")), "/")
	if baseURL == "" {
		return fmt.Errorf("CATALOG_SERVICE_URL est requis par le composant runner")
	}
	endpoint, err := url.Parse(baseURL + "/internal/runner-catalog")
	if err != nil || endpoint.Scheme == "" || endpoint.Host == "" {
		return fmt.Errorf("CATALOG_SERVICE_URL doit être une URL absolue valide")
	}
	res, err := (&http.Client{Timeout: runTimeout()}).Get(endpoint.String())
	if err != nil {
		return fmt.Errorf("lecture du catalogue Runner: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("lecture du catalogue Runner: HTTP %d", res.StatusCode)
	}
	var catalog RunnerCatalog
	if err := json.NewDecoder(res.Body).Decode(&catalog); err != nil {
		return fmt.Errorf("décodage du catalogue Runner: %w", err)
	}
	exercises, jsExercises = catalogExercises(catalog.Go), catalogExercises(catalog.JS)
	rustExercises, javaExercises = catalogExercises(catalog.Rust), catalogExercises(catalog.Java)
	return nil
}

func resolveJSInstructionsDir(root string) string {
	for _, candidate := range jsInstructionsDirCandidates {
		p := filepath.Join(root, candidate)
		if DirExists(p) {
			return p
		}
	}
	return ""
}
