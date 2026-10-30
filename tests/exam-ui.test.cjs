const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("node:assert/strict");
const root =
  require("node:path").resolve(__dirname, "..") + require("node:path").sep;
const tick = () => new Promise((r) => setTimeout(r, 10));
const fixtures = [
  { id: "only1", title: "only1", statement: "# only1" },
  { id: "countalpha", title: "countalpha", statement: "# countalpha" },
  {
    id: "lastword",
    title: "lastword",
    statement: "# lastword",
    example: "package main\nfunc main() {}\n",
  },
];
async function boot(saved = {}, defer = false, catalogs = null) {
  const dom = new JSDOM(fs.readFileSync(root + "index.html", "utf8"), {
    url: "http://localhost:8092",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  let now = 1700000000000;
  const intervals = [];
  const requests = [];
  let release;
  w.Date.now = () => now;
  w.setInterval = (fn) => {
    intervals.push(fn);
    return intervals.length;
  };
  for (const [k, v] of Object.entries(saved)) w.localStorage.setItem(k, v);
  w.fetch = async (url, opts) => {
    const resource = decodeURIComponent(
      new URL(String(url), "http://localhost:8092").pathname,
    );
    if (resource.startsWith("/learning-content/")) {
      const path = require("node:path").resolve(root, "." + resource);
      if (!path.startsWith(root) || !fs.existsSync(path))
        return { ok: false, status: 404 };
      return {
        ok: true,
        text: async () => fs.readFileSync(path, "utf8"),
        json: async () => JSON.parse(fs.readFileSync(path, "utf8")),
      };
    }
    if (url === "/api/run") {
      const body = JSON.parse(opts.body);
      requests.push(body);
      const data = {
        success: body.code.startsWith("correct"),
        output: body.code.startsWith("correct")
          ? "OK: validé"
          : "Tests échoués",
      };
      const response = { ok: true, status: 200, json: async () => data };
      if (defer) return new Promise((r) => (release = () => r(response)));
      return response;
    }
    return {
      ok: true,
      json: async () =>
        catalogs
          ? catalogs[
              new URL(url, "http://localhost").searchParams.get("track") || "go"
            ] || []
          : url.includes("track=")
            ? []
            : fixtures,
    };
  };
  // Use the real HTML entrypoint so new scripts cannot be forgotten by tests.
  const scripts = Array.from(w.document.querySelectorAll("script[src]"), (el) =>
    el.getAttribute("src"),
  ).filter((name) => name !== "vendor/editor.bundle.js");
  for (const name of scripts)
    w.eval(fs.readFileSync(root + name.split("?")[0], "utf8"));
  await tick();
  return {
    dom,
    w,
    requests,
    release: () => release(),
    advance(ms) {
      now += ms;
      intervals.forEach((fn) => fn());
    },
    snapshot: () =>
      Object.fromEntries(
        Array.from({ length: w.localStorage.length }, (_, i) => {
          const k = w.localStorage.key(i);
          return [k, w.localStorage.getItem(k)];
        }),
      ),
  };
}
const click = (w, selector) => w.document.querySelector(selector).click();
const draft = (w, code) => {
  const el = w.document.getElementById("code-editor");
  el.value = code;
  el.dispatchEvent(new w.Event("input", { bubbles: true }));
};
const el = (w, id) => w.document.getElementById(id);
const assertNoFuture = (w) => {
  assert.equal(w.document.querySelectorAll(".exercise-chip").length, 0);
  assert.equal(el(w, "exercise-chips").textContent, "");
};
require("node:test")(
  "independent exam sessions, hidden exercises, free/strict flow, expiry and reports",
  async () => {
    let env = await boot();
    let w = env.w;
    assert.equal(w.document.querySelector(".timer-panel").hidden, true);
    draft(w, "correct TRAINING SECRET");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    click(w, "#mode-true-exam");
    assert.equal(el(w, "exam-lobby").hidden, false);
    assertNoFuture(w);
    click(w, "#exam-start");
    assert.equal(el(w, "code-editor").value, "");
    assert.equal(el(w, "true-exam-next").disabled, true);
    assert.equal(w.document.querySelector(".timer-panel").hidden, true);
    assertNoFuture(w);
    draft(w, "FREE DRAFT");
    click(w, "#exam-skip");
    assert.equal(el(w, "exam-title").textContent, "countalpha");
    assert.equal(el(w, "code-editor").value, "");
    assertNoFuture(w);
    click(w, "#exam-submit");
    await tick();
    assert.equal(el(w, "exam-report").hidden, false);
    assert.equal(
      el(w, "exam-report-score").textContent,
      "0 / 3 exercices validés",
    );
    assert.ok(!el(w, "exam-report-results").textContent.includes("lastword"));
    click(w, "#mode-learning");
    await tick();
    assert.equal(el(w, "exam-report").hidden, true);
    assert.equal(el(w, "exam-lobby").hidden, true);
    assert.equal(el(w, "exam-title").textContent, "Fiches de révision");
    assert.equal(w.document.querySelector(".exam-complete"), null);
    click(w, "#mode-true-exam");
    assert.equal(el(w, "exam-report").hidden, false);
    click(w, "#exam-report-training");
    assert.equal(el(w, "code-editor").value, "");
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    click(w, "#mode-true-exam");
    click(w, "#exam-report-new");
    click(w, 'input[name="exam-kind"][value="strict"]');
    click(w, "#exam-start");
    assert.equal(el(w, "code-editor").value, "");
    assert.equal(el(w, "timer-display").textContent, "03:00:00");
    assert.equal(el(w, "exam-skip").hidden, true);
    assert.equal(el(w, "timer-toggle").hidden, true);
    assert.equal(el(w, "timer-reset").hidden, true);
    // Even a synthetic event on the hidden control cannot skip a strict exam.
    el(w, "exam-skip").dispatchEvent(
      new w.MouseEvent("click", { bubbles: true }),
    );
    assert.equal(el(w, "exam-title").textContent, "only1");
    draft(w, "correct EXAM");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "true-exam-next").disabled, false);
    draft(w, "changed");
    assert.equal(el(w, "true-exam-next").disabled, true);
    draft(w, "correct EXAM");
    click(w, "#true-exam-next");
    assert.equal(el(w, "exam-title").textContent, "countalpha");
    assert.equal(el(w, "code-editor").value, "");
    draft(w, "correct FINAL");
    click(w, "#exam-submit");
    await tick();
    assert.equal(el(w, "exam-report").hidden, false);
    assert.equal(
      el(w, "exam-report-score").textContent,
      "2 / 3 exercices validés",
    );
    assert.equal(env.requests.at(-1).code, "correct FINAL");
    assert.equal(el(w, "code-editor").readOnly, true);
    let saved = env.snapshot();
    env.dom.window.close();
    env = await boot(saved);
    w = env.w;
    assert.equal(el(w, "exam-report").hidden, false);
    assert.equal(
      el(w, "exam-report-score").textContent,
      "2 / 3 exercices validés",
    );
    click(w, "#exam-report-training");
    assert.equal(el(w, "code-editor").value, "");
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    env.dom.window.close();
    // Pending submission at deadline: freeze immediately, finish after its response, never submit twice.
    env = await boot({}, true);
    w = env.w;
    click(w, "#mode-true-exam");
    click(w, 'input[name="exam-kind"][value="strict"]');
    click(w, "#exam-start");
    draft(w, "correct PENDING");
    env.advance(15000);
    click(w, "#run-btn");
    env.advance(3 * 3600000 + 1);
    assert.equal(el(w, "code-editor").readOnly, true);
    assert.equal(el(w, "exam-report").hidden, true);
    env.release();
    await tick();
    assert.equal(el(w, "exam-report").hidden, false);
    assert.equal(
      el(w, "exam-report-score").textContent,
      "1 / 3 exercices validés",
    );
    assert.equal(env.requests.length, 1);
    env.dom.window.close();
    // Deadline submits an unsent frozen draft once.
    env = await boot();
    w = env.w;
    click(w, "#mode-true-exam");
    click(w, 'input[name="exam-kind"][value="strict"]');
    click(w, "#exam-start");
    draft(w, "correct UNSENT");
    env.advance(3 * 3600000 + 1);
    await tick();
    assert.equal(
      el(w, "exam-report-score").textContent,
      "1 / 3 exercices validés",
    );
    assert.equal(env.requests.length, 1);
    assert.equal(el(w, "timer-display").textContent, "00:00:00");
    env.dom.window.close();
    console.log(
      "PASS: training isolation, hidden exercises, free skip, strict 3h/no-skip, changed drafts, final submission, report, reload and pending/unsent expiry.",
    );
  },
);

