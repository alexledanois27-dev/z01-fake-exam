package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	// rootMarker repère la racine du projet (frontend servi par le Web).
	rootMarker          = "index.html"
	serviceModeMonolith = "monolith"
	serviceModeCatalog  = "catalog"
	serviceModeRunner   = "runner"
	serviceModeWeb      = "web"
)

var jsInstructionsDirCandidates = []string{
	"js_exam_instructions",
	"Js_exam_instructions",
}

var (
	rootDir           string
	jsInstructionsDir string
	exercises         []Exercise
	jsExercises       []Exercise
	rustExercises     []Exercise
	javaExercises     []Exercise
)

// Run starts one explicitly selected service. Commands own the service choice,
// preventing deployment configuration from accidentally exposing a component's
// private responsibility.
func Run(mode string) error {
	mode, err := serviceMode(mode)
	if err != nil {
		return err
	}
	security, err := loadSecurityConfig()
	if err != nil {
		return err
	}
	if security.production && (mode == serviceModeMonolith || mode == serviceModeRunner) {
		if err := requireRootlessDocker(); err != nil {
			return err
		}
	}
	if err := initialize(mode); err != nil {
		return err
	}
	mux, err := newServiceMux(mode)
	if err != nil {
		return err
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	address := strings.TrimSpace(os.Getenv("LISTEN_ADDR"))
	if address == "" {
		address = "127.0.0.1" + port
	}
	if !security.production && !localHost(address) {
		return fmt.Errorf("écoute non locale refusée : configurer APP_ENV=production et ses protections")
	}
	fmt.Printf("Service %s en écoute sur %s\n", mode, address)
	return newHTTPServer(address, mux, security).ListenAndServe()
}

func serviceMode(raw string) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(raw))
	switch mode {
	case serviceModeMonolith, serviceModeCatalog, serviceModeRunner, serviceModeWeb:
		return mode, nil
	default:
		return "", fmt.Errorf("composant=%q invalide (monolith, catalog, runner ou web)", raw)
	}
}

func initialize(mode string) error {
	var err error
	rootDir, err = os.Getwd()
	if err != nil {
		return fmt.Errorf("récupération du répertoire courant: %w", err)
	}

	// Support: si on lance depuis backend, remonter à la racine du projet.
	for curr := rootDir; ; {
		if FileExists(filepath.Join(curr, rootMarker)) {
			rootDir = curr
			break
		}
		parent := filepath.Dir(curr)
		if parent == curr {
			break
		}
		curr = parent
	}

	if mode == serviceModeWeb {
		return nil
	}
	if mode == serviceModeRunner {
		return loadRunnerCatalog()
	}
	return initializeCatalog()
}
