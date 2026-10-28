async function fetchTextResource(path) {
  const url = buildLearningUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function buildLearningUrl(path) {
  const normalized = (path || "").replace(/^\//, "");
  const encodedPath = encodeURI(normalized).replace(/#/g, "%23");
  try {
    return new URL("/" + encodedPath, window.location.origin).toString();
  } catch {
    return "/" + encodedPath;
  }
}

function normalizeLesson(raw, idx) {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.id ||
    raw.ID ||
    raw.slug ||
    raw.name ||
    `lesson-${String(idx + 1).padStart(2, "0")}`;
  const title =
    raw.title || raw.Title || raw.name || raw.id || `Leçon ${idx + 1}`;
  const path = raw.path || raw.url || raw.file || raw.href;
  if (!path) return null;
  const slug = raw.slug || slugify(title || id);
  return { id, title, path, slug, track: raw.track || "go" };
}

function renderLearningContent(md) {
  if (!learningContentEl) return;
  const html = markdownToHtml(md || defaultLessonMsg);
  learningContentEl.innerHTML = html || defaultLessonMsg;
  highlightMarkdownCode(learningContentEl);
  revealPanel(learningContentEl);
}

function renderLearningLessons() {
  if (!learningLessonsEl) return;
  learningLessonsEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "header";
  const title = document.createElement("div");
  title.textContent = `Fiches ${{ go: "Go", js: "JavaScript", rust: "Rust", java: "Java" }[currentTrack]}`;
  const count = document.createElement("div");
  count.textContent =
    learningLessons.length > 0 ? `${learningLessons.length}` : "0";
  header.appendChild(title);
  header.appendChild(count);
  learningLessonsEl.appendChild(header);

  if (!learningLessons.length) {
    const empty = document.createElement("div");
    empty.className = "learning-empty";
    empty.innerHTML = `Dépose tes fichiers Markdown dans <code>learning-content/</code> puis référence-les dans <code>manifest.json</code> (clé <code>lessons</code>).`;
    learningLessonsEl.appendChild(empty);
    return;
  }

  learningLessons.forEach((lesson, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lesson-item";
    if (lesson.id === learningCurrentLessonId) {
      btn.classList.add("active");
    }
    const labelId = String(idx + 1).padStart(2, "0");
    btn.textContent = `${labelId} - ${lesson.title}`;
    btn.addEventListener("click", () => {
      selectLearningLesson(lesson.id);
    });
    learningLessonsEl.appendChild(btn);
  });
}

async function loadLearningManifest() {
  learningManifest = revisionCatalog;
  learningLessons = revisionCatalog.lessons
    .filter((lesson) => (lesson.track || "go") === currentTrack)
    .map(normalizeLesson)
    .filter(Boolean);
}

async function loadLearningData() {
  await loadLearningManifest();
  learningLoaded = true;
}

async function revisionMarkdown(lesson) {
  if (typeof learningLessonCache[lesson.id] === "string")
    return learningLessonCache[lesson.id];
  const text = await fetchTextResource(lesson.path);
  learningLessonCache[lesson.id] = text;
  return text;
}

async function selectLearningLesson(lessonId) {
  const lesson = learningLessons.find(
    (l) => l.id === lessonId || l.slug === slugify(lessonId || ""),
  );
  if (!lesson || !learningMode) return;
  const track = currentTrack;
  const request = ++learningRequestSequence;
  learningCurrentLessonId = lesson.id;
  learningSelections[track] = lesson.id;
  renderLearningLessons();
  learningContentEl.textContent = "Chargement de la fiche…";
  try {
    const md = await revisionMarkdown(lesson);
    if (
      request !== learningRequestSequence ||
      !learningMode ||
      currentTrack !== track
    )
      return;
    renderLearningContent(md);
  } catch (error) {
    if (
      request !== learningRequestSequence ||
      !learningMode ||
      currentTrack !== track
    )
      return;
    learningContentEl.textContent =
      "Impossible de charger la fiche. Réessaie ou vérifie que ses fichiers sont présents.";
  }
}

function normalizeLessonPath(p) {
  return decodeURIComponent((p || "").replace(/^\/+/, "").replace(/\\/g, "/"));
}

function findLessonByHref(href) {
  if (!href) return null;
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  // Anchor-only links like #structure-dun-fichier-go
  if (href.startsWith("#")) {
    const frag = href.replace(/^#/, "");
    const targetSlug = slugify(decodeURIComponent(frag));
    return learningLessons.find(
      (lesson) =>
        lesson.slug === targetSlug ||
        slugify(lesson.title) === targetSlug ||
        slugify(lesson.id) === targetSlug,
    );
  }

  const pathFromUrl = normalizeLessonPath(url.pathname);
  const filename = pathFromUrl.split("/").pop();
  return learningLessons.find((lesson) => {
    const lp = normalizeLessonPath(lesson.path);
    const lFile = lp.split("/").pop();
    return lp === pathFromUrl || lFile === filename || lesson.id === href;
  });
}

function setLearningMode(enabled) {
  learningMode = !!enabled;
  renderTrainingGuide(learningMode ? null : currentExercise);
  if (learningMode) {
    editorIdentity = null;
    codeEditorEl.value = "";
    updateHighlight();
    outputEl.textContent = "";
  }
  document.querySelector(".catalog-panel").inert = learningMode;
  if (learningMode) {
    examTitleEl.textContent = "Fiches de révision";
    document.getElementById("exercise-level").textContent = "Apprendre";
  } else if (currentExercise) updateExerciseHeader(currentExercise);
  if (appEl) {
    appEl.classList.toggle("learning-mode", learningMode);
  } else {
    document.body.classList.toggle("learning-mode", learningMode);
  }
  updateModeLabel();
  learningRequestSequence++;
  if (learningMode) {
    const track = currentTrack;
    loadLearningData().then(() => {
      if (!learningMode || currentTrack !== track) return;
      learningCurrentLessonId = learningSelections[track] || null;
      renderLearningLessons();
      const target =
        learningLessons.find((l) => l.id === learningCurrentLessonId) ||
        learningLessons[0];
      if (target) selectLearningLesson(target.id);
      else renderLearningContent(defaultLessonMsg);
    });
  } else renderLearningContent(defaultLessonMsg);
}
