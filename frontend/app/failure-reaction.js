const failureReactions = [
  {src: "assets/wrong-answer-office.gif", alt: "Michael Scott s’exclame : non !", caption: "Non, pas ce bug… On respire et on retente."},
  {src: "assets/wrong-answer-fine.gif", alt: "Le chien This is fine au milieu des flammes", caption: "Tout va bien. Enfin… on va regarder la console."},
  {src: "assets/wrong-answer-disappointed.gif", alt: "Une réaction de déception", caption: "Le test n’est pas convaincu. Encore un petit ajustement."},
  {
    src: "assets/wrong-answer.gif",
    alt: "Picard fait un facepalm",
    caption: "Ça arrive. On corrige et on recommence !",
  },
  {
    src: "assets/wrong-answer-math.gif",
    alt: "Une femme réfléchit avec des équations autour d’elle",
    caption: "On pose le problème et on reprend étape par étape.",
  },
  {
    src: "assets/wrong-answer-travolta.gif",
    alt: "John Travolta regarde autour de lui, perplexe",
    caption: "Le résultat s’est égaré. Les indices sont dans la console.",
  },
];
let reactionBag = [];
let lastReaction = null;
function nextFailureReaction() {
  if (!reactionBag.length) {
    reactionBag = [...failureReactions];
    for (let i = reactionBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reactionBag[i], reactionBag[j]] = [reactionBag[j], reactionBag[i]];
    }
    if (reactionBag[0] === lastReaction)
      [reactionBag[0], reactionBag[1]] = [reactionBag[1], reactionBag[0]];
  }
  lastReaction = reactionBag.shift();
  return lastReaction;
}

// Reactions belong to the visible correction, never to transport errors or examples.
function showFailureReaction() {
  const selected = nextFailureReaction();
  const reaction = document.createElement("span");
  reaction.className = "failure-reaction";
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion) {
    const still = document.createElement("span");
    still.className = "failure-reaction-still";
    still.setAttribute("role", "img");
    still.setAttribute("aria-label", "Facepalm");
    still.textContent = "🤦";
    reaction.append(still);
  } else {
    const gif = document.createElement("img");
    gif.src = selected.src;
    gif.alt = selected.alt;
    gif.width = 128;
    gif.height = 100;
    gif.addEventListener("error", () => gif.remove(), { once: true });
    reaction.append(gif);
  }
  const content = document.createElement("span");
  content.className = "failure-reaction-content";
  const caption = document.createElement("span");
  caption.textContent = selected.caption;
  const hide = document.createElement("button");
  hide.type = "button";
  hide.className = "text-button";
  hide.textContent = "Masquer la réaction";
  hide.addEventListener("click", () => reaction.remove());
  content.append(caption, hide);
  reaction.append(content);
  outputEl.append(document.createTextNode("\n"), reaction);
}
