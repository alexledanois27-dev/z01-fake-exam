package backend

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDockerUsesReadOnlyInputsAndBoundedWritableAreas(t *testing.T) {
	args := officialGoDockerArgsFor(officialGoModuleImage, "/tmp/student", "only1")
	secured, err := hardenDockerArgs(args)
	if err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(secured, " ")
	for _, required := range []string{"--read-only", "--log-driver none", "readonly", "/__input0", "/tmp/home/piscine-go", "exec \"$@\""} {
		if !strings.Contains(joined, required) {
			t.Fatal("missing", required)
		}
	}
	if strings.Contains(joined, "/tmp/student:/") {
		t.Fatal("host source still mounted writable")
	}
	if _, err := hardenDockerArgs([]string{"run", "--rm", "attacker/image:latest"}); err == nil {
		t.Fatal("unknown image accepted")
	}
}
func TestProductionRequiresRootlessDaemon(t *testing.T) {
	useFakeDocker(t, `printf '{"SecurityOptions":["name=seccomp"]}'`)
	if err := requireRootlessDocker(); err == nil {
		t.Fatal("rootful daemon accepted")
	}
	useFakeDocker(t, `printf '{"SecurityOptions":["name=rootless"],"CgroupVersion":"2","MemoryLimit":true,"SwapLimit":true,"CPUCfsQuota":true,"PidsLimit":true}'`)
	if err := requireRootlessDocker(); err != nil {
		t.Fatal(err)
	}
}
func TestReadOnlyAndDiskLimitIntegration(t *testing.T) {
	if os.Getenv("RUN_HARDENING_INTEGRATION") != "1" {
		t.Skip("set RUN_HARDENING_INTEGRATION=1")
	}
	dir := t.TempDir()
	if err := os.Chmod(dir, 0755); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(dir, "student.js")
	if err := os.WriteFile(file, []byte("original"), 0644); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	args := append([]string{"run", "--rm"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	script := `set -eu
if touch /escape-test 2>/dev/null; then exit 10; fi
if printf changed >/__input0/student.js 2>/dev/null; then exit 11; fi
test "$(cat /workspace/student.js)" = original
if dd if=/dev/zero of=/workspace/fill bs=1048576 count=140 2>/dev/null; then exit 12; fi
rm /workspace/fill
printf 'readonly and disk limit OK'`
	args = append(args, "-v", dir+":/workspace:rw", "-w", "/workspace", "--entrypoint", "sh", officialImage("module-js"), "-c", script)
	out, err := dockerRunCommand(ctx, args).CombinedOutput()
	if err != nil || !strings.Contains(string(out), "readonly and disk limit OK") {
		t.Fatalf("%v: %s", err, out)
	}
	content, err := os.ReadFile(file)
	if err != nil || string(content) != "original" {
		t.Fatal("host input changed")
	}
}
func TestHardenedOfficialRunnersIntegration(t *testing.T) {
	if os.Getenv("RUN_HARDENING_INTEGRATION") != "1" {
		t.Skip("set RUN_HARDENING_INTEGRATION=1")
	}
	t.Setenv("RUNNER_TIMEOUT_SECONDS", "60")
	withTemporaryRunnerRoot(t)
	root := rootDir
	for _, tc := range []struct {
		name string
		ex   Exercise
		code string
		run  func(Exercise, string) (bool, string)
	}{
		{"JS", Exercise{ID: "factorial", Runner: "factorial", ExpectedFiles: []string{"js-factorial.js"}}, "function factorial(n) { let r=1; for(let i=2;i<=n;i++)r*=i; return r; }", RunJSExercise},
		{"Rust", Exercise{ID: "rust-checkpoint-smallest", Runner: "smallest", Image: officialRustCheckpointImage}, "use std::collections::HashMap;\npub fn smallest(map: HashMap<&str, i32>) -> i32 { map.values().copied().min().unwrap_or(i32::MAX) }", RunRustExercise},
		{"Java", Exercise{ID: "java-goodbye-mars", Runner: "GoodbyeMars", Image: officialJavaModuleImage, ExpectedFiles: []string{"GoodbyeMars.java"}}, javaE2ESolutions["goodbye-mars"], RunJavaExercise},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rootDir = root
			ok, out := tc.run(tc.ex, tc.code)
			if !ok {
				t.Fatal(out)
			}
		})
	}
}

func TestRunnerRejectsCataloguePathTraversal(t *testing.T) {
	for _, ex := range []Exercise{
		{ID: "safe", Runner: "../../escape"},
		{ID: "safe", ExpectedFiles: []string{"../escape.go"}},
		{ID: "safe", ExpectedFiles: []string{"/escape.go"}},
		{ID: "safe", ExpectedFiles: []string{"src/../../escape.go"}},
		{ID: "safe", ExpectedFiles: []string{`C:\escape.go`}},
	} {
		if err := validateRunnerExercise(ex); err == nil {
			t.Fatalf("unsafe catalogue accepted: %#v", ex)
		}
	}
	if err := validateRunnerExercise(Exercise{ID: "rust-checkpoint-safe", Runner: "safe", ExpectedFiles: []string{"src/lib.rs"}}); err != nil {
		t.Fatal(err)
	}
}
