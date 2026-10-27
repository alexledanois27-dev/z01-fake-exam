package backend

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestStaticOnlyServesPublicAssets(t *testing.T) {
	old := rootDir
	rootDir = t.TempDir()
	defer func() { rootDir = old }()
	for _, name := range []string{"assets/wrong-answer-office.gif", "assets/wrong-answer-fine.gif", "assets/wrong-answer-disappointed.gif", "assets/wrong-answer-homer.gif", "assets/wrong-answer-math.gif", "assets/wrong-answer-travolta.gif", "assets/wrong-answer.gif", "assets/z01-logo.png", "index.html", "app.js", "frontend/lib/training-hints.js", "frontend/hints/go.json", ".env", "backend/main.go", "frontend/app/context.js", "frontend/build.json", "learning-content/notes.md", "goexam-private/student.go", "vendor/purify.min.js", "vendor/editor.bundle.js", "frontend/lib/exam-timer.js", "frontend/lib/timer-ui.js", "frontend/lib/exam-sessions.js"} {
		path := filepath.Join(rootDir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte("content"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	for path, want := range map[string]int{"/assets/wrong-answer-office.gif": 200, "/assets/wrong-answer-fine.gif": 200, "/assets/wrong-answer-disappointed.gif": 200, "/assets/wrong-answer-homer.gif": 200, "/assets/wrong-answer-math.gif": 200, "/assets/wrong-answer-travolta.gif": 200, "/assets/wrong-answer.gif": 200, "/assets/z01-logo.png": 200, "/frontend/lib/training-hints.js": 200, "/frontend/hints/go.json": 404, "/": 200, "/app.js": 200, "/learning-content/notes.md": 200, "/vendor/purify.min.js": 200, "/vendor/editor.bundle.js": 200, "/frontend/lib/exam-timer.js": 200, "/frontend/lib/timer-ui.js": 200, "/frontend/lib/exam-sessions.js": 200, "/frontend/app/context.js": 404, "/frontend/build.json": 404, "/.env": 404, "/backend/main.go": 404, "/goexam-private/student.go": 404, "/missing": 404} {
		rec := httptest.NewRecorder()
		handleStatic(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != want {
			t.Errorf("%s: %d want %d", path, rec.Code, want)
		}
	}
	if err := os.Symlink(filepath.Join(rootDir, ".env"), filepath.Join(rootDir, "learning-content", "secret.md")); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	handleStatic(rec, httptest.NewRequest("GET", "/learning-content/secret.md", nil))
	if rec.Code != 404 {
		t.Fatal("symlink exposed private data")
	}
}
func TestRunnerRejectsOversizedBodiesAndBusyRequests(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	rec := httptest.NewRecorder()
	handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(`{"exerciseId":"x","code":"`+strings.Repeat("a", 300<<10)+`"}`)))
	if !strings.Contains(rec.Body.String(), "request body too large") {
		t.Fatalf("unbounded request: %s", rec.Body.String())
	}
	runnerSlots <- struct{}{}
	runnerSlots <- struct{}{}
	defer func() { <-runnerSlots; <-runnerSlots }()
	rec = httptest.NewRecorder()
	handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(`{"exerciseId":"x","code":"audit"}`)))
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("busy status: %d", rec.Code)
	}
}
func TestRunnerOutputStaysBoundedWhileDraining(t *testing.T) {
	var b limitedOutput
	input := []byte(strings.Repeat("x", maxRunnerOutput*2))
	for i := 0; i < 3; i++ {
		n, err := b.Write(input)
		if n != len(input) || err != nil {
			t.Fatal("writer did not drain")
		}
	}
	if b.Len() != maxRunnerOutput || !strings.Contains(b.String(), "tronquée") {
		t.Fatal("output not capped")
	}
}

func TestDeadlineRemovesNamedDockerContainer(t *testing.T) {
	log := filepath.Join(t.TempDir(), "docker.log")
	t.Setenv("PERSONAL_TEST_DOCKER_LOG", log)
	useFakeDocker(t, `if [ "$1" = "rm" ]; then
 printf '%s\n' "$*" >> "$PERSONAL_TEST_DOCKER_LOG"
 exit 0
fi
sleep 2`)
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	cmd := dockerRunCommand(ctx, []string{"run", "--rm", officialGoModuleImage})
	if err := cmd.Run(); err == nil {
		t.Fatal("deadline did not interrupt runner")
	}
	data, err := os.ReadFile(log)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "rm --force personal-exam-") {
		t.Fatalf("missing cleanup: %s", data)
	}
}

// Opt-in smoke test uses a locally available image with sh/sleep, without pulling.
func TestDockerCancellationIntegration(t *testing.T) {
	image := os.Getenv("RUN_DOCKER_SMOKE_IMAGE")
	if image == "" {
		t.Skip("set RUN_DOCKER_SMOKE_IMAGE to a local image with sh and sleep")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	args := []string{"run", "--rm", "--network", "none", "--entrypoint", "sh", image, "-c", "sleep 30"}
	cmd := dockerRunCommand(ctx, args)
	if err := cmd.Run(); err == nil {
		t.Fatal("container unexpectedly finished before cancellation")
	}
	if ctx.Err() != context.DeadlineExceeded {
		t.Fatalf("docker failed before deadline: %v", ctx.Err())
	}
	name := cmd.Args[3]
	if err := exec.Command("docker", "inspect", name).Run(); err == nil {
		t.Fatal("container survived its deadline")
	}
}

func TestDockerOutputPipeIsBounded(t *testing.T) {
	useFakeDocker(t, "head -c 1048576 /dev/zero")
	out, _, err := RunOfficialGoDocker(officialGoModuleImage, t.TempDir(), "onlya")
	if err != nil {
		t.Fatal(err)
	}
	if len(out) > maxRunnerOutput+100 || !strings.Contains(out, "tronquée") {
		t.Fatalf("unbounded pipe output: %d bytes", len(out))
	}
}
