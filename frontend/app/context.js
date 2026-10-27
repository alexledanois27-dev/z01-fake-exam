const chipsContainer = document.getElementById("exercise-chips");
const levelFiltersEl = document.getElementById("level-filters");
const examTitleEl = document.getElementById("exam-title");

const statementEl = document.getElementById("exercise-content");
const modeExamEl = document.getElementById("mode-exam");
const modeTrueExamEl = document.getElementById("mode-true-exam");
const modeLearningEl = document.getElementById("mode-learning");
const modeInputs = Array.from(
  document.querySelectorAll('input[name="app-mode"]'),
);
const modeSwitchEl = document.querySelector(".mode-switch");
const trackInputs = Array.from(
  document.querySelectorAll('input[name="track-mode"]'),
);
const trackSwitchEl = document.querySelector(".track-switch");
const editorTabLabelEl = document.getElementById("editor-tab-label");
const trueExamNextBtn = document.getElementById("true-exam-next");
const trueExamRestartBtn = document.getElementById("true-exam-restart");
const trueExamStatusEl = document.getElementById("true-exam-status");
const learningContentEl = document.getElementById("learning-content");
const learningLessonsEl = document.getElementById("learning-lessons");
const appEl = document.getElementById("app");

const codeEditorEl = document.getElementById("code-editor");
const outputEl = document.getElementById("output");
const searchEl = document.getElementById("exercise-search");
let exerciseQuery = "";

const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const clearBtn = document.getElementById("clear-console");

// CodeMirror is served locally. The textarea remains a usable fallback.
const codeWorkspace =
  typeof CodeWorkspace !== "undefined"
    ? CodeWorkspace.create({
        parent: document.getElementById("code-workspace"),
        onChange(code) {
          codeEditorEl.value = code;
          codeEditorEl.dispatchEvent(new Event("input", { bubbles: true }));
        },
        onPosition(position) {
          document.getElementById("editor-position").textContent =
            `Ln ${position.line}, Col ${position.column}`;
        },
        onRun: () => runCode(),
      })
    : null;
if (codeWorkspace) codeEditorEl.classList.add("cm-backed");
else {
  document.getElementById("code-workspace").hidden = true;
  document.querySelector(".editor-engine").textContent = "Éditeur de secours";
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlightGo(code) {
  return escapeHtml(code);
}
function updateHighlight() {
  if (codeWorkspace) {
    const key = editorIdentity
      ? JSON.stringify([
          editorIdentity.track,
          editorIdentity.scope || "training",
          editorIdentity.id,
        ])
      : "empty";
    codeWorkspace.setDocument(codeEditorEl.value, key, currentTrack);
  }
}
function renderRunState(state) {
  const label = document.getElementById("run-status");
  label.dataset.state = state;
  label.textContent = {
    ready: "Prêt",
    running: "Tests en cours",
    success: "Réussi",
    error: "À revoir",
  }[state];
  outputEl.dataset.state = state;
  const labelText = trueExamMode ? "Soumettre l’exercice" : "Exécuter";
  runBtn.innerHTML =
    state === "running"
      ? "Tests en cours…"
      : `<span aria-hidden="true">▷</span> ${labelText}${trueExamMode ? "" : " <kbd>Ctrl ↵</kbd>"}`;
}

let exercises = [];
let jsExercises = [];
let rustExercises = [];
let javaExercises = [];
let currentExercise = null;
let learningMode = false;
let currentLevelFilter = "all";
let trueExamMode = false;
let trueExamSeries = [];
let trueExamIndex = -1;
let previousLevelFilter = "all";
let currentTrack = "go";
let examKind = "free";
let currentExam = null;
let pendingRun = null;
let finishingExam = null;
const examRepo = ExamSessions.create();
