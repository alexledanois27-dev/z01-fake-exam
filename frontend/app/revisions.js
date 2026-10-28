let revisionRequestSequence = 0;
function closeRevisionLesson() {
  revisionRequestSequence++;
  const dialog = document.getElementById("revision-dialog");
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  dialog.remove();
}
function renderExerciseRevisionLinks(exercise) {
  const ids =
    revisionCatalog.exerciseLinks[currentTrack]?.[exId(exercise)] || [];
  const lessons = ids
    .map((id) =>
      revisionCatalog.lessons.find(
        (l) => l.id === id && l.track === currentTrack,
      ),
    )
    .filter(Boolean);
  if (!lessons.length) return;
  const section = document.createElement("section");
  section.id = "exercise-revision-links";
  section.className = "revision-links";
  section.setAttribute("aria-label", "Fiches utiles pour cet exercice");
  const title = document.createElement("span");
  title.className = "revision-links-label";
  title.textContent = "Fiches utiles";
  section.append(title);
  for (const lesson of lessons) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "revision-link";
    button.dataset.lessonId = lesson.id;
    button.textContent = lesson.title;
    button.addEventListener("click", () => openRevisionLesson(lesson.id));
    section.append(button);
  }
  statementEl.before(section);
}
async function openRevisionLesson(id) {
  if (trueExamMode || learningMode) return;
  const lesson = revisionCatalog.lessons.find(
    (l) => l.id === id && l.track === currentTrack,
  );
  if (!lesson) return;
  closeRevisionLesson();
  const request = ++revisionRequestSequence;
  const dialog = document.createElement("dialog");
  dialog.id = "revision-dialog";
  dialog.setAttribute("aria-labelledby", "revision-dialog-title");
  const header = document.createElement("div");
  header.className = "revision-dialog-header";
  const title = document.createElement("h2");
  title.id = "revision-dialog-title";
  title.textContent = lesson.title;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Fermer la fiche";
  close.addEventListener("click", closeRevisionLesson);
  header.append(title, close);
  const content = document.createElement("article");
  content.className = "markdown-viewer revision-dialog-content";
  content.textContent = "Chargement de la fiche…";
  dialog.append(header, content);
  document.body.append(dialog);
  dialog.addEventListener("close", () => {
    revisionRequestSequence++;
    dialog.remove();
  });
  if (typeof dialog.showModal === "function") dialog.showModal();
  else {
    dialog.setAttribute("open", "");
    close.focus();
  }
  try {
    const md = await revisionMarkdown(lesson);
    if (
      request !== revisionRequestSequence ||
      !dialog.isConnected ||
      trueExamMode ||
      learningMode
    )
      return;
    content.innerHTML = markdownToHtml(md);
    highlightMarkdownCode(content);
  } catch (error) {
    if (request === revisionRequestSequence && dialog.isConnected)
      content.textContent =
        "Impossible de charger cette fiche. Vérifie les fichiers locaux puis réessaie.";
  }
}
