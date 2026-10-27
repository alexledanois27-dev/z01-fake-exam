package backend

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Moulinettes Go : module-go pour les exercices du CDA ; test-go reste l'image
// par défaut d'un exercice sans image (RUNNER_GO_DOCKER_IMAGE).
var (
	officialGoRunnerImage = officialImage("test-go")
	officialGoModuleImage = officialImage("module-go")
)

// RunExercise evaluates code with the same public test image as the Go Final
// Exam. The image owns the test suite; this repository only prepares the
// student workspace that its entrypoint expects at /go-tests/student.
func RunExercise(ex Exercise, code string) (bool, string) {
	if err := validateRunnerExercise(ex); err != nil {
		return false, err.Error()
	}
	if err := validateGoPackage(ex, code); err != nil {
		return false, err.Error()
	}
	studentDir, err := os.MkdirTemp("", "goexam-*")
	if err != nil {
		return false, "Erreur système: " + err.Error()
	}
	defer os.RemoveAll(studentDir)
	_ = os.Chmod(studentDir, 0o755)

	// La moulinette cherche le programme dans student/<exercice>/ : le nom
	// officiel (Runner).
	exerciseID := strings.TrimSpace(ex.Runner)
	if exerciseID == "" {
		exerciseID = ex.ID
	}
	image := goImageFor(ex)
	if strings.Contains(image, "/module-go") && ex.AllowedFunctions == nil {
		return false, "Correction indisponible : les fonctions autorisées manquent dans le catalogue."
	}
	var file string
	var errPrepare error
	if len(ex.ExpectedFiles) > 0 || ex.AllowedFunctions != nil {
		file, errPrepare = prepareRestrictedGoStudentDir(studentDir, ex, code)
	} else {
		errPrepare = prepareOfficialGoStudentDir(studentDir, exerciseID, code)
	}
	if errPrepare != nil {
		return false, "Erreur de préparation du code: " + errPrepare.Error()
	}
	if ex.AllowedFunctions != nil {
		source, err := os.ReadFile(filepath.Join(studentDir, file))
		if err != nil {
			return false, "Erreur de lecture du code : " + err.Error()
		}
		if err := checkGoAllowedAccess(file, string(source), ex.AllowedFunctions); err != nil {
			return false, err.Error()
		}
	}
	stdout, stderr, runErr := runOfficialGoDocker(image, studentDir, exerciseID, file, ex.AllowedFunctions)
	out := strings.TrimSpace(stdout + "\n" + stderr)

	if runErr != nil {
		if out == "" {
			return false, "Échec moulinette Go officielle: " + runErr.Error()
		}
		return false, out
	}
	if out == "" {
		return true, "OK: tous les tests sont validés."
	}
	return true, out
}

func prepareOfficialGoStudentDir(studentDir, exerciseID, code string) error {
	module := `module student

go 1.18

require github.com/01-edu/z01 v0.1.0
`
	if err := os.WriteFile(filepath.Join(studentDir, "go.mod"), []byte(module), 0o644); err != nil {
		return fmt.Errorf("création go.mod: %w", err)
	}

	// The browser editor may submit its last line without a trailing newline.
	// Materialize it as a normal Go source file so the official gofumpt check
	// evaluates formatting, not the transport artifact.
	code = ensureTrailingNewline(code)

	functionSource := RewritePackage(code, "student")
	if err := os.WriteFile(filepath.Join(studentDir, "student.go"), []byte(functionSource), 0o644); err != nil {
		return fmt.Errorf("création student.go: %w", err)
	}

	programDir := filepath.Join(studentDir, filepath.Base(exerciseID))
	if err := os.MkdirAll(programDir, 0o755); err != nil {
		return fmt.Errorf("création dossier exercice: %w", err)
	}
	programSource := RewritePackage(code, "main")
	if err := os.WriteFile(filepath.Join(programDir, "main.go"), []byte(programSource), 0o644); err != nil {
		return fmt.Errorf("création main.go: %w", err)
	}
	return nil
}

func ensureTrailingNewline(code string) string {
	if strings.HasSuffix(code, "\n") {
		return code
	}
	return code + "\n"
}

func RunOfficialGoDocker(image, studentDir, exerciseID string) (string, string, error) {
	return runOfficialGoDocker(image, studentDir, exerciseID, "", nil)
}

func runOfficialGoDocker(image, studentDir, exerciseID, file string, allowed []string) (string, string, error) {
	timeout := runTimeout()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	args := officialGoDockerArgsFor(image, studentDir, exerciseID)
	if allowed != nil {
		args = append(args[:len(args)-1], "-e", "FILE="+file, "-e", "ALLOWED_FUNCTIONS="+strings.Join(allowed, " "), image)
	}

	cmd := dockerRunCommand(ctx, args)
	var stdout, stderr limitedOutput
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if ctx.Err() == context.DeadlineExceeded {
		return stdout.String(), stderr.String(), context.DeadlineExceeded
	}
	return stdout.String(), stderr.String(), err
}

func officialGoDockerArgs(studentDir, exerciseID string) []string {
	return officialGoDockerArgsFor(goRunnerImage(), studentDir, exerciseID)
}

// officialGoDockerArgsFor monte le code de l'élève là où l'image l'attend :
// /go-tests/student pour test-go, /test-go/student pour module-go.
func officialGoDockerArgsFor(image, studentDir, exerciseID string) []string {
	workdir := "/go-tests"
	if strings.Contains(image, "/module-go") {
		workdir = "/test-go"
	}
	args := []string{"run", "--rm", "--platform", "linux/amd64"}
	args = append(args, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	return append(args,
		"-v", studentDir+":"+workdir+"/student:rw",
		// The official test module resolves `student` as ../piscine-go
		// after copying itself into root's home directory.
		"-v", studentDir+":/root/piscine-go:rw",
		"-e", "EXERCISE="+filepath.Base(exerciseID),
		image,
	)
}

// goImageFor choisit la moulinette d'un exercice Go. RUNNER_GO_DOCKER_IMAGE
// ne remplace que celle des examens de la Piscine.
func goImageFor(ex Exercise) string {
	image := pinnedImage(ex.Image)
	if image == "" || strings.Contains(image, "/test-go") {
		return goRunnerImage()
	}
	return image
}

func goRunnerImage() string {
	return getenvDefault("RUNNER_GO_DOCKER_IMAGE", officialGoRunnerImage)
}
