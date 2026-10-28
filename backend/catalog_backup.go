package backend

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type catalogSnapshot struct {
	Version   int              `json:"version"`
	Track     string           `json:"track"`
	SavedAt   string           `json:"savedAt"`
	Source    string           `json:"source"`
	Exercises []RunnerExercise `json:"exercises"`
}

func snapshotImage(track string) string {
	switch track {
	case "go":
		return officialImage("module-go")
	case "js":
		return officialImage("module-js")
	case "rust":
		return officialImage("module-rust")
	case "java":
		return officialImage("module-java")
	}
	return ""
}
func validateCatalogSnapshot(s catalogSnapshot, track string) error {
	if snapshotImage(track) == "" || s.Track != track || s.Version != 1 || s.Source != zoneCatalogURL || len(s.Exercises) == 0 || len(s.Exercises) > 1000 {
		return fmt.Errorf("snapshot %s invalide", track)
	}
	if _, err := time.Parse(time.RFC3339, s.SavedAt); err != nil {
		return fmt.Errorf("date du snapshot invalide")
	}
	seen := map[string]bool{}
	for _, ex := range catalogExercises(s.Exercises) {
		if err := validateRunnerExercise(ex); err != nil {
			return err
		}
		if seen[ex.ID] || strings.TrimSpace(ex.Statement) == "" || len(ex.ExpectedFiles) == 0 || ex.Image != snapshotImage(track) || (track == "go" && ex.AllowedFunctions == nil) {
			return fmt.Errorf("exercice de secours invalide : %s", ex.ID)
		}
		if !strings.HasPrefix(ex.SubjectURL, "/api/content/") && !strings.HasPrefix(ex.SubjectURL, "/markdown/") {
			return fmt.Errorf("source de secours invalide : %s", ex.ID)
		}
		seen[ex.ID] = true
	}
	return nil
}
func readCatalogBackup(track string) ([]Exercise, string, error) {
	if snapshotImage(track) == "" {
		return nil, "", fmt.Errorf("langage de secours inconnu")
	}
	file, err := os.Open(filepath.Join(rootDir, "catalog-snapshots", track+".json"))
	if err != nil {
		return nil, "", err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 16<<20))
	if err != nil {
		return nil, "", err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	var snapshot catalogSnapshot
	if err = decoder.Decode(&snapshot); err != nil {
		return nil, "", err
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		return nil, "", fmt.Errorf("snapshot JSON multiple ou tronqué")
	}
	if err = validateCatalogSnapshot(snapshot, track); err != nil {
		return nil, "", err
	}
	list := catalogExercises(snapshot.Exercises)
	for i := range list {
		list[i].StatementSource = "local"
		list[i].SnapshotDate = snapshot.SavedAt
	}
	return list, snapshot.SavedAt, nil
}
func loadCatalogBackup(track string, load func() ([]Exercise, error)) ([]Exercise, error) {
	backup, date, backupErr := readCatalogBackup(track)
	if os.Getenv("CATALOG_MODE") == "offline" {
		if backupErr != nil {
			return nil, fmt.Errorf("snapshot %s indisponible : %w", track, backupErr)
		}
		log.Printf("Catalogue %s : copie locale du %s (%d exercices)", track, date, len(backup))
		return backup, nil
	}
	list, err := load()
	if err != nil || len(list) == 0 {
		if backupErr == nil {
			log.Printf("Catalogue %s : API indisponible, copie locale du %s", track, date)
			return backup, nil
		}
		return list, fmt.Errorf("API %s : %v ; copie locale : %v", track, err, backupErr)
	}
	// Keep current API metadata when only a statement download fails.
	if backupErr == nil {
		byID := map[string]Exercise{}
		for _, ex := range backup {
			byID[ex.ID] = ex
		}
		for i, ex := range list {
			if ex.StatementSource == "zone01-api" {
				continue
			}
			if old, ok := byID[ex.ID]; ok && (ex.SubjectURL == old.SubjectURL || ex.SubjectURL == "") {
				if ex.SubjectURL == "" {
					list[i] = old
				} else {
					list[i].Statement = old.Statement
					list[i].Example = old.Example
					list[i].StatementSource = "local"
					list[i].SnapshotDate = date
				}
			}
		}
	}
	return list, nil
}

// ExportCatalogSnapshots refreshes the bundled public data only after every
// track has loaded completely from the live API. No submitted code is saved.
func ExportCatalogSnapshots(outputDir string) error {
	if err := initialize(serviceModeCatalog); err != nil {
		return err
	}
	sets := map[string][]Exercise{"go": exercises, "js": jsExercises, "rust": rustExercises, "java": javaExercises}
	data := map[string][]byte{}
	for track, list := range sets {
		for _, ex := range list {
			if ex.StatementSource != "zone01-api" {
				return fmt.Errorf("synchronisation refusée : %s/%s ne vient pas de l’API", track, ex.ID)
			}
		}
		s := catalogSnapshot{Version: 1, Track: track, SavedAt: time.Now().UTC().Format(time.RFC3339), Source: zoneCatalogURL, Exercises: runnerExercises(list)}
		if err := validateCatalogSnapshot(s, track); err != nil {
			return err
		}
		encoded, err := json.MarshalIndent(s, "", "  ")
		if err != nil {
			return err
		}
		data[track] = append(encoded, '\n')
	}
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return err
	}
	for track, encoded := range data {
		temp, err := os.CreateTemp(outputDir, ".snapshot-*")
		if err != nil {
			return err
		}
		name := temp.Name()
		if _, err = temp.Write(encoded); err != nil {
			temp.Close()
			os.Remove(name)
			return err
		}
		if err = temp.Close(); err != nil {
			os.Remove(name)
			return err
		}
		if err = os.Chmod(name, 0644); err != nil {
			os.Remove(name)
			return err
		}
		if err = os.Rename(name, filepath.Join(outputDir, track+".json")); err != nil {
			os.Remove(name)
			return err
		}
	}
	return nil
}
