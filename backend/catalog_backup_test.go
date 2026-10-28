package backend

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func backupFixture() catalogSnapshot {
	return catalogSnapshot{Version: 1, Track: "go", SavedAt: time.Now().UTC().Format(time.RFC3339), Source: zoneCatalogURL, Exercises: runnerExercises([]Exercise{{ID: "only1", Runner: "only1", Statement: "official statement", Example: "example", Image: officialImage("module-go"), SubjectURL: "/api/content/root/01-edu_module/content/only1/README.md", ExpectedFiles: []string{"only1/main.go"}, AllowedFunctions: []string{"github.com/01-edu/z01.PrintRune"}}})}
}
func writeBackupFixture(t *testing.T) {
	t.Helper()
	old := rootDir
	rootDir = t.TempDir()
	t.Cleanup(func() { rootDir = old })
	dir := filepath.Join(rootDir, "catalog-snapshots")
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	data, _ := json.Marshal(backupFixture())
	if err := os.WriteFile(filepath.Join(dir, "go.json"), data, 0644); err != nil {
		t.Fatal(err)
	}
}
func TestCatalogBackupAutomaticAndPartialFallback(t *testing.T) {
	writeBackupFixture(t)
	t.Setenv("CATALOG_MODE", "auto")
	list, err := loadCatalogBackup("go", func() ([]Exercise, error) { return nil, errors.New("offline") })
	if err != nil || len(list) != 1 || list[0].StatementSource != "local" || list[0].Image != officialImage("module-go") || list[0].AllowedFunctions == nil {
		t.Fatalf("%+v %v", list, err)
	}
	list, err = loadCatalogBackup("go", func() ([]Exercise, error) {
		ex := catalogExercises(backupFixture().Exercises)[0]
		ex.Statement = "placeholder"
		ex.Example = ""
		return []Exercise{ex}, nil
	})
	if err != nil || list[0].Statement != "official statement" || list[0].Example != "example" || list[0].SnapshotDate == "" {
		t.Fatal("statement fallback failed")
	}
	list, err = loadCatalogBackup("go", func() ([]Exercise, error) {
		ex := catalogExercises(backupFixture().Exercises)[0]
		ex.Statement = "new official"
		ex.StatementSource = "zone01-api"
		return []Exercise{ex}, nil
	})
	if err != nil || list[0].Statement != "new official" {
		t.Fatal("snapshot replaced valid API")
	}
}
func TestCatalogBackupRefusesCorruptOrUnsafeData(t *testing.T) {
	for _, mutate := range []func(*catalogSnapshot){
		func(s *catalogSnapshot) { s.Version = 99 }, func(s *catalogSnapshot) { s.Track = "js" }, func(s *catalogSnapshot) { s.Exercises[0].Image = "attacker/image" }, func(s *catalogSnapshot) { s.Exercises[0].ExpectedFiles = []string{"../escape.go"} }, func(s *catalogSnapshot) { s.Exercises[0].AllowedFunctions = nil }, func(s *catalogSnapshot) { s.Exercises[0].Statement = "" },
	} {
		s := backupFixture()
		mutate(&s)
		if validateCatalogSnapshot(s, "go") == nil {
			t.Fatal("unsafe snapshot accepted")
		}
	}
	writeBackupFixture(t)
	if err := os.WriteFile(filepath.Join(rootDir, "catalog-snapshots", "go.json"), []byte(`{"version":1} {}`), 0644); err != nil {
		t.Fatal(err)
	}
	if _, _, err := readCatalogBackup("go"); err == nil {
		t.Fatal("multiple JSON accepted")
	}
}

type offlineTransport struct{ calls *int }

