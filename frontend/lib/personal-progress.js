/* Browser-local progress. No account or remote storage is used. */
(function (root) {
  function create(getStorage) {
    const key = "personal-exam-v1";
    let data = { drafts: {}, results: {}, sessions: {} };
    try {
      const saved = JSON.parse(getStorage().getItem(key));
      if (saved && saved.version === 1) {
        for (const field of ["drafts", "results", "sessions"]) {
          if (
            saved[field] &&
            typeof saved[field] === "object" &&
            !Array.isArray(saved[field])
          )
            data[field] = saved[field];
        }
      }
    } catch {
      /* Unavailable or corrupt storage: keep working in memory. */
    }
    const idFor = (track, id) => JSON.stringify([track, id]);
    return {
      draft(track, id, code) {
        const key = idFor(track, id);
        if (code !== undefined) data.drafts[key] = String(code);
        return typeof data.drafts[key] === "string" ? data.drafts[key] : null;
      },
      result(track, id, success) {
        const key = idFor(track, id);
        if (success !== undefined) {
          const previous = data.results[key];
          data.results[key] = {
            attempts: (Number(previous && previous.attempts) || 0) + 1,
            success: !!success,
            updatedAt: new Date().toISOString(),
          };
        }
        return data.results[key] || null;
      },
      session(track, value) {
        const key = idFor(track, "session");
        if (value !== undefined) data.sessions[key] = value;
        return data.sessions[key] || null;
      },
      flush() {
        try {
          getStorage().setItem(key, JSON.stringify({ ...data, version: 1 }));
          return true;
        } catch {
          return false;
        }
      },
    };
  }
  if (typeof module !== "undefined") module.exports = { create };
  else root.PersonalProgress = { create };
})(typeof window !== "undefined" ? window : globalThis);
