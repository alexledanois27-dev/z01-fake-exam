// Appearance preferences are browser-local and never change exercise results.
const accentInputs = Array.from(
  document.querySelectorAll('#accent-theme input[name="accent"]'),
);
const accentMenu = document.getElementById("accent-menu");
const accentMenuToggle = accentMenu.querySelector("summary");
const accentNames = ["yellow", "gray", "blue", "green", "red", "violet"];
const customAccentColor = document.getElementById("custom-accent-color");
const customAccentHex = document.getElementById("custom-accent-hex");
const presetColors = {
  yellow: "#f4cf00",
  gray: "#9098a3",
  blue: "#2986ff",
  green: "#00c968",
  red: "#ff3b45",
  violet: "#9855ff",
};
function accentColorComponents(hex) {
  const rgb = [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  if (delta) {
    if (max === rgb[0]) hue = ((rgb[1] - rgb[2]) / delta) % 6;
    else if (max === rgb[1]) hue = (rgb[2] - rgb[0]) / delta + 2;
    else hue = (rgb[0] - rgb[1]) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  const linear = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  const luminance =
    linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const whiteInk =
    1.05 / (luminance + 0.05) > (luminance + 0.05) / (0.0052 + 0.05);
  return { hue, saturation, whiteInk };
}
function applyAccent(value) {
  const custom = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  const accent = custom
    ? value.toLowerCase()
    : accentNames.includes(value)
      ? value
      : "yellow";
  const root = document.documentElement;
  root.dataset.accent = custom ? "custom" : accent;
  for (const property of [
    "--accent",
    "--accent-hue",
    "--theme-chroma",
    "--accent-ink",
    "--accent-logo-filter",
  ])
    root.style.removeProperty(property);
  if (custom) {
    const { hue, saturation } = accentColorComponents(accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-hue", String(hue));
    root.style.setProperty("--theme-chroma", String(saturation));
  }
  const { whiteInk } = accentColorComponents(
    custom ? accent : presetColors[accent],
  );
  root.style.setProperty("--accent-ink", whiteInk ? "#ffffff" : "#101010");
  root.style.setProperty(
    "--accent-logo-filter",
    whiteInk ? "brightness(0) invert(1)" : "brightness(0)",
  );
  for (const input of accentInputs) input.checked = input.value === accent;
  const selected = accentInputs.find((input) => input.checked);
  customAccentColor.value = custom ? accent : presetColors[accent];
  customAccentHex.value = customAccentColor.value;
  customAccentHex.setCustomValidity("");
  accentMenuToggle.setAttribute(
    "aria-label",
    "Choisir la nuance : " +
      (custom ? accent : selected.getAttribute("aria-label")),
  );
  return accent;
}
function saveAccent(value) {
  const accent = applyAccent(value);
  try {
    window.localStorage.setItem("z01fakeexam-accent", accent);
  } catch {}
}
customAccentColor.addEventListener("input", () =>
  saveAccent(customAccentColor.value),
);
customAccentColor.addEventListener("change", () =>
  saveAccent(customAccentColor.value),
);
customAccentHex.addEventListener("input", () =>
  customAccentHex.setCustomValidity(""),
);
document
  .getElementById("custom-accent-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const hex = customAccentHex.value.trim();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      customAccentHex.setCustomValidity("Utilise un code comme #2986ff.");
      customAccentHex.reportValidity();
      return;
    }
    saveAccent(hex);
  });
try {
  applyAccent(window.localStorage.getItem("z01fakeexam-accent"));
} catch {
  applyAccent("yellow");
}
for (const input of accentInputs) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    saveAccent(input.value);
    accentMenu.open = false;
    accentMenuToggle.focus();
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
  if (event.relatedTarget && !accentMenu.contains(event.relatedTarget))
    accentMenu.open = false;
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
