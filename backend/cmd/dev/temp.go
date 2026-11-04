package main

import (
	"fmt"
	"os"
	"path/filepath"
)

// Snap/private-tmp installations may give Go and Docker different /tmp trees.
// Only the local Linux entrypoint chooses a host-visible default. Production
// and explicitly configured paths keep their deployment-specific layout.
func configureLocalTempDir(goos string, homeDir func() (string, error)) error {
	if goos != "linux" || os.Getenv("APP_ENV") == "production" || os.Getenv("TMPDIR") != "" {
		return nil
	}
	home, err := homeDir()
	if err != nil || home == "" {
		return fmt.Errorf("dossier personnel introuvable : définir TMPDIR vers un dossier accessible à Docker")
	}
	home, err = filepath.EvalSymlinks(home)
	if err != nil {
		return fmt.Errorf("résolution du dossier personnel : %w", err)
	}
	dir := filepath.Join(home, "z01-exam-tmp")
	if err := os.Mkdir(dir, 0700); err != nil && !os.IsExist(err) {
		return fmt.Errorf("création du dossier temporaire local : %w", err)
	}
	info, err := os.Lstat(dir)
	if err != nil {
		return fmt.Errorf("lecture du dossier temporaire local : %w", err)
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 || info.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("%s doit être un vrai dossier sans écriture pour le groupe ou les autres ; choisir un autre TMPDIR si nécessaire", dir)
	}
	if err := os.Setenv("TMPDIR", dir); err != nil {
		return err
	}
	return nil
}
