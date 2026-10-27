package backend

import (
	"encoding/json"
	"go/format"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRestrictedGoLayoutUsesExpectedFileAndPackage(t *testing.T) {
	for _, tc := range []struct{ file, pkg string }{{"lastword.go", "student"}, {"onlya/main.go", "main"}} {
		t.Run(tc.file, func(t *testing.T) {
			dir := t.TempDir()
			file, err := prepareRestrictedGoStudentDir(dir, Exercise{ExpectedFiles: []string{tc.file}, AllowedFunctions: []string{"--allow-builtin"}}, "package piscine\n\nfunc Demo() {}")
			if err != nil {
				t.Fatal(err)
			}
			if file != tc.file {
				t.Fatalf("FILE=%q", file)
			}
			source, err := os.ReadFile(filepath.Join(dir, tc.file))
			if err != nil {
				t.Fatal(err)
			}
			if !strings.HasPrefix(string(source), "package "+tc.pkg+"\n") || !strings.HasSuffix(string(source), "\n") {
				t.Fatalf("wrong source: %s", source)
			}
			if _, err := os.Stat(filepath.Join(dir, "student.go")); !os.IsNotExist(err) {
				t.Fatal("unexpected duplicate student.go")
			}
		})
	}
}

func TestRestrictedGoLayoutRejectsUnsafeOrAmbiguousMetadata(t *testing.T) {
	for _, file := range []string{"../outside.go", "/tmp/outside.go", "a/../../x.go", "a/../x.go", `a\x.go`, "bad.txt", "-flags.go", ""} {
		if _, err := prepareRestrictedGoStudentDir(t.TempDir(), Exercise{ExpectedFiles: []string{file}}, "func Demo() {}"); err == nil {
			t.Errorf("accepted %q", file)
		}
	}
	for _, files := range [][]string{nil, {"one.go", "two.go"}} {
		if _, err := prepareRestrictedGoStudentDir(t.TempDir(), Exercise{ExpectedFiles: files}, ""); err == nil {
			t.Error("ambiguous file metadata accepted")
		}
	}
	if _, err := prepareRestrictedGoStudentDir(t.TempDir(), Exercise{ExpectedFiles: []string{"x.go"}, AllowedFunctions: []string{"fmt.* --allow-builtin"}}, ""); err == nil {
		t.Fatal("combined rules accepted")
	}
}

func TestModuleGoFailsClosedWhenRulesAreMissing(t *testing.T) {
	ok, out := RunExercise(Exercise{ID: "lastword", Image: officialGoModuleImage, ExpectedFiles: []string{"lastword.go"}}, "package piscine\n")
	if ok || !strings.Contains(out, "fonctions autorisées manquent") {
		t.Fatalf("missing rules: %v %s", ok, out)
	}
}

func TestGoCatalogueAndRunnerSnapshotKeepRestrictions(t *testing.T) {
	var node zoneRustNode
	if err := json.Unmarshal([]byte(`{"path":"/rouen/cursus-cda/checkpoint","children":{"lastword":{"key":"lastword","type":"exercise","attrs":{"expectedFiles":["lastword.go"],"allowedFunctions":["--allow-builtin"],"validations":[{"type":"tester","testImage":"ghcr.io/01-edu/module-go"}]}}}}`), &node); err != nil {
		t.Fatal(err)
	}
	zoneCatalogMu.Lock()
	old := zoneCatalogCache
	zoneCatalogCache = &node
	zoneCatalogMu.Unlock()
	defer func() { zoneCatalogMu.Lock(); zoneCatalogCache = old; zoneCatalogMu.Unlock() }()
	list, err := LoadGoExercises()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].AllowedFunctions[0] != "--allow-builtin" || list[0].ExpectedFiles[0] != "lastword.go" {
		t.Fatalf("lost metadata: %#v", list)
	}
	list = append(list, Exercise{ID: "explicit-empty", AllowedFunctions: []string{}})
	data, err := json.Marshal(RunnerCatalog{Go: runnerExercises(list)})
	if err != nil {
		t.Fatal(err)
	}
	var decoded RunnerCatalog
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}
	recovered := catalogExercises(decoded.Go)
	if recovered[0].AllowedFunctions[0] != "--allow-builtin" || recovered[1].AllowedFunctions == nil {
		t.Fatal("lost rules in snapshot")
	}
}