require("node:test")(
  "example output never counts as training or exam validation",
  async () => {
    const env = await boot();
    const w = env.w;
    click(w, '[data-id="lastword"]');
    draft(w, "correct sample");
    assert.equal(el(w, "example-btn").disabled, false);
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(env.requests.at(-1).mode, "preview");
    assert.match(el(w, "output").textContent, /sans validation/);
    assert.match(el(w, "progress-label").textContent, /0 \/ 3/);
    click(w, "#mode-true-exam");
    click(w, 'input[name="exam-kind"][value="strict"]');
    click(w, "#exam-start");
    for (let i = 0; i < 2; i++) {
      draft(w, "correct submitted");
      env.advance(15000);
      click(w, "#run-btn");
      await tick();
      click(w, "#true-exam-next");
    }
    assert.equal(el(w, "exam-title").textContent, "lastword");
    draft(w, "correct sample only");
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(el(w, "true-exam-next").disabled, true);
    click(w, "#exam-submit");
    await tick();
    assert.equal(env.requests.at(-1).mode, undefined);
    assert.equal(
      el(w, "exam-report-score").textContent,
      "3 / 3 exercices validés",
    );
    env.dom.window.close();
  },
);

require("node:test")(
  "preview sends literal arguments without configurable harness overrides",
  async () => {
    const env = await boot();
    const w = env.w;
    click(w, '[data-id="lastword"]');
    draft(w, "correct sample");
    assert.equal(el(w, "example-source").textContent, fixtures[2].example);
    assert.equal(el(w, "test-mode"), null);
    el(w, "program-args").value = `"hello world" 42 "" '$(id)'`;

    env.advance(15000);

    click(w, "#example-btn");
    await tick();
    assert.deepEqual(env.requests.at(-1).args, [
      "hello world",
      "42",
      "",
      "$(id)",
    ]);
    assert.deepEqual(Object.keys(env.requests.at(-1)).sort(), [
      "args",
      "code",
      "exerciseId",
      "mode",
    ]);
    env.dom.window.close();
  },
);

