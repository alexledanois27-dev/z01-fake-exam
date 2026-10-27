let isResizing = false;
let currentHandle = null;
let initialSize = 0;
let initialPosition = 0;
const leftPanelEl = document.querySelector(".left-panel");
const editorContainerEl = document.querySelector(".editor-container");
const rightPanelEl = document.querySelector(".right-panel");
const layoutEl = document.querySelector(".layout");
const rootStyle = document.documentElement.style;
const handleWidth = 4;
const handleHeight = 4;
const minLeftWidth = 200;
const minRightWidth = 220; // panel + handle
const minEditorHeight = 140;
const minConsoleHeight = 120;

function applyLeftPanelWidth(px) {
  const safe = Math.max(minLeftWidth, px);
  rootStyle.setProperty("--left-panel-width", `${safe}px`);
}

function applyEditorHeight(px) {
  const safe = Math.max(minEditorHeight, px);
  rootStyle.setProperty("--editor-height", `${safe}px`);
  if (editorContainerEl) {
    editorContainerEl.style.height = `${safe}px`;
    editorContainerEl.style.flexBasis = `${safe}px`;
  }
}

if (layoutEl && leftPanelEl) {
  const layoutWidth =
    layoutEl.getBoundingClientRect().width || window.innerWidth;
  const initial =
    leftPanelEl.getBoundingClientRect().width || layoutWidth * 0.43;
  applyLeftPanelWidth(Math.min(initial, layoutWidth * 0.5));
}
if (rightPanelEl && editorContainerEl) {
  const initialHeight =
    editorContainerEl.getBoundingClientRect().height ||
    rightPanelEl.getBoundingClientRect().height * 0.6;
  applyEditorHeight(initialHeight);
}

// Initialiser les gestionnaires de redimensionnement
document.querySelectorAll(".resize-handle").forEach((handle) => {
  handle.addEventListener("mousedown", startResize);
});

function startResize(e) {
  isResizing = true;
  currentHandle = e.target;
  currentHandle.classList.add("active");

  // Mesures initiales
  if (currentHandle.classList.contains("horizontal")) {
    initialSize = editorContainerEl
      ? editorContainerEl.getBoundingClientRect().height
      : 0;
    initialPosition = e.clientY;
  } else {
    initialSize = leftPanelEl ? leftPanelEl.getBoundingClientRect().width : 0;
    initialPosition = e.clientX;
  }

  // Ajout temporaire des écouteurs
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResize);
}

function resize(e) {
  if (!isResizing) return;

  if (currentHandle && currentHandle.classList.contains("horizontal")) {
    if (!rightPanelEl || !editorContainerEl) return;
    const delta = e.clientY - initialPosition;
    const panelHeight =
      rightPanelEl.getBoundingClientRect().height || window.innerHeight;
    const maxHeight = Math.max(
      minEditorHeight,
      panelHeight - minConsoleHeight - handleHeight,
    );
    const newHeight = Math.max(
      minEditorHeight,
      Math.min(initialSize + delta, maxHeight),
    );
    applyEditorHeight(newHeight);
    return;
  }

  // Redimensionnement horizontal (énoncé vs éditeur)
  if (!leftPanelEl || !rightPanelEl) return;
  const delta = e.clientX - initialPosition;
  const layoutWidth = layoutEl
    ? layoutEl.getBoundingClientRect().width
    : window.innerWidth;
  const maxWidth = Math.max(
    minLeftWidth,
    layoutWidth - minRightWidth - handleWidth,
  );
  const newWidth = Math.max(
    minLeftWidth,
    Math.min(initialSize + delta, maxWidth),
  );
  applyLeftPanelWidth(newWidth);
}

function stopResize() {
  isResizing = false;
  if (currentHandle) {
    currentHandle.classList.remove("active");
    currentHandle = null;
  }
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResize);
}

// --- Redimensionnement Learning (liste vs contenu) ---
let isLearningResizing = false;
let learningHandle = null;
let learningInitialSize = 0;
let learningInitialPosition = 0;

const learningLayoutEl = document.querySelector(".learning-layout");
const learningSidebarEl = document.querySelector(".learning-sidebar");

document
  .querySelectorAll(".learning-resize-handle.vertical")
  .forEach((handle) => {
    handle.addEventListener("mousedown", startLearningResize);
  });

function startLearningResize(e) {
  isLearningResizing = true;
  learningHandle = e.target;
  learningHandle.classList.add("active");

  learningInitialSize = learningSidebarEl ? learningSidebarEl.offsetWidth : 0;
  learningInitialPosition = e.clientX;

  document.addEventListener("mousemove", resizeLearning);
  document.addEventListener("mouseup", stopLearningResize);
}

function resizeLearning(e) {
  if (!isLearningResizing) return;
  if (!learningLayoutEl || !learningSidebarEl) return;

  const delta = e.clientX - learningInitialPosition;
  const maxWidth = learningLayoutEl.offsetWidth - 200;
  const newWidth = Math.max(
    200,
    Math.min(learningInitialSize + delta, maxWidth),
  );
  learningSidebarEl.style.width = newWidth + "px";
}

function stopLearningResize() {
  isLearningResizing = false;
  if (learningHandle) {
    learningHandle.classList.remove("active");
    learningHandle = null;
  }
  document.removeEventListener("mousemove", resizeLearning);
  document.removeEventListener("mouseup", stopLearningResize);
}
