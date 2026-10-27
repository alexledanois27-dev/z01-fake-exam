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
  return { id, title, path, slug };
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
  title.textContent = "Leçons";
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
    const labelId = lesson.id || idx + 1;
    btn.textContent = `${labelId} - ${lesson.title}`;
    btn.addEventListener("click", () => {
      selectLearningLesson(lesson.id);
    });
    learningLessonsEl.appendChild(btn);
  });
}

function renderJsLearningLessons() {
  if (!learningLessonsEl) return;
  learningLessonsEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "header";
  const title = document.createElement("div");
  title.textContent = "Leçons JS";
  const count = document.createElement("div");
  count.textContent = `${jsLearningLessons.length}`;
  header.appendChild(title);
  header.appendChild(count);
  learningLessonsEl.appendChild(header);

  jsLearningLessons.forEach((lesson) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lesson-item";
    if (lesson.id === jsLearningCurrentLessonId) {
      btn.classList.add("active");
    }
    btn.textContent = `${lesson.id} - ${lesson.title}`;
    btn.addEventListener("click", () => {
      selectJsLearningLesson(lesson.id);
    });
    learningLessonsEl.appendChild(btn);
  });
}

function selectJsLearningLesson(lessonId) {
  const lesson =
    jsLearningLessons.find((l) => l.id === lessonId) || jsLearningLessons[0];
  if (!lesson) return;
  jsLearningCurrentLessonId = lesson.id;
  renderJsLearningLessons();
  renderLearningContent(lesson.content);
}

async function loadLearningManifest() {
  try {
    const res = await fetch("/learning-content/manifest.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    learningManifest = data || {};
    const lessons = Array.isArray(learningManifest.lessons)
      ? learningManifest.lessons
      : [];
    learningLessons = lessons
      .map((l, i) => normalizeLesson(l, i))
      .filter(Boolean);
  } catch (e) {
    learningManifest = null;
    learningLessons = [];
    console.warn("Impossible de charger le manifest learning:", e.message || e);
  }
}

async function loadLearningData() {
  if (learningLoaded) return;
  learningLoaded = true;
  await loadLearningManifest();
}

async function selectLearningLesson(lessonId) {
  let lesson = learningLessons.find((l) => l.id === lessonId);
  if (!lesson) {
    const slugId = slugify(lessonId || "");
    lesson = learningLessons.find((l) => l.slug === slugId);
  }
  if (!lesson) return;
  learningCurrentLessonId = lesson.id;
  renderLearningLessons();
  if (learningContentEl) {
    learningContentEl.textContent = "Chargement de la leçon...";
  }
  try {
    const cached = learningLessonCache[lesson.id];
    const md =
      cached || (await fetchTextResource("/" + lesson.path.replace(/^\//, "")));
    learningLessonCache[lesson.id] = md;
    renderLearningContent(md);
  } catch (e) {
    renderLearningContent(
      `Impossible de charger la leçon ${lesson.id} (${lesson.path}) : ${e.message}`,
    );
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
  if (learningMode) {
    if (isJsTrack()) {
      const target =
        jsLearningCurrentLessonId ||
        (jsLearningLessons[0] && jsLearningLessons[0].id);
      renderJsLearningLessons();
      if (target) {
        selectJsLearningLesson(target);
      } else {
        renderLearningContent("# Learning JS\n\nAucune leçon JS disponible.");
      }
      return;
    }
    if (isRustTrack()) {
      renderLearningLessons();
      renderLearningContent(
        "# Apprentissage Rust\n\nLe parcours Rust est disponible en mode Examen et Vrai examen, avec les énoncés et images officielles Zone01.",
      );
      return;
    }
    if (isJavaTrack()) {
      renderLearningLessons();
      renderLearningContent(
        "# Apprentissage Java\n\nLe parcours Java est disponible en mode Examen et Vrai examen, avec les énoncés et images officielles Zone01.",
      );
      return;
    }
    loadLearningData().then(() => {
      if (!learningLessons.length) {
        renderLearningLessons();
        renderLearningContent(learningSource || defaultLearningMd);
        return;
      }
      const hasCurrent = learningLessons.some(
        (lesson) => lesson.id === learningCurrentLessonId,
      );
      const targetId = hasCurrent
        ? learningCurrentLessonId
        : learningLessons[0].id;
      selectLearningLesson(targetId);
    });
  } else {
    renderLearningContent(defaultLessonMsg);
  }
}
