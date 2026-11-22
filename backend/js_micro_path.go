package backend

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var errMicroNotFound = errors.New("petit exercice inconnu")
var microIdentifier = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

type jsMicroTest struct {
	Label        string          `json:"label"`
	Invoke       string          `json:"invoke"`
	ExpectedText string          `json:"expectedText"`
	Args         json.RawMessage `json:"args"`
	Expected     json.RawMessage `json:"expected"`
	Calls        json.RawMessage `json:"calls"`
}
type jsMicroLesson struct {
	ID       string        `json:"id"`
	Track    string        `json:"-"`
	Target   string        `json:"target"`
	Solution string        `json:"solution"`
	Tests    []jsMicroTest `json:"tests"`
}
type jsMicroCurriculum struct {
	Modules []struct {
		Lessons []jsMicroLesson `json:"lessons"`
	} `json:"modules"`
}
type jsMicroCheck struct {
	Label    string `json:"label"`
	Expected string `json:"expected"`
	Actual   string `json:"actual"`
	Passed   bool   `json:"passed"`
	Error    string `json:"error,omitempty"`
}
type jsMicroResult struct {
	Success bool           `json:"success"`
	Output  string         `json:"output"`
	Checks  []jsMicroCheck `json:"checks,omitempty"`
}

func readMicroCurriculum() (jsMicroCurriculum, error) { return readTrackCurriculum("js") }
func readTrackCurriculum(track string) (jsMicroCurriculum, error) {
	var curriculum jsMicroCurriculum
	switch track {
	case "go", "js", "rust", "java":
	default:
		return curriculum, errMicroNotFound
	}
	file, err := os.Open(filepath.Join(rootDir, "learning-content", track+"-micro-path", "curriculum.json"))
	if err != nil {
		return curriculum, err
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, (512<<10)+1))
	if err != nil || len(raw) > 512<<10 {
		return curriculum, fmt.Errorf("contenu pédagogique trop volumineux ou illisible")
	}
	if err = json.Unmarshal(raw, &curriculum); err != nil {
		return curriculum, err
	}
	for i := range curriculum.Modules {
		for j := range curriculum.Modules[i].Lessons {
			curriculum.Modules[i].Lessons[j].Track = track
		}
	}
	return curriculum, nil
}
func findMicroLesson(id string) (jsMicroLesson, error) {
	track, _, ok := strings.Cut(id, "-learn-")
	if !ok {
		return jsMicroLesson{}, errMicroNotFound
	}
	curriculum, err := readTrackCurriculum(track)
	if err != nil {
		return jsMicroLesson{}, err
	}
	for _, module := range curriculum.Modules {
		for _, lesson := range module.Lessons {
			if lesson.ID == id {
				if !microIdentifier.MatchString(lesson.Target) || len(lesson.Tests) == 0 || len(lesson.Tests) > 8 {
					return jsMicroLesson{}, fmt.Errorf("configuration pédagogique invalide")
				}
				return lesson, nil
			}
		}
	}
	return jsMicroLesson{}, errMicroNotFound
}
func microImage(lesson jsMicroLesson) string {
	track := lesson.Track
	if track == "" {
		track = "js"
	}
	return officialImage("module-" + track)
}

