const sprintStore = CheckpointSprint.create({ plan: jsSprintPlan });
let sprintActive = null;
let sprintViewSequence = 0;
const sprintLabels = {
  new: "À découvrir",
  guided: "Réussi avec aide",
  independent: "Réussi sans aide",
  consolidated: "Confirmé à 24 h",
  review: "À revoir",
};
function sprintNode(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function sprintButton(text, action, className = "button button-subtle") {
  const button = sprintNode("button", text, className);
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}
function closeSprintDashboard() {
  sprintViewSequence++;
  destroyMicroEditor();
  const dialog = document.getElementById("js-sprint-dialog");
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  dialog.remove();
}
function syncSprintContext(exercise) {
  closeSprintDashboard();
  if (
    sprintActive &&
    (trueExamMode ||
      learningMode ||
      currentTrack !== "js" ||
      !exercise ||
      sprintActive.id !== exId(exercise) ||
      sprintActive.scope !== editorIdentity?.scope)
  )
    sprintActive = null;
  appEl.classList.toggle(
    "sprint-autonomous",
    !!sprintActive && !sprintActive.assisted,
  );
  document.getElementById("sprint-exercise-banner")?.remove();
  if (!sprintActive) return;
  const banner = sprintNode("section", undefined, "sprint-exercise-banner");
  banner.id = "sprint-exercise-banner";
  banner.setAttribute("aria-label", "Exercice du parcours JavaScript");
  const text = sprintNode("div");
  text.append(
    sprintNode(
      "strong",
      `Checkpoint JS · ${sprintActive.assisted ? "Entraînement guidé" : "Défi sans aide"}`,
    ),
  );
  text.append(
    sprintNode(
      "p",
      sprintActive.assisted
        ? "Utilise les fiches et les indices, puis refais l’exercice sans aide."
        : "Pars d’une page blanche. Les fiches, indices et anciens essais sont masqués pendant ce défi.",
    ),
  );
  banner.append(text, sprintButton("Parcours / aides ↗", openSprintDashboard));
  document.querySelector(".workspace-header").after(banner);
}
function startSprintExercise(id, assisted) {
  if (trueExamMode || examFocusLocked() || submissionRunning) return;
  const target = jsExercises.find((ex) => exId(ex) === id);
  if (!target) return;
  const plannedDay = jsSprintPlan.days.find((day) =>
    day.exercises.includes(id),
  );
  if (!plannedDay || target.level !== jsSprintPlan.levels[id]) return;
  closeSprintDashboard();
  sprintActive = null;
  setAppMode("exam");
  setTrackMode("js");
  currentLevelFilter = "all";
  exerciseQuery = "";
  searchEl.value = "";
  renderLevelFilters();
  renderChips();
  selectExercise(id);
  sprintActive = {
    id,
    day: sprintStore.day(),
    assisted,
    scope: editorIdentity.scope,
  };
  syncSprintContext(currentExercise);
  codeEditorEl.focus();
}
function captureSprintAttempt() {
  return sprintActive && currentTrack === "js" && !trueExamMode && !learningMode
    ? sprintActive
    : null;
}
function recordSprintCorrection(submitted, captured, success) {
  if (
    submitted.track !== "js" ||
    submitted.session ||
    !captured ||
    captured.id !== submitted.id ||
    captured.scope !== submitted.scope
  )
    return;
  sprintStore.record({ id: captured.id, assisted: captured.assisted, success });
}
function sprintExerciseRow(id) {
  const target = jsExercises.find((ex) => exId(ex) === id);
  const state = sprintStore.evidence(id);
  const compatible = target && target.level === jsSprintPlan.levels[id];
  const row = sprintNode("article", undefined, "sprint-exercise");
  row.dataset.exercise = id;
  const heading = sprintNode("div");
  const name = target ? exTitle(target) : id;
  heading.append(
    sprintNode("strong", name),
    sprintNode(
      "span",
      compatible
        ? `N${target.level} · ${sprintLabels[state.status]}`
        : target
          ? "Groupe modifié : parcours à actualiser"
          : "Indisponible dans le catalogue",
      "sprint-caption",
    ),
  );
  row.append(heading);
  const actions = sprintNode("div", undefined, "sprint-actions");
  for (const [label, assisted] of [
    ["Avec aide", true],
    ["Sans aide", false],
  ]) {
    const button = sprintButton(
      label,
      () => startSprintExercise(id, assisted),
      assisted ? "button button-subtle" : "button button-primary",
    );
    button.dataset.sprintExercise = id;
    button.dataset.assisted = String(assisted);
    button.disabled =
      !target || submissionRunning || !compatible || target.level > 4;
    actions.append(button);
  }
  row.append(actions);
  return row;
}
// The checkpoint bridge stays available after the small teaching exercises.
function openSprintDashboard() {
  if (trueExamMode || examFocusLocked()) return;
  if (sprintActive && !sprintActive.assisted) {
    sprintActive.assisted = true;
    syncSprintContext(currentExercise);
  }
  setAppMode("path");
}