require("node:test")(
  "training navigation clears code but retains successful exercises",
  async () => {
    let env = await boot();
    let w = env.w;
    draft(w, "correct only1");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    click(w, '[data-id="countalpha"]');
    assert.equal(el(w, "code-editor").value, "");
    draft(w, "another draft");
    click(w, '[data-id="only1"]');
    assert.equal(el(w, "code-editor").value, "");
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    draft(w, "must not return after reload");
    const saved = env.snapshot();
    env.dom.window.close();
    env = await boot(saved);
    w = env.w;
    assert.equal(el(w, "code-editor").value, "");
    assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    env.dom.window.close();
  },
);

require("node:test")(
  "training guides reveal progressively, reset on navigation and never enter exams",
  async () => {
    const catalogs = require("./fixtures/training-exercises.json");
    const env = await boot({}, false, catalogs);
    const w = env.w;
    click(w, '[data-id="only1"]');
    let panel = el(w, "training-guide");
    assert.ok(panel);
    assert.equal(panel.open, false);
    const syntax = panel.querySelector(".guide-syntax");
    const pitfalls = panel.querySelector(".guide-pitfalls");
    assert.ok(syntax && pitfalls);
    assert.equal(syntax.open, false);
    assert.equal(pitfalls.open, false);
    assert.ok(syntax.querySelector("pre code").textContent);
    assert.match(syntax.textContent, /PrintRune/);
    assert.match(pitfalls.textContent, /affichage/);
    assert.equal(el(w, "code-editor").value, "");
    const guide = require("../frontend/hints/go.json").only1;
    assert.ok(!panel.textContent.includes(guide.strategy));
    panel.open = true;
    click(w, ".guide-reveal");
    assert.match(panel.textContent, /programme principal/);
    assert.ok(!panel.textContent.includes(guide.hints[0]));
    click(w, ".guide-reveal");
    click(w, ".guide-reveal");
    click(w, ".guide-reveal");
    assert.ok(panel.textContent.includes(guide.checks[0]));
    assert.equal(panel.querySelector(".guide-reveal"), null);
    assert.equal(env.requests.length, 0);
    click(w, '[data-id="countalpha"]');
    panel = el(w, "training-guide");
    assert.equal(panel.open, false);
    assert.equal(panel.querySelectorAll(".guide-step").length, 0);
    click(w, "#mode-true-exam");
    assert.equal(el(w, "training-guide"), null);
    click(w, "#exam-start");
    assert.equal(el(w, "training-guide"), null);
    click(w, "#mode-exam");
    assert.ok(el(w, "training-guide"));
    click(w, "#mode-learning");
    await tick();
    assert.equal(el(w, "training-guide"), null);
    env.dom.window.close();
  },
);
require("node:test")(
  "each language displays its own guide and stale or unknown statements get no advice",
  async () => {
    const catalogs = require("./fixtures/training-exercises.json");
    for (const track of ["go", "js", "rust", "java"]) {
      const env = await boot({ "z02intra-track-mode": track }, false, catalogs);
      const w = env.w;
      const panel = el(w, "training-guide");
      assert.ok(panel, track);
      assert.ok(panel.querySelector(".guide-reveal"), track);
      assert.equal(panel.open, false);
      env.dom.window.close();
    }
    const env = await boot();
    const panel = el(env.w, "training-guide");
    assert.match(panel.textContent, /consigne a changé/);
    assert.equal(panel.querySelector(".guide-reveal"), null);
    click(env.w, '[data-id="lastword"]');
    assert.equal(
      el(env.w, "training-guide").querySelector(".guide-reveal"),
      null,
    );
    env.dom.window.close();
  },
);

require("node:test")(
  "failure meme belongs only to failed corrections and clears with the console",
  async () => {
    const env = await boot();
    const w = env.w;
    draft(w, "wrong answer");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.ok(
      el(w, "output").querySelector(
        '.failure-reaction img[src^="assets/wrong-answer"]',
      ),
    );
    click(w, ".failure-reaction button");
    assert.equal(el(w, "output").querySelector(".failure-reaction"), null);
    assert.match(el(w, "output").textContent, /Tests échoués/);
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    click(w, "#clear-console");
    assert.equal(el(w, "output").querySelector("img"), null);
    draft(w, "correct answer");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "output").querySelector(".failure-reaction"), null);
    click(w, '[data-id="lastword"]');
    draft(w, "wrong example");
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(el(w, "output").querySelector(".failure-reaction"), null);
    w.fetch = async () => {
      throw Error("offline");
    };
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "output").querySelector(".failure-reaction"), null);
    assert.match(el(w, "output").textContent, /Correction indisponible/);
    env.dom.window.close();
  },
);
require("node:test")(
  "reduced motion replaces the animated reaction with a still symbol",
  async () => {
    const env = await boot();
    const w = env.w;
    w.matchMedia = () => ({ matches: true });
    draft(w, "wrong answer");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.ok(el(w, "output").querySelector(".failure-reaction-still"));
    assert.equal(el(w, "output").querySelector("img"), null);
    click(w, '[data-id="countalpha"]');
    assert.equal(el(w, "output").querySelector(".failure-reaction"), null);
    env.dom.window.close();
  },
);

require("node:test")(
  "failure reactions rotate through all GIFs without consecutive repeats",
  async () => {
    const env = await boot();
    const w = env.w;
    w.Math.random = () => 0;
    const sources = [];
    for (let i = 0; i < 18; i++) {
      draft(w, "wrong answer");
      env.advance(15000);
      click(w, "#run-btn");
      await tick();
      const image = el(w, "output").querySelector(".failure-reaction img");
      assert.ok(image);
      sources.push(image.getAttribute("src"));
    }
    for (let i = 1; i < sources.length; i++)
      assert.notEqual(sources[i], sources[i - 1]);
    for (let i = 0; i < sources.length; i += 6)
      assert.equal(new Set(sources.slice(i, i + 6)).size, 6);
    env.dom.window.close();
  },
);

