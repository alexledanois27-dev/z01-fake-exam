// Rebuilt on every exercise/mode change: revealed help never follows into an exam.
function renderTrainingGuide(exercise) {
  closeRevisionLesson();
  document.getElementById("exercise-revision-links")?.remove();
  document.getElementById("training-guide")?.remove();
  if (!exercise || trueExamMode || learningMode) return;
  const result = TrainingHints.lookup(trainingGuides, currentTrack, exercise);
  if (result.status === "ready") renderExerciseRevisionLinks(exercise);
  const panel = document.createElement("details");
  panel.id = "training-guide";
  panel.className = "training-guide";
  const summary = document.createElement("summary");
  summary.textContent = "Un coup de pouce ?";
  panel.append(summary);
  const intro = document.createElement("p");
  intro.className = "guide-intro";
  intro.textContent =
    "Des indices progressifs pour comprendre, sans solution à copier.";
  panel.append(intro);
  if (result.status !== "ready") {
    const note = document.createElement("p");
    note.textContent =
      result.status === "stale"
        ? "La consigne a changé : cette fiche doit être actualisée avant de proposer une démarche."
        : "Cet exercice vient d’arriver : sa fiche pédagogique n’est pas encore disponible.";
    panel.append(note);
  } else {
    const guide = result.guide;
    const topics = document.createElement("div");
    topics.className = "guide-topics";
    topics.setAttribute("aria-label", "Notions à connaître");
    for (const topic of guide.topics) {
      const tag = document.createElement("span");
      tag.textContent = topic;
      topics.append(tag);
    }
    panel.append(topics);
    const steps = document.createElement("div");
    steps.className = "guide-steps";
    steps.setAttribute("aria-live", "polite");
    panel.append(steps);
    const content = [
      ["Une piste pour démarrer", [guide.strategy]],
      ["Indice 1", [guide.hints[0]]],
      ["Indice 2", [guide.hints[1]]],
      ["Cas à tester toi-même", guide.checks],
    ];
    let revealed = 0;
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "button button-subtle guide-reveal";
    reveal.textContent = "Voir une première piste";
    reveal.addEventListener("click", () => {
      if (trueExamMode || learningMode || revealed >= content.length) return;
      const [title, lines] = content[revealed++];
      const section = document.createElement("section");
      section.className = "guide-step";
      const heading = document.createElement("h4");
      heading.textContent = title;
      section.append(heading);
      for (const line of lines) {
        const text = document.createElement("p");
        text.textContent = line;
        section.append(text);
      }
      steps.append(section);
      reveal.textContent =
        revealed === 3 ? "Voir les cas à tester" : "Voir l’indice suivant";
      if (revealed === content.length) reveal.remove();
    });
    panel.append(reveal);
    const reference = CodeHints.get(currentTrack, exercise, guide);
    if (reference) {
      const syntax = document.createElement("details");
      syntax.className = "guide-reference guide-syntax";
      const syntaxTitle = document.createElement("summary");
      syntaxTitle.textContent = "Syntaxe et petits exemples";
      syntax.append(syntaxTitle);
      const context = document.createElement("p");
      context.className = "guide-intro";
      context.textContent =
        "Fragments de référence à adapter : ils ne constituent pas un programme complet ni la solution de cet exercice.";
      syntax.append(context);
      if (reference.noLoops) {
        const warning = document.createElement("p");
        warning.className = "guide-warning";
        warning.textContent =
          "Ici, les boucles sont interdites : privilégie la récursion.";
        syntax.append(warning);
      }
      for (const example of reference.examples) {
        const heading = document.createElement("h4");
        heading.textContent = example.title;
        const explanation = document.createElement("p");
        explanation.textContent = example.explanation;
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = example.code;
        pre.append(code);
        syntax.append(heading, explanation, pre);
      }
      const pitfalls = document.createElement("details");
      pitfalls.className = "guide-reference guide-pitfalls";
      const pitfallsTitle = document.createElement("summary");
      pitfallsTitle.textContent = "Pièges fréquents et débogage";
      pitfalls.append(pitfallsTitle);
      const list = document.createElement("ul");
      for (const trap of reference.traps) {
        const item = document.createElement("li");
        item.textContent = trap;
        list.append(item);
      }
      const debug = document.createElement("p");
      debug.textContent =
        "Pour déboguer : relève d’abord la ligne de l’erreur, réduis l’entrée au plus petit cas qui échoue, puis compare les valeurs attendues. Retire les affichages de débogage avant la correction finale.";
      pitfalls.append(list, debug);
      panel.append(syntax, pitfalls);
    }
    if (currentTrack === "go") {
      const tools = TrainingHints.usefulGoTools(exercise);
      const functions = document.createElement("details");
      functions.className = "guide-functions";
      const title = document.createElement("summary");
      title.textContent = "Fonctions autorisées : à quoi servent-elles ?";
      functions.append(title);
      const note = document.createElement("p");
      note.textContent = tools.length
        ? "Ces outils sont autorisés par le catalogue. Choisis ceux utiles à ta démarche ; tu n’as pas besoin de tous les utiliser."
        : "Privilégie les conditions, boucles et opérations du langage. La liste officielle au-dessus de l’énoncé reste la référence pour les appels autorisés.";
      functions.append(note);
      for (const tool of tools) {
        const text = document.createElement("p");
        const code = document.createElement("code");
        code.textContent = tool.name;
        text.append(code, document.createTextNode(" — " + tool.description));
        functions.append(text);
      }
      panel.append(functions);
    }
  }
  statementEl.before(panel);
}
