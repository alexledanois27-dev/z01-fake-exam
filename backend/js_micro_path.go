package backend

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var errMicroNotFound = errors.New("petit exercice inconnu")
var microIdentifier = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

type jsMicroTest struct {
	Label    string          `json:"label"`
	Args     json.RawMessage `json:"args"`
	Expected json.RawMessage `json:"expected"`
	Calls    json.RawMessage `json:"calls"`
}
type jsMicroLesson struct {
	ID       string        `json:"id"`
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

func readMicroCurriculum() (jsMicroCurriculum, error) {
	var curriculum jsMicroCurriculum
	file, err := os.Open(filepath.Join(rootDir, "learning-content", "js-micro-path", "curriculum.json"))
	if err != nil {
		return curriculum, err
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, 512<<10+1))
	if err != nil || len(raw) > 512<<10 {
		return curriculum, fmt.Errorf("contenu pédagogique trop volumineux ou illisible")
	}
	err = json.Unmarshal(raw, &curriculum)
	return curriculum, err
}
func findMicroLesson(id string) (jsMicroLesson, error) {
	curriculum, err := readMicroCurriculum()
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
const _z01Checks = _z01Tests.map(test => {
 const expected = _z01Revive(test.expected);
 const args = _z01Revive(test.args);
 const calls = _z01Revive(test.calls || []);
 const before = _z01Copy([args,calls]);
 try {
  if (!_z01Student) throw Error("La fonction ` + lesson.Target + ` est absente. Garde son nom et sa signature.");
  let actual = _z01Student(...args);
  for (const nextArgs of calls) {
   if (typeof actual!=="function") throw Error("Cet appel devait renvoyer une fonction pour l’appel suivant.");
   actual=actual(...nextArgs);
  }
  const unchanged = _z01Equal([args,calls],before);
  return {label:test.label,expected:_z01Format(expected),actual:_z01Format(actual),passed:unchanged && _z01Equal(actual,expected),error:unchanged ? "" : "Les arguments ont été modifiés : crée une copie avant de les transformer."};
 } catch(error) {
  return {label:test.label,expected:_z01Format(expected),actual:"aucun résultat",passed:false,error:String(error.message || error).slice(0,800)};
 }
});
const _z01Success = _z01Checks.every(check=>check.passed);
process.stdout.write("\n__Z01_MICRO_RESULT__"+JSON.stringify({success:_z01Success,output:_z01Success ? "Tous les cas de ce petit exercice sont réussis." : "Compare le résultat et les cas qui échouent, puis reprends l’explication.",checks:_z01Checks}));
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
	if err := os.WriteFile(filepath.Join(dir, "micro.js"), []byte(microProgram(lesson, source)), 0644); err != nil {
		return jsMicroResult{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), runTimeout())
	defer cancel()
	args := append([]string{"run", "--rm", "--platform", "linux/amd64"}, baseDockerRunArgs("")...)
	args = withOptionalCPULimit(args)
	args = append(args, "--entrypoint", "node", "-w", "/workspace", "-v", dir+":/workspace:rw", officialImage("module-js"), "/workspace/micro.js")
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
		return jsMicroResult{Output: "Erreur JavaScript :\n" + stderr.String()}, nil
	}
	result, err := parseMicroOutput(stdout.String())
	if err != nil {
		return jsMicroResult{Output: "Le programme s’est arrêté avant les tests ou produit trop de sortie. Garde la fonction demandée et retire les affichages excessifs."}, nil
	}
	return result, nil
}
