// Browser fullscreen is voluntary; Escape and OS/browser navigation remain available.
let examFocusWasLocked = false;
let examFocusInterrupted = false;
function examFocusLocked() {
  return !!(
    trueExamMode &&
    currentExam?.kind === "strict" &&
    currentExam.phase !== "finished"
  );
}
function examFocusPanel() {
  let panel = document.getElementById("exam-focus-panel");
  if (panel) return panel;
  panel = document.createElement("section");
  panel.id = "exam-focus-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Examen en cours");
  const title = document.createElement("h2");
  title.textContent = "Examen réel en cours";
  const text = document.createElement("p");
  text.textContent =
    "Reviens en plein écran pour continuer. Le chronomètre continue pendant ton absence. Pour quitter la session, rends ton examen.";
  const resume = document.createElement("button");
  resume.type = "button";
  resume.textContent = "Reprendre en plein écran";
  resume.addEventListener("click", requestExamFullscreen);
  const submit = document.createElement("button");
  submit.type = "button";
  submit.textContent = "Rendre l’examen";
  submit.addEventListener("click", () => finishExam("submitted"));
  panel.append(title, text, resume, submit);
  document.body.append(panel);
  return panel;
}
function syncExamFocus() {
  const locked = examFocusLocked();
  for (const selector of [".mode-switch", ".track-switch"]) {
    const tabs = document.querySelector(selector);
    if (tabs) tabs.hidden = locked;
  }
  appEl.classList.toggle("exam-navigation-locked", locked);
  for (const input of [...modeInputs, ...trackInputs])
    input.disabled = locked || !!finishingExam;
  document
    .getElementById("true-exam-restart")
    ?.toggleAttribute("disabled", locked || submissionRunning);
  const panel = examFocusPanel();
  panel.hidden =
    !locked ||
    !document.documentElement.requestFullscreen ||
    (!!document.fullscreenElement && !examFocusInterrupted);
  appEl.inert = !panel.hidden;
  if (locked && !examFocusWasLocked) {
    history.pushState({ examFocus: true }, "", location.href);
  }
  if (
    !locked &&
    examFocusWasLocked &&
    document.fullscreenElement &&
    document.exitFullscreen
  ) {
    Promise.resolve(document.exitFullscreen()).catch(() => {});
  }
  if (!locked) examFocusInterrupted = false;
  examFocusWasLocked = locked;
}
function requestExamFullscreen() {
  if (!examFocusLocked()) return;
  if (document.fullscreenElement) {
    examFocusInterrupted = false;
    syncExamFocus();
    return;
  }
  const request = document.documentElement.requestFullscreen;
  if (!request) {
    syncExamFocus();
    return;
  }
  try {
    Promise.resolve(request.call(document.documentElement))
      .then(() => {
        examFocusInterrupted = false;
        syncExamFocus();
      })
      .catch(syncExamFocus);
  } catch {
    syncExamFocus();
  }
}
document.addEventListener("fullscreenchange", syncExamFocus);
document.addEventListener("visibilitychange", () => {
  if (examFocusLocked() && document.hidden) examFocusInterrupted = true;
  syncExamFocus();
});
window.addEventListener("beforeunload", (event) => {
  if (!examFocusLocked()) return;
  saveCurrentDraft();
  event.preventDefault();
  event.returnValue = "";
});
window.addEventListener("popstate", () => {
  if (examFocusLocked())
    history.pushState({ examFocus: true }, "", location.href);
});
document.addEventListener(
  "click",
  (event) => {
    if (
      examFocusLocked() &&
      event.target.closest("a") &&
      !event.target.closest("#exercise-content")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
