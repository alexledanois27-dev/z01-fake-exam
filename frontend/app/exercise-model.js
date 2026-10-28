function normalizeExerciseId(id) {
  return (id || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function exId(ex) {
  return ex.id || ex.ID;
}
function exTitle(ex) {
  return ex.title || ex.Title || exId(ex);
}
function exStatement(ex) {
  return ex.statement || ex.Statement || "";
}

function getExerciseLevel(id) {
  const key = normalizeExerciseId(id);
  return LEVEL_MAP[key] || null;
}

function getFilteredExercises() {
  let source = getTrackExercises();
  if (currentLevelFilter === "unclassified")
    source = source.filter((ex) => !ex.level);
  else if (currentLevelFilter !== "all")
    source = source.filter((ex) => ex.level === Number(currentLevelFilter));
  const query = exerciseQuery.trim().toLocaleLowerCase();
  return query
    ? source.filter((ex) =>
        `${exTitle(ex)} ${exId(ex)}`.toLocaleLowerCase().includes(query),
      )
    : source;
}

function getActiveExercises() {
  if (trueExamMode && trueExamSeries.length) return trueExamSeries;
  return getFilteredExercises();
}

function setActiveExerciseChip(id) {
  document.querySelectorAll(".exercise-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.id === id);
    if (c.dataset.id === id) c.setAttribute("aria-current", "true");
    else c.removeAttribute("aria-current");
  });
}

function renderGoRestrictions(ex) {
  const panel = document.getElementById("go-restrictions");
  panel.hidden = currentTrack !== "go" || !ex;
  if (panel.hidden) return;
  const tags = document.getElementById("allowed-functions");
  const note = document.getElementById("restriction-note");
  tags.replaceChildren();
  if (!Array.isArray(ex.allowedFunctions)) {
    note.textContent =
      "Règles indisponibles : la correction Go est bloquée tant que le catalogue ne les fournit pas.";
  } else {
    for (const rule of ex.allowedFunctions) {
      const tag = document.createElement("code");
      tag.textContent = rule;
      if (rule === "--allow-builtin")
        tag.title =
          "Fonctions intégrées et conversions autorisées, sauf print et println.";
      tags.appendChild(tag);
    }
    if (!ex.allowedFunctions.length) {
      const tag = document.createElement("span");
      tag.textContent = "Aucune fonction ou import explicitement autorisé";
      tags.appendChild(tag);
    }
    note.textContent = ex.allowedFunctions.includes("--allow-builtin")
      ? "Fonctions intégrées et conversions permises. print et println intégrés restent interdits."
      : "Seules les fonctions listées sont permises, avec les fonctions que tu définis toi-même.";
  }
}

function updateExerciseHeader(ex) {
  if (learningMode) {
    examTitleEl.textContent = "Fiches de révision";
    document.getElementById("exercise-level").textContent = "Apprendre";
    return;
  }
  const source = document.getElementById("statement-source");
  if (source)
    source.textContent =
      ex.statementSource === "zone01-api"
        ? "Énoncé officiel · API Zone01"
        : ex.statementSource === "local"
          ? "Énoncé · copie locale de secours" +
            (ex.snapshotDate ? ` · ${ex.snapshotDate.slice(0, 10)}` : "")
          : "Énoncé chargé depuis le catalogue";
  const title = exTitle(ex);
  renderGoRestrictions(ex);
  document.getElementById("example-preview").hidden = !ex.example;
  document.getElementById("example-source").textContent = ex.example || "";
  document.getElementById("program-args").value = "";
  exampleBtn.textContent = "Tester";
  exampleBtn.title = "Exécuter ton programme avec les Args, sans soumettre";
  if (Array.isArray(ex.expectedFiles) && ex.expectedFiles.length === 1)
    editorTabLabelEl.textContent = ex.expectedFiles[0];
  examTitleEl.textContent = title;
  document.getElementById("exercise-level").textContent = ex.level
    ? `Niveau ${ex.level}`
    : "Sans niveau";
}