require("node:test")(
  "accent choice persists, validates stored values and preserves progress",
  async () => {
    let env = await boot();
    let w = env.w;
    for (const accent of ["gray", "blue", "green", "red", "violet", "yellow"]) {
      click(w, `#accent-theme input[value="${accent}"]`);
      assert.equal(w.document.documentElement.dataset.accent, accent);
      assert.equal(w.localStorage.getItem("z01fakeexam-accent"), accent);
    }
    click(w, '#accent-theme input[value="blue"]');
    const saved = env.snapshot();
    env.dom.window.close();
    env = await boot(saved);
    w = env.w;
    assert.equal(w.document.documentElement.dataset.accent, "blue");
    assert.equal(
      w.document.querySelector("#accent-theme input:checked").value,
      "blue",
    );
    assert.equal(
      w.document.querySelectorAll("#accent-theme input:checked").length,
      1,
    );
    assert.equal(
      w.document.querySelectorAll(
        '#accent-theme input[type="radio"][aria-label]',
      ).length,
      6,
    );
    assert.match(el(w, "progress-label").textContent, /0 \/ 3/);
    env.dom.window.close();
    env = await boot({ "z01fakeexam-accent": "unexpected" });
    assert.equal(env.w.document.documentElement.dataset.accent, "yellow");
    env.dom.window.close();
  },
);
require("node:test")(
  "confetti celebrates a new validation, never failure, repeated success or an example",
  async () => {
    const env = await boot();
    const w = env.w;
    let cleanup;
    w.setTimeout = (fn) => {
      cleanup = fn;
      return 42;
    };
    draft(w, "wrong answer");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "success-confetti"), null);
    draft(w, "correct answer");
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "success-confetti").children.length, 44);
    assert.equal(el(w, "success-confetti").getAttribute("aria-hidden"), "true");
    cleanup();
    assert.equal(el(w, "success-confetti"), null);
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "success-confetti"), null);
    click(w, '[data-id="lastword"]');
    draft(w, "correct example");
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(el(w, "success-confetti"), null);
    w.matchMedia = () => ({ matches: true });
    env.advance(15000);
    click(w, "#run-btn");
    await tick();
    assert.equal(el(w, "success-confetti"), null);
    env.dom.window.close();
  },
);

