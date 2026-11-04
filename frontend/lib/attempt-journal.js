/* Bounded browser-local correction history. No editor drafts or remote account. */
(function (root) {
  const KEY = "z01-attempt-journal-v1";
  const LIMITS = {
    total: 100,
    perExercise: 10,
    characters: 800000,
    code: 24000,
    output: 8000,
  };
  const tracks = ["go", "js", "rust", "java"];
  function create(getStorage = () => root.localStorage) {
    let items = [],
      sequence = 0,
      dirty = false;
    function normalize(raw) {
      if (
        !raw ||
        !tracks.includes(raw.track) ||
        typeof raw.exercise !== "string" ||
        !raw.exercise ||
        typeof raw.code !== "string" ||
        ![true, false, null].includes(raw.success) ||
        !Number.isFinite(raw.at)
      )
        return null;
      const session =
        typeof raw.session === "string" ? raw.session.slice(0, 200) : "";
      return {
        id:
          typeof raw.id === "string"
            ? raw.id.slice(0, 200)
            : `${Date.now()}-${++sequence}`,
        track: raw.track,
        exercise: raw.exercise.slice(0, 200),
        at: raw.at,
        session,
        released: !session || raw.released === true,
        code: raw.code.slice(0, LIMITS.code),
        output: String(raw.output || "").slice(0, LIMITS.output),
        truncated:
          raw.truncated === true ||
          raw.code.length > LIMITS.code ||
          String(raw.output || "").length > LIMITS.output,
        success: raw.success,
      };
    }
    function trim() {
      const kept = [],
        counts = new Map();
      let size = 0;
      for (const item of [...items].reverse()) {
        const key = JSON.stringify([item.track, item.exercise]);
        const length = JSON.stringify(item).length;
        if (
          (counts.get(key) || 0) >= LIMITS.perExercise ||
          kept.length >= LIMITS.total ||
          size + length > LIMITS.characters
        )
          continue;
        kept.push(item);
        counts.set(key, (counts.get(key) || 0) + 1);
        size += length;
      }
      items = kept.reverse();
    }
    try {
      const saved = JSON.parse(getStorage().getItem(KEY));
      if (saved?.version === 1 && Array.isArray(saved.items))
        items = saved.items.slice(-1000).map(normalize).filter(Boolean);
      trim();
    } catch {
      /* Corrupt/unavailable storage: use memory. */
    }
    return {
      add(value) {
        const item = normalize({
          ...value,
          id: `${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`,
          at: Date.now(),
          released: !value.session,
        });
        if (!item) return false;
        items.push(item);
        dirty = true;
        trim();
        return true;
      },
      releaseExam(session) {
        for (const item of items)
          if (item.session === session && !item.released) {
            item.released = true;
            dirty = true;
          }
      },
      list(track, exercise) {
        return items
          .filter(
            (item) =>
              item.track === track &&
              item.released &&
              (!exercise || item.exercise === exercise),
          )
          .slice()
          .reverse()
          .map((item) => ({ ...item }));
      },
      clear(track) {
        dirty = true;
        items = items.filter((item) => item.track !== track);
      },
      flush() {
        if (!dirty) return true;
        try {
          getStorage().setItem(KEY, JSON.stringify({ version: 1, items }));
          dirty = false;
          return true;
        } catch {
          return false;
        }
      },
    };
  }
  if (typeof module !== "undefined") module.exports = { create, LIMITS };
  else root.AttemptJournal = { create, LIMITS };
})(typeof window !== "undefined" ? window : globalThis);
