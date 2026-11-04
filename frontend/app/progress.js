// Personal data stays in this browser, namespaced by language and exercise.
const personalStore = PersonalProgress.create(() => window.localStorage);
const attemptJournal = AttemptJournal.create(() => window.localStorage);
let personalReady = false;
let editorIdentity = null;
let trainingVisit = 0;
let submissionRunning = false;
const saveStatusEl = document.createElement("p");
saveStatusEl.className = "personal-status";
saveStatusEl.setAttribute("role", "status");
document
  .querySelector(".editor-status")
  .insertAdjacentElement("afterend", saveStatusEl);

function persistPersonal() {
  const saved = [
    personalStore.flush(),
    examRepo.flush(),
    attemptJournal.flush(),
  ].every(Boolean);
  saveStatusEl.textContent = saved
    ? "Enregistré dans ce navigateur · progression, examen et historique"
    : "Stockage indisponible : copie ton code avant de fermer cette page.";
}

function saveCurrentDraft() {
  if (!personalReady || !editorIdentity) return;
  if (editorIdentity.session) {
    examRepo.draft(
      editorIdentity.session,
      editorIdentity.id,
      codeEditorEl.value,
    );
    updateTrueExamControls();
  }
  persistPersonal();
}

function savePersonalSession() {
  if (!personalReady) return;
  const previous = personalStore.session(currentTrack) || {};
  const trainingSelected = trueExamMode
    ? previous.trainingSelected || previous.selected || null
    : currentExercise
      ? exId(currentExercise)
      : previous.trainingSelected || previous.selected || null;
  personalStore.session(currentTrack, {
    selected: trainingSelected,
    trainingSelected,
    mode: learningMode ? "learning" : trueExamMode ? "true-exam" : "exam",
    filter: currentLevelFilter,
    examKind,
  });
  persistPersonal();
}

codeEditorEl.addEventListener("input", saveCurrentDraft);
// Pair completion and indentation change value without firing an input event.
codeEditorEl.addEventListener("keydown", () =>
  queueMicrotask(saveCurrentDraft),
);
window.addEventListener("pagehide", saveCurrentDraft);
