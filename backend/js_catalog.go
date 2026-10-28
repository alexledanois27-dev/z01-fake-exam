package backend

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"sync"
)

var jsExams = []zoneExam{{path: "/rouen/cursus-cda/checkpoint-js", image: "ghcr.io/01-edu/module-js"}}

// Stable UI IDs preserve existing browser progress and pedagogical guide keys.
func jsSubjectIDForRunner(runner string) string {
	for _, id := range []string{"array-reverse-chunks", "grid-words-finder", "grid-words-finder-2", "snake-path-validator", "divisorfinder", "evensum", "perfectnum", "sentencepyramid"} {
		if jsTestIDForSubject(id) == runner {
			return id
		}
	}
	return runner
}

func LoadJSExercises(jsDir string) ([]Exercise, error) {
	local, localErr := LoadLocalJSExercises(jsDir)
	ctx, cancel := context.WithTimeout(context.Background(), runTimeout())
	defer cancel()
	return loadJSWithFallback(ctx, local, localErr, zoneCatalog, fetchZoneStatement)
}

func loadJSWithFallback(ctx context.Context, local []Exercise, localErr error, catalog func(context.Context) (zoneRustNode, error), fetch func(context.Context, string) (string, error)) ([]Exercise, error) {
	root, err := catalog(ctx)
	if err == nil {
		var remote []Exercise
		remote, err = loadAPIJSExercises(ctx, root, local, fetch)
		if err == nil {
			return remote, nil
		}
	}
	if len(local) > 0 {
		log.Printf("Catalogue JavaScript API indisponible, secours local (%d exercices) : %v", len(local), err)
		return local, nil
	}
	return nil, fmt.Errorf("catalogue JavaScript indisponible : API %v ; secours local %v", err, localErr)
}

func loadAPIJSExercises(ctx context.Context, root zoneRustNode, local []Exercise, fetch func(context.Context, string) (string, error)) ([]Exercise, error) {
	found := collectZoneExercises(root, jsExams)
	if len(found) == 0 {
		return nil, fmt.Errorf("checkpoint JavaScript absent ou vide")
	}
	byID := make(map[string]Exercise, len(local))
	for _, ex := range local {
		byID[ex.ID] = ex
	}
	list := make([]Exercise, 0, len(found))
	seen := map[string]bool{}
	for _, item := range found {
		runner := strings.TrimPrefix(item.node.Key, "js-")
		id := jsSubjectIDForRunner(runner)
		ex := Exercise{Level: item.node.Attrs.Group, ID: id, Title: runner, Runner: runner, Image: item.image, SubjectURL: item.node.Attrs.Subject, ExpectedFiles: item.node.Attrs.ExpectedFiles, AllowedFunctions: item.node.Attrs.AllowedFunctions, Template: "function solve(input) {\n  return input;\n}\n\nmodule.exports = { solve };\n", StatementSource: "zone01-api"}
		if old, ok := byID[id]; ok {
			ex.Title = old.Title
			ex.Template = old.Template
		}
		if err := validateRunnerExercise(ex); err != nil {
			return nil, err
		}
		if seen[id] || item.image != officialImage("module-js") || len(ex.ExpectedFiles) != 1 || filepath.Base(ex.ExpectedFiles[0]) != ex.ExpectedFiles[0] || !strings.HasSuffix(ex.ExpectedFiles[0], ".js") {
			return nil, fmt.Errorf("métadonnées JavaScript invalides pour %s", id)
		}
		if !strings.HasPrefix(ex.SubjectURL, "/api/content/") && !strings.HasPrefix(ex.SubjectURL, "/markdown/") {
			return nil, fmt.Errorf("énoncé JavaScript invalide pour %s", id)
		}
		seen[id] = true
		list = append(list, ex)
	}
	jobs := make(chan int)
	errs := make(chan error, len(list))
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				text, err := fetch(ctx, list[i].SubjectURL)
				if err != nil || strings.TrimSpace(text) == "" {
					old, ok := byID[list[i].ID]
					if !ok || strings.TrimSpace(old.Statement) == "" {
						errs <- fmt.Errorf("énoncé indisponible pour %s", list[i].ID)
						continue
					}
					log.Printf("Énoncé JS %s : secours local", list[i].ID)
					text = old.Statement
					list[i].StatementSource = "local"
				}
				list[i].Statement = text
				list[i].Example = LanguageExample("js", text)
			}
		}()
	}
	for i := range list {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	close(errs)
	for err := range errs {
		return nil, err
	}
	sortExercises(list)
	return list, nil
}
