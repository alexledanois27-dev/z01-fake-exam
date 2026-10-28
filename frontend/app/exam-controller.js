function updateTrueExamStatus(message) {
  if (!trueExamStatusEl) return;
  trueExamStatusEl.textContent = message || "";
}

function updateTrueExamControls() {
  for (const input of [...modeInputs, ...trackInputs])
    input.disabled =
      examFocusLocked() ||
      !!finishingExam ||
      currentExam?.phase === "finishing";
  exampleBtn.disabled =
    submissionRunning ||
    !currentExercise ||
    (trueExamMode &&
      (!currentExam ||
        currentExam.phase !== "running" ||
        examRepo.expired(currentExam)));
  const running =
    trueExamMode &&
    currentExam &&
    currentExam.phase === "running" &&
    !examRepo.expired(currentExam);
  const id = currentExam && currentExam.series[currentExam.index];
  const passed = running && examRepo.passed(currentExam, id);
  trueExamNextBtn.disabled = !running || submissionRunning || !passed;
  trueExamNextBtn.textContent =
    running && currentExam.index === currentExam.series.length - 1
      ? "Terminer →"
      : "Suivant →";
  trueExamNextBtn.title = passed
    ? ""
    : "Soumets une solution correcte pour continuer.";
  trueExamRestartBtn.disabled =
    examFocusLocked() || submissionRunning || !!finishingExam;
  document.getElementById("exam-skip").hidden = examKind !== "free";
  document.getElementById("exam-skip").disabled =
    !running || submissionRunning || passed;
  document.getElementById("exam-submit").disabled =
    !running || submissionRunning;
  searchEl.disabled = trueExamMode;
  searchEl.placeholder = trueExamMode
    ? "Exercices masqués pendant l’examen"
    : "Rechercher un exercice…";
  runBtn.disabled = submissionRunning || (trueExamMode && !running);
  updateExecutionCooldowns();
  const readOnly = trueExamMode && !running;
  codeEditorEl.readOnly = readOnly;
  if (codeWorkspace?.setReadOnly) codeWorkspace.setReadOnly(readOnly);
}

function restoreTrainingExercise() {
  const saved = personalStore.session(currentTrack) || {};
  const source = getTrackExercises();
  const target =
    source.find(
      (ex) => exId(ex) === (saved.trainingSelected || saved.selected),
    ) || source[0];
  if (target) selectExercise(exId(target));
}

function setTrueExamMode(enabled) {
  saveCurrentDraft();
  const wasExam = trueExamMode;
  trueExamMode = !!enabled;
  renderTrainingGuide(null);
  appEl.classList.toggle("true-exam-mode", trueExamMode);
  currentExercise = null;
  editorIdentity = null;
  if (trueExamMode) {
    if (!wasExam) previousLevelFilter = currentLevelFilter;
    startTrueExamSeries();
  } else {
    currentExam = null;
    trueExamSeries = [];
    trueExamIndex = -1;
    currentLevelFilter = previousLevelFilter || "all";
    renderExamView();
    renderLevelFilters();
    renderChips();
    restoreTrainingExercise();
  }
  updateModeLabel();
  updateTrueExamControls();
  if (!trueExamMode) {
    runBtn.disabled = submissionRunning;
    updateExecutionCooldowns();
  }
}

function buildTrueExamSeries() {
  const source = getExamSource();
  if (isJsTrack()) {
    const shuffled = [...source];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }
  const series = [];
  for (let level = 1; level <= 10; level++) {
    const candidates = source.filter((ex) => ex.level === level);
    if (!candidates.length) continue;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    series.push(pick);
  }
  return series;
}

function getExamSource() {
  return isJsTrack() ? jsExercises : getTrackExercises();
}

