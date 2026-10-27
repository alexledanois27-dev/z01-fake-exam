package backend

import (
	"go/parser"
	"go/token"
	"os"
	"strings"
	"testing"
)

func TestGoExampleFindsOnlyCompleteMainProgram(t *testing.T) {
	statement := "```console\n$ go run .\n```\n\n```go\nfunc LastWord(s string) string {}\n```\n\n```go\npackage main\nimport \"fmt\"\nfunc main() { fmt.Println(\"example\") }\n```\n"
	example := GoExample(statement)
	if !strings.Contains(example, "package main") || !strings.Contains(example, "fmt.Println") {
		t.Fatalf("wrong example: %q", example)
	}
	if GoExample("```go\nfunc main() {}\n```\n") != "" {
		t.Fatal("incomplete program accepted")
	}
}

func TestGoExampleAdaptsStudentImportAndUnqualifiedFunctions(t *testing.T) {
	solution := "package student\nfunc LastWord(s string) string {return s}\n"
	cases := []struct{ name, source, contains string }{
		{"piscine", `package main; import ("fmt"; "piscine"); func main(){fmt.Print(piscine.LastWord("a"))}`, `piscine "student"`},
		{"alias", `package main; import ("fmt"; p "piscine"); func main(){fmt.Print(p.LastWord("a"))}`, `p "student"`},
		{"direct", `package main; import "fmt"; func main(){fmt.Print(LastWord("a"))}`, `exampleStudent.LastWord`},
		{"shadow", `package main; import "fmt"; func main(){LastWord := func(s string)string{return s}; fmt.Print(LastWord("a"))}`, `LastWord("a")`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			source, err := prepareGoExample(tc.source, solution)
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(source, tc.contains) {
				t.Fatalf("missing %s in %s", tc.contains, source)
			}
			if _, err := parser.ParseFile(token.NewFileSet(), "main.go", source, 0); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestGoExampleIntegration(t *testing.T) {
	if os.Getenv("RUN_GO_EXAMPLE_INTEGRATION") != "1" {
		t.Skip("set RUN_GO_EXAMPLE_INTEGRATION=1 to execute the real Go image")
	}
	t.Setenv("RUNNER_TIMEOUT_SECONDS", "30")
	for _, tc := range []struct{ name, id, code, harness, want string }{
		{"imported-function", "lastword", "package piscine\n\nfunc LastWord(s string) string {\n  return s + \"\\n\"\n}\n", `package main
import ("fmt"; p "piscine")
func main(){fmt.Print(p.LastWord("abc"))}`, "abc\n"},
		{"same-package-example", "passwordentropy", "package piscine\nfunc Entropy(s string) float64 {return float64(len(s))}\n", `package main
import "fmt"
func main(){fmt.Println(Entropy("abc"))}`, "3\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ex := Exercise{ID: tc.id, ExpectedFiles: []string{tc.id + ".go"}, AllowedFunctions: []string{"--allow-builtin"}, Image: officialGoModuleImage, Statement: "```go\n" + tc.harness + "\n```\n"}
			ok, out := RunGoExample(ex, tc.code)
			if !ok || out != tc.want {
				t.Fatalf("got (%v,%q), want %q", ok, out, tc.want)
			}
		})
	}
}