require("node:test")(
  "color dropdown closes on selection, Escape and outside click",
  async () => {
    const env = await boot();
    const w = env.w;
    const menu = el(w, "accent-menu");
    const toggle = menu.querySelector("summary");
    assert.equal(menu.open, false);
    menu.open = true;
    click(w, '#accent-theme input[value="violet"]');
    assert.equal(menu.open, false);
    assert.equal(w.document.documentElement.dataset.accent, "violet");
    assert.match(toggle.getAttribute("aria-label"), /Violet/);
    assert.equal(w.document.activeElement, toggle);
    menu.open = true;
    menu.dispatchEvent(
      new w.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(menu.open, false);
    menu.open = true;
    el(w, "exam-title").click();
    assert.equal(menu.open, false);
    env.dom.window.close();
  },
);

require("node:test")(
  "preview without a statement example and invalid Args never submit",
  async () => {
    const env = await boot();
    const w = env.w;
    draft(w, "correct program");
    assert.equal(el(w, "example-btn").disabled, false);
    el(w, "program-args").value = '"unfinished';
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(env.requests.length, 0);
    assert.match(el(w, "output").textContent, /guillemets/);
    el(w, "program-args").value = 'one "two words"';
    env.advance(15000);
    click(w, "#example-btn");
    await tick();
    assert.equal(env.requests.at(-1).mode, "preview");
    assert.deepEqual(env.requests.at(-1).args, ["one", "two words"]);
    assert.match(el(w, "progress-label").textContent, /0 \/ 3/);
    click(w, '[data-id="lastword"]');
    assert.equal(el(w, "program-args").value, "");
    env.dom.window.close();
  },
);

require("node:test")(
  "strict exam locks navigation and requires fullscreen until submission",
  async () => {
    const env = await boot();
    const w = env.w;
    let fullscreen = null;
    let requested = 0;
    Object.defineProperty(w.document, "fullscreenElement", {
      get: () => fullscreen,
      configurable: true,
    });
    w.document.documentElement.requestFullscreen = async () => {
      requested++;
      fullscreen = w.document.documentElement;
      w.document.dispatchEvent(new w.Event("fullscreenchange"));
    };
    w.document.exitFullscreen = async () => {
      fullscreen = null;
      w.document.dispatchEvent(new w.Event("fullscreenchange"));
    };
    click(w, "#mode-true-exam");
    click(w, 'input[name="exam-kind"][value="strict"]');
    click(w, "#exam-start");
    await tick();
    assert.equal(requested, 1);
    assert.equal(w.document.querySelector(".mode-switch").hidden, true);
    assert.equal(w.document.querySelector(".track-switch").hidden, true);
    assert.equal(el(w, "mode-exam").disabled, true);
    assert.equal(el(w, "mode-learning").disabled, true);
    el(w, "mode-learning").dispatchEvent(
      new w.Event("change", { bubbles: true }),
    );
    assert.equal(el(w, "exam-title").textContent, "only1");
    assert.equal(el(w, "app").classList.contains("learning-mode"), false);
    const unload = new w.Event("beforeunload", { cancelable: true });
    w.dispatchEvent(unload);
    assert.equal(unload.defaultPrevented, true);
    fullscreen = null;
    w.document.dispatchEvent(new w.Event("fullscreenchange"));
    assert.equal(el(w, "exam-focus-panel").hidden, false);
    assert.equal(w.document.querySelector("#app").inert, true);
    el(w, "exam-focus-panel").querySelector("button").click();
    await tick();
    assert.equal(el(w, "exam-focus-panel").hidden, true);
    Object.defineProperty(w.document, "hidden", {
      value: true,
      configurable: true,
    });
    w.document.dispatchEvent(new w.Event("visibilitychange"));
    Object.defineProperty(w.document, "hidden", {
      value: false,
      configurable: true,
    });
    w.document.dispatchEvent(new w.Event("visibilitychange"));
    assert.equal(el(w, "exam-focus-panel").hidden, false);
    el(w, "exam-focus-panel").querySelector("button").click();
    await tick();
    assert.equal(el(w, "exam-focus-panel").hidden, true);
    click(w, "#exam-submit");
    await tick();
    assert.equal(el(w, "exam-focus-panel").hidden, true);
    assert.equal(fullscreen, null);
    assert.equal(w.document.querySelector(".mode-switch").hidden, false);
    assert.equal(w.document.querySelector(".track-switch").hidden, false);
    assert.equal(el(w, "mode-learning").disabled, false);
    click(w, "#mode-learning");
    await tick();
    assert.equal(el(w, "app").classList.contains("learning-mode"), true);
    env.dom.window.close();
  },
);

require("node:test")(
  "successful exam correction advances automatically but previews never advance",
  async () => {
    const env = await boot();
    const w = env.w;
    click(w, "#mode-true-exam");
    click(w, "#exam-start");
    draft(w, "correct program");
    env.advance(15000);
    click(w, "#example-btn");
    await new Promise((r) => setTimeout(r, 1000));
    assert.equal(el(w, "exam-title").textContent, "only1");
    env.advance(15000);
    click(w, "#run-btn");
    await new Promise((r) => setTimeout(r, 1000));
    assert.equal(el(w, "exam-title").textContent, "countalpha");
    assert.equal(el(w, "code-editor").value, "");
    draft(w, "wrong");
    env.advance(15000);
    click(w, "#run-btn");
    await new Promise((r) => setTimeout(r, 1000));
    assert.equal(el(w, "exam-title").textContent, "countalpha");
    env.dom.window.close();
  },
);

require("node:test")(
  "independent Tester and execution cooldowns enforce their deadlines",
  async () => {
    const env = await boot();
    const w = env.w;
    draft(w, "correct program");
    el(w, "example-btn").click();
    await tick();
    assert.equal(el(w, "example-btn").disabled, true);
    assert.match(el(w, "example-btn").textContent, /10s/);
    el(w, "example-btn").dispatchEvent(
      new w.MouseEvent("click", { bubbles: true }),
    );
    await tick();
    assert.equal(env.requests.length, 1);
    el(w, "run-btn").click();
    await tick();
    assert.equal(env.requests.length, 2);
    assert.match(el(w, "run-btn").textContent, /15s/);
    env.advance(10000);
    assert.equal(el(w, "example-btn").disabled, false);
    assert.equal(el(w, "run-btn").disabled, true);
    assert.match(el(w, "run-btn").textContent, /5s/);
    env.advance(5000);
    assert.equal(el(w, "run-btn").disabled, false);
    env.dom.window.close();
  },
);

require("node:test")(
  "majority brute-force suspicion only decorates the exam report and survives reload",
  async () => {
    let env = await boot();
    let w = env.w;
    click(w, "#mode-true-exam");
    click(w, "#exam-start");
    for (let i = 0; i < 3; i++) {
      draft(
        w,
        i < 2
          ? "correct\n" +
              Array.from(
                { length: 6 },
                (_, n) => `if n==${n} {return ${n + 1}}`,
              ).join("\n")
          : "correct ordinary solution",
      );
      env.advance(15000);
      click(w, "#run-btn");
      await tick();
      click(w, "#true-exam-next");
      await tick();
    }
    assert.equal(
      el(w, "exam-report-score").textContent,
      "3 / 3 exercices validés",
    );
    assert.match(el(w, "exam-brute-force-note").textContent, /2 \/ 3/);
    assert.equal(el(w, "exam-brute-force-reaction").hidden, false);
    assert.match(
      el(w, "exam-brute-force-reaction").querySelector("img").src,
      /brute-force-result.png$/,
    );
    const saved = env.snapshot();
    env.dom.window.close();
    env = await boot(saved);
    w = env.w;
    assert.equal(el(w, "exam-brute-force-reaction").hidden, false);
    assert.match(el(w, "exam-brute-force-note").textContent, /2 \/ 3/);
    env.dom.window.close();
  },
);
require("node:test")(
  "statement provenance distinguishes API and dated offline snapshots for Go",
  async () => {
    const env = await boot({}, false, {
      go: [
        {
          ...fixtures[0],
          statementSource: "local",
          snapshotDate: "2026-10-28T08:00:00Z",
        },
        { ...fixtures[1], statementSource: "zone01-api" },
      ],
    });
    const w = env.w;
    assert.match(
      el(w, "statement-source").textContent,
      /copie locale.*2026-10-28/,
    );
    click(w, '[data-id="countalpha"]');
    assert.match(el(w, "statement-source").textContent, /API Zone01/);
    env.dom.window.close();
  },
);
require("node:test")(
  "training references open real lessons without changing code and disappear in exams",
  async () => {
    const catalogs = require("./fixtures/training-exercises.json");
    for (const track of ["go", "js", "rust", "java"]) {
      const env = await boot({ "z02intra-track-mode": track }, false, catalogs);
      const w = env.w;
      const references = el(w, "exercise-revision-links");
      assert.ok(references, track);
      draft(w, "MY CODE TO KEEP");
      const before = el(w, "exam-title").textContent;
      references.querySelector("button").click();
      await tick();
      const dialog = el(w, "revision-dialog");
      assert.ok(dialog?.open, track);
      assert.ok(dialog.querySelector("article").textContent.length > 100);
      assert.ok(!dialog.textContent.includes("Impossible de charger"));
      assert.equal(el(w, "code-editor").value, "MY CODE TO KEEP");
      assert.equal(el(w, "exam-title").textContent, before);
      dialog.querySelector("button").click();
      assert.equal(el(w, "revision-dialog"), null);
      assert.equal(el(w, "code-editor").value, "MY CODE TO KEEP");
      references.querySelector("button").click();
      await tick();
      click(w, "#mode-true-exam");
      assert.equal(el(w, "revision-dialog"), null);
      assert.equal(el(w, "exercise-revision-links"), null);
      click(w, "#exam-start");
      assert.equal(el(w, "exercise-revision-links"), null);
      env.dom.window.close();
    }
  },
);
require("node:test")(
  "revision tab filters its lessons by language and loads real Markdown",
  async () => {
    const catalogs = require("./fixtures/training-exercises.json");
    const env = await boot({}, false, catalogs);
    const w = env.w;
    for (const [track, count] of [
      ["go", 34],
      ["js", 11],
      ["rust", 12],
      ["java", 13],
    ]) {
      click(w, "#track-" + track);
      click(w, "#mode-learning");
      await tick();
      const buttons = el(w, "learning-lessons").querySelectorAll("button");
      assert.equal(buttons.length, count, track);
      assert.equal(
        el(w, "exam-title").textContent,
        "Fiches de révision",
        track,
      );
      assert.ok(el(w, "learning-content").querySelector("h1"), track);
      assert.ok(
        !el(w, "learning-content").textContent.includes(
          "Impossible de charger",
        ),
        track,
      );
      buttons[buttons.length - 1].click();
      await tick();
      assert.ok(el(w, "learning-content").querySelector("h1"), track);
      click(w, "#mode-exam");
    }
    env.dom.window.close();
  },
);

require("node:test")(
  "changing language preserves the active tab instead of restoring its previous tab",
  async () => {
    const catalogs = require("./fixtures/training-exercises.json");
    const env = await boot({}, false, catalogs);
    const w = env.w;
    try {
      // Give JavaScript an exam history, then leave it in training.
      click(w, "#track-js");
      click(w, "#mode-true-exam");
      click(w, "#exam-start");
      click(w, "#exam-submit");
      await tick();
      click(w, "#mode-exam");
      click(w, "#track-go");
      click(w, "#mode-learning");
      for (const track of ["js", "rust", "java", "go"]) {
        click(w, "#track-" + track);
        await tick();
        assert.equal(el(w, "mode-learning").checked, true, track);
        assert.equal(
          el(w, "exam-title").textContent,
          "Fiches de révision",
          track,
        );
        assert.equal(el(w, "exam-report").hidden, true, track);
      }
      click(w, "#mode-exam");
      for (const track of ["js", "rust", "java", "go"]) {
        click(w, "#track-" + track);
        assert.equal(el(w, "mode-exam").checked, true, track);
      }
      click(w, "#mode-true-exam");
      click(w, "#track-rust");
      assert.equal(el(w, "mode-true-exam").checked, true);
      assert.equal(el(w, "exam-lobby").hidden, false);
    } finally {
      env.dom.window.close();
    }
  },
);

require("node:test")(
  "JavaScript level filters use official groups, including offline and unknown entries",
  async () => {
    const catalogs = {
      ...require("./fixtures/training-exercises.json"),
      js: require("../catalog-snapshots/js.json").exercises,
    };
    const env = await boot({}, false, catalogs);
    const w = env.w;
    try {
      click(w, "#track-js");
      assert.equal(
        w.document.querySelectorAll("#level-filters button").length,
        8,
      );
      for (let level = 1; level <= 7; level++) {
        click(w, `#level-filters [data-filter="${level}"]`);
        const visible = [...w.document.querySelectorAll(".exercise-chip")]
          .map((node) => node.dataset.id)
          .sort();
        const expected = catalogs.js
          .filter((ex) => ex.level === level)
          .map((ex) => ex.id)
          .sort();
        assert.ok(expected.length > 0);
        assert.deepEqual(visible, expected);
        assert.equal(el(w, "exercise-level").textContent, `Niveau ${level}`);
      }
      click(w, '#level-filters [data-filter="all"]');
      assert.equal(w.document.querySelectorAll(".exercise-chip").length, 31);
    } finally {
      env.dom.window.close();
    }
    const unknown = await boot({}, false, {
      ...catalogs,
      js: [{ id: "new-js", title: "New JS", statement: "new subject" }],
    });
    try {
      click(unknown.w, "#track-js");
      assert.equal(
        unknown.w.document.querySelectorAll("#level-filters button").length,
        2,
      );
      click(unknown.w, '#level-filters [data-filter="unclassified"]');
      assert.equal(
        unknown.w.document.querySelectorAll(".exercise-chip").length,
        1,
      );
      assert.equal(el(unknown.w, "exercise-level").textContent, "Sans niveau");
    } finally {
      unknown.dom.window.close();
    }
  },
);

require("node:test")(
  "custom accent accepts precise colors, restores them and clears overrides for presets",
  async () => {
    let env = await boot();
    let w = env.w;
    const applyHex = (hex) => {
      el(w, "custom-accent-hex").value = hex;
      el(w, "custom-accent-form").dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
    };
    for (const hex of ["#000000", "#ffffff", "#808080", "#E85D04"]) {
      applyHex(hex);
      const root = w.document.documentElement;
      assert.equal(root.dataset.accent, "custom");
      assert.equal(root.style.getPropertyValue("--accent"), hex.toLowerCase());
      assert.ok(
        Number.isFinite(Number(root.style.getPropertyValue("--accent-hue"))),
      );
      assert.ok(
        Number.isFinite(Number(root.style.getPropertyValue("--theme-chroma"))),
      );
      assert.equal(
        w.localStorage.getItem("z01fakeexam-accent"),
        hex.toLowerCase(),
      );
    }
    applyHex("#000000");
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-ink"),
      "#ffffff",
    );
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-logo-filter"),
      "brightness(0) invert(1)",
    );
    applyHex("#ffffff");
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-logo-filter"),
      "brightness(0)",
    );
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-ink"),
      "#101010",
    );
    applyHex("red; color: red");
    assert.equal(w.localStorage.getItem("z01fakeexam-accent"), "#ffffff");
    assert.ok(el(w, "custom-accent-hex").validationMessage);
    el(w, "custom-accent-color").value = "#6437ab";
    el(w, "custom-accent-color").dispatchEvent(
      new w.Event("input", { bubbles: true }),
    );
    assert.equal(el(w, "custom-accent-hex").value, "#6437ab");
    const saved = env.snapshot();
    env.dom.window.close();
    env = await boot(saved);
    w = env.w;
    assert.equal(w.document.documentElement.dataset.accent, "custom");
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent"),
      "#6437ab",
    );
    click(w, '#accent-theme input[value="green"]');
    assert.equal(w.document.documentElement.dataset.accent, "green");
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent"),
      "",
    );
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--theme-chroma"),
      "",
    );
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-ink"),
      "#101010",
    );
    assert.equal(w.localStorage.getItem("z01fakeexam-accent"), "green");
    click(w, '#accent-theme input[value="violet"]');
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-ink"),
      "#101010",
    );
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-logo-filter"),
      "brightness(0)",
    );
    click(w, '#accent-theme input[value="yellow"]');
    assert.equal(
      w.document.documentElement.style.getPropertyValue("--accent-logo-filter"),
      "brightness(0)",
    );
    env.dom.window.close();
  },
);

