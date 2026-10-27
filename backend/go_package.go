package backend

import (
	"fmt"
	"go/parser"
	"go/token"
	"path/filepath"
)

// Validate the student's declaration before adapting it to the image's internal module.
func validateGoPackage(ex Exercise, code string) error {
	expected := "piscine"
	if len(ex.ExpectedFiles) == 1 && filepath.Base(ex.ExpectedFiles[0]) == "main.go" {
		expected = "main"
	}
	node, err := parser.ParseFile(token.NewFileSet(), "solution.go", code, parser.PackageClauseOnly)
	if err != nil {
		return fmt.Errorf("Déclaration de package Go invalide : %w", err)
	}
	if node.Name.Name != expected {
		return fmt.Errorf("Package incorrect : cet exercice attend package %s, reçu package %s.", expected, node.Name.Name)
	}
	return nil
}
