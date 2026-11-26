const microStores = Object.fromEntries(
  Object.entries(microPaths).map(([track, plan]) => [
    track,
    JSMicroProgress.create({
      plan,
      key: plan.storageKey || `z01-${track}-micro-path-v1`,
      legacyKey: plan.legacyStorageKey,
      legacyKeys: plan.legacyStorageKeys,
    }),
  ]),
);
let microPlan = microPaths.js;
let microStore = microStores.js;
let microLessons = microPlan.modules.flatMap((module) => module.lessons);
function activateMicroTrack() {
  microEpoch++;
  destroyMicroEditor();
  microPlan = microPaths[currentTrack];
  microStore = microStores[currentTrack];
  microLessons = microPlan.modules.flatMap((module) => module.lessons);
  microFeedback = null;
}
function microLanguage() {
  return { go: "Go", js: "JavaScript", rust: "Rust", java: "Java" }[
    currentTrack
  ];
}

let microEditor = null;
let microRunning = false;
let microEpoch = 0;
let microFeedback = null;
function destroyMicroEditor() {
  if (microEditor) {
    microEditor.destroy();
    microEditor = null;
  }
}
function microCurrent() {
  return (
    microLessons.find((lesson) => lesson.id === microStore.selected()) ||
    microLessons[0]
  );
}
function microCode() {
  return microEditor
    ? microEditor.getCode()
    : document.getElementById("micro-code")?.value || microCurrent().starter;
}
function microDisplayValue(value) {
  const names = {
    double: "(x => x * 2)",
    increment: "(x => x + 1)",
    isEven: "(x => x % 2 === 0)",
    positive: "(x => x > 0)",
    ascending: "((a, b) => a - b)",
    descending: "((a, b) => b - a)",
  };
  if (value && typeof value === "object" && value.$fn)
    return names[value.$fn] || "[fonction]";
  if (value && typeof value === "object" && value.$undefined)
    return "undefined";
  if (Array.isArray(value))
    return "[" + value.map(microDisplayValue).join(", ") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .map(
          ([key, item]) => JSON.stringify(key) + ": " + microDisplayValue(item),
        )
        .join(", ") +
      "}"
    );
  return JSON.stringify(value);
}
function microCodeBlock(code, language) {
  const block = sprintNode("div", undefined, "micro-code-example");
  block.append(sprintNode("span", language, "micro-kicker"));
  const pre = sprintNode("pre");
  pre.append(sprintNode("code", code));
  block.append(pre);
  return block;
}
function microSelect(id) {
  microStore.select(id);
  microEpoch++;
  microFeedback = null;
  renderMicroPath();
  document.querySelector(".micro-title")?.focus();
}
function refreshMicroActions() {
  const summary = microStore.summary();
  const card = document.querySelector(".micro-progress-card");
  if (card) {
    card.querySelector("strong").textContent =
      `${summary.completed}/${summary.total}`;
    card.querySelector("small").textContent =
      `${summary.independent} sans indice ni corrigé`;
    card.querySelector("progress").value = summary.completed;
  }
  for (const [index, module] of microPlan.modules.entries()) {
    const label = document.querySelector(
      `[data-micro-chapter="${module.id}"] .micro-kicker`,
    );
    const done = module.lessons.filter(
      (lesson) => microStore.state(lesson.id).completed,
    ).length;
    if (label)
      label.textContent = `${String(index + 1).padStart(2, "0")} · ${done}/${module.lessons.length}`;
  }
  for (const lesson of microLessons) {
    const button = document.querySelector(`[data-micro-lesson="${lesson.id}"]`);
    if (button)
      button.textContent = `${microStore.state(lesson.id).completed ? "✓" : "○"} ${lesson.title}`;
  }
  const row = microStore.state(microCurrent().id);
  const verify = document.getElementById("micro-verify");
  if (verify) {
    verify.disabled = microRunning || submissionRunning;
    verify.textContent = microRunning ? "Vérification…" : "Vérifier mon code";
  }
  const next = document.getElementById("micro-next");
  if (next) next.disabled = !row.lastPassed || microRunning;
  const warning = document.getElementById("micro-save-status");
  if (warning)
    warning.textContent = microStore.saved()
      ? "Brouillon conservé dans ce navigateur."
      : "Brouillon non sauvegardé : stockage indisponible ou code de plus de 8 000 caractères. Copie ton code avant de fermer.";
}
async function verifyMicroCode() {
  if (microRunning || submissionRunning || trueExamMode) return;
  const lesson = microCurrent();
  const code = microCode();
  if (!code.trim()) return;
  microStore.saveDraft(lesson.id, code);
  const state = microStore.state(lesson.id);
  const assisted = state.solutionSeen || state.hints > 0;
  const epoch = microEpoch;
  microRunning = true;
  microFeedback = null;
  refreshMicroActions();
  const status = document.getElementById("micro-result");
  if (status) status.textContent = "Exécution de tes petits tests dans Docker…";
  try {
    let data;
    for (let attempt = 0; attempt < 145; attempt++) {
      if (epoch !== microEpoch || !document.getElementById("js-sprint-dialog"))
        return;
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "lesson", exerciseId: lesson.id, code }),
      });
      data = await response.json();
      if (response.status === 202 && data.status === "preparing") {
        if (epoch === microEpoch && status?.isConnected)
          status.textContent = String(
            data.output || "Préparation du moteur " + microLanguage() + "…",
          );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      if (!response.ok || typeof data.success !== "boolean")
        throw Error(
          data.output || `Service indisponible (HTTP ${response.status})`,
        );
      break;
    }
    if (typeof data?.success !== "boolean")
      throw Error("Préparation trop longue. Vérifie Docker et réessaie.");
    if (epoch !== microEpoch) return;
    microStore.record(lesson.id, code, data.success, assisted);
    microFeedback = {
      id: lesson.id,
      code,
      success: data.success,
      output: String(data.output || ""),
      checks: Array.isArray(data.checks) ? data.checks : [],
    };
    if (document.getElementById("js-sprint-dialog")) renderMicroFeedback();
  } catch (error) {
    if (epoch === microEpoch && status?.isConnected) {
      status.textContent =
        "Vérification indisponible : " +
        error.message +
        " Aucun échec d’exercice enregistré.";
    }
  } finally {
    microRunning = false;
    refreshMicroActions();
  }
}
function renderMicroFeedback() {
  const container = document.getElementById("micro-result");
  if (!container || !microFeedback || microFeedback.id !== microCurrent().id)
    return;
  container.replaceChildren();
  const feedback = microFeedback;
  container.className =
    "micro-result " + (feedback.success ? "micro-success" : "micro-failure");
  container.append(
    sprintNode(
      "strong",
      feedback.success ? "✓ Cette étape est réussie" : "Un point à corriger",
    ),
    sprintNode("p", feedback.output),
  );
  if (feedback.code !== microCode())
    container.append(
      sprintNode(
        "p",
        "Le code a changé depuis cette vérification : relance les tests avant de continuer.",
      ),
    );
  for (const [testIndex, check] of feedback.checks.entries()) {
    const row = sprintNode("section", undefined, "micro-check");
    const test = microCurrent().tests[testIndex];
    const call =
      test?.invoke ||
      (test
        ? `${microCurrent().target}(${test.args.map(microDisplayValue).join(", ")})${(test.calls || []).map((args) => `(${args.map(microDisplayValue).join(", ")})`).join("")}`
        : "");
    row.append(
      sprintNode(
        "strong",
        `${check.passed === true ? "✓" : "×"} ${String(check.label || "Test")} ${call}`,
      ),
    );
    row.append(
      sprintNode("p", `Attendu : ${String(check.expected)}`),
      sprintNode("p", `Obtenu : ${String(check.actual)}`),
    );
    if (check.error)
      row.append(sprintNode("p", String(check.error), "micro-error"));
    container.append(row);
  }
  refreshMicroActions();
}
function renderMicroPath() {
  const dialog = document.getElementById("js-sprint-dialog");
  if (!dialog || trueExamMode) return;
  destroyMicroEditor();
  const body = dialog.querySelector(".sprint-body");
  body.replaceChildren();
  const lesson = microCurrent();
  const chapter = microPlan.modules.find((module) =>
    module.lessons.some((row) => row.id === lesson.id),
  );
  const index = microLessons.indexOf(lesson);
  const summary = microStore.summary();
  const hero = sprintNode("section", undefined, "micro-hero");
  const intro = sprintNode("div");
  intro.append(
    sprintNode(
      "p",
      microPlan.audience || "POUR LES DÉVELOPPEURS GO · PROTOTYPE",
      "micro-kicker",
    ),
    sprintNode("h2", microPlan.title),
    sprintNode(
      "p",
      microPlan.description ||
        "On explicite les différences avec Go, puis on assemble les briques nécessaires aux niveaux 1 à 4 du checkpoint JavaScript.",
    ),
  );
  const stats = sprintNode("div", undefined, "micro-progress-card");
  stats.append(
    sprintNode("strong", `${summary.completed}/${summary.total}`),
    sprintNode("span", "petits exercices réussis"),
    sprintNode("small", `${summary.independent} sans indice ni corrigé`),
  );
  const progress = document.createElement("progress");
  progress.max = summary.total;
  progress.value = summary.completed;
  progress.setAttribute("aria-label", "Petits exercices réussis");
  stats.append(progress);
  hero.append(intro, stats);
  body.append(hero);
  const grid = sprintNode("div", undefined, "micro-grid");
  const nav = sprintNode("nav", undefined, "micro-navigation");
  nav.setAttribute("aria-label", "Chapitres " + microLanguage());
  nav.append(
    sprintButton(
      "Reprendre ma prochaine étape →",
      () => microSelect(microStore.recommend()),
      "button button-primary",
    ),
  );
  for (const [moduleIndex, module] of microPlan.modules.entries()) {
    const done = module.lessons.filter(
      (l) => microStore.state(l.id).completed,
    ).length;
    const button = sprintButton(
      "",
      () =>
        microSelect(
          module.lessons.find((l) => !microStore.state(l.id).completed)?.id ||
            module.lessons[0].id,
        ),
      "micro-chapter",
    );
    button.dataset.microChapter = module.id;
    button.setAttribute("aria-current", module === chapter ? "step" : "false");
    button.append(
      sprintNode(
        "span",
        `${String(moduleIndex + 1).padStart(2, "0")} · ${done}/${module.lessons.length}`,
        "micro-kicker",
      ),
      sprintNode("strong", module.title),
    );
    nav.append(button);
    if (module === chapter) {
      const list = sprintNode("div", undefined, "micro-lessons");
      for (const row of module.lessons) {
        const state = microStore.state(row.id);
        const item = sprintButton(
          `${state.completed ? "✓" : "○"} ${row.title}`,
          () => microSelect(row.id),
          "micro-lesson",
        );
        item.dataset.microLesson = row.id;
        item.setAttribute(
          "aria-current",
          row.id === lesson.id ? "step" : "false",
        );
        list.append(item);
      }
      nav.append(list);
    }
  }
  const main = sprintNode("section", undefined, "micro-main");
  main.append(
    sprintNode(
      "p",
      `ÉTAPE ${index + 1}/${microLessons.length} · ENVIRON ${lesson.minutes} MIN · ${chapter.title}`,
      "micro-kicker",
    ),
  );
  const title = sprintNode("h3", lesson.title, "micro-title");
  title.tabIndex = -1;
  main.append(title);
  const introduction = sprintNode("details", undefined, "micro-chapter-intro");
  introduction.open = chapter.lessons[0].id === lesson.id;
  introduction.append(
    sprintNode("summary", "Comprendre ce chapitre avant de coder"),
    sprintNode("p", chapter.goal),
    sprintNode(
      "p",
      chapter.officialLevels?.length
        ? currentTrack === "java" && chapter.checkpointGroups
          ? Object.entries(chapter.checkpointGroups)
              .map(
                ([checkpoint, groups]) =>
                  javaCheckpointLabel(checkpoint) +
                  " : " +
                  groups.map((level) => "N" + level).join(", "),
              )
              .join(" · ")
          : "Niveaux officiels associés : " +
            chapter.officialLevels.map((level) => "N" + level).join(", ")
        : "Progression pédagogique par compétences ; aucun groupe officiel fourni pour ces sujets.",
      "sprint-caption",
    ),
  );
  const compare = sprintNode("div", undefined, "micro-language-pair");
  compare.append(
    microCodeBlock(
      chapter.go,
      currentTrack === "go" ? "LE REPÈRE" : "TON REPÈRE GO",
    ),
    microCodeBlock(
      chapter.js || chapter.example,
      "À ÉCRIRE EN " + microLanguage(),
    ),
  );
  introduction.append(compare);
  for (const note of chapter.notes) introduction.append(sprintNode("p", note));
  main.append(introduction);
  const concept = sprintNode("section", undefined, "micro-concept");
  concept.append(
    sprintNode("h4", "1 · Comprendre précisément"),
    sprintNode("p", lesson.bridge, "micro-bridge"),
  );
  for (const paragraph of lesson.explanation)
    concept.append(sprintNode("p", paragraph));
  main.append(concept);
  const practice = sprintNode("section", undefined, "micro-practice");
  practice.append(
    sprintNode("h4", "2 · Écrire la petite fonction"),
    sprintNode("p", lesson.task),
    sprintNode(
      "p",
      microPlan.instructions ||
        "Garde le nom de la fonction. N’ajoute ni package, ni main, ni export. Dans ces exercices, les arguments reçus doivent rester intacts.",
      "sprint-caption",
    ),
  );
  const examples = sprintNode("details", undefined, "micro-cases");
  examples.append(
    sprintNode(
      "summary",
      `${lesson.tests.length} cas de test publics · voir les entrées attendues`,
    ),
  );
  for (const [i, test] of lesson.tests.entries()) {
    const calls = (test.calls || [])
      .map((args) => `(${args.map(microDisplayValue).join(", ")})`)
      .join("");
    examples.append(
      sprintNode(
        "p",
        `${i + 1}. ${test.invoke || `${lesson.target}(${test.args.map(microDisplayValue).join(", ")})${calls}`} → ${test.expectedText ?? microDisplayValue(test.expected)}`,
      ),
    );
  }
  examples.append(
    sprintNode(
      "p",
      "Les fonctions affichées dans les entrées sont de vraies fonctions fournies par le test : tu n’as pas à décoder leur représentation.",
      "sprint-caption",
    ),
  );
  practice.append(examples);
  const state = microStore.state(lesson.id);
  const editorHost = sprintNode("div", undefined, "micro-editor-host");
  editorHost.id = "micro-editor-host";
  const textarea = document.createElement("textarea");
  textarea.id = "micro-code";
  textarea.spellcheck = false;
  textarea.setAttribute("aria-label", "Ton code " + microLanguage());
  textarea.value = state.draft;
  textarea.rows = 8;
  const onChange = (code) => {
    textarea.value = code;
    microStore.saveDraft(lesson.id, code);
    if (microFeedback?.id === lesson.id) renderMicroFeedback();
    refreshMicroActions();
  };
  textarea.addEventListener("input", () => onChange(textarea.value));
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = textarea.selectionStart;
      textarea.setRangeText("  ", start, textarea.selectionEnd, "end");
      onChange(textarea.value);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      verifyMicroCode();
    }
  });
  practice.append(editorHost, textarea);
  const actions = sprintNode("div", undefined, "micro-actions");
  const verify = sprintButton(
    "Vérifier mon code",
    verifyMicroCode,
    "button button-primary",
  );
  verify.id = "micro-verify";
  const retry = sprintButton("Repartir du squelette", () => {
    if (microRunning) return;
    microStore.retry(lesson.id);
    microFeedback = null;
    renderMicroPath();
  });
  retry.title =
    "Vide le brouillon de cette étape et masque de nouveau les aides.";
  actions.append(verify, retry);
  practice.append(actions);
  const saved = sprintNode("p", undefined, "sprint-caption");
  saved.id = "micro-save-status";
  practice.append(saved);
  const result = sprintNode("section", undefined, "micro-result");
  result.id = "micro-result";
  result.setAttribute("aria-live", "polite");
  result.textContent = state.lastPassed
    ? "✓ Dernière vérification réussie pour ce code. Tu peux continuer."
    : "Le test appelle ta fonction. Tu verras le résultat attendu et celui obtenu pour chaque cas.";
  practice.append(result);
  main.append(practice);
  const help = sprintNode("section", undefined, "micro-help");
  help.append(sprintNode("h4", "3 · Débloquer, puis comprendre"));
  const hints = sprintNode("div");
  for (const hint of lesson.hints.slice(0, state.hints))
    hints.append(sprintNode("p", hint));
  const hintButton = sprintButton("Un indice précis", () => {
    microStore.hint(lesson.id);
    renderMicroPath();
  });
  hintButton.disabled = state.hints >= lesson.hints.length || microRunning;
  help.append(hints, hintButton);
  const solution = sprintNode("details", undefined, "micro-solution");
  solution.open = state.solutionSeen;
  solution.append(sprintNode("summary", "Voir le corrigé expliqué"));
  solution.addEventListener("toggle", () => {
    if (solution.open) microStore.reveal(lesson.id);
  });
  solution.append(microCodeBlock(lesson.solution, "UNE SOLUTION POSSIBLE"));
  const steps = sprintNode("ol");
  for (const line of lesson.walkthrough) steps.append(sprintNode("li", line));
  solution.append(
    steps,
    sprintNode(
      "p",
      "Après lecture, repars du squelette et réécris de mémoire. Un résultat réussi avec le corrigé reste identifié comme guidé.",
      "sprint-caption",
    ),
  );
  help.append(solution);
  main.append(help);
  const footer = sprintNode("div", undefined, "micro-step-footer");
  const prev = sprintButton("← Étape précédente", () => {
    if (index > 0) microSelect(microLessons[index - 1].id);
  });
  prev.disabled = index === 0 || microRunning;
  const next = sprintButton(
    index === microLessons.length - 1
      ? "Voir le pont vers le checkpoint ↓"
      : "Étape suivante →",
    () => {
      if (!microStore.state(lesson.id).lastPassed || microRunning) return;
      if (index + 1 < microLessons.length)
        microSelect(microLessons[index + 1].id);
      else
        document
          .getElementById("micro-checkpoint-bridge")
          ?.scrollIntoView({ behavior: "smooth" });
    },
    "button button-primary",
  );
  next.id = "micro-next";
  footer.append(prev, next);
  main.append(footer);
  const bridge = sprintNode("section", undefined, "micro-checkpoint-bridge");
  bridge.id = "micro-checkpoint-bridge";
  bridge.append(
    sprintNode("h4", "Quand ces briques sont comprises : les vrais sujets"),
    sprintNode(
      "p",
      "Ces petits tests ne remplacent pas les sujets complets. Assemble les notions dans ces exercices du catalogue, puis refais-les sans aide.",
    ),
  );
  for (const id of chapter.checkpoint)
    bridge.append(
      currentTrack === "js" &&
        jsSprintPlan.levels[id] &&
        jsSprintPlan.levels[id] <= 4
        ? sprintExerciseRow(id)
        : microCatalogRow(id),
    );
  if (chapter === microPlan.modules.at(-1))
    bridge.append(
      sprintButton(
        "Ouvrir les examens " + microLanguage(),
        () => {
          if (microRunning || submissionRunning || examFocusLocked()) return;
          closeSprintDashboard();
          sprintActive = null;
          setAppMode("exam");
          setAppMode("true-exam");
        },
        "button button-primary",
      ),
    );
  main.append(bridge);
  grid.append(nav, main);
  body.append(grid);
  const bottom = sprintNode("footer", undefined, "micro-bottom");
  bottom.append(
    sprintNode(
      "p",
      "Progression locale d’apprentissage, distincte des scores d’examen. Le parcours n’est pas une garantie de note ou de délai. Avance par compétence plutôt que par jour.",
      "sprint-caption",
    ),
  );
  const clear = sprintButton("Réinitialiser seulement ce parcours", () => {
    if (microRunning) return;
    if (clear.dataset.confirm !== "yes") {
      clear.dataset.confirm = "yes";
      clear.textContent = "Confirmer la réinitialisation";
      return;
    }
    microEpoch++;
    microStore.clear();
    microFeedback = null;
    renderMicroPath();
  });
  clear.disabled = microRunning;
  bottom.append(clear);
  body.append(bottom);
  if (typeof CodeWorkspace !== "undefined") {
    microEditor = CodeWorkspace.create({
      parent: editorHost,
      onChange,
      onRun: verifyMicroCode,
      ariaLabel: "Ton code " + microLanguage(),
    });
    microEditor.setDocument(state.draft, "micro:" + lesson.id, currentTrack);
    textarea.hidden = true;
  } else editorHost.hidden = true;
  if (microFeedback?.id === lesson.id) renderMicroFeedback();
  refreshMicroActions();
}
function microCatalogRow(id) {
  const row = sprintNode("article", undefined, "sprint-exercise");
  const target = getTrackExercises().find((ex) => exId(ex) === id);
  const button = sprintButton("Ouvrir en entraînement", () => {
    if (microRunning || submissionRunning || examFocusLocked()) return;
    setAppMode("exam");
    currentLevelFilter = "all";
    exerciseQuery = "";
    searchEl.value = "";
    renderLevelFilters();
    renderChips();
    selectExercise(id);
  });
  button.disabled = !target || microRunning;
  row.append(sprintNode("strong", target ? exTitle(target) : id), button);
  return row;
}
function openMicroPath() {
  if (!pathMode || trueExamMode || examFocusLocked()) return;
  closeRevisionLesson();
  closeLearningJournal();
  closeSprintDashboard();
  const panel = document.getElementById("learn-path-panel");
  const view = sprintNode("div", undefined, "micro-page");
  view.id = "js-sprint-dialog";
  view.append(sprintNode("div", undefined, "sprint-body"));
  panel.replaceChildren(view);
  renderMicroPath();
}