require("node:test")(
  "journal compares attempts safely without changing the editor and clears independently of progress",
  async () => {
    let env = await boot();
    let w = env.w;
    try {
      const malicious = '<img src=x onerror="alert(1)">';
      draft(w, malicious);
      click(w, "#run-btn");
      await tick();
      env.advance(15000);
      draft(w, "correct second attempt");
      click(w, "#run-btn");
      await tick();
      draft(w, "CURRENT UNSUBMITTED CODE");
      click(w, "#exercise-history-btn");
      const dialog = el(w, "learning-journal-dialog");
      assert.ok(dialog.open);
      assert.equal(dialog.querySelectorAll(".journal-attempt").length, 2);
      assert.ok(dialog.textContent.includes(malicious));
      assert.equal(dialog.querySelector("img"), null);
      [...dialog.querySelectorAll("button")]
        .find((b) => b.textContent === "Comparer les deux essais")
        .click();
      assert.equal(
        dialog.querySelectorAll(".journal-comparison section").length,
        2,
      );
      assert.equal(el(w, "code-editor").value, "CURRENT UNSUBMITTED CODE");
      w.document.dispatchEvent(
        new w.KeyboardEvent("keydown", {
          key: "Enter",
          ctrlKey: true,
          bubbles: true,
        }),
      );
      assert.equal(env.requests.length, 2);
      const saved = env.snapshot();
      env.dom.window.close();
      env = await boot(saved);
      w = env.w;
      click(w, "#exercise-history-btn");
      assert.equal(
        el(w, "learning-journal-dialog").querySelectorAll(".journal-attempt")
          .length,
        2,
      );
      const clear = el(w, "learning-journal-dialog").querySelector(
        ".journal-footer button",
      );
      clear.click();
      assert.equal(
        el(w, "learning-journal-dialog").querySelectorAll(".journal-attempt")
          .length,
        2,
      );
      clear.click();
      assert.equal(
        el(w, "learning-journal-dialog").querySelectorAll(".journal-attempt")
          .length,
        0,
      );
      assert.match(el(w, "progress-label").textContent, /1 \/ 3/);
    } finally {
      env.dom.window.close();
    }
  },
);
require("node:test")(
  "exam attempts stay hidden until rendering and the report links to relevant lessons",
  async () => {
    const env = await boot();
    const w = env.w;
    try {
      click(w, "#mode-true-exam");
      click(w, "#exam-start");
      draft(w, "exam failed attempt");
      click(w, "#run-btn");
      await tick();
      click(w, "#exam-learning-report-btn");
      click(w, "#exercise-history-btn");
      click(w, "#learning-report-btn");
      assert.equal(el(w, "learning-journal-dialog"), null);
      click(w, "#mode-exam");
      click(w, "#exercise-history-btn");
      assert.equal(
        el(w, "learning-journal-dialog").querySelectorAll(".journal-attempt")
          .length,
        0,
      );
      click(w, "#mode-true-exam");
      assert.equal(el(w, "learning-journal-dialog"), null);
      click(w, "#exam-submit");
      await tick();
      click(w, "#exam-learning-report-btn");
      const dialog = el(w, "learning-journal-dialog");
      assert.ok(dialog.open);
      assert.ok(dialog.textContent.includes("1 exercice(s) à retravailler"));
      assert.ok(dialog.querySelectorAll(".journal-topic").length > 0);
      const examCode = el(w, "code-editor").value;
      dialog.querySelector(".journal-topic button").click();
      await tick();
      assert.ok(dialog.querySelector("article h1"));
      assert.equal(el(w, "code-editor").value, examCode);
    } finally {
      env.dom.window.close();
    }
  },
);
require("node:test")(
  "service errors are stored without counting as failed learning outcomes; Tester is not saved",
  async () => {
    const env = await boot();
    const w = env.w;
    try {
      draft(w, "correct solution");
      click(w, "#run-btn");
      await tick();
      env.advance(15000);
      click(w, "#example-btn");
      await tick();
      env.advance(15000);
      const original = w.fetch;
      w.fetch = async (url, options) =>
        url === "/api/run"
          ? {
              ok: false,
              status: 503,
              json: async () => ({ output: "Service unavailable" }),
            }
          : original(url, options);
      click(w, "#run-btn");
      await tick();
      click(w, "#learning-report-btn");
      const text = el(w, "learning-journal-dialog").textContent;
      assert.ok(text.includes("2 correction(s) conservée(s)"));
      assert.ok(text.includes("1 exercice(s) réussi(s)"));
      assert.ok(text.includes("0 exercice(s) à retravailler"));
      assert.ok(text.includes("1 correction(s) indisponible(s)"));
    } finally {
      env.dom.window.close();
    }
  },
);

