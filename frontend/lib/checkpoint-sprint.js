/* Local prototype evidence only: no code, answers to exercises, or exam scores. */
(function (root) {
  const DAY = 24 * 60 * 60 * 1000;
  function create({
    plan,
    getStorage = () => root.localStorage,
    now = () => Date.now(),
  }) {
    const key = "z01-js-checkpoint-sprint-v1";
    const ids = new Set(plan.days.flatMap((day) => day.exercises));
    let state = { version: 1, day: 1, answers: {}, attempts: [] };
    let saved = true;
    try {
      const raw = JSON.parse(getStorage().getItem(key));
      if (raw?.version === 1) {
        if (Number.isInteger(raw.day) && raw.day >= 1 && raw.day <= 7)
          state.day = raw.day;
        for (const question of plan.questions) {
          const value = raw.answers?.[question.id];
          if (
            Number.isInteger(value) &&
            value >= 0 &&
            value < question.choices.length
          )
            state.answers[question.id] = value;
        }
        state.attempts = (Array.isArray(raw.attempts) ? raw.attempts : [])
          .slice(-200)
          .filter(
            (a) =>
              ids.has(a?.id) &&
              typeof a.success === "boolean" &&
              typeof a.assisted === "boolean" &&
              Number.isFinite(a.at) &&
              a.at >= 0 &&
              a.at <= now(),
          )
          .map(({ id, success, assisted, at }) => ({
            id,
            success,
            assisted,
            at,
          }));
      }
    } catch (error) {
      saved = error?.name === "SyntaxError";
      /* Absent/corrupt storage does not block training. */
    }
    const flush = () => {
      try {
        getStorage().setItem(key, JSON.stringify(state));
        saved = true;
      } catch {
        saved = false;
      }
      return saved;
    };
    function evidence(id) {
      const rows = state.attempts.filter((a) => a.id === id);
      const last = rows.at(-1);
      const failed = rows.findLastIndex((a) => !a.success);
      const clean = rows
        .slice(failed + 1)
        .filter((a) => a.success && !a.assisted);
      const consolidated =
        clean.length >= 2 && clean.at(-1).at - clean[0].at >= DAY;
      return {
        status: !last
          ? "new"
          : !last.success
            ? "review"
            : consolidated
              ? "consolidated"
              : clean.length
                ? "independent"
                : "guided",
        due:
          last?.success && clean.length && !consolidated
            ? clean[0].at + DAY
            : null,
        attempts: rows.length,
      };
    }
    return {
      day: () => state.day,
      selectDay(day) {
        if (Number.isInteger(day) && day >= 1 && day <= 7) {
          state.day = day;
          flush();
        }
      },
      answer(id, value) {
        const q = plan.questions.find((q) => q.id === id);
        if (
          !q ||
          !Number.isInteger(value) ||
          value < 0 ||
          value >= q.choices.length
        )
          return;
        state.answers[id] = value;
        flush();
      },
      diagnostic() {
        const answered = plan.questions.filter((q) =>
          Object.hasOwn(state.answers, q.id),
        );
        const missed = answered.filter((q) => state.answers[q.id] !== q.answer);
        return {
          answers: { ...state.answers },
          total: plan.questions.length,
          answered: answered.length,
          correct: answered.length - missed.length,
          suggestedDay:
            answered.length < plan.questions.length
              ? 1
              : Math.min(...missed.map((q) => q.day), 3),
        };
      },
      record({ id, success, assisted }) {
        if (
          !ids.has(id) ||
          typeof success !== "boolean" ||
          typeof assisted !== "boolean"
        )
          return false;
        state.attempts.push({ id, success, assisted, at: now() });
        state.attempts = state.attempts
          .filter(
            (a, i, all) =>
              all.slice(i + 1).filter((b) => b.id === a.id).length < 6,
          )
          .slice(-200);
        return flush();
      },
      evidence,
      summary() {
        const rows = [...ids].map((id) => ({ id, ...evidence(id) }));
        return {
          total: rows.length,
          independent: rows.filter((r) =>
            ["independent", "consolidated"].includes(r.status),
          ).length,
          consolidated: rows.filter((r) => r.status === "consolidated").length,
          review: rows.filter(
            (r) => r.status === "review" || (r.due && r.due <= now()),
          ),
          rows,
        };
      },
      saved: () => saved,
      clear() {
        state = { version: 1, day: 1, answers: {}, attempts: [] };
        return flush();
      },
    };
  }
  if (typeof module !== "undefined") module.exports = { create, DAY };
  else root.CheckpointSprint = { create, DAY };
})(typeof window !== "undefined" ? window : globalThis);
