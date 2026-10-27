package backend

import (
	"os"
	"strings"
	"testing"
)

func TestLanguageExamplesPreferUsage(t *testing.T) {
	for _, tc := range []struct{ track, language, source string }{
		{"js", "js", "console.log(twice(3));"},
		{"rust", "rust", "use demo::*;\nfn main(){println!(\"{}\",twice(3));}"},
		{"java", "java", "public class ExerciseRunner {public static void main(String[] args){System.out.println(Twice.twice(3));}}"},
	} {
		statement := "### Expected\n```" + tc.language + "\nstub\n```\n### Usage\n```" + tc.language + "\n" + tc.source + "\n```\n"
		if got := LanguageExample(tc.track, statement); !strings.Contains(got, tc.source) {
			t.Errorf("%s: %q", tc.track, got)
		}
	}
}

func TestManualExampleValidatesInputsBeforeDocker(t *testing.T) {
	if ok, _ := RunManualExample("go", Exercise{}, RunRequest{TestMode: "unsafe"}); ok {
		t.Fatal("invalid mode accepted")
	}
	if ok, _ := RunManualExample("js", Exercise{}, RunRequest{Args: make([]string, 65)}); ok {
		t.Fatal("too many args accepted")
	}
	if ok, _ := RunManualExample("js", Exercise{}, RunRequest{Stdin: strings.Repeat("a", 65537)}); ok {
		t.Fatal("unbounded stdin")
	}
}

func TestFourLanguageManualExamplesIntegration(t *testing.T) {
	if os.Getenv("RUN_MANUAL_EXAMPLE_INTEGRATION") != "1" {
		t.Skip("set RUN_MANUAL_EXAMPLE_INTEGRATION=1 for all four official images")
	}
	t.Setenv("RUNNER_TIMEOUT_SECONDS", "60")
	ptr := func(s string) *string { return &s }
	cases := []struct {
		name, track, code, program, want string
		direct                           bool
	}{
		{"go-program", "go", `package main
import ("fmt"; "os"; "io")
func main(){b,_:=io.ReadAll(os.Stdin);fmt.Print(os.Args[1]+"|"+os.Args[2]+"|"+string(b))}`, "", "hello world|$(echo BAD)|line\n", true},
		{"js-function", "js", `function twice(x){return x*2;}`, `console.log(twice(3));`, "6\n", false},
		{"js-esmodule", "js", `export function twice(x){return x*2;}`, `console.log(twice(3));`, "6\n", false},
		{"js-program", "js", `process.stdout.write(process.argv.slice(2).join('|')+'|'+require('fs').readFileSync(0,'utf8'));`, "", "hello world|$(echo BAD)|line\n", true},
		{"rust-function", "rust", `pub fn twice(x:i32)->i32{x*2}`, "use demo::*;\nfn main(){println!(\"{}\",twice(3));}", "6\n", false},
		{"rust-program", "rust", `use std::io::Read;
fn main(){let mut text=String::new();std::io::stdin().read_to_string(&mut text).unwrap();let args=std::env::args().skip(1).collect::<Vec<_>>().join("|");print!("{}|{}",args,text);}`, "", "hello world|$(echo BAD)|line\n", true},
		{"java-function", "java", `public class Twice {public static int twice(int x){return x*2;}}`, `public class ExerciseRunner {public static void main(String[] args){System.out.println(Twice.twice(3));}}`, "6\n", false},
		{"java-program", "java", `import java.nio.charset.StandardCharsets;
public class ExerciseRunner {public static void main(String[] args)throws Exception{System.out.print(String.join("|",args)+"|"+new String(System.in.readAllBytes(),StandardCharsets.UTF_8));}}`, "", "hello world|$(echo BAD)|line\n", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mode := "harness"
			if tc.direct {
				mode = "auto"
			}
			ex := Exercise{ID: "demo", Runner: "demo", ExpectedFiles: []string{"demo.go"}, Image: officialGoModuleImage, AllowedFunctions: []string{"fmt.*", "io.*", "os.*", "--allow-builtin"}}
			if tc.track == "go" && tc.direct {
				ex.ExpectedFiles = []string{"demo/main.go"}
			}
			if tc.track == "java" {
				ex.ExpectedFiles = []string{"Twice.java"}
			}
			req := RunRequest{Code: tc.code, Example: ptr(tc.program), TestMode: mode}
			if tc.direct {
				req.Args = []string{"hello world", "$(echo BAD)"}
				req.Stdin = "line\n"
			}
			ok, out := RunManualExample(tc.track, ex, req)
			if !ok || out != tc.want {
				t.Fatalf("got (%v,%q), expected %q", ok, out, tc.want)
			}
		})
	}
}