require("node:test")(
  "clearing the journal invalidates a late lesson response and unknown exercise IDs remain harmless",
  async () => {
    const seed = {
      version: 1,
      items: ["only1", "__proto__"].map((exercise, index) => ({
        id: String(index),
        track: "go",
        exercise,
        code: "sample",
        output: "",
        at: 1700000000000,
        session: "",
        released: true,
        success: false,
      })),
    };
    const env = await boot({ "z01-attempt-journal-v1": JSON.stringify(seed) });
    const w = env.w;
    try {
      let release;
      const original = w.fetch;
      w.fetch = async (url, opts) =>
        String(url).includes("learning-content/")
          ? new Promise((resolve) => {
              release = () =>
                resolve({ ok: true, text: async () => "# Late lesson" });
            })
          : original(url, opts);
      click(w, "#learning-report-btn");
      const dialog = el(w, "learning-journal-dialog");
      assert.ok(dialog.querySelector(".journal-topic"));
      dialog.querySelector(".journal-topic button").click();
      const clear = dialog.querySelector(".journal-footer button");
      clear.click();
      clear.click();
      release();
      await tick();
      assert.ok(!dialog.textContent.includes("Late lesson"));
      assert.ok(dialog.textContent.includes("Pas encore d’historique"));
    } finally {
      env.dom.window.close();
    }
  },
);

