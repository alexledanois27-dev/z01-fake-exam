// Local entrypoint: no shell-specific commands, works with Go on every host OS.
package main

import (
	backend "Z02INTRA"
	"log"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

func main() {
	if err := configureLocalTempDir(runtime.GOOS, os.UserHomeDir); err != nil {
		log.Fatal(err)
	}

	if os.Getenv("LISTEN_ADDR") == "" {
		port := strings.TrimPrefix(os.Getenv("PORT"), ":")
		if port == "" {
			port = "8080"
		}
		os.Setenv("LISTEN_ADDR", net.JoinHostPort("127.0.0.1", port))
	}
	if os.Getenv("RUNNER_MODE") == "" {
		os.Setenv("RUNNER_MODE", "docker")
	}
	// go run does not always include VCS metadata: capture the checkout at startup.
	if sha, err := exec.Command("git", "rev-parse", "HEAD").Output(); err == nil {
		backend.BuildSHA = strings.TrimSpace(string(sha))
		if status, err := exec.Command("git", "status", "--porcelain").Output(); err == nil {
			backend.BuildDirty = len(status) > 0
		}
	}
	log.Printf("Projet local : http://%s (Docker requis pour les soumissions)", os.Getenv("LISTEN_ADDR"))
	if err := backend.Run("monolith"); err != nil {
		log.Fatal(err)
	}
}
