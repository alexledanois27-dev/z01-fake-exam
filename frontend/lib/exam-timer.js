/* Deadline-based timer: closing the tab does not stop a running session. */
(function (root) {
  function create({
    getStorage = () => root.localStorage,
    now = () => Date.now(),
  } = {}) {
    const key = "personal-exam-timer-v1";
    const validDuration = (value) =>
      Number.isInteger(value) && value >= 60000 && value <= 480 * 60000;
    let state = {
      duration: 120 * 60000,
      remaining: 120 * 60000,
      deadline: null,
    };
    try {
      const saved = JSON.parse(getStorage().getItem(key));
      if (
        saved &&
        saved.version === 1 &&
        validDuration(saved.duration) &&
        Number.isFinite(saved.remaining) &&
        saved.remaining >= 0 &&
        saved.remaining <= saved.duration &&
        (saved.deadline === null ||
          (Number.isFinite(saved.deadline) &&
            saved.deadline <= now() + saved.duration))
      ) {
        state = {
          duration: saved.duration,
          remaining: saved.remaining,
          deadline: saved.deadline,
        };
      }
    } catch {
      /* Timer remains usable when storage is unavailable. */
    }
    function remaining() {
      return state.deadline === null
        ? state.remaining
        : Math.max(0, Math.min(state.duration, state.deadline - now()));
    }
    function save() {
      try {
        getStorage().setItem(key, JSON.stringify({ ...state, version: 1 }));
        return true;
      } catch {
        return false;
      }
    }
    return {
      snapshot() {
        const left = remaining();
        return {
          duration: state.duration,
          remaining: left,
          running: state.deadline !== null && left > 0,
          expired: left === 0,
        };
      },
      start() {
        const left = remaining();
        state.remaining = left > 0 ? left : state.duration;
        state.deadline = now() + state.remaining;
        return save();
      },
      pause() {
        state.remaining = remaining();
        state.deadline = null;
        return save();
      },
      reset() {
        state.remaining = state.duration;
        state.deadline = null;
        return save();
      },
      configure(minutes) {
        const duration = Number(minutes) * 60000;
        if (!Number.isInteger(Number(minutes)) || !validDuration(duration))
          return false;
        state = { duration, remaining: duration, deadline: null };
        return save();
      },
    };
  }
  function format(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return [
      Math.floor(seconds / 3600),
      Math.floor((seconds % 3600) / 60),
      seconds % 60,
    ]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  }
  if (typeof module !== "undefined") module.exports = { create, format };
  else root.ExamTimer = { create, format };
})(typeof window !== "undefined" ? window : globalThis);
