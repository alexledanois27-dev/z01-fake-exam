package backend

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRustJavaImportOfficialGroupAndCheckpoint(t *testing.T) {
	for _, track := range []string{"rust", "java"} {
		t.Run(track, func(t *testing.T) {
			exams := rustExams
			if track == "java" {
				exams = javaExams
			}
			root := zoneRustNode{Children: map[string]zoneRustNode{}}
			for _, exam := range exams {
				root.Children[exam.path] = zoneRustNode{Path: exam.path, Children: map[string]zoneRustNode{
					"first":   {Type: "exercise", Key: zoneCheckpoint(exam) + "-first", Name: "First", Attrs: zoneRustAttrs{Group: 2}},
					"unknown": {Type: "exercise", Key: zoneCheckpoint(exam) + "-unknown", Name: "Unknown"},
				}}
			}
			zoneCatalogMu.Lock()
			old := zoneCatalogCache
			zoneCatalogCache = &root
			zoneCatalogMu.Unlock()
			t.Cleanup(func() { zoneCatalogMu.Lock(); zoneCatalogCache = old; zoneCatalogMu.Unlock() })
			// Empty subjects avoid network requests; metadata is independent of statement availability.
			list, err := LoadRustExercises()
			if track == "java" {
				list, err = LoadJavaExercises()
			}
			if err != nil || len(list) != 2*len(exams) {
				t.Fatal(err, len(list))
			}
			for _, exercise := range list {
				want := 0
				if strings.HasSuffix(exercise.ID, "first") {
					want = 2
				}
				if exercise.Level != want || exercise.Checkpoint == "" {
					t.Fatalf("lost metadata: %+v", exercise)
				}
			}
			bytes, err := json.Marshal(runnerExercises(list))
			if err != nil {
				t.Fatal(err)
			}
			var decoded []RunnerExercise
			if err = json.Unmarshal(bytes, &decoded); err != nil {
				t.Fatal(err)
			}
			restored := catalogExercises(decoded)
			for i, exercise := range list {
				if exercise.Level != restored[i].Level || exercise.Checkpoint != restored[i].Checkpoint {
					t.Fatal("runner snapshot lost checkpoint or group")
				}
			}
		})
	}
}

func TestBundledRustJavaGroupsAreComplete(t *testing.T) {
	useMicroRoot(t)
	for _, track := range []string{"rust", "java"} {
		list, _, err := readCatalogBackup(track)
		if err != nil {
			t.Fatal(err)
		}
		counts := map[string]map[int]int{}
		for _, exercise := range list {
			if exercise.Level < 1 || exercise.Checkpoint == "" {
				t.Fatalf("missing official metadata: %+v", exercise)
			}
			if counts[exercise.Checkpoint] == nil {
				counts[exercise.Checkpoint] = map[int]int{}
			}
			counts[exercise.Checkpoint][exercise.Level]++
		}
		if track == "rust" {
			if len(list) != 38 || len(counts["final-checkpoint-rust"]) != 10 {
				t.Fatal(counts)
			}
		} else {
			if len(list) != 45 || len(counts) != 3 {
				t.Fatal(counts)
			}
			for _, checkpoint := range []string{"checkpoint-01-java", "checkpoint-02-java", "checkpoint-03-java"} {
				for level := 1; level <= 5; level++ {
					if counts[checkpoint][level] != 3 {
						t.Fatalf("%s N%d: %+v", checkpoint, level, counts)
					}
				}
			}
		}
	}
}
