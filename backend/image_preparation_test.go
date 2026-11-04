package backend

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func awaitPreparation(t *testing.T, p *imagePreparer, image string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		p.mu.Lock()
		running := p.jobs[image].running
		p.mu.Unlock()
		if !running {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("preparation did not finish")
}

func TestImagePreparationDeduplicatesAndRejectsUntrustedImages(t *testing.T) {
	p := newImagePreparer()
	var installed atomic.Bool
	var pulls atomic.Int32
	started, release := make(chan struct{}), make(chan struct{})
	p.inspect = func(context.Context, string) error {
		if installed.Load() {
			return nil
		}
		return errors.New("missing")
	}
	p.pull = func(ctx context.Context, image string) error {
		pulls.Add(1)
		close(started)
		select {
		case <-release:
			installed.Store(true)
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	image := officialGoModuleImage
	if ok, err := p.ready(image); ok || err != nil {
		t.Fatalf("first request: %v %v", ok, err)
	}
	<-started
	for i := 0; i < 20; i++ {
		if ok, err := p.ready(image); ok || err != nil {
			t.Fatal("must remain pending")
		}
	}
	if len(p.slots) != 1 || pulls.Load() != 1 {
		t.Fatal("duplicate downloads")
	}
	if _, err := p.ready("attacker/image:latest"); err == nil {
		t.Fatal("arbitrary image allowed")
	}
	close(release)
	awaitPreparation(t, p, image)
	if ok, err := p.ready(image); !ok || err != nil {
		t.Fatalf("image not ready: %v", err)
	}
	if pulls.Load() != 1 {
		t.Fatal("download repeated")
	}
}

func TestImagePreparationFailureBackoffAndRetry(t *testing.T) {
	p := newImagePreparer()
	var pulls atomic.Int32
	p.inspect = func(context.Context, string) error { return errors.New("missing") }
	p.pull = func(context.Context, string) error { pulls.Add(1); return errors.New("network failure") }
	image := officialImage("module-js")
	p.ready(image)
	awaitPreparation(t, p, image)
	for i := 0; i < 3; i++ {
		if ok, err := p.ready(image); ok || err == nil {
			t.Fatal("failed download not reported")
		}
	}
	if pulls.Load() != 1 {
		t.Fatal("failure retry storm")
	}
	p.mu.Lock()
	p.jobs[image].failedAt = time.Now().Add(-31 * time.Second)
	p.mu.Unlock()
	if ok, err := p.ready(image); ok || err != nil {
		t.Fatal("retry did not start")
	}
	awaitPreparation(t, p, image)
	if pulls.Load() != 2 {
		t.Fatal("retry not bounded")
	}
}

func TestRunPreparesWithoutReservingCorrectionOrEvaluating(t *testing.T) {
	t.Setenv("RUNNER_MODE", "docker")
	useFakeDocker(t, `printf 'OK: validé'`)
	oldImages, oldExercises := runnerImages, exercises
	p := newImagePreparer()
	runnerImages = p
	exercises = []Exercise{{ID: "only1", ExpectedFiles: []string{"only1/main.go"}}}
	defer func() { runnerImages = oldImages; exercises = oldExercises }()
	var installed atomic.Bool
	release := make(chan struct{})
	p.inspect = func(context.Context, string) error {
		if installed.Load() {
			return nil
		}
		return errors.New("missing")
	}
	p.pull = func(ctx context.Context, _ string) error {
		select {
		case <-release:
			installed.Store(true)
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	body := `{"exerciseId":"only1","code":"package main\nfunc main() {}"}`
	request := func() *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		handleRun(rec, httptest.NewRequest("POST", "/api/run", strings.NewReader(body)))
		return rec
	}
	rec := request()
	if rec.Code != http.StatusAccepted || len(runnerSlots) != 0 || rec.Header().Get("Retry-After") != "5" {
		t.Fatalf("pending response: %d %s", rec.Code, rec.Body)
	}
	var pending map[string]any
	json.Unmarshal(rec.Body.Bytes(), &pending)
	if pending["status"] != "preparing" || pending["success"] != nil {
		t.Fatal("preparation presented as a correction")
	}
	close(release)
	awaitPreparation(t, p, goRunnerImage())
	rec = request()
	if rec.Code != 200 {
		t.Fatal(rec.Code)
	}
	var result RunResponse
	json.Unmarshal(rec.Body.Bytes(), &result)
	if !result.Success {
		t.Fatalf("correction did not resume: %s", rec.Body)
	}
}

func TestDockerRunNeverDownloadsInsideCorrectionDeadline(t *testing.T) {
	cmd := dockerRunCommand(context.Background(), officialGoDockerArgsFor(officialGoModuleImage, "/tmp/student", "only1"))
	args := strings.Join(cmd.Args, " ")
	if !strings.Contains(args, "run --pull never --name") {
		t.Fatal("implicit pull can consume execution deadline:", args)
	}
}