function renderExamReport() {
  const summary = examRepo.summary(currentExam);
  const analyses = new Map(
    summary.rows
      .filter((row) => row.status === "passed")
      .map((row) => [
        row.id,
        analyzeBruteForce(
          currentExam.results[row.id]?.code,
          row.id,
          currentExam.results[row.id]?.hardcoding,
        ),
      ]),
  );
  const suspected = [...analyses.values()].filter(
    (result) => result.suspected,
  ).length;
  const bruteForceNote = document.getElementById("exam-brute-force-note");
  bruteForceNote.textContent = `${suspected} / ${summary.passed} réussites avec indices de réponses codées en dur. Estimation locale, sans pénalité ; une solution non signalée n’est pas une preuve d’absence de réponses codées en dur.`;
  const reaction = document.getElementById("exam-brute-force-reaction");
  const majority = summary.passed > 0 && suspected > summary.passed / 2;
  reaction.hidden = !majority;
  const image = reaction.querySelector("img");
  if (majority) image.src = "assets/brute-force-result.png";
  else image.removeAttribute("src");
  const reason =
    currentExam.finishReason === "timeout"
      ? "Les 3 heures sont écoulées."
      : currentExam.finishReason === "completed"
        ? "Tu es arrivé au terme de la série."
        : "Tu as rendu ta session.";
  document.getElementById("exam-report-reason").textContent = reason;
  document.getElementById("exam-report-score").textContent =
    `${summary.passed} / ${summary.total} exercices validés`;
  document.getElementById("exam-report-note").textContent =
    `${summary.skipped} exercice(s) passé(s) · ${summary.unseen} non présenté(s)` +
    (summary.errors
      ? ` · ${summary.errors} correction(s) indisponible(s) : bilan partiel.`
      : "");
  const results = document.getElementById("exam-report-results");
  results.replaceChildren();
  const labels = {
    passed: "Réussi",
    failed: "Non validé",
    skipped: "Passé",
    unsubmitted: "Non soumis",
    error: "Correction indisponible",
  };
  for (const row of summary.rows) {
    const line = document.createElement("div");
    line.className = "exam-result-row";
    const title = document.createElement("span");
    title.textContent =
      getExamSource().find((ex) => exId(ex) === row.id)?.title || row.id;
    const status = document.createElement("strong");
    const analysis = analyses.get(row.id);
    status.textContent =
      labels[row.status] +
      (analysis?.suspected ? " · Réponses codées en dur suspectées" : "");
    if (analysis?.suspected) status.title = analysis.reasons.join("\n");
    status.dataset.state = row.status;
    line.append(title, status);
    results.appendChild(line);
  }
}

function renderExamView() {
  syncExamFocus();
  const phase = currentExam?.phase;
  const lobby = trueExamMode && !learningMode && !currentExam;
  const report = trueExamMode && !learningMode && phase === "finished";
  appEl.classList.toggle("exam-setup", lobby);
  appEl.classList.toggle("exam-complete", report);
  document.getElementById("exam-lobby").hidden = !lobby;
  document.getElementById("exam-report").hidden = !report;
  if (lobby) {
    examTitleEl.textContent = "Examen blanc";
    document.getElementById("exercise-level").textContent = "Nouvelle session";
    document
      .querySelectorAll('input[name="exam-kind"]')
      .forEach((input) => (input.checked = input.value === examKind));
    document.getElementById("exam-start").disabled =
      !getExamSource().length || submissionRunning;
    const saved = examRepo.current(currentTrack, examKind);
    document.getElementById("exam-resume").hidden =
      !saved || saved.phase === "finished";
  }
  if (report) {
    examTitleEl.textContent = "Bilan d’examen";
    document.getElementById("exercise-level").textContent =
      currentExam.kind === "strict" ? "3 heures" : "Libre";
    renderExamReport();
  }
  if (trueExamMode && currentExam && !report) {
    updateTrueExamStatus(
      `${currentExam.kind === "strict" ? "Chronométré · 3 h" : "Libre · sans timer"} — exercice ${currentExam.index + 1} / ${currentExam.series.length}`,
    );
  }
  updateTrueExamControls();
  window.dispatchEvent(new Event("exam-state-change"));
}

