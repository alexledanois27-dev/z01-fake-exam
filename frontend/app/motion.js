// Decorative only: navigation and focus never wait for an animation.
const panelMotions = new WeakMap();
function revealPanel(element) {
  if (
    !element?.animate ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  )
    return;
  panelMotions.get(element)?.cancel();
  const animation = element.animate(
    [
      { opacity: 0.65, transform: "translateY(5px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 180, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
  panelMotions.set(element, animation);
}
