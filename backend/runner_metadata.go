package backend

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

var safeExerciseName = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_-]*$`)

// Remote catalogues are data, never filesystem paths or shell commands.
func validateRunnerExercise(ex Exercise) error {
	if !safeExerciseName.MatchString(ex.ID) || (ex.Runner != "" && !safeExerciseName.MatchString(ex.Runner)) {
		return fmt.Errorf("identifiant d’exercice ou de runner invalide")
	}
	for _, file := range ex.ExpectedFiles {
		clean := filepath.ToSlash(filepath.Clean(file))
		if file == "" || clean == "." || clean != file || filepath.IsAbs(file) || strings.ContainsAny(file, "\\:\x00") || clean == ".." || strings.HasPrefix(clean, "../") {
			return fmt.Errorf("chemin de fichier attendu invalide")
		}
	}
	return nil
}
