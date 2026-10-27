package backend

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// LanguageExample selects a runnable snippet, preferably from the Usage section.
func LanguageExample(track, statement string) string {
	if track == "go" {
		return GoExample(statement)
	}
	body := statement
	if at := strings.Index(strings.ToLower(statement), "### usage"); at >= 0 {
		body = statement[at:]
	}
	for _, m := range goFence.FindAllStringSubmatch(body, -1) {
		lang := strings.ToLower(strings.TrimSpace(m[1]))
		code := strings.TrimSpace(m[2]) + "\n"
		switch track {
		case "js":
			if lang == "js" || lang == "javascript" {
				return code
			}
		case "rust":
			if (lang == "rust" || lang == "rs") && rustMain.MatchString(code) {
				return code
			}
		case "java":
			if lang == "java" && javaMain.MatchString(code) {
				return code
			}
		}
	}
	return ""
}

var rustMain = regexp.MustCompile(`\bfn\s+main\s*\(`)
var javaMain = regexp.MustCompile(`\bstatic\s+(?:final\s+)?void\s+main\s*\(`)
var safeCrate = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

func RunManualExample(track string, ex Exercise, req RunRequest) (bool, string) {
	if err := validateRunnerExercise(ex); err != nil {
		return false, err.Error()
	}
	if len(req.Args) > 64 || len(req.Stdin) > 64<<10 {
		return false, "Trop d’arguments ou entrée standard trop volumineuse."
	}
	for _, arg := range req.Args {
		if len(arg) > 4096 || strings.ContainsRune(arg, '\x00') {
			return false, "Argument de test invalide ou trop long."
		}
	}
	if req.TestMode != "" && req.TestMode != "auto" && req.TestMode != "program" && req.TestMode != "harness" {
		return false, "Mode de test inconnu."
	}
	example := LanguageExample(track, ex.Statement)
	if req.Example != nil {
		example = *req.Example
	}
	// Program previews need no harness. A function still needs a statement caller.
	directProgram := req.TestMode == "program"
	if req.TestMode == "auto" || req.TestMode == "" {
		switch track {
		case "go":
			directProgram = regexp.MustCompile(`\bfunc\s+main\s*\(`).MatchString(req.Code)
		case "rust":
			directProgram = rustMain.MatchString(req.Code)
		case "java":
			directProgram = javaMain.MatchString(req.Code)
		case "js":
			directProgram = strings.TrimSpace(example) == ""
		}
	}
	if req.Example == nil && strings.TrimSpace(example) == "" && !directProgram {
		return false, "Cette solution contient une fonction seule : aucun programme d’appel n’est fourni dans la consigne. Les Args ne peuvent pas appeler automatiquement cette fonction."
	}
	if len(example) > 128<<10 {
		return false, "Programme de test trop volumineux."
	}
	dir, err := os.MkdirTemp("", "manual-example-*")
	if err != nil {
		return false, err.Error()
	}
	defer os.RemoveAll(dir)
	if err := os.Chmod(dir, 0755); err != nil {
		return false, err.Error()
	}
	write := func(name, source string) error {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}
		return os.WriteFile(path, []byte(source), 0644)
	}
	direct := directProgram
	automatic := req.TestMode == "" || req.TestMode == "auto"
	var image, entry string
	var command []string
	env := []string{}
	switch track {
	case "go":
		if err := validateGoPackage(ex, req.Code); err != nil {
			return false, err.Error()
		}
		image = goImageFor(ex)
		entry = "go"
		if ex.AllowedFunctions == nil {
			return false, "Fonctions autorisées indisponibles dans le catalogue."
		}
		if automatic {
			direct = directProgram
		}
		pkg, file := "student", "solution.go"
		if direct {
			pkg, file = "main", "main.go"
		}
		source := ensureTrailingNewline(RewritePackage(req.Code, pkg))
		if err := checkGoAllowedAccess(file, source, ex.AllowedFunctions); err != nil {
			return false, err.Error()
		}
		if err := write("go.mod", "module student\n\ngo 1.18\n\nrequire github.com/01-edu/z01 v0.1.0\n"); err != nil {
			return false, err.Error()
		}
		if err := write(file, source); err != nil {
			return false, err.Error()
		}
		target := "."
		if !direct {
			if strings.TrimSpace(example) == "" {
				example = "package main\n\nfunc main() {\n // Ajoute ici un appel à ta fonction.\n}\n"
			}
			program, err := prepareGoExample(example, source)
			if err != nil {
				return false, err.Error()
			}
			if err := write("cmd/example/main.go", program); err != nil {
				return false, err.Error()
			}
			target = "./cmd/example"
		}
		env = []string{"-e", "GOPROXY=off", "-e", "GOSUMDB=off"}
		command = append([]string{"run", "-mod=mod", target}, req.Args...)
	case "js":
		image = jsRunnerImage()
		entry = "node"
		source := req.Code
		if !direct {
			source += "\n;\n" + example
		}
		filename := "example.js"
		if regexp.MustCompile(`(?m)^\s*(?:export|import)\s`).MatchString(source) {
			filename = "example.mjs"
		}
		if err := write(filename, source); err != nil {
			return false, err.Error()
		}
		command = append([]string{"/workspace/" + filename}, req.Args...)
	case "rust":
		image = officialRustCheckpointImage
		entry = "sh"
		if automatic {
			direct = rustMain.MatchString(req.Code)
		}
		crate := strings.ReplaceAll(ex.Runner, "-", "_")
		if crate == "" {
			crate = strings.ReplaceAll(strings.TrimPrefix(ex.ID, "rust-checkpoint-"), "-", "_")
		}
		if !safeCrate.MatchString(crate) {
			return false, "Nom de module Rust invalide."
		}
		if err := write("solution.rs", req.Code); err != nil {
			return false, err.Error()
		}
		script := "set -e\nrustc --edition=2024 /workspace/solution.rs -o /workspace/example\nexec /workspace/example \"$@\""
		if !direct {
			if strings.TrimSpace(example) == "" {
				example = "fn main() {\n // Ajoute ici un appel à ta fonction.\n}\n"
			}
			if err := write("main.rs", example); err != nil {
				return false, err.Error()
			}
			script = "set -e\nrustc --edition=2024 --crate-type lib --crate-name \"$EXAMPLE_CRATE\" /workspace/solution.rs -o /workspace/libstudent.rlib\nrustc --edition=2024 /workspace/main.rs --extern \"$EXAMPLE_CRATE=/workspace/libstudent.rlib\" -L /workspace -o /workspace/example\nexec /workspace/example \"$@\""
		}
		env = []string{"-e", "EXAMPLE_CRATE=" + crate}
		command = append([]string{"-c", script, "example"}, req.Args...)
	case "java":
		image = officialJavaModuleImage
		entry = "sh"
		fallback := ex.Runner + ".java"
		if len(ex.ExpectedFiles) > 0 {
			fallback = filepath.Base(ex.ExpectedFiles[0])
		}
		files := javaSourceFiles(req.Code, fallback)
		harnessClass := ""
		if automatic {
			direct = javaMain.MatchString(req.Code)
		}
		if !direct {
			if strings.TrimSpace(example) == "" {
				example = "public class ExampleMain {\n public static void main(String[] args) {\n  // Ajoute ici un appel à ta classe.\n }\n}\n"
			}
			harness := javaSourceFiles(example, "ExampleMain.java")
			for name, source := range harness {
				if javaMain.MatchString(source) {
					harnessClass = strings.TrimSuffix(name, ".java")
				}
				if _, exists := files[name]; exists {
					return false, "Le programme de test et ta solution déclarent le même fichier Java. Choisis le mode Programme seul ou change le nom de la classe de test."
				}
				files[name] = source
			}
		}
		names := make([]string, 0, len(files))
		for name := range files {
			names = append(names, name)
		}
		sort.Strings(names)
		mainClass := harnessClass
		for _, name := range names {
			if filepath.Base(name) != name || !strings.HasSuffix(name, ".java") {
				return false, "Nom de fichier Java invalide."
			}
			if err := write(name, files[name]); err != nil {
				return false, err.Error()
			}
			if harnessClass == "" && javaMain.MatchString(files[name]) {
				mainClass = strings.TrimSuffix(name, ".java")
			}
		}
		if mainClass == "" {
			return false, "Ajoute un programme de test avec public static void main(String[] args)."
		}
		env = []string{"-e", "EXAMPLE_MAIN=" + mainClass}
		command = append([]string{"-c", "set -e\nmkdir -p /workspace/build\njavac -J-Xmx128m -d /workspace/build /workspace/*.java\nexec java -Xmx128m -cp /workspace/build \"$EXAMPLE_MAIN\" \"$@\"", "example"}, req.Args...)
	default:
		return false, "Langage de test inconnu."
	}
	ctx, cancel := context.WithTimeout(context.Background(), runTimeout())
	defer cancel()
	args := append([]string{"run", "--rm", "-i", "--platform", "linux/amd64"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	args = append(args, "--entrypoint", entry, "-w", "/workspace", "-v", dir+":/workspace:rw")
	args = append(args, env...)
	args = append(args, image)
	args = append(args, command...)
	cmd := dockerRunCommand(ctx, args)
	cmd.Stdin = strings.NewReader(req.Stdin)
	var stdout, stderr limitedOutput
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	out := stdout.String() + stderr.String()
	if ctx.Err() == context.DeadlineExceeded {
		return false, "Temps limite dépassé pendant le test.\n" + out
	}
	if err != nil {
		if out == "" {
			out = fmt.Sprint(err)
		}
		return false, out
	}
	return true, out
}
