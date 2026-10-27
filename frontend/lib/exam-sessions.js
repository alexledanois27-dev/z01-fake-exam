/* Exam sessions never read training drafts or training results. */
(function (root) {
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  function create({
    getStorage = () => root.localStorage,
    now = () => Date.now(),
    idFactory,
  } = {}) {
    const key = "personal-exam-sessions-v2";
    let sequence = 0;
    const uid =
      idFactory ||
      (() => `${now()}-${++sequence}-${Math.random().toString(36).slice(2)}`);
    let sessions = {};
    try {
      const saved = JSON.parse(getStorage().getItem(key));
      if (
        saved &&
        saved.version === 2 &&
        saved.sessions &&
        typeof saved.sessions === "object"
      )
        sessions = saved.sessions;
    } catch {
      /* Keep working in memory. */
    }
    const scope = (track, kind) => JSON.stringify([track, kind]);
    function valid(s) {
      return (
        s &&
        typeof s.id === "string" &&
        ["free", "strict"].includes(s.kind) &&
        Array.isArray(s.series) &&
        s.series.length > 0 &&
        s.series.length <= 10 &&
        s.series.every((id) => typeof id === "string") &&
        new Set(s.series).size === s.series.length &&
        Number.isInteger(s.index) &&
        s.index >= 0 &&
        s.index < s.series.length &&
        ["running", "finishing", "finished"].includes(s.phase) &&
        Number.isFinite(s.startedAt) &&
        (s.kind === "free"
          ? s.deadline === null
          : s.deadline === s.startedAt + THREE_HOURS) &&
        s.drafts &&
        typeof s.drafts === "object" &&
        s.results &&
        typeof s.results === "object" &&
        s.skipped
      );
    }
    const currentId = (s) => s.series[s.index];
    const expired = (s) => s.kind === "strict" && now() >= s.deadline;
    const tested = (s, id) =>
      !!s.results[id] &&
      typeof s.results[id].success === "boolean" &&
      s.results[id].code === (s.drafts[id] || "");
    const passed = (s, id) => tested(s, id) && s.results[id].success;
    function flush() {
      try {
        getStorage().setItem(key, JSON.stringify({ version: 2, sessions }));
        return true;
      } catch {
        return false;
      }
    }
    return {
      current(track, kind) {
        const s = sessions[scope(track, kind)];
        return valid(s) ? s : null;
      },
      start(track, kind, series) {
        if (
          !["free", "strict"].includes(kind) ||
          !Array.isArray(series) ||
          !series.length ||
          series.length > 10 ||
          new Set(series).size !== series.length
        )
          throw Error("Série invalide");
        const startedAt = now();
        const s = {
          id: uid(),
          track,
          kind,
          series: [...series],
          index: 0,
          phase: "running",
          startedAt,
          deadline: kind === "strict" ? startedAt + THREE_HOURS : null,
          drafts: {},
          results: {},
          skipped: {},
          finishedAt: null,
          finishReason: null,
        };
        sessions[scope(track, kind)] = s;
        flush();
        return s;
      },
      draft(s, id, code) {
        if (
          code !== undefined &&
          s.phase === "running" &&
          !expired(s) &&
          currentId(s) === id
        ) {
          s.drafts[id] = String(code);
          flush();
        }
        return typeof s.drafts[id] === "string" ? s.drafts[id] : "";
      },
      record(s, id, code, success, output = "", hardcoding = null) {
        if (s.phase === "finished" || !s.series.includes(id)) return false;
        const previous = s.results[id];
        s.results[id] = {
          code,
          success: typeof success === "boolean" ? success : null,
          output: String(output).slice(0, 8000),
          attempts: (previous?.attempts || 0) + 1,
          hardcoding,
        };
        flush();
        return true;
      },
      tested,
      passed,
      expired,
      advance(s, skip = false) {
        if (s.phase !== "running" || expired(s)) return false;
        const id = currentId(s);
        if (skip && s.kind !== "free") return false;
        if (!skip && !passed(s, id)) return false;
        if (skip) s.skipped[id] = true;
        if (s.index === s.series.length - 1) {
          flush();
          return "end";
        }
        s.index++;
        flush();
        return true;
      },
      lock(s, reason) {
        if (s.phase === "finished") return;
        s.phase = "finishing";
        s.finishReason = reason;
        flush();
      },
      finish(s, reason) {
        s.phase = "finished";
        s.finishReason = reason;
        s.finishedAt = reason === "timeout" ? s.deadline : now();
        flush();
      },
      summary(s) {
        const rows = s.series.slice(0, s.index + 1).map((id) => ({
          id,
          status: passed(s, id)
            ? "passed"
            : s.skipped[id]
              ? "skipped"
              : tested(s, id)
                ? "failed"
                : s.results[id]?.success === null &&
                    s.results[id].code === (s.drafts[id] || "")
                  ? "error"
                  : "unsubmitted",
        }));
        return {
          total: s.series.length,
          rows,
          passed: rows.filter((r) => r.status === "passed").length,
          skipped: rows.filter((r) => r.status === "skipped").length,
          errors: rows.filter((r) => r.status === "error").length,
          unseen: s.series.length - rows.length,
        };
      },
      flush,
    };
  }
  if (typeof module !== "undefined") module.exports = { create, THREE_HOURS };
  else root.ExamSessions = { create, THREE_HOURS };
})(typeof window !== "undefined" ? window : globalThis);