// Invocation expressions come only from maintained curriculum files, never from request fields.
func compiledMicroProgram(lesson jsMicroLesson, source string) (string, string, string) {
	var body strings.Builder
	switch lesson.Track {
	case "go":
		body.WriteString("package main\nimport (\"fmt\";\"strings\";\"sort\";\"strconv\")\nvar _=strings.Fields;var _=sort.Ints;var _=strconv.Itoa\n" + source + "\nfunc main(){\n")
		for i, test := range lesson.Tests {
			fmt.Fprintf(&body, "{actual:=fmt.Sprint(%s);fmt.Printf(\"\\n__Z01_CASE__%d|%%x\\n\",[]byte(actual))}\n", test.Invoke, i)
		}
		body.WriteString("}\n")
		return body.String(), "micro.go", "go run /workspace/micro.go"
	case "rust":
		body.WriteString(source + "\nfn main(){\n")
		for i, test := range lesson.Tests {
			fmt.Fprintf(&body, "{let actual=format!(\"{:?}\",%s);let hex:String=actual.as_bytes().iter().map(|b|format!(\"{:02x}\",b)).collect();println!(\"\\n__Z01_CASE__%d|{}\",hex);}\n", test.Invoke, i)
		}
		body.WriteString("}\n")
		return body.String(), "micro.rs", "rustc --edition=2024 /workspace/micro.rs -o /workspace/micro && exec /workspace/micro"
	case "java":
		body.WriteString("public class Lesson {\n" + source + "\npublic static void main(String[] args) {\n")
		for i, test := range lesson.Tests {
			fmt.Fprintf(&body, "{String actual=String.valueOf(%s);StringBuilder hex=new StringBuilder();for(byte b:actual.getBytes(java.nio.charset.StandardCharsets.UTF_8))hex.append(String.format(\"%%02x\",b&255));System.out.println(\"\\n__Z01_CASE__%d|\"+hex);}\n", test.Invoke, i)
		}
		body.WriteString("}}\n")
		return body.String(), "Lesson.java", "mkdir -p /workspace/build && javac -J-Xmx128m -d /workspace/build /workspace/Lesson.java && exec java -Xmx128m -cp /workspace/build Lesson"
	}
	return "", "", ""
}
func parseCompiledMicroOutput(lesson jsMicroLesson, raw string) (jsMicroResult, error) {
	values := map[int]string{}
	for _, line := range strings.Split(raw, "\n") {
		if !strings.HasPrefix(line, "__Z01_CASE__") {
			continue
		}
		index, value, ok := strings.Cut(strings.TrimPrefix(line, "__Z01_CASE__"), "|")
		if !ok {
			continue
		}
		i, err := strconv.Atoi(index)
		if err != nil || i < 0 || i >= len(lesson.Tests) {
			continue
		}
		bytes, err := hex.DecodeString(value)
		if err != nil || len(bytes) > 4096 {
			continue
		}
		values[i] = string(bytes)
	}
	if len(values) != len(lesson.Tests) {
		return jsMicroResult{}, fmt.Errorf("résultat pédagogique incomplet")
	}
	result := jsMicroResult{Success: true, Output: "Tous les cas de ce petit exercice sont réussis."}
	for i, test := range lesson.Tests {
		passed := values[i] == test.ExpectedText
		result.Success = result.Success && passed
		result.Checks = append(result.Checks, jsMicroCheck{Label: test.Label, Expected: test.ExpectedText, Actual: values[i], Passed: passed})
	}
	if !result.Success {
		result.Output = "Compare les résultats attendus et obtenus, puis reprends l’explication."
	}
	return result, nil
}

// Source is written to a file and executed ONLY by Node inside the existing
// hardened Docker runner. This is not a host-side JS sandbox or a client eval.
func microProgram(lesson jsMicroLesson, source string) string {
	tests, _ := json.Marshal(lesson.Tests)
	return `"use strict";
const _z01Equal = require("node:util").isDeepStrictEqual;
const _z01Callbacks = {
 double: x => x*2, increment: x => x+1, isEven: x => x%2===0,
 positive: x => x>0, ascending: (a,b) => a-b, descending: (a,b) => b-a
};
function _z01Revive(value) {
 if (Array.isArray(value)) return value.map(_z01Revive);
 if (value && typeof value === "object") {
  if (Object.keys(value).length===1 && Object.hasOwn(value,"$fn")) {
   if (!Object.hasOwn(_z01Callbacks,value.$fn)) throw Error("Callback pédagogique inconnu");
   return _z01Callbacks[value.$fn];
  }
  if (Object.keys(value).length===1 && value.$undefined===true) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,_z01Revive(item)]));
 }
 return value;
}
function _z01Copy(value) {
 if (Array.isArray(value)) return value.map(_z01Copy);
 if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,_z01Copy(item)]));
 return value;
}
function _z01Format(value) {
 if (value===undefined) return "undefined";
 if (typeof value==="function") return "[fonction]";
 try { const text=JSON.stringify(value); return String(text).slice(0,1200); }
 catch { return "[valeur non sérialisable]"; }
}
const _z01Student = (() => {
` + source + `
return typeof ` + lesson.Target + ` === "function" ? ` + lesson.Target + ` : null;
})();
const _z01Tests = ` + string(tests) + `;
(async () => {
const _z01Checks = await Promise.all(_z01Tests.map(async test => {
 const expected = _z01Revive(test.expected);
 const args = _z01Revive(test.args);
 const calls = _z01Revive(test.calls || []);
 const before = _z01Copy([args,calls]);
 try {
  if (!_z01Student) throw Error("La fonction ` + lesson.Target + ` est absente. Garde son nom et sa signature.");
  let actual = await _z01Student(...args);
  for (const nextArgs of calls) {
   if (typeof actual!=="function") throw Error("Cet appel devait renvoyer une fonction pour l’appel suivant.");
   actual=await actual(...nextArgs);
  }
  const unchanged = _z01Equal([args,calls],before);
  return {label:test.label,expected:_z01Format(expected),actual:_z01Format(actual),passed:unchanged && _z01Equal(actual,expected),error:unchanged ? "" : "Les arguments ont été modifiés : crée une copie avant de les transformer."};
 } catch(error) {
  return {label:test.label,expected:_z01Format(expected),actual:"aucun résultat",passed:false,error:String(error.message || error).slice(0,800)};
 }
}));
const _z01Success = _z01Checks.every(check=>check.passed);
process.stdout.write("\n__Z01_MICRO_RESULT__"+JSON.stringify({success:_z01Success,output:_z01Success ? "Tous les cas de ce petit exercice sont réussis." : "Compare le résultat et les cas qui échouent, puis reprends l’explication.",checks:_z01Checks}));
})();
`
}

