package backend

import (
	"net/http"
	"path/filepath"
	"strings"
)

func handleStatic(w http.ResponseWriter, r *http.Request) {
	requested := strings.TrimPrefix(r.URL.Path, "/")
	if requested == "" {
		requested = "index.html"
	}
	allowed := map[string]bool{
		"assets/wrong-answer-office.gif":       true,
		"assets/wrong-answer-fine.gif":         true,
		"assets/wrong-answer-disappointed.gif": true,
		"assets/brute-force-result.png":        true,
		"assets/wrong-answer-homer.gif":        true,
		"assets/wrong-answer-math.gif":         true,
		"assets/wrong-answer-travolta.gif":     true,
		"assets/wrong-answer.gif":              true,
		"assets/z01-logo.png":                  true,
		"frontend/lib/training-hints.js":       true, "index.html": true, "app.js": true, "frontend/lib/personal-progress.js": true,
		"version.js": true, "style.css": true, "blank.css": true,
		"frontend/lib/exam-timer.js": true, "frontend/lib/timer-ui.js": true, "frontend/lib/exam-sessions.js": true,
	}
	// Only public assets and Markdown lessons are served, never the checkout.
	clean := filepath.ToSlash(filepath.Clean(requested))
	lesson := strings.HasPrefix(clean, "learning-content/") &&
		(strings.HasSuffix(clean, ".md") || clean == "learning-content/manifest.json")
	vendor := clean == "vendor/marked.min.js" || clean == "vendor/purify.min.js" || clean == "vendor/editor.bundle.js"
	if clean != requested || !(allowed[clean] || lesson || vendor) {
		http.NotFound(w, r)
		return
	}
	target := filepath.Join(rootDir, clean)
	// Reject symlinks escaping the public tree.
	real, err := filepath.EvalSymlinks(target)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	root, err := filepath.EvalSymlinks(rootDir)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	rel, err := filepath.Rel(root, real)
	if err != nil || filepath.ToSlash(rel) != clean || !FileExists(real) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeFile(w, r, real)
}