func TestRunRequestCannotRelaxCatalogueRestrictions(t *testing.T) {
	useFakeDocker(t, `for arg do
 case "$arg" in FILE=*|ALLOWED_FUNCTIONS=*) printf '%s\n' "$arg";; esac
done`)
	t.Setenv("RUNNER_MODE", "docker")
	old := exercises
	exercises = []Exercise{{ID: "lastword", Runner: "lastword", Image: officialGoModuleImage, ExpectedFiles: []string{"lastword.go"}, AllowedFunctions: []string{"--allow-builtin"}}}
	defer func() { exercises = old }()
	rec := httptest.NewRecorder()
	handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(`{"exerciseId":"lastword","code":"package piscine\n\nfunc LastWord(s string) string { return s }\n","allowedFunctions":["fmt.*"],"expectedFiles":["skip.go"]}`)))
	var response RunResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if !response.Success || !strings.Contains(response.Output, "FILE=lastword.go") || !strings.Contains(response.Output, "ALLOWED_FUNCTIONS=--allow-builtin") || strings.Contains(response.Output, "fmt.*") {
		t.Fatalf("client changed rules: %#v", response)
	}
}

func TestGoRestrictionsIntegration(t *testing.T) {
	if os.Getenv("RUN_GO_RESTRICTIONS_INTEGRATION") != "1" {
		t.Skip("set RUN_GO_RESTRICTIONS_INTEGRATION=1 for the official module-go image")
	}
	t.Setenv("RUNNER_TIMEOUT_SECONDS", "60")
	cases := []struct {
		name, id, file, code, diagnostic string
		allowed                          []string
		want                             bool
	}{
		{name: "function-allowed", id: "lastword", file: "lastword.go", allowed: []string{"--allow-builtin"}, want: true, code: `package piscine

func LastWord(s string) string {
 end := len(s)
 for end > 0 && s[end-1] == ' ' { end-- }
 start := end
 for start > 0 && s[start-1] != ' ' { start-- }
 return s[start:end] + "\n"
}
`},
		{name: "function-forbidden-import", id: "lastword", file: "lastword.go", allowed: []string{"--allow-builtin"}, diagnostic: "illegal-import", code: `package piscine

import "strings"

func LastWord(s string) string {
 words := strings.Fields(s)
 if len(words) == 0 { return "\n" }
 return words[len(words)-1] + "\n"
}
`},
		{name: "program-allowed", id: "onlya", file: "onlya/main.go", allowed: []string{"github.com/01-edu/z01.PrintRune", "--allow-builtin"}, want: true, code: `package main

import "github.com/01-edu/z01"

func main() { z01.PrintRune('a') }
`},
		{name: "program-forbidden-function", id: "onlya", file: "onlya/main.go", allowed: []string{"github.com/01-edu/z01.PrintRune", "--allow-builtin"}, diagnostic: "illegal-import", code: `package main

import "fmt"

func main() { fmt.Print("a") }
`},
	}

	entropy := `package piscine

import (
    "math"
    "unicode"
)

func Entropy(password string) float64 {
    var lower, upper, digit, special bool
    for _, r := range password {
        switch {
        case unicode.IsLower(r): lower = true
        case unicode.IsUpper(r): upper = true
        case unicode.IsDigit(r): digit = true
        case !unicode.IsLetter(r) && !unicode.IsDigit(r): special = true
        }
    }
    pool := 0
    if lower { pool += 26 }
    if upper { pool += 26 }
    if digit { pool += 10 }
    if special { pool += 32 }
    if pool == 0 { return 0 }
    return float64(len(password)) * math.Log2(float64(pool))
}
`
	cases = append(cases, struct {
		name, id, file, code, diagnostic string
		allowed                          []string
		want                             bool
	}{
		name: "passwordentropy-allowed", id: "passwordentropy", file: "passwordentropy.go",
		allowed: []string{"math.Log2", "unicode.*", "--allow-builtin"}, want: true, code: entropy,
	}, struct {
		name, id, file, code, diagnostic string
		allowed                          []string
		want                             bool
	}{
		name: "passwordentropy-forbidden-same-package", id: "passwordentropy", file: "passwordentropy.go",
		allowed: []string{"math.Log2", "unicode.*", "--allow-builtin"}, code: strings.Replace(entropy, "math.Log2(float64(pool))", "(math.Log2(float64(pool)) + math.Sqrt(0))", 1), diagnostic: "illegal-access",
	}, struct {
		name, id, file, code, diagnostic string
		allowed                          []string
		want                             bool
	}{
		name: "function-wrong-result", id: "lastword", file: "lastword.go",
		allowed: []string{"--allow-builtin"}, code: "package piscine\n\nfunc LastWord(s string) string { return \"wrong\\n\" }\n",
	})

	cases = append(cases, struct {
		name, id, file, code, diagnostic string
		allowed                          []string
		want                             bool
	}{
		name: "passwordentropy-forbidden-log", id: "passwordentropy", file: "passwordentropy.go",
		allowed: []string{"math.Log2", "unicode.*", "--allow-builtin"},
		code:    strings.Replace(entropy, "math.Log2(float64(pool))", "(math.Log(float64(pool)) / math.Log(2))", 1), diagnostic: "illegal-access",
	})
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// gofumpt requires conventional formatting before restrictions are checked.
			code := formatGoIntegrationSource(t, tc.code)
			ok, out := RunExercise(Exercise{ID: tc.id, Runner: tc.id, Image: officialGoModuleImage, ExpectedFiles: []string{tc.file}, AllowedFunctions: tc.allowed}, code)
			if ok != tc.want {
				t.Fatalf("success=%v, want %v:\n%s", ok, tc.want, out)
			}
			if tc.diagnostic != "" && !strings.Contains(out, tc.diagnostic) {
				t.Fatalf("wrong failure, expected %s:\n%s", tc.diagnostic, out)
			}
		})
	}
}

