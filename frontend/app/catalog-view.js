function renderLevelFilters() {
  if (!levelFiltersEl) return;
  levelFiltersEl.innerHTML = "";
  const levels = isJsTrack()
    ? [
        ...new Set(
          getTrackExercises()
            .map((ex) => ex.level)
            .filter(Number.isInteger),
        ),
      ].sort((a, b) => a - b)
    : Array.from({ length: 10 }, (_, i) => i + 1);
  const filters = [
    { id: "all", label: "Tous" },
    ...levels.map((level) => ({ id: String(level), label: `N${level}` })),
    ...(isJsTrack() && getTrackExercises().some((ex) => !ex.level)
      ? [{ id: "unclassified", label: "Non classés" }]
      : []),
  ];
  if (!filters.some((filter) => filter.id === currentLevelFilter)) {
    currentLevelFilter = "all";
  }
  filters.forEach((f) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      "chip filter-chip" + (currentLevelFilter === f.id ? " active" : "");
    chip.dataset.filter = f.id;
    chip.setAttribute("aria-pressed", String(currentLevelFilter === f.id));
    if (f.id === "all") {
      const label = document.createElement("span");
      label.textContent = "Tous les niveaux";
      const count = document.createElement("span");
      count.className = "level-filter-count";
      count.textContent = String(getTrackExercises().length);
      chip.append(label, count);
    } else if (f.id === "unclassified") {
      chip.textContent = f.label;
      chip.title = "Groupe non fourni par le catalogue";
    } else {
      const prefix = document.createElement("span");
      prefix.className = "level-prefix";
      prefix.textContent = "N";
      const number = document.createElement("strong");
      number.textContent = f.id;
      chip.append(prefix, number);
      chip.setAttribute("aria-label", `Niveau ${f.id}`);
      const count = getTrackExercises().filter(
        (ex) => String(ex.level) === f.id,
      ).length;
      chip.title = `Niveau ${f.id} · ${count} exercice${count > 1 ? "s" : ""}`;
    }
    chip.onclick = () => applyLevelFilter(f.id);
    levelFiltersEl.appendChild(chip);
  });
}

function applyLevelFilter(filterId) {
  if (trueExamMode) return;
  saveCurrentDraft();
  currentLevelFilter = filterId;
  savePersonalSession();
  renderLevelFilters();
  renderChips();

  const filtered = getFilteredExercises();
  if (!filtered.length) {
    currentExercise = null;
    renderTrainingGuide(null);
    examTitleEl.textContent = "Aucun exercice pour ce niveau";
    statementEl.innerHTML = "Aucun exercice disponible pour ce niveau.";
    outputEl.textContent = "";
    return;
  }

  if (
    currentExercise &&
    filtered.some((ex) => exId(ex) === exId(currentExercise))
  ) {
    setActiveExerciseChip(exId(currentExercise));
    updateExerciseHeader(currentExercise);
    return;
  }

  selectExercise(exId(filtered[0]));
}

function renderChips() {
  chipsContainer.innerHTML = "";
  if (trueExamMode) return;
  const list = getActiveExercises();
  const source = getTrackExercises();
  const passed = source.filter(
    (ex) => personalStore.result(currentTrack, exId(ex))?.success,
  ).length;
  document.getElementById("exercise-count").textContent = source.length;
  document.getElementById("progress-label").textContent =
    `${passed} / ${source.length}`;
  const progress = document.getElementById("catalog-progress");
  progress.max = source.length || 1;
  progress.value = passed;
  if (trueExamMode && trueExamSeries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "chips-empty";
    empty.textContent = "Lance la série True Exam.";
    chipsContainer.appendChild(empty);
    return;
  }
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "chips-empty";
    empty.textContent = exerciseQuery.trim()
      ? "Aucun exercice trouvé."
      : "Aucun exercice pour ce niveau.";
    chipsContainer.appendChild(empty);
    return;
  }
  list.forEach((ex, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip exercise-chip";
    chip.dataset.id = exId(ex);
    const result = personalStore.result(currentTrack, exId(ex));
    chip.dataset.result = result
      ? result.success
        ? "passed"
        : "retry"
      : "untouched";
    const number = document.createElement("span");
    number.className = "exercise-number";
    number.textContent = String(
      source.findIndex((item) => exId(item) === exId(ex)) + 1,
    ).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "exercise-name";
    name.textContent = exTitle(ex);
    const icon = document.createElement("span");
    icon.className = "exercise-result";
    icon.textContent = result ? (result.success ? "✓" : "↻") : "";
    chip.append(number, name, icon);
    chip.setAttribute(
      "aria-disabled",
      String(trueExamMode && i > trueExamIndex),
    );
    if (result)
      chip.title = `${result.attempts} tentative(s) — ${result.success ? "Réussi" : "À revoir"}`;
    chip.onclick = () => {
      if (trueExamMode && i > trueExamIndex) return;
      selectExercise(exId(ex));
    };
    chipsContainer.appendChild(chip);
  });
  if (currentExercise) setActiveExerciseChip(exId(currentExercise));
}

function selectExercise(id) {
  if (
    trueExamMode &&
    (!currentExam ||
      currentExam.phase === "finished" ||
      id !== currentExam.series[currentExam.index])
  )
    return;
  const ex = getTrackExercises().find((e) => exId(e) === id);
  if (!ex) return;
  saveCurrentDraft();
  currentExercise = ex;
  editorIdentity = {
    track: currentTrack,
    id,
    scope: trueExamMode
      ? `exam:${currentExam.id}`
      : `training:${++trainingVisit}`,
    session: trueExamMode ? currentExam : null,
  };
  if (trueExamMode && trueExamSeries.length) {
    const idx = trueExamSeries.findIndex((e) => exId(e) === id);
    if (idx >= 0) {
      trueExamIndex = idx;
    }
    updateTrueExamStatus(`Exo ${trueExamIndex + 1}/${trueExamSeries.length}`);
    updateTrueExamControls();
  }

  setActiveExerciseChip(id);
  updateExerciseHeader(ex);
  const rendered = markdownToHtml(exStatement(ex));
  statementEl.innerHTML =
    rendered || "Contenu Markdown indisponible pour cet exercice.";
  highlightMarkdownCode(statementEl);
  revealPanel(statementEl);
  renderTrainingGuide(ex);
  codeEditorEl.value = trueExamMode ? examRepo.draft(currentExam, id) : "";
  updateHighlight();
  outputEl.textContent = "";
  renderRunState("ready");
  savePersonalSession();
  updateTrueExamControls();
}
