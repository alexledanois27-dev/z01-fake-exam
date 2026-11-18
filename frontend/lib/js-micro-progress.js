/* This local teaching progress is separate from checkpoint/exam scores. */
(function (root) {
  function create({ plan, getStorage = () => root.localStorage }) {
    const lessons = plan.modules.flatMap((m) => m.lessons);
    const ids = new Set(lessons.map((l) => l.id));
    const key = "z01-js-micro-path-v1";
    let saved = true;
    let data = { version: 1, selected: lessons[0].id, items: {} };
    try {
      const raw = JSON.parse(getStorage().getItem(key));
      if (raw?.version === 1) {
        if (ids.has(raw.selected)) data.selected = raw.selected;
        for (const lesson of lessons) {
          const item = raw.items?.[lesson.id];
          if (!item || typeof item !== "object") continue;
          data.items[lesson.id] = {
            draft:
              typeof item.draft === "string" && item.draft.length <= 8000
                ? item.draft
                : lesson.starter,
            completed: item.completed === true,
            lastPassed: item.lastPassed === true,
            assisted: item.assisted === true,
            solutionSeen: item.solutionSeen === true,
            hints: Number.isInteger(item.hints)
              ? Math.min(lesson.hints.length, Math.max(0, item.hints))
              : 0,
            attempts: Number.isInteger(item.attempts)
              ? Math.min(999, Math.max(0, item.attempts))
              : 0,
          };
        }
      }
    } catch (error) {
      saved = error?.name === "SyntaxError";
    }
    function item(id) {
      if (!ids.has(id)) return null;
      if (!data.items[id])
        data.items[id] = {
          draft: lessons.find((l) => l.id === id).starter,
          completed: false,
          lastPassed: false,
          assisted: false,
          solutionSeen: false,
          hints: 0,
          attempts: 0,
        };
      return data.items[id];
    }
    function flush() {
      try {
        getStorage().setItem(key, JSON.stringify(data));
        saved = true;
      } catch {
        saved = false;
      }
      return saved;
    }
    return {
      selected: () => data.selected,
      select(id) {
        if (ids.has(id)) {
          data.selected = id;
          flush();
        }
      },
      state(id) {
        const row = item(id);
        return row ? { ...row } : null;
      },
      saveDraft(id, code) {
        const row = item(id);
        if (!row || typeof code !== "string") return false;
        if (code.length > 8000) {
          saved = false;
          return false;
        }
        if (row.draft !== code) row.lastPassed = false;
        row.draft = code;
        return flush();
      },
      hint(id) {
        const row = item(id);
        if (!row) return;
        row.hints = Math.min(
          row.hints + 1,
          lessons.find((l) => l.id === id).hints.length,
        );
        flush();
      },
      reveal(id) {
        const row = item(id);
        if (row) {
          row.solutionSeen = true;
          flush();
        }
      },
      record(id, code, success, assisted) {
        const row = item(id);
        if (!row || typeof success !== "boolean") return false;
        row.attempts = Math.min(row.attempts + 1, 999);
        row.lastPassed = success && row.draft === code;
        if (success) {
          row.completed = true;
          row.assisted = assisted === true;
        }
        return flush();
      },
      retry(id) {
        const row = item(id);
        if (!row) return;
        row.draft = lessons.find((l) => l.id === id).starter;
        row.lastPassed = false;
        row.solutionSeen = false;
        row.hints = 0;
        flush();
      },
      summary() {
        return {
          total: lessons.length,
          completed: lessons.filter((l) => item(l.id).completed).length,
          independent: lessons.filter(
            (l) => item(l.id).completed && !item(l.id).assisted,
          ).length,
        };
      },
      recommend() {
        return lessons.find((l) => !item(l.id).completed)?.id || data.selected;
      },
      saved: () => saved,
      clear() {
        data = { version: 1, selected: lessons[0].id, items: {} };
        flush();
      },
    };
  }
  if (typeof module !== "undefined") module.exports = { create };
  else root.JSMicroProgress = { create };
})(typeof window !== "undefined" ? window : globalThis);
