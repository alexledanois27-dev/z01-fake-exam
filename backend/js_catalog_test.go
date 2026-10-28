package backend

import (
	"context"
	"errors"
	"os"
	"testing"
)

func jsCatalogFixture() zoneRustNode {
	return zoneRustNode{Path: jsExams[0].path, Children: map[string]zoneRustNode{
		"one": {Type: "exercise", Key: "js-array-chunk-reversal", Attrs: zoneRustAttrs{Group: 2, Subject: "/api/content/root/01-edu_module/content/js-array-chunk-reversal/README.md", ExpectedFiles: []string{"array-chunk-reversal.js"}}},
	}}
}
func TestJSAPIUsesOfficialMetadataAndStableIDs(t *testing.T) {
	local := []Exercise{{ID: "array-reverse-chunks", Title: "Array Reverse Chunks", Statement: "old", Template: "template"}}
	list, err := loadAPIJSExercises(context.Background(), jsCatalogFixture(), local, func(context.Context, string) (string, error) {
		return "## Official\n### Usage\n```js\nconsole.log(reverseChunks([1],1));\n```", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	ex := list[0]
	if ex.Level != 2 || len(list) != 1 || ex.ID != "array-reverse-chunks" || ex.Runner != "array-chunk-reversal" || ex.ExpectedFiles[0] != "array-chunk-reversal.js" || ex.StatementSource != "zone01-api" || ex.Example == "" || ex.Template != "template" {
		t.Fatalf("%+v", ex)
	}
}
func TestJSAPIFallbacks(t *testing.T) {
	local := []Exercise{{ID: "array-reverse-chunks", Statement: "local statement", StatementSource: "local"}}
	failure := func(context.Context, string) (string, error) { return "", errors.New("unavailable") }
	list, err := loadAPIJSExercises(context.Background(), jsCatalogFixture(), local, failure)
	if err != nil || list[0].Statement != "local statement" || list[0].StatementSource != "local" {
		t.Fatalf("%+v %v", list, err)
	}
	list, err = loadJSWithFallback(context.Background(), local, nil, func(context.Context) (zoneRustNode, error) { return zoneRustNode{}, errors.New("offline") }, failure)
	if err != nil || list[0].ID != local[0].ID {
		t.Fatal("offline fallback failed")
	}
	if _, err = loadJSWithFallback(context.Background(), nil, nil, func(context.Context) (zoneRustNode, error) { return zoneRustNode{}, errors.New("offline") }, failure); err == nil {
		t.Fatal("empty source accepted")
	}
	if _, err = loadAPIJSExercises(context.Background(), jsCatalogFixture(), nil, failure); err == nil {
		t.Fatal("missing statement accepted")
	}
}
func TestJSAPIRejectsUnsafeMetadata(t *testing.T) {
	root := jsCatalogFixture()
	node := root.Children["one"]
	node.Attrs.ExpectedFiles = []string{"../escape.js"}
	root.Children["one"] = node
	if _, err := loadAPIJSExercises(context.Background(), root, nil, func(context.Context, string) (string, error) { return "text", nil }); err == nil {
		t.Fatal("unsafe path accepted")
	}
}
func TestJSAPILiveIntegration(t *testing.T) {
	if os.Getenv("RUN_JS_CATALOG_INTEGRATION") != "1" {
		t.Skip("opt-in public API integration")
	}
	list, err := LoadJSExercises("../Js_exam_instructions")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 31 {
		t.Fatalf("expected 31 current exercises, got %d; check catalogue changes", len(list))
	}
	for _, ex := range list {
		if ex.StatementSource != "zone01-api" || ex.Statement == "" || ex.Level < 1 || ex.Level > 7 {
			t.Fatalf("fallback instead of live API: %s", ex.ID)
		}
	}
	ex := FindExercise(list, "factorial")
	if ex == nil {
		t.Fatal("lost stable factorial ID")
	}
	ok, out := RunJSExercise(*ex, "function factorial(n){let v=1;for(let i=2;i<=n;i++)v*=i;return v;}")
	if !ok {
		t.Fatal(out)
	}
}

func TestJSAPIMissingGroupDoesNotInventLevel(t *testing.T) {
	root := jsCatalogFixture()
	node := root.Children["one"]
	node.Attrs.Group = 0
	root.Children["one"] = node
	list, err := loadAPIJSExercises(context.Background(), root, nil, func(context.Context, string) (string, error) { return "statement", nil })
	if err != nil || len(list) != 1 || list[0].Level != 0 {
		t.Fatalf("%+v %v", list, err)
	}
}

func TestJSBackupRetainsOfficialGroups(t *testing.T) {
	oldRoot := rootDir
	rootDir = ".."
	t.Cleanup(func() { rootDir = oldRoot })
	list, _, err := readCatalogBackup("js")
	if err != nil {
		t.Fatal(err)
	}
	groups := map[int]int{}
	for _, ex := range list {
		groups[ex.Level]++
	}
	if len(list) != 31 || len(groups) != 7 {
		t.Fatalf("unexpected groups: %v", groups)
	}
	if ex := FindExercise(list, "factorial"); ex == nil || ex.Level != 1 {
		t.Fatalf("factorial: %+v", ex)
	}
	if ex := FindExercise(list, "array-reverse-chunks"); ex == nil || ex.Level != 2 {
		t.Fatalf("chunks: %+v", ex)
	}
}
