package backend

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestRevisionSnippetsIntegration(t *testing.T) {
	if os.Getenv("RUN_REVISION_SNIPPETS_INTEGRATION") != "1" {
		t.Skip("opt-in Rust/Java lesson checks")
	}
	for _, track := range []string{"rust", "java"} {
		t.Run(track, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.Chmod(dir, 0755); err != nil {
				t.Fatal(err)
			}
			entries, err := os.ReadDir(filepath.Join("..", "learning-content", track))
			if err != nil {
				t.Fatal(err)
			}
			count := 0
			for _, entry := range entries {
				md, err := os.ReadFile(filepath.Join("..", "learning-content", track, entry.Name()))
				if err != nil {
					t.Fatal(err)
				}
				for _, match := range goFence.FindAllStringSubmatch(string(md), -1) {
					if strings.TrimSpace(match[1]) != track {
						continue
					}
					count++
					folder := filepath.Join(dir, fmt.Sprint(count))
					if err = os.MkdirAll(folder, 0755); err != nil {
						t.Fatal(err)
					}
					name := "main.rs"
					if track == "java" {
						name = "Demo.java"
					}
					if err = os.WriteFile(filepath.Join(folder, name), []byte(match[2]), 0644); err != nil {
						t.Fatal(err)
					}
				}
			}
			if (track == "rust" && count != 12) || (track == "java" && count != 13) {
				t.Fatalf("unexpected snippets: %d", count)
			}
			script := "set -eu\nfor file in /workspace/*/main.rs; do rustc --edition=2024 \"$file\" -o /workspace/check; /workspace/check; done\nprintf 'snippets OK'"
			image := officialImage("module-rust")
			if track == "java" {
				image = officialImage("module-java")
				script = "set -eu\nfor file in /workspace/*/Demo.java; do rm -rf /workspace/build; mkdir /workspace/build; javac -J-Xmx128m -d /workspace/build \"$file\"; java -Xmx128m -ea -cp /workspace/build Demo; done\nprintf 'snippets OK'"
			}
			args := append([]string{"run", "--rm"}, baseDockerRunArgs("")...)
			args = withOptionalCPULimit(args)
			args = append(args, "-v", dir+":/workspace:rw", "-w", "/workspace", "--entrypoint", "sh", image, "-c", script)
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()
			out, err := dockerRunCommand(ctx, args).CombinedOutput()
			if err != nil || !strings.Contains(string(out), "snippets OK") {
				t.Fatalf("%v: %s", err, out)
			}
		})
	}
}
