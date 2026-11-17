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
      `Parcours JS · séance ${sprintActive.day} · ${sprintActive.assisted ? "Entraînement guidé" : "Défi sans aide"}`,
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
function sprintQuiz(body) {
  const diagnostic = sprintStore.diagnostic();
  const details = sprintNode("details", undefined, "sprint-diagnostic");
  details.id = "sprint-diagnostic";
  details.append(
    sprintNode(
      "summary",
      `Diagnostic express · ${diagnostic.answered}/${diagnostic.total} réponses`,
    ),
  );
  details.append(
    sprintNode(
      "p",
      "Six questions de repérage. Elles orientent les révisions ; elles ne valident pas les exercices.",
      "sprint-caption",
    ),
  );
  const questions = sprintNode("div");
  for (const question of jsSprintPlan.questions) {
    const field = sprintNode("fieldset");
    field.append(sprintNode("legend", question.prompt));
    const previous = diagnostic.answers[question.id];
    question.choices.forEach((choice, index) => {
      const label = sprintNode("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `sprint-quiz-${question.id}`;
      input.value = String(index);
      input.checked = previous === index;
      input.addEventListener("change", () => {
        sprintStore.answer(question.id, index);
        renderSprintDashboard();
        const refreshed = document.getElementById("sprint-diagnostic");
        refreshed.open = true;
        refreshed
          .querySelector(`[name="sprint-quiz-${question.id}"]:checked`)
          ?.focus();
      });
      label.append(input, document.createTextNode(choice));
      field.append(label);
    });
    if (previous !== undefined)
      field.append(
        sprintNode(
          "p",
          (previous === question.answer ? "✓ " : "À revoir · ") +
            question.explanation,
          "sprint-answer",
        ),
      );
    questions.append(field);
  }
  details.append(questions);
  if (diagnostic.answered === diagnostic.total) {
    details.append(
      sprintNode(
        "p",
        `${diagnostic.correct}/${diagnostic.total} repères retrouvés. Commence par la séance ${diagnostic.suggestedDay} puis confirme en codant.`,
      ),
    );
    details.append(
      sprintButton("Suivre cette recommandation", () => {
        sprintStore.selectDay(diagnostic.suggestedDay);
        renderSprintDashboard();
      }),
    );
  }
  body.append(details);
}
async function readSprintLesson(lesson) {
  const dialog = document.getElementById("js-sprint-dialog");
  if (!dialog || trueExamMode) return;
  const request = ++sprintViewSequence;
  const body = dialog.querySelector(".sprint-body");
  body.replaceChildren(
    sprintButton("← Revenir à la séance", renderSprintDashboard),
  );
  const article = sprintNode(
    "article",
    "Chargement de la fiche…",
    "markdown-viewer sprint-reader",
  );
  body.append(article);
  try {
    const text = await revisionMarkdown(lesson);
    if (request !== sprintViewSequence || !dialog.isConnected) return;
    article.innerHTML = markdownToHtml(text);
    highlightMarkdownCode(article);
  } catch {
    if (request === sprintViewSequence && dialog.isConnected)
      article.textContent =
        "Fiche indisponible. Réessaie après avoir vérifié les fichiers du projet.";
  }
}
function renderSprintDashboard() {
  const dialog = document.getElementById("js-sprint-dialog");
  if (!dialog || trueExamMode) return;
  sprintViewSequence++;
  const body = dialog.querySelector(".sprint-body");
  body.replaceChildren();
  const summary = sprintStore.summary();
  const diagnostic = sprintStore.diagnostic();
  const hero = sprintNode("section", undefined, "sprint-hero");
  const introduction = sprintNode("div");
  introduction.append(
    sprintNode(
      "p",
      "JAVASCRIPT / PARCOURS INTENSIF / PROTOTYPE",
      "sprint-eyebrow",
    ),
  );
  introduction.append(sprintNode("h2", "Objectif : atteindre le niveau 4."));
  introduction.append(
    sprintNode(
      "p",
      "Sept séances pour sécuriser les bases, reconnaître les méthodes et résoudre sans aide. Environ 1 h 40 à 2 h par séance ; jusqu’à 3 h pour l’examen blanc.",
    ),
  );
  introduction.append(
    sprintNode(
      "p",
      "Plan fondé sur les 19 sujets N1–N4 du catalogue de référence. À adapter à ton niveau : aucun score officiel ni délai de réussite garanti.",
      "sprint-caption",
    ),
  );
  const stats = sprintNode("div", undefined, "sprint-stats");
  for (const [value, text] of [
    [`${summary.independent}/${summary.total}`, "réussis sans aide"],
    [summary.consolidated, "confirmés à 24 h"],
    [summary.review.length, "à revoir maintenant"],
  ]) {
    const card = sprintNode("div");
    card.append(sprintNode("strong", String(value)), sprintNode("span", text));
    stats.append(card);
  }
  hero.append(introduction, stats);
  body.append(hero);
  const progress = document.createElement("progress");
  progress.max = summary.total;
  progress.value = summary.independent;
  progress.setAttribute(
    "aria-label",
    "Exercices réussis sans aide dans le parcours",
  );
  body.append(progress);
  if (!sprintStore.saved())
    body.append(
      sprintNode(
        "p",
        "Le stockage local est indisponible : ce parcours sera perdu à la fermeture.",
        "sprint-warning",
      ),
    );
  if (!jsExercises.length)
    body.append(
      sprintNode(
        "p",
        "Catalogue JavaScript en cours de chargement ou indisponible. Ferme et rouvre le parcours après le chargement.",
        "sprint-warning",
      ),
    );
  sprintQuiz(body);
  const layout = sprintNode("div", undefined, "sprint-layout");
  const navigation = sprintNode("nav", undefined, "sprint-days");
  navigation.setAttribute("aria-label", "Les sept séances du parcours");
  for (const day of jsSprintPlan.days) {
    const done = day.exercises.filter((id) =>
      ["independent", "consolidated"].includes(sprintStore.evidence(id).status),
    ).length;
    const button = sprintButton(
      "",
      () => {
        sprintStore.selectDay(day.day);
        renderSprintDashboard();
      },
      "sprint-day",
    );
    button.dataset.day = String(day.day);
    button.setAttribute(
      "aria-current",
      day.day === sprintStore.day() ? "step" : "false",
    );
    button.append(
      sprintNode(
        "span",
        `SÉANCE ${String(day.day).padStart(2, "0")}`,
        "sprint-eyebrow",
      ),
      sprintNode("strong", day.title),
      sprintNode(
        "span",
        day.exercises.length
          ? `${done}/${day.exercises.length} sans aide · ~${day.minutes} min`
          : "Simulation · jusqu’à 3 h",
        "sprint-caption",
      ),
    );
    navigation.append(button);
  }
  const day = jsSprintPlan.days.find((day) => day.day === sprintStore.day());
  const session = sprintNode("section", undefined, "sprint-session");
  session.append(
    sprintNode("p", `SÉANCE ${day.day} / 7 · ${day.topic}`, "sprint-eyebrow"),
    sprintNode("h3", day.title),
  );
  const routine = sprintNode("ol", undefined, "sprint-routine");
  for (const step of [
    "10 min · retrouver de mémoire une notion d’hier",
    "15 min · lire la fiche et tracer un exemple",
    "45–75 min · coder, puis refaire sans aide",
    "10 min · expliquer l’erreur et prévoir un rappel à 24 h",
  ])
    routine.append(sprintNode("li", step));
  session.append(routine);
  const concepts = sprintNode("div", undefined, "sprint-concepts");
  concepts.append(
    sprintNode("h4", "Le réflexe à acquérir"),
    sprintNode("p", day.method),
    sprintNode("p", day.insight),
  );
  const pre = sprintNode("pre");
  pre.append(sprintNode("code", day.code));
  concepts.append(
    pre,
    sprintNode(
      "p",
      "Exemple de syntaxe à adapter : ce n’est pas une solution du sujet.",
      "sprint-caption",
    ),
  );
  const traps = sprintNode("ul");
  day.traps.forEach((trap) => traps.append(sprintNode("li", trap)));
  concepts.append(traps);
  session.append(concepts);
  const lessons = sprintNode("div", undefined, "sprint-actions");
  for (const id of day.lessons) {
    const lesson = revisionCatalog.lessons.find(
      (lesson) => lesson.track === "js" && lesson.id === id,
    );
    if (lesson)
      lessons.append(
        sprintButton(`↗ ${lesson.title}`, () => readSprintLesson(lesson)),
      );
  }
  session.append(
    lessons,
    sprintNode("h4", "Passer de la compréhension à l’autonomie"),
  );
  for (const id of day.exercises) session.append(sprintExerciseRow(id));
  if (day.day === 7) {
    session.append(
      sprintNode(
        "p",
        "Refais les exercices à revoir ci-dessous, puis ouvre le mode examen JavaScript. Choisis le mode chronométré de 3 h et rends ta session pour lire le bilan. Les séances restent accessibles librement. La progression vient des corrections, pas des clics sur les séances.",
      ),
    );
    const exam = sprintButton(
      "Ouvrir les examens JavaScript →",
      () => {
        if (submissionRunning || examFocusLocked()) return;
        closeSprintDashboard();
        sprintActive = null;
        setAppMode("exam");
        setTrackMode("js");
        setAppMode("true-exam");
      },
      "button button-primary",
    );
    exam.disabled = submissionRunning;
    session.append(exam);
  }
  layout.append(navigation, session);
  body.append(layout);
  const review = sprintNode("section", undefined, "sprint-review");
  review.append(sprintNode("h3", "Ta prochaine révision"));
  if (summary.review.length) {
    review.append(
      sprintNode(
        "p",
        "Priorité aux derniers essais non validés, puis aux rappels arrivés à 24 h. Les erreurs techniques ne modifient pas ces repères.",
      ),
    );
    const ordered = [...summary.review].sort(
      (a, b) => Number(b.status === "review") - Number(a.status === "review"),
    );
    for (const row of ordered.slice(0, 4))
      review.append(sprintExerciseRow(row.id));
  } else
    review.append(
      sprintNode(
        "p",
        "Commence par les sujets de ta séance. Après une réussite sans aide, reviens au moins 24 heures plus tard sur une page blanche pour la confirmer.",
      ),
    );
  body.append(review);
  const footer = sprintNode("footer", undefined, "sprint-footer");
  footer.append(
    sprintNode(
      "p",
      `${diagnostic.answered}/${diagnostic.total} réponses au diagnostic · données de ce navigateur uniquement. Six essais au maximum par exercice ; aucune copie de code dans ce suivi. Les anciens succès ne sont pas assimilés à une preuve d’autonomie.`,
      "sprint-caption",
    ),
  );
  const clear = sprintButton("Réinitialiser ce parcours", () => {
    if (clear.dataset.confirm !== "yes") {
      clear.dataset.confirm = "yes";
      clear.textContent = "Confirmer la réinitialisation";
      return;
    }
    sprintStore.clear();
    renderSprintDashboard();
  });
  footer.append(clear);
  body.append(footer);
}
function openSprintDashboard() {
  if (trueExamMode || examFocusLocked()) return;
  if (sprintActive && !sprintActive.assisted) {
    sprintActive.assisted = true;
    syncSprintContext(currentExercise);
  }
  closeRevisionLesson();
  closeLearningJournal();
  closeSprintDashboard();
  const dialog = sprintNode("dialog", undefined, "sprint-dialog");
  dialog.id = "js-sprint-dialog";
  dialog.setAttribute("aria-labelledby", "sprint-title");
  const header = sprintNode("header", undefined, "sprint-dialog-header");
  const title = sprintNode("strong", "Parcours JS · 7 séances");
  title.id = "sprint-title";
  const close = sprintButton("Fermer ✕", closeSprintDashboard);
  header.append(title, close);
  dialog.append(header, sprintNode("div", undefined, "sprint-body"));
  document.body.append(dialog);
  dialog.addEventListener("close", () => {
    sprintViewSequence++;
    dialog.remove();
  });
  renderSprintDashboard();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  close.focus();
}
document
  .getElementById("js-sprint-open")
  .addEventListener("click", openSprintDashboard);
