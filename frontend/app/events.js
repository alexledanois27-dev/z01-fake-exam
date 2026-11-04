runBtn.addEventListener("click", runCode);
exampleBtn.addEventListener("click", () => runCode({ example: true }));
clearBtn.addEventListener("click", clearConsole);
if (modeInputs.length) {
  modeInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.currentTarget;
      if (!target.checked) return;
      setAppMode(target.value);
    });
  });
}
if (trackInputs.length) {
  trackInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.currentTarget;
      if (!target.checked) return;
      setTrackMode(target.value);
    });
  });
}
if (trueExamNextBtn) {
  trueExamNextBtn.addEventListener("click", () => nextTrueExamExercise(false));
}
if (trueExamRestartBtn) {
  trueExamRestartBtn.addEventListener("click", restartTrueExamSeries);
}
if (learningContentEl) {
  learningContentEl.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (!anchor) return;
    const lesson = findLessonByHref(anchor.getAttribute("href"));
    if (lesson) {
      e.preventDefault();
      selectLearningLesson(lesson.id);
    }
  });
}

searchEl.addEventListener("input", () => {
  exerciseQuery = searchEl.value;
  renderChips();
});
document.addEventListener("keydown", (event) => {
  if (
    document.getElementById("revision-dialog")?.open ||
    document.getElementById("learning-journal-dialog")?.open
  )
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!searchEl.disabled) searchEl.focus();
  }
  if (
    !codeWorkspace &&
    (event.ctrlKey || event.metaKey) &&
    event.key === "Enter"
  ) {
    event.preventDefault();
    runCode();
  }
});
let codeSize = 13;
for (const [id, delta] of [
  ["font-smaller", -1],
  ["font-larger", 1],
]) {
  document.getElementById(id).addEventListener("click", () => {
    codeSize = Math.max(10, Math.min(22, codeSize + delta));
    document.documentElement.style.setProperty("--code-size", `${codeSize}px`);
  });
}
document.getElementById("download-statement").addEventListener("click", () => {
  if (!currentExercise) return;
  const blob = new Blob([exStatement(currentExercise)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${currentTrack}-${exId(currentExercise).replace(/[^a-zA-Z0-9_-]/g, "-")}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document
  .getElementById("exam-start")
  .addEventListener("click", () => startTrueExamSeries(true));
document
  .getElementById("exam-resume")
  .addEventListener("click", () => startTrueExamSeries(false));
document
  .getElementById("exam-skip")
  .addEventListener("click", () => nextTrueExamExercise(true));
document
  .getElementById("exam-submit")
  .addEventListener("click", () => finishExam("submitted"));
document
  .getElementById("exam-report-new")
  .addEventListener("click", restartTrueExamSeries);
document
  .getElementById("exam-report-training")
  .addEventListener("click", () => setAppMode("exam"));
document.querySelectorAll('input[name="exam-kind"]').forEach((input) =>
  input.addEventListener("change", () => {
    if (!input.checked || currentExam) return;
    examKind = input.value === "strict" ? "strict" : "free";
    savePersonalSession();
    renderExamView();
  }),
);

// --- Gestion du redimensionnement ---
