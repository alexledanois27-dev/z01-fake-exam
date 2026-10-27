package backend

import (
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var goFence = regexp.MustCompile("(?ms)^```([^\r\n]*)\r?\n(.*?)^```[ \t]*\r?$")

// Only a complete main program from the server's statement is accepted.
func GoExample(statement string) string {
	for _, match := range goFence.FindAllStringSubmatch(statement, -1) {
		language := strings.TrimSpace(match[1])
		if language != "" && language != "go" && language != "golang" {
			continue
		}
		source := strings.TrimSpace(match[2]) + "\n"
		f, err := parser.ParseFile(token.NewFileSet(), "example.go", source, 0)
		if err != nil || f.Name.Name != "main" {
			continue
		}
		for _, decl := range f.Decls {
			if fn, ok := decl.(*ast.FuncDecl); ok && fn.Name.Name == "main" && fn.Recv == nil {
				return source
			}
		}
	}
	return ""
}

type exampleEdit struct {
	start, end int
	text       string
}

// Adapt the statement's harness to the isolated student module. It can use
// piscine.Func or call the student's exported function directly.
func prepareGoExample(example, solution string) (string, error) {
	fset := token.NewFileSet()
	harness, err := parser.ParseFile(fset, "example.go", example, 0)
	if err != nil {
		return "", err
	}
	student, err := parser.ParseFile(token.NewFileSet(), "solution.go", solution, 0)
	if err != nil {
		return "", err
	}
	names := map[string]bool{}
	for name := range student.Scope.Objects {
		if ast.IsExported(name) {
			names[name] = true
		}
	}
	used := map[string]bool{}
	ast.Inspect(harness, func(n ast.Node) bool {
		if id, ok := n.(*ast.Ident); ok {
			used[id.Name] = true
		}
		return true
	})
	alias := "exampleStudent"
	for used[alias] {
		alias += "X"
	}
	edits := []exampleEdit{}
	imported := false
	for _, imp := range harness.Imports {
		path, _ := strconv.Unquote(imp.Path.Value)
		if path != "piscine" && path != "student" && path != "./piscine" && path != "../piscine" {
			continue
		}
		name := filepath.Base(path)
		if imp.Name != nil {
			name = imp.Name.Name
		}
		if name == "." || name == "_" {
			return "", fmt.Errorf("l’exemple utilise un import étudiant non pris en charge")
		}
		text := strconv.Quote("student")
		if imp.Name == nil {
			text = name + " " + text
		}
		edits = append(edits, exampleEdit{fset.Position(imp.Path.Pos()).Offset, fset.Position(imp.Path.End()).Offset, text})
		alias = name
		imported = true
	}
	referenced := false
	for _, ident := range harness.Unresolved {
		if names[ident.Name] {
			referenced = true
			edits = append(edits, exampleEdit{fset.Position(ident.Pos()).Offset, fset.Position(ident.End()).Offset, alias + "." + ident.Name})
		}
	}
	if !imported {
		pos := fset.Position(harness.Name.End()).Offset
		next := pos
		for next < len(example) && (example[next] == ' ' || example[next] == '\t') {
			next++
		}
		if next < len(example) && example[next] == ';' {
			pos = next + 1
		}
		importName := alias
		if !referenced {
			importName = "_"
		}
		edits = append(edits, exampleEdit{pos, pos, "\n\nimport " + importName + " \"student\"\n"})
	}
	sort.Slice(edits, func(i, j int) bool { return edits[i].start > edits[j].start })
	for _, edit := range edits {
		example = example[:edit.start] + edit.text + example[edit.end:]
	}
	formatted, err := format.Source([]byte(example))
	if err != nil {
		return "", fmt.Errorf("préparation du programme d’exemple : %w", err)
	}
	return string(formatted), nil
}

func RunGoExample(ex Exercise, code string) (bool, string) {
	return RunManualExample("go", ex, RunRequest{Code: code, Mode: "example"})
}