window.getExamTimerContext = () => ({
  mode: trueExamMode ? "exam" : "training",
  kind: examKind,
  phase: currentExam?.phase || "lobby",
  deadline: currentExam?.deadline || null,
  finishedAt: currentExam?.finishedAt || null,
});

function startTrueExamSeries(fresh = false) {
  if (!trueExamMode) return;
  saveCurrentDraft();
  if (fresh) {
    const ids = buildTrueExamSeries().map(exId);
    if (!ids.length) {
      document.getElementById("exam-setup-message").textContent =
        "Aucun exercice disponible pour ce langage.";
      return;
    }
    currentExam = examRepo.start(currentTrack, examKind, ids);
  } else currentExam = examRepo.current(currentTrack, examKind);
  if (!getExamSource().length) currentExam = null;
  currentExercise = null;
  editorIdentity = null;
  trueExamSeries = currentExam
    ? currentExam.series
        .map((id) => getExamSource().find((ex) => exId(ex) === id))
        .filter(Boolean)
    : [];
  trueExamIndex = currentExam?.index ?? -1;
  renderChips();
  if (
    currentExam &&
    currentExam.phase !== "finished" &&
    trueExamSeries.length === currentExam.series.length
  ) {
    selectExercise(currentExam.series[currentExam.index]);
  } else {
    codeEditorEl.value = "";
    updateHighlight();
  }
  renderExamView();
  requestExamFullscreen();
  savePersonalSession();
  if (
    currentExam &&
    (examRepo.expired(currentExam) || currentExam.phase === "finishing") &&
    currentExam.phase !== "finished"
  ) {
    finishExam(currentExam.finishReason || "timeout");
  }
}

function restartTrueExamSeries() {
  if (examFocusLocked()) return;
  if (!trueExamMode || submissionRunning || finishingExam) return;
  saveCurrentDraft();
  currentExam = null;
  currentExercise = null;
  editorIdentity = null;
  trueExamSeries = [];
  trueExamIndex = -1;
  codeEditorEl.value = "";
  updateHighlight();
  renderChips();
  renderExamView();
}

function nextTrueExamExercise(skip = false) {
  if (!trueExamMode || !currentExam || submissionRunning) return;
  saveCurrentDraft();
  const moved = examRepo.advance(currentExam, skip);
  if (!moved) return;
  if (moved === "end") {
    finishExam("completed");
    return;
  }
  trueExamIndex = currentExam.index;
  selectExercise(currentExam.series[currentExam.index]);
  renderExamView();
}

function finishExam(reason = "submitted") {
  if (!trueExamMode || !currentExam) return Promise.resolve(false);
  if (currentExam.phase === "finished") {
    renderExamView();
    return Promise.resolve(true);
  }
  if (finishingExam) return finishingExam;
  saveCurrentDraft();
  const session = currentExam;
  examRepo.lock(session, reason);
  renderExamView();
  finishingExam = (async () => {
    if (pendingRun) await pendingRun;
    const id = session.series[session.index];
    const code = examRepo.draft(session, id);
    if (
      currentExam === session &&
      trueExamMode &&
      code.trim() &&
      !session.skipped[id] &&
      !examRepo.tested(session, id)
    ) {
      await runCode({ finalSubmission: true });
    }
    examRepo.finish(session, reason);
    if (trueExamMode && currentExam === session) {
      renderExamView();
      document.getElementById("exam-report").focus();
    }
    persistPersonal();
    return true;
  })().finally(() => {
    finishingExam = null;
    updateTrueExamControls();
  });
  return finishingExam;
}

setInterval(() => {
  if (
    trueExamMode &&
    currentExam?.phase === "running" &&
    examRepo.expired(currentExam)
  )
    finishExam("timeout");
}, 250);
