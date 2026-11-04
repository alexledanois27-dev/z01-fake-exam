package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalTempDirDefaultsAndCleanup(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TMPDIR", "")
	t.Setenv("APP_ENV", "development")
	getHome := func() (string, error) { return home, nil }
	if err := configureLocalTempDir("linux", getHome); err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(home, "z01-exam-tmp")
	if os.Getenv("TMPDIR") != dir {
		t.Fatalf("TMPDIR = %q", os.Getenv("TMPDIR"))
	}
	info, err := os.Stat(dir)
	if err != nil || info.Mode().Perm() != 0700 {
		t.Fatalf("private directory: %v, %v", info, err)
	}
	for _, prefix := range []string{"manual-example-", "goexam-", "jsexam-", "rustexam-", "javaexam-"} {
		work, err := os.MkdirTemp("", prefix)
		if err != nil {
			t.Fatal(err)
		}
		if filepath.Dir(work) != dir {
			t.Fatalf("temporary submission outside configured directory: %s", work)
		}
		if err := os.RemoveAll(work); err != nil {
			t.Fatal(err)
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 0 {
		t.Fatalf("temporary submissions remain: %v, %v", entries, err)
	}
	// Reuse the existing parent on the next launch.
	t.Setenv("TMPDIR", "")
	if err := configureLocalTempDir("linux", getHome); err != nil {
		t.Fatal(err)
	}
}

func TestLocalTempDirPreservesExplicitAndProductionSettings(t *testing.T) {
	for _, tc := range []struct{ goos, env, tmp string }{
		{"linux", "development", "/configured/shared/path"},
		{"linux", "production", ""},
		{"darwin", "development", ""},
		{"windows", "development", ""},
	} {
		t.Run(tc.goos+tc.env+tc.tmp, func(t *testing.T) {
			t.Setenv("APP_ENV", tc.env)
			t.Setenv("TMPDIR", tc.tmp)
			err := configureLocalTempDir(tc.goos, func() (string, error) { t.Fatal("home must not be consulted"); return "", nil })
			if err != nil || os.Getenv("TMPDIR") != tc.tmp {
				t.Fatalf("configuration changed: %v", err)
			}
		})
	}
}

func TestLocalTempDirRejectsUnsafePaths(t *testing.T) {
	for _, kind := range []string{"file", "symlink", "writable"} {
		t.Run(kind, func(t *testing.T) {
			home := t.TempDir()
			dir := filepath.Join(home, "z01-exam-tmp")
			var err error
			switch kind {
			case "file":
				err = os.WriteFile(dir, []byte("preserve"), 0600)
			case "symlink":
				err = os.Symlink(t.TempDir(), dir)
			case "writable":
				err = os.Mkdir(dir, 0700)
				if err == nil {
					err = os.Chmod(dir, 0777)
				}
			}
			if err != nil {
				t.Fatal(err)
			}
			t.Setenv("TMPDIR", "")
			t.Setenv("APP_ENV", "development")
			if err := configureLocalTempDir("linux", func() (string, error) { return home, nil }); err == nil {
				t.Fatal("unsafe parent accepted")
			}
			if os.Getenv("TMPDIR") != "" {
				t.Fatal("TMPDIR modified after failure")
			}
		})
	}
	t.Setenv("TMPDIR", "")
	t.Setenv("APP_ENV", "development")
	if err := configureLocalTempDir("linux", func() (string, error) { return "", errors.New("no home") }); err == nil {
		t.Fatal("missing home accepted")
	}
}
