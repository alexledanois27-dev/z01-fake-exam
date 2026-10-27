package backend

import (
	"strings"
	"testing"
)

func TestGoPackageMatchesExercise(t *testing.T) {
	for _, tc := range []struct {
		file, code string
		valid      bool
	}{
		{"printif.go", "package piscine\nfunc PrintIf(s string) string{return s}", true},
		{"printif.go", "package main\nfunc PrintIf(s string) string{return s}", false},
		{"printif.go", "package student", false},
		{"only1/main.go", "package main\nfunc main(){}", true},
		{"only1/main.go", "package piscine", false},
		{"printif.go", "// package piscine\npackage main", false},
		{"printif.go", "func PrintIf(){}", false},
	} {
		ex := Exercise{ID: "probe", ExpectedFiles: []string{tc.file}}
		err := validateGoPackage(ex, tc.code)
		if (err == nil) != tc.valid {
			t.Fatalf("%q: %v", tc.code, err)
		}
	}
}
func TestWrongGoPackageRejectedBeforeDocker(t *testing.T) {
	ex := Exercise{ID: "printif", ExpectedFiles: []string{"printif.go"}}
	for _, run := range []func() (bool, string){
		func() (bool, string) { return RunExercise(ex, "package main\nfunc PrintIf(s string)string{return s}") },
		func() (bool, string) {
			return RunManualExample("go", ex, RunRequest{Code: "package main\nfunc main(){}", TestMode: "auto"})
		},
	} {
		ok, out := run()
		if ok || !strings.Contains(out, "attend package piscine") {
			t.Fatalf("%v: %s", ok, out)
		}
	}
}