func formatGoIntegrationSource(t *testing.T, code string) string {
	t.Helper()
	source, err := format.Source([]byte(code))
	if err != nil {
		t.Fatal(err)
	}
	return string(source)
}

func TestGoAllowedAccessChecksAliasesReferencesAndShadowing(t *testing.T) {
	rules := []string{"math.Log2", "unicode.*", "--allow-builtin"}
	for _, tc := range []struct{ name, source, contains string }{
		{"exact", `package piscine; import "math"; var _ = math.Log2`, ""},
		{"wildcard", `package piscine; import "unicode"; var _ = unicode.IsLower`, ""},
		{"alias", `package piscine; import m "math"; var _ = m.Log`, "illegal-access"},
		{"function-reference", `package piscine; import "math"; var _ = math.Sqrt`, "illegal-access"},
		{"nested", `package piscine; import "math"; var _ = math.Log2(2) + math.Sqrt(0)`, "illegal-access"},
		{"package", `package piscine; import "strings"; var _ = strings.Fields`, "illegal-import"},
		{"dot", `package piscine; import . "math"; var _ = Sqrt`, "Import pointé"},
		{"shadow", `package piscine; import "math"; var _ = math.Log2; func f() { math := struct { Sqrt int }{}; _ = math.Sqrt }`, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := checkGoAllowedAccess("test.go", tc.source, rules)
			if tc.contains == "" && err != nil {
				t.Fatal(err)
			}
			if tc.contains != "" && (err == nil || !strings.Contains(err.Error(), tc.contains)) {
				t.Fatalf("wanted %q, got %v", tc.contains, err)
			}
		})
	}
}

func TestRestrictedRunnerRequiresPackageDeclaration(t *testing.T) {
	useFakeDocker(t, "exit 0")
	ok, out := RunExercise(Exercise{ID: "lastword", Image: officialGoModuleImage, ExpectedFiles: []string{"lastword.go"}, AllowedFunctions: []string{"--allow-builtin"}}, "func LastWord(s string) string { return s }")
	if ok || !strings.Contains(out, "Déclaration de package Go invalide") {
		t.Fatalf("package-less function not rejected: %s", out)
	}
}
