const initialLearningMode =
  (modeLearningEl && modeLearningEl.checked) ||
  (appEl && appEl.classList.contains("learning-mode")) ||
  document.body.classList.contains("learning-mode");
const initialTrueExamMode =
  (modeTrueExamEl && modeTrueExamEl.checked) ||
  (appEl && appEl.classList.contains("true-exam-mode")) ||
  document.body.classList.contains("true-exam-mode");
if (initialLearningMode) {
  setAppMode("learning");
} else if (initialTrueExamMode) {
  setAppMode("true-exam");
} else {
  setAppMode(modeExamEl && modeExamEl.checked ? "exam" : "exam");
}
updateTrueExamControls();
loadExercises();

let initialTrack = "go";
try {
  const storedTrack = window.localStorage.getItem("z02intra-track-mode");
  if (
    storedTrack === "js" ||
    storedTrack === "go" ||
    storedTrack === "rust" ||
    storedTrack === "java"
  ) {
    initialTrack = storedTrack;
  } else if (trackInputs.length) {
    const checked = trackInputs.find((input) => input.checked);
    initialTrack = checked ? checked.value : "go";
  }
} catch {
  if (trackInputs.length) {
    const checked = trackInputs.find((input) => input.checked);
    initialTrack = checked ? checked.value : "go";
  }
}
setTrackMode(initialTrack);
