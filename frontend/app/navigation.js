function slugify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function updateModeLabel() {
  if (!modeInputs.length) return;
  const mode = learningMode ? "learning" : trueExamMode ? "true-exam" : "exam";
  const previousMode = appEl.dataset.motionMode;
  if (previousMode && previousMode !== mode) {
    revealPanel(
      learningMode
        ? document.getElementById("learning-panel")
        : document.querySelector(".workspace"),
    );
  }
  appEl.dataset.motionMode = mode;
  document.querySelector(".catalog-panel").inert = learningMode;
  document.querySelector(".breadcrumb").firstChild.textContent =
    {
      learning: "Mes fiches",
      "true-exam": "Ma session d’examen",
      exam: "Mon entraînement",
    }[mode] + " ";
  modeInputs.forEach((input) => {
    input.checked = input.value === mode;
  });
  if (modeSwitchEl) {
    modeSwitchEl.classList.remove("is-exam", "is-true-exam", "is-learning");
    modeSwitchEl.classList.add(
      mode === "learning"
        ? "is-learning"
        : mode === "true-exam"
          ? "is-true-exam"
          : "is-exam",
    );
  }
}

function isJsTrack() {
  return currentTrack === "js";
}

function isRustTrack() {
  return currentTrack === "rust";
}

function isJavaTrack() {
  return currentTrack === "java";
}

function getTrackExercises() {
  if (isJsTrack()) {
    return jsExercises;
  }
  if (isRustTrack()) {
    return rustExercises;
  }
  if (isJavaTrack()) {
    return javaExercises;
  }
  return exercises;
}

function updateTrackLabel() {
  if (trackInputs.length) {
    trackInputs.forEach((input) => {
      input.checked = input.value === currentTrack;
    });
  }
  if (trackSwitchEl) {
    trackSwitchEl.classList.toggle("is-js", isJsTrack());
    trackSwitchEl.classList.toggle("is-rust", isRustTrack());
    trackSwitchEl.classList.toggle("is-java", isJavaTrack());
  }
}

function updateTrackDependentUi() {
  document.getElementById("example-preview").hidden = true;
  exampleBtn.disabled = true;
  renderGoRestrictions(null);
  const jsMode = isJsTrack();
  const rustMode = isRustTrack();
  const javaMode = isJavaTrack();
  if (appEl) {
    appEl.classList.toggle("js-track-mode", jsMode);
    appEl.classList.toggle("rust-track-mode", rustMode);
    appEl.classList.toggle("java-track-mode", javaMode);
  } else {
    document.body.classList.toggle("js-track-mode", jsMode);
  }

  const languageLabel = {
    go: "Go",
    js: "JavaScript",
    rust: "Rust",
    java: "Java",
  }[currentTrack];
  document.getElementById("track-breadcrumb").textContent = languageLabel;
  document.getElementById("editor-language").textContent = languageLabel;
  if (editorTabLabelEl)
    editorTabLabelEl.textContent = jsMode
      ? "main.js"
      : rustMode
        ? "lib.rs"
        : javaMode
          ? "ExerciseRunner.java"
          : "main.go";

  if (runBtn) {
    runBtn.disabled = submissionRunning;
    runBtn.title = "";
  }
  const source = getTrackExercises();
  const hasCurrent =
    currentExercise && source.some((ex) => exId(ex) === exId(currentExercise));
  if (!hasCurrent) {
    currentExercise = null;
    renderTrainingGuide(null);
  }

  if (trueExamMode) {
    startTrueExamSeries();
  } else if (!learningMode) {
    renderLevelFilters();
    renderChips();
    const filtered = getFilteredExercises();
    if (
      currentExercise &&
      filtered.some((ex) => exId(ex) === exId(currentExercise))
    ) {
      setActiveExerciseChip(exId(currentExercise));
      updateExerciseHeader(currentExercise);
      const rendered = markdownToHtml(exStatement(currentExercise));
      statementEl.innerHTML =
        rendered || "Contenu Markdown indisponible pour cet exercice.";
      highlightMarkdownCode(statementEl);
    } else if (filtered.length) {
      selectExercise(exId(filtered[0]));
    } else {
      examTitleEl.textContent = "Sélectionne un exercice";
      statementEl.innerHTML = "Aucun exercice disponible pour ce mode.";
    }
  } else {
    setLearningMode(true);
  }
}

function setTrackMode(mode) {
  if (examFocusLocked()) {
    updateTrackLabel();
    return;
  }
  const normalized = (mode || "go").toString().toLowerCase();
  const nextTrack =
    normalized === "js"
      ? "js"
      : normalized === "rust"
        ? "rust"
        : normalized === "java"
          ? "java"
          : "go";
  if (nextTrack === currentTrack) {
    updateTrackLabel();
    updateTrackDependentUi();
    return;
  }

  saveCurrentDraft();
  savePersonalSession();
  currentExercise = null;
  renderTrainingGuide(null);
  editorIdentity = null;
  currentTrack = nextTrack;
  currentExam = null;
  try {
    window.localStorage.setItem("z02intra-track-mode", currentTrack);
  } catch {
    // noop
  }
  const saved = personalStore.session(currentTrack);
  const ready = personalReady;
  personalReady = false;
  currentLevelFilter = (saved && saved.filter) || "all";
  // Changing language preserves the current tab and exam conditions.
  // Only exercise selection and difficulty belong to the destination language.
  if (appEl) {
    appEl.classList.toggle("learning-mode", learningMode);
    appEl.classList.toggle("true-exam-mode", trueExamMode);
  }
  updateModeLabel();
  updateTrackLabel();
  updateTrackDependentUi();
  if (
    !trueExamMode &&
    !learningMode &&
    saved &&
    getTrackExercises().some((ex) => exId(ex) === saved.selected)
  ) {
    selectExercise(saved.selected);
  }
  personalReady = ready;
  savePersonalSession();
}

function setAppMode(mode) {
  if (examFocusLocked()) {
    updateModeLabel();
    return;
  }
  const normalized = (mode || "exam").toString().toLowerCase();
  if (normalized === "learning") {
    setTrueExamMode(false);
    setLearningMode(true);
    savePersonalSession();
    return;
  }
  if (normalized === "true-exam") {
    setLearningMode(false);
    setTrueExamMode(true);
    savePersonalSession();
    return;
  }
  setLearningMode(false);
  setTrueExamMode(false);
  savePersonalSession();
}
