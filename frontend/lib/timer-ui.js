(function () {
  const timer = ExamTimer.create();
  const panel = document.querySelector(".timer-panel");
  const display = document.getElementById("timer-display");
  const toggle = document.getElementById("timer-toggle");
  const status = document.getElementById("timer-status");
  const notice = document.getElementById("timer-notice");
  const minutes = document.getElementById("timer-minutes");
  let announced = false;
  minutes.value = timer.snapshot().duration / 60000;
  function render() {
    const context = window.getExamTimerContext?.() || { mode: "training" };
    const isExam = context.mode === "exam";
    const strict = isExam && context.kind === "strict" && context.deadline;
    panel.hidden = !strict;
    if (!isExam) {
      if (timer.snapshot().running) timer.pause();
      notice.textContent = "";
      return;
    }
    toggle.hidden = isExam;
    document.getElementById("timer-reset").hidden = isExam;
    document.querySelector(".timer-settings").hidden = isExam;
    if (isExam) {
      if (strict) {
        const remaining = Math.max(
          0,
          Math.min(
            3 * 3600000,
            context.deadline -
              (context.phase === "finished" ? context.finishedAt : Date.now()),
          ),
        );
        display.textContent = ExamTimer.format(remaining);
        display.setAttribute(
          "aria-label",
          "Temps restant : " + display.textContent,
        );
        status.textContent =
          context.phase === "finished"
            ? "Session rendue · 3 h"
            : context.phase === "finishing"
              ? "Correction finale…"
              : "Examen · 3 heures";
        panel.classList.toggle(
          "running",
          context.phase === "running" && remaining > 0,
        );
        panel.classList.toggle("expired", remaining === 0);
        panel.classList.toggle(
          "urgent",
          remaining > 0 && remaining < 5 * 60000,
        );
      }
      return;
    }
    const state = timer.snapshot();
    display.textContent = ExamTimer.format(state.remaining);
    display.setAttribute(
      "aria-label",
      "Temps restant : " + display.textContent,
    );
    toggle.textContent = state.running
      ? "Pause"
      : state.expired
        ? "Recommencer"
        : state.remaining < state.duration
          ? "Reprendre"
          : "Démarrer";
    status.textContent = state.expired
      ? "Temps écoulé"
      : state.running
        ? "Session en cours"
        : state.remaining < state.duration
          ? "En pause"
          : "À ton rythme";
    panel.classList.toggle("running", state.running);
    panel.classList.toggle("expired", state.expired);
    panel.classList.toggle(
      "urgent",
      state.running && state.remaining < 5 * 60000,
    );
    if (state.expired && !announced) {
      notice.textContent =
        "Temps écoulé. Ton code est conservé ; tu peux continuer à t’entraîner.";
      announced = true;
    }
    if (!state.expired && announced) {
      announced = false;
      notice.textContent = "";
    }
  }
  function saved(ok) {
    if (!ok)
      notice.textContent =
        "Le timer fonctionne, mais son état ne peut pas être sauvegardé dans ce navigateur.";
    render();
  }
  toggle.addEventListener(
    "click",
    () =>
      window.getExamTimerContext?.().mode !== "exam" &&
      saved(timer.snapshot().running ? timer.pause() : timer.start()),
  );
  document.getElementById("timer-reset").addEventListener("click", () => {
    if (window.getExamTimerContext?.().mode !== "exam") saved(timer.reset());
  });
  document.getElementById("timer-apply").addEventListener("click", () => {
    if (window.getExamTimerContext?.().mode === "exam") return;
    if (!minutes.checkValidity() || !Number.isInteger(Number(minutes.value))) {
      minutes.reportValidity();
      return;
    }
    saved(timer.configure(minutes.value));
    document.querySelector(".timer-settings").open = false;
  });
  window.addEventListener("exam-state-change", render);
  document.addEventListener("visibilitychange", render);
  setInterval(render, 250);
  render();
})();