func parseMicroOutput(raw string) (jsMicroResult, error) {
	const marker = "\n__Z01_MICRO_RESULT__"
	at := strings.LastIndex(raw, marker)
	if at < 0 {
		return jsMicroResult{}, fmt.Errorf("résultat pédagogique absent")
	}
	var result jsMicroResult
	if err := json.Unmarshal([]byte(raw[at+len(marker):]), &result); err != nil {
		return result, err
	}
	if len(result.Checks) == 0 || len(result.Checks) > 8 {
		return result, fmt.Errorf("résultat pédagogique invalide")
	}
	return result, nil
}

func runMicroLesson(lesson jsMicroLesson, source string) (jsMicroResult, error) {
	dir, err := os.MkdirTemp("", "jsmicro-*")
	if err != nil {
		return jsMicroResult{}, err
	}
	defer os.RemoveAll(dir)
	if err := os.Chmod(dir, 0755); err != nil {
		return jsMicroResult{}, err
	}
	program, file, script := compiledMicroProgram(lesson, source)
	if lesson.Track == "js" || lesson.Track == "" {
		program = microProgram(lesson, source)
		file = "micro.js"
		script = "exec node /workspace/micro.js"
	}
	if err := os.WriteFile(filepath.Join(dir, file), []byte(program), 0644); err != nil {
		return jsMicroResult{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), runTimeout())
	defer cancel()
	args := append([]string{"run", "--rm", "--platform", "linux/amd64"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	args = append(args, "--entrypoint", "sh", "-w", "/workspace", "-v", dir+":/workspace:rw", microImage(lesson), "-c", "set -e\n"+script)
	cmd := dockerRunCommand(ctx, args)
	var stdout, stderr limitedOutput
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	err = cmd.Run()
	if ctx.Err() != nil {
		return jsMicroResult{Output: "Temps limite dépassé : vérifie la condition et la mise à jour de tes boucles."}, nil
	}
	if err != nil {
		var exit *exec.ExitError
		if !errors.As(err, &exit) || exit.ExitCode() == 125 || exit.ExitCode() == 126 || exit.ExitCode() == 127 {
			return jsMicroResult{}, fmt.Errorf("exécution Docker indisponible : %s", strings.TrimSpace(stderr.String()))
		}
		return jsMicroResult{Output: "Erreur de compilation ou d’exécution :\n" + stderr.String()}, nil
	}
	var result jsMicroResult
	if lesson.Track == "js" || lesson.Track == "" {
		result, err = parseMicroOutput(stdout.String())
	} else {
		result, err = parseCompiledMicroOutput(lesson, stdout.String())
	}
	if err != nil {
		return jsMicroResult{Output: "Le programme s’est arrêté avant les tests ou produit trop de sortie. Garde la fonction demandée et retire les affichages excessifs."}, nil
	}
	return result, nil
}
