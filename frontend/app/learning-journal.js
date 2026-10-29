let journalRequestSequence = 0;
function journalAvailable() {
  return !learningMode && (!trueExamMode || currentExam?.phase === "finished");
}
function syncJournalControls() {
  document.getElementById("exercise-history-btn").hidden =
    learningMode || trueExamMode || !currentExercise;
  document.getElementById("learning-report-btn").disabled = !journalAvailable();
}
function closeLearningJournal() {
  journalRequestSequence++;
  const dialog = document.getElementById("learning-journal-dialog");
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  dialog.remove();
}
function journalNode(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function journalButton(text, action) {
  const button = journalNode("button", text, "button button-subtle");
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}
function journalExerciseTitle(id) {
  return exTitle(getTrackExercises().find((ex) => exId(ex) === id) || { id });
}
function journalAttemptLabel(item) {
  return `${new Date(item.at).toLocaleString("fr-FR")} · ${item.session ? "Examen terminé" : "Entraînement"} · ${item.success === null ? "Correction indisponible" : item.success ? "Réussi" : "Non validé"}`;
}
function journalCode(parent, item) {
  parent.append(journalNode("p", journalAttemptLabel(item), "journal-meta"));
  if (item.truncated)
    parent.append(
      journalNode(
        "p",
        "Copie abrégée pour limiter le stockage : ce code ou cette sortie est incomplet.",
        "journal-note",
      ),
    );
  parent.append(
    journalNode("h4", "Code soumis"),
    journalNode("pre", item.code, "journal-code"),
    journalNode("h4", "Résultat"),
    journalNode("pre", item.output || "(aucune sortie)", "journal-code"),
  );
}
function renderExerciseHistory(body, exercise) {
  body.replaceChildren();
  body.append(
    journalNode("h3", journalExerciseTitle(exercise)),
    journalNode(
      "p",
      "Corrections enregistrées sur ce navigateur. Tester n’est pas enregistré ; consulter un essai ne remplace jamais le code de l’éditeur.",
      "journal-note",
    ),
  );
  const attempts = attemptJournal.list(currentTrack, exercise);
  if (!attempts.length) {
    body.append(
      journalNode(
        "p",
        "Aucune tentative conservée pour cet exercice. Les essais antérieurs à cette fonctionnalité ne sont pas récupérables.",
      ),
    );
    return;
  }
  if (attempts.length > 1) {
    const controls = journalNode("div", undefined, "journal-compare-controls");
    const selectors = [0, 1].map((selected, index) => {
      const label = journalNode("label", `Tentative ${index ? "B" : "A"}`);
      const select = document.createElement("select");
      select.setAttribute(
        "aria-label",
        `Tentative ${index ? "B" : "A"} à comparer`,
      );
      attempts.forEach((item, i) => {
        const option = journalNode(
          "option",
          `#${attempts.length - i} · ${journalAttemptLabel(item)}`,
        );
        option.value = String(i);
        select.append(option);
      });
      select.value = String(selected);
      label.append(select);
      controls.append(label);
      return select;
    });
    const comparison = journalNode("div", undefined, "journal-comparison");
    controls.append(
      journalButton("Comparer les deux essais", () => {
        comparison.replaceChildren();
        selectors.forEach((select, index) => {
          const panel = journalNode("section");
          panel.append(journalNode("h3", `Tentative ${index ? "B" : "A"}`));
          journalCode(panel, attempts[Number(select.value)]);
          comparison.append(panel);
        });
      }),
    );
    body.append(controls, comparison);
  }
  attempts.forEach((item, index) => {
    const details = journalNode("details", undefined, "journal-attempt");
    details.append(
      journalNode(
        "summary",
        `#${attempts.length - index} · ${journalAttemptLabel(item)}`,
      ),
    );
    const content = journalNode("div");
    journalCode(content, item);
    details.append(content);
    body.append(details);
  });
}
async function showJournalLesson(body, lesson) {
  const request = ++journalRequestSequence;
  body.replaceChildren(
    journalButton("← Retour au bilan", () => {
      journalRequestSequence++;
      renderLearningReport(body);
    }),
    journalNode("p", "Chargement de la fiche…"),
  );
  try {
    const md = await revisionMarkdown(lesson);
    if (
      request !== journalRequestSequence ||
      !body.isConnected ||
      !journalAvailable()
    )
      return;
    const article = journalNode("article", undefined, "markdown-viewer");
    article.innerHTML = markdownToHtml(md);
    highlightMarkdownCode(article);
    body.lastChild.replaceWith(article);
  } catch {
    if (request === journalRequestSequence && body.isConnected)
      body.lastChild.textContent =
        "Fiche indisponible. Réessaie depuis le bilan.";
  }
}
function renderLearningReport(body) {
  body.replaceChildren();
  const labels = { go: "Go", js: "JavaScript", rust: "Rust", java: "Java" };
  body.append(
    journalNode("h3", `Mon bilan · ${labels[currentTrack]}`),
    journalNode(
      "p",
      "Bilan indicatif fondé sur les dernières corrections conservées ici, pas une mesure certaine de tes compétences. Les anciennes tentatives ne sont pas reconstituées.",
      "journal-note",
    ),
  );
  const attempts = attemptJournal.list(currentTrack);
  if (!attempts.length) {
    body.append(
      journalNode(
        "p",
        "Pas encore d’historique pour ce langage. Tes réussites existantes restent conservées dans la progression.",
      ),
    );
    return;
  }
  const latest = new Map();
  for (const item of attempts)
    if (item.success !== null && !latest.has(item.exercise))
      latest.set(item.exercise, item);
  const passed = [...latest.values()].filter((item) => item.success).length;
  const failed = [...latest.values()].filter((item) => !item.success);
  const stats = journalNode("div", undefined, "journal-stats");
  for (const text of [
    `${attempts.length} correction(s) conservée(s)`,
    `${passed} exercice(s) réussi(s) au dernier essai corrigé`,
    `${failed.length} exercice(s) à retravailler`,
    `${attempts.filter((item) => item.success === null).length} correction(s) indisponible(s)`,
  ])
    stats.append(journalNode("span", text));
  body.append(stats, journalNode("h3", "Fiches à revoir"));
  const topics = new Map();
  for (const item of failed) {
    const references =
      revisionCatalog.exerciseLinks[currentTrack]?.[item.exercise];
    for (const id of Array.isArray(references) ? references : []) {
      const lesson = revisionCatalog.lessons.find(
        (l) => l.id === id && l.track === currentTrack,
      );
      if (!lesson) continue;
      if (!topics.has(id)) topics.set(id, { lesson, exercises: [] });
      topics.get(id).exercises.push(journalExerciseTitle(item.exercise));
    }
  }
  if (!topics.size)
    body.append(
      journalNode(
        "p",
        failed.length
          ? "Aucune fiche associée aux exercices concernés dans le catalogue actuel."
          : "Aucun exercice à revoir parmi les derniers essais corrigés. Tu peux continuer à t’entraîner.",
      ),
    );
  for (const { lesson, exercises } of [...topics.values()].sort(
    (a, b) => b.exercises.length - a.exercises.length,
  )) {
    const row = journalNode("section", undefined, "journal-topic");
    row.append(
      journalButton(lesson.title, () => showJournalLesson(body, lesson)),
      journalNode("p", `Dernier essai non validé : ${exercises.join(", ")}`),
    );
    body.append(row);
  }
  body.append(journalNode("h3", "Exercices présents dans l’historique"));
  for (const id of new Set(attempts.map((item) => item.exercise))) {
    const item = latest.get(id);
    body.append(
      journalButton(
        `${journalExerciseTitle(id)} · ${item ? (item.success ? "Réussi" : "À revoir") : "Correction indisponible"}`,
        () => {
          renderExerciseHistory(body, id);
          body.prepend(
            journalButton("← Retour au bilan", () =>
              renderLearningReport(body),
            ),
          );
        },
      ),
    );
  }
}
function openLearningJournal(exercise = null) {
  if (!journalAvailable()) return;
  closeLearningJournal();
  closeRevisionLesson();
  const dialog = journalNode("dialog");
  dialog.id = "learning-journal-dialog";
  dialog.setAttribute("aria-labelledby", "learning-journal-title");
  const header = journalNode("div", undefined, "journal-header");
  const title = journalNode(
    "h2",
    exercise ? "Historique de l’exercice" : "Bilan d’apprentissage",
  );
  title.id = "learning-journal-title";
  header.append(title, journalButton("Fermer", closeLearningJournal));
  const body = journalNode("div", undefined, "journal-body");
  const footer = journalNode("footer", undefined, "journal-footer");
  footer.append(
    journalNode(
      "p",
      "Limites : 10 essais par exercice, 100 au total, environ 1,6 Mo de texte. Les plus anciens sont supprimés automatiquement. Effacer l’historique ne touche ni aux réussites ni à l’examen.",
    ),
  );
  let confirmClear = false;
  const clear = journalButton("Effacer l’historique de ce langage", () => {
    if (!confirmClear) {
      confirmClear = true;
      clear.textContent = "Confirmer l’effacement de l’historique";
      return;
    }
    journalRequestSequence++;
    attemptJournal.clear(currentTrack);
    persistPersonal();
    confirmClear = false;
    clear.textContent = "Effacer l’historique de ce langage";
    if (exercise) renderExerciseHistory(body, exercise);
    else renderLearningReport(body);
  });
  footer.append(clear);
  dialog.append(header, body, footer);
  document.body.append(dialog);
  dialog.addEventListener("close", () => {
    journalRequestSequence++;
    dialog.remove();
  });
  if (exercise) renderExerciseHistory(body, exercise);
  else renderLearningReport(body);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else {
    dialog.setAttribute("open", "");
    header.querySelector("button").focus();
  }
}
document
  .getElementById("exercise-history-btn")
  .addEventListener("click", () => {
    if (!trueExamMode && currentExercise)
      openLearningJournal(exId(currentExercise));
  });
for (const id of ["learning-report-btn", "exam-learning-report-btn"])
  document
    .getElementById(id)
    .addEventListener("click", () => openLearningJournal());
