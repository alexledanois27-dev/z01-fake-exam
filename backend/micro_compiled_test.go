package backend

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCompiledMicroCurriculaAndTrustedSolutions(t *testing.T) {
	useMicroRoot(t)
	for _, track := range []string{"go", "rust", "java"} {
		t.Run(track, func(t *testing.T) {
			curriculum, err := readTrackCurriculum(track)
			if err != nil {
				t.Fatal(err)
			}
			count := 0
			for _, module := range curriculum.Modules {
				for _, lesson := range module.Lessons {
					count++
					t.Run(lesson.ID, func(t *testing.T) {
						if len(lesson.Tests) < 2 || len(lesson.Solution) == 0 {
							t.Fatal("incomplete curriculum")
						}
						found, err := findMicroLesson(lesson.ID)
						if err != nil || found.Track != track {
							t.Fatal("lookup", err)
						}
						program, file, script := compiledMicroProgram(lesson, lesson.Solution)
						if program == "" || file == "" || script == "" {
							t.Fatal("missing compiler harness")
						}
						// Only maintained repository corrections run on the host in tests.
						// Student submissions always use the Docker runner.
						var command []string
						dir := t.TempDir()
						switch track {
						case "go":
							command = []string{"go", "run", filepath.Join(dir, file)}
						case "rust":
							command = []string{"rustc", "--edition=2024", filepath.Join(dir, file), "-o", filepath.Join(dir, "micro")}
						case "java":
							command = []string{"javac", "-d", dir, filepath.Join(dir, file)}
						}
						if _, err := exec.LookPath(command[0]); err != nil {
							t.Skip("compiler unavailable; run explicit Docker curriculum test")
						}
						if err := os.WriteFile(filepath.Join(dir, file), []byte(program), 0600); err != nil {
							t.Fatal(err)
						}
						ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
						defer cancel()
						out, err := exec.CommandContext(ctx, command[0], command[1:]...).CombinedOutput()
						if err != nil {
							t.Fatalf("compile/run: %v %s", err, out)
						}
						if track == "java" {
							out, err = exec.CommandContext(ctx, "java", "-cp", dir, "Lesson").CombinedOutput()
						}
						if track == "rust" {
							out, err = exec.CommandContext(ctx, filepath.Join(dir, "micro")).CombinedOutput()
						}
						if err != nil {
							t.Fatal(err, string(out))
						}
						result, err := parseCompiledMicroOutput(lesson, string(out))
						if err != nil || !result.Success {
							t.Fatalf("bad maintained correction: %v %+v %s", err, result, out)
						}
					})
				}
			}
			if count != 30 {
				t.Fatalf("expected 30 teaching steps, got %d", count)
			}
		})
	}
}
func TestCompiledMicroParserRejectsMissingCasesAndReportsDifferences(t *testing.T) {
	lesson := jsMicroLesson{Tests: []jsMicroTest{{Label: "A", ExpectedText: "8"}, {Label: "B", ExpectedText: "0"}}}
	if _, err := parseCompiledMicroOutput(lesson, "__Z01_CASE__0|38"); err == nil {
		t.Fatal("partial report accepted")
	}
	result, err := parseCompiledMicroOutput(lesson, "noise\n__Z01_CASE__0|38\n__Z01_CASE__1|31\n")
	if err != nil || result.Success || !result.Checks[0].Passed || result.Checks[1].Actual != "1" {
		t.Fatal(err, result)
	}
}
func TestMicroDockerOtherCurricula(t *testing.T) {
	if os.Getenv("RUN_MICRO_DOCKER_TESTS") != "1" {
		t.Skip("explicit local Docker integration")
	}
	useMicroRoot(t)
	for _, track := range []string{"go", "js", "rust", "java"} {
		curriculum, err := readTrackCurriculum(track)
		if err != nil {
			t.Fatal(err)
		}
		for _, module := range curriculum.Modules {
			for _, lesson := range module.Lessons {
				t.Run(lesson.ID, func(t *testing.T) {
					result, err := runMicroLesson(lesson, lesson.Solution)
					if err != nil || !result.Success {
						t.Fatalf("Docker correction: %v %+v", err, result)
					}
				})
			}
		}
	}
}
func TestMicroHTTPCompiledTracksIgnoreClientHarness(t *testing.T) {
	useMicroRoot(t)
	t.Setenv("RUNNER_MODE", "docker")
	for _, track := range []string{"go", "rust", "java"} {
		t.Run(track, func(t *testing.T) {
			lesson, err := findMicroLesson(track + "-learn-return")
			if err != nil {
				t.Fatal(err)
			}
			var report strings.Builder
			for i, test := range lesson.Tests {
				fmt.Fprintf(&report, "\\n__Z01_CASE__%d|%s\\n", i, hex.EncodeToString([]byte(test.ExpectedText)))
			}
			useFakeDocker(t, "printf '"+report.String()+"'")
			old := runnerImages
			runnerImages = newImagePreparer()
			defer func() { runnerImages = old }()
			rec := httptest.NewRecorder()
			body := fmt.Sprintf(`{"mode":"lesson","exerciseId":%q,"code":"student code","image":"attacker/image","track":"js","target":"process.exit","tests":[]}`, lesson.ID)
			handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(body)))
			if rec.Code != 200 {
				t.Fatal(rec.Code, rec.Body.String())
			}
			var result jsMicroResult
			if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil || !result.Success {
				t.Fatal(err, rec.Body.String())
			}
			image := microImage(lesson)
			if image != officialImage("module-"+track) {
				t.Fatal("wrong fixed image", image)
			}
		})
	}
}
