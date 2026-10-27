package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

// The catalogue's nil list means unknown rules, while an empty list means
// explicitly no allowed imports/builtins. Never populate rules from RunRequest.
func prepareRestrictedGoStudentDir(dir string, ex Exercise, code string) (string, error) {
	if len(ex.ExpectedFiles) != 1 {
		return "", fmt.Errorf("un fichier Go attendu est requis pour contrôler les restrictions")
	}
	file := ex.ExpectedFiles[0]
	if file == "" || strings.ContainsAny(file, "\\:\x00") || filepath.IsAbs(file) ||
		filepath.ToSlash(filepath.Clean(file)) != file || file == ".." ||
		strings.HasPrefix(file, "../") || !strings.HasSuffix(file, ".go") || strings.HasPrefix(file, "-") {
		return "", fmt.Errorf("chemin de fichier Go attendu invalide")
	}
	for _, rule := range ex.AllowedFunctions {
		if rule == "" || strings.IndexFunc(rule, unicode.IsSpace) >= 0 || strings.ContainsRune(rule, '\x00') {
			return "", fmt.Errorf("règle de fonction autorisée invalide")
		}
	}
	module := "module student\n\ngo 1.18\n\nrequire github.com/01-edu/z01 v0.1.0\n"
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte(module), 0644); err != nil {
		return "", err
	}
	pkg := "student"
	if filepath.Base(file) == "main.go" {
		pkg = "main"
	}
	target := filepath.Join(dir, filepath.FromSlash(file))
	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return "", err
	}
	source := ensureTrailingNewline(RewritePackage(code, pkg))
	if err := os.WriteFile(target, []byte(source), 0644); err != nil {
		return "", err
	}
	return file, nil
}
