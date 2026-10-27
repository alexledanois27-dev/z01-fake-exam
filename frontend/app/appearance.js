// Appearance preferences are browser-local and never change exercise results.
const accentInputs = Array.from(
  document.querySelectorAll('#accent-theme input[name="accent"]'),
);
const accentMenu = document.getElementById("accent-menu");
const accentMenuToggle = accentMenu.querySelector("summary");
const accentNames = ["yellow", "gray", "blue", "green", "red", "violet"];
function applyAccent(value) {
  const accent = accentNames.includes(value) ? value : "yellow";
  document.documentElement.dataset.accent = accent;
  for (const input of accentInputs) input.checked = input.value === accent;
  const selected = accentInputs.find((input) => input.checked);
  accentMenuToggle.setAttribute(
    "aria-label",
    "Choisir la nuance : " + selected.getAttribute("aria-label"),
  );
}
try {
  applyAccent(window.localStorage.getItem("z01fakeexam-accent"));
} catch {
  applyAccent("yellow");
}
for (const input of accentInputs) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    applyAccent(input.value);
    accentMenu.open = false;
    accentMenuToggle.focus();
    try {
      window.localStorage.setItem("z01fakeexam-accent", input.value);
    } catch {}
  });
}

document.addEventListener("click", (event) => {
  if (!accentMenu.contains(event.target)) accentMenu.open = false;
});
accentMenu.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accentMenu.open) {
    event.preventDefault();
    accentMenu.open = false;
    accentMenuToggle.focus();
  }
});
accentMenu.addEventListener("focusout", (event) => {
  if (!accentMenu.contains(event.relatedTarget)) accentMenu.open = false;
});

let confettiTimeout = null;
function celebrateExercise() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document.getElementById("success-confetti")?.remove();
  window.clearTimeout(confettiTimeout);
  const layer = document.createElement("div");
  layer.id = "success-confetti";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 44; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${8 + Math.random() * 84}%`;
    piece.style.setProperty("--rise", `${55 + Math.random() * 35}vh`);
    piece.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
    piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 180}ms`;
    piece.style.animationDuration = `${1100 + Math.random() * 600}ms`;
    layer.append(piece);
  }
  document.body.append(layer);
  confettiTimeout = window.setTimeout(() => layer.remove(), 2100);
}