require("node:test")(
  "fresh strict exams start at level one in all languages regardless of training level",
  async () => {
    const catalogs = Object.fromEntries(
      ["go", "js", "rust", "java"].map((track) => [
        track,
        require(`../catalog-snapshots/${track}.json`).exercises,
      ]),
    );
    for (const track of Object.keys(catalogs)) {
      const env = await boot({}, false, catalogs);
      const w = env.w;
      try {
        // Make the old JavaScript shuffle start away from N1 deterministically.
        w.Math.random = () => 0;
        click(w, "#mode-exam");
        click(w, "#track-" + track);
        click(w, '#level-filters [data-filter="5"]');
        assert.equal(el(w, "exercise-level").textContent, "Niveau 5", track);
        draft(w, "TRAINING ONLY");
        click(w, "#mode-true-exam");
        click(w, 'input[name="exam-kind"][value="strict"]');
        click(w, "#exam-start");
        assert.equal(el(w, "exercise-level").textContent, "Niveau 1", track);
        assert.equal(el(w, "code-editor").value, "", track);
        assertNoFuture(w);
        const sessions = JSON.parse(
          w.localStorage.getItem("personal-exam-sessions-v2"),
        ).sessions;
        const session = sessions[JSON.stringify([track, "strict"])];
        assert.equal(session.index, 0, track);
        assert.equal(session.series.length, track === "js" ? 7 : 10, track);
        if (track !== "go") {
          const levels = session.series.map((id) => {
            const exercise = catalogs[track].find((ex) => ex.id === id);
            return (
              exercise.level || (catalogs[track].indexOf(exercise) % 10) + 1
            );
          });
          assert.deepEqual(
            levels,
            Array.from({ length: session.series.length }, (_, i) => i + 1),
            track,
          );
        }
        // A reload resumes the actual exam, never the training selection.
        const restored = await boot(env.snapshot(), false, catalogs);
        try {
          assert.equal(
            el(restored.w, "exercise-level").textContent,
            "Niveau 1",
            track,
          );
        } finally {
          restored.dom.window.close();
        }
      } finally {
        env.dom.window.close();
      }
    }
  },
);
