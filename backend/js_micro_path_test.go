package backend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func useMicroRoot(t *testing.T) {
	t.Helper()
	old := rootDir
	path, err := filepath.Abs("..")
	if err != nil {
		t.Fatal(err)
	}
	rootDir = path
	t.Cleanup(func() { rootDir = old })
}

func TestEveryMaintainedMicroSolutionPassesPublicCases(t *testing.T) {
	// Only repository-authored corrections are executed by the host Node process.
	// Arbitrary student submissions use runMicroLesson and Docker exclusively.
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("Node required for maintained curriculum checks")
	}
	useMicroRoot(t)
	curriculum, err := readMicroCurriculum()
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, module := range curriculum.Modules {
		for _, lesson := range module.Lessons {
			count++
			t.Run(lesson.ID, func(t *testing.T) {
				dir := t.TempDir()
				file := filepath.Join(dir, "maintained-solution.js")
				if err := os.WriteFile(file, []byte(microProgram(lesson, lesson.Solution)), 0600); err != nil {
					t.Fatal(err)
				}
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				out, err := exec.CommandContext(ctx, node, file).CombinedOutput()
				if err != nil {
					t.Fatalf("invalid maintained solution: %v %s", err, out)
				}
				result, err := parseMicroOutput(string(out))
				if err != nil || !result.Success {
					t.Fatalf("cases failed: %v %s", err, out)
				}
			})
		}
	}
	if count != 30 {
		t.Fatalf("unexpected curriculum size: %d", count)
	}
}

func TestMicroHarnessDetectsMutationMissingReturnAndCurryingMistakes(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("Node required")
	}
	useMicroRoot(t)
	for _, tc := range []struct{ id, source, diagnostic string }{
		{"js-learn-append-copy", `function appendCopy(arr,value){ arr.push(value); return arr; }`, "arguments ont été modifiés"},
		{"js-learn-return", `function doubleValue(n){ console.log(n*2); }`, "undefined"},
		{"js-learn-return-function", `function makeAdder(base){ return base; }`, "renvoyer une fonction"},
	} {
		t.Run(tc.id, func(t *testing.T) {
			lesson, err := findMicroLesson(tc.id)
			if err != nil {
				t.Fatal(err)
			}
			file := filepath.Join(t.TempDir(), "known-invalid-example.js")
			os.WriteFile(file, []byte(microProgram(lesson, tc.source)), 0600)
			out, err := exec.Command(node, file).CombinedOutput()
			if err != nil {
				t.Fatal(err, string(out))
			}
			result, err := parseMicroOutput(string(out))
			if err != nil || result.Success || !strings.Contains(string(out), tc.diagnostic) {
				t.Fatalf("missing diagnostic: %v %s", err, out)
			}
		})
	}
}

func TestMicroHTTPUsesOnlyServerLessonAndSharedPreparation(t *testing.T) {
	useMicroRoot(t)
	t.Setenv("RUNNER_MODE", "docker")
	useFakeDocker(t, `printf '\n__Z01_MICRO_RESULT__{"success":true,"output":"OK","checks":[{"label":"Cas 1","expected":"8","actual":"8","passed":true}]}'`)
	old := runnerImages
	p := newImagePreparer()
	runnerImages = p
	t.Cleanup(func() { runnerImages = old })
	request := func(body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(body)))
		return rec
	}
	rec := request(`{"mode":"lesson","exerciseId":"js-learn-return","code":"function doubleValue(n){return n*2;}","image":"attacker/image","tests":[],"target":"process.exit"}`)
	if rec.Code != 200 {
		t.Fatal(rec.Code, rec.Body.String())
	}
	var result jsMicroResult
	json.Unmarshal(rec.Body.Bytes(), &result)
	if !result.Success || len(result.Checks) != 1 {
		t.Fatal(rec.Body.String())
	}
	rec = request(`{"mode":"lesson","exerciseId":"../../secret","code":"x"}`)
	if rec.Code != 404 {
		t.Fatal("unknown lesson accepted", rec.Code)
	}
	p.inspect = func(context.Context, string) error { return errors.New("missing") }
	p.pull = func(context.Context, string) error { return errors.New("offline") }
	rec = request(`{"mode":"lesson","exerciseId":"js-learn-return","code":"x"}`)
	if rec.Code != 202 || len(runnerSlots) != 0 {
		t.Fatal("preparation holds a slot or returns grade", rec.Code)
	}
	awaitPreparation(t, p, officialImage("module-js"))
	rec = request(`{"mode":"lesson","exerciseId":"js-learn-return","code":"x"}`)
	if rec.Code != 503 {
		t.Fatal("infrastructure error treated as a grade", rec.Code)
	}
}