func (r offlineTransport) RoundTrip(*http.Request) (*http.Response, error) {
	*r.calls++
	return nil, errors.New("network disabled by test")
}
func TestAllCatalogsStartOfflineWithoutNetwork(t *testing.T) {
	oldRoot := rootDir
	rootDir, _ = filepath.Abs("..")
	defer func() { rootDir = oldRoot }()
	oldGo, oldJS, oldRust, oldJava, oldDir := exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir
	defer func() {
		exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir = oldGo, oldJS, oldRust, oldJava, oldDir
	}()
	t.Setenv("CATALOG_MODE", "offline")
	calls := 0
	oldClient := http.DefaultClient
	http.DefaultClient = &http.Client{Transport: offlineTransport{&calls}}
	defer func() { http.DefaultClient = oldClient }()
	if err := initializeCatalog(); err != nil {
		t.Fatal(err)
	}
	if calls != 0 {
		t.Fatal("offline mode called API")
	}
	for _, tc := range []struct {
		list  []Exercise
		count int
	}{{exercises, 61}, {jsExercises, 31}, {rustExercises, 38}, {javaExercises, 45}} {
		if len(tc.list) != tc.count {
			t.Fatal("missing offline exercises")
		}
		for _, ex := range tc.list {
			if ex.StatementSource != "local" || ex.Statement == "" || ex.SnapshotDate == "" {
				t.Fatal("offline exercise incomplete")
			}
		}
	}
	// Raw runner metadata is never served as a static snapshot.
	res := httptest.NewRecorder()
	handleStatic(res, httptest.NewRequest("GET", "/catalog-snapshots/go.json", nil))
	if res.Code != 404 {
		t.Fatal("snapshot exposed")
	}
}
func TestOfflineCatalogCorrectionIntegration(t *testing.T) {
	if os.Getenv("RUN_OFFLINE_CATALOG_INTEGRATION") != "1" {
		t.Skip("opt-in Docker checks from snapshots")
	}
	old := rootDir
	rootDir, _ = filepath.Abs("..")
	defer func() { rootDir = old }()
	t.Setenv("RUNNER_TIMEOUT_SECONDS", "60")
	for _, tc := range []struct {
		track, id, code string
		run             func(Exercise, string) (bool, string)
	}{
		{"go", "only1", "package main\n\nimport \"github.com/01-edu/z01\"\n\nfunc main() {\n\tz01.PrintRune('1')\n}\n", RunExercise},
		{"js", "factorial", "function factorial(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}", RunJSExercise},
		{"rust", "rust-checkpoint-smallest", "use std::collections::HashMap;\npub fn smallest(map:HashMap<&str,i32>)->i32{map.values().copied().min().unwrap_or(i32::MAX)}", RunRustExercise},
		{"java", "java-goodbye-mars", javaE2ESolutions["goodbye-mars"], RunJavaExercise},
	} {
		t.Run(tc.track, func(t *testing.T) {
			list, _, err := readCatalogBackup(tc.track)
			if err != nil {
				t.Fatal(err)
			}
			ex := FindExercise(list, tc.id)
			if ex == nil {
				t.Fatal("exercise missing")
			}
			if ok, out := tc.run(*ex, tc.code); !ok {
				t.Fatal(out)
			}
		})
	}
}
func TestAllCatalogsAutomaticallyUseBackupsWhenAPIFails(t *testing.T) {
	oldRoot := rootDir
	rootDir, _ = filepath.Abs("..")
	defer func() { rootDir = oldRoot }()
	oldGo, oldJS, oldRust, oldJava, oldDir := exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir
	defer func() {
		exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir = oldGo, oldJS, oldRust, oldJava, oldDir
	}()
	zoneCatalogMu.Lock()
	oldCache := zoneCatalogCache
	zoneCatalogCache = nil
	zoneCatalogMu.Unlock()
	defer func() { zoneCatalogMu.Lock(); zoneCatalogCache = oldCache; zoneCatalogMu.Unlock() }()
	t.Setenv("CATALOG_MODE", "auto")
	calls := 0
	oldClient := http.DefaultClient
	http.DefaultClient = &http.Client{Transport: offlineTransport{&calls}}
	defer func() { http.DefaultClient = oldClient }()
	if err := initializeCatalog(); err != nil {
		t.Fatal(err)
	}
	if calls == 0 {
		t.Fatal("auto mode did not try the API")
	}
	for _, tc := range []struct {
		list  []Exercise
		count int
	}{{exercises, 61}, {jsExercises, 31}, {rustExercises, 38}, {javaExercises, 45}} {
		if len(tc.list) != tc.count {
			t.Fatal("missing automatic fallback exercises")
		}
		for _, ex := range tc.list {
			if ex.StatementSource != "local" || ex.SnapshotDate == "" {
				t.Fatal("missing fallback provenance")
			}
		}
	}
	ex := FindExercise(jsExercises, "factorial")
	if ex == nil || ex.ExpectedFiles[0] != "factorial.js" {
		t.Fatal("official JS metadata not preserved")
	}
}
func TestSnapshotSyncDoesNotOverwriteCopiesWithFallbackData(t *testing.T) {
	oldRoot, oldGo, oldJS, oldRust, oldJava, oldDir := rootDir, exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir
	defer func() {
		rootDir, exercises, jsExercises, rustExercises, javaExercises, jsInstructionsDir = oldRoot, oldGo, oldJS, oldRust, oldJava, oldDir
	}()
	t.Setenv("CATALOG_MODE", "offline")
	dir := t.TempDir()
	file := filepath.Join(dir, "go.json")
	if err := os.WriteFile(file, []byte("original"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := ExportCatalogSnapshots(dir); err == nil {
		t.Fatal("sync accepted fallback instead of live data")
	}
	data, err := os.ReadFile(file)
	if err != nil || string(data) != "original" {
		t.Fatal("existing copy was changed")
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 1 {
		t.Fatal("failed sync wrote extra files")
	}
}
