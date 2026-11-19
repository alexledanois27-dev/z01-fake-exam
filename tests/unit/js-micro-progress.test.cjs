const test = require("node:test");
const assert = require("node:assert/strict");
const { create } = require("../../frontend/lib/js-micro-progress.js");
const plan = require("../../learning-content/js-micro-path/curriculum.json");
const lessons = plan.modules.flatMap((m) => m.lessons);
function setup(raw) {
  let value = raw || null;
  const storage = {
    getItem: () => value,
    setItem: (key, next) => {
      value = next;
    },
  };
  return {
    store: create({ plan, getStorage: () => storage }),
    raw: () => value,
  };
}
test("Go to JS curriculum gives sixty-three small explained exercises and covers all target checkpoint subjects", () => {
  assert.equal(plan.modules.length, 12);
  assert.equal(lessons.length, 63);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 63);
  const ids = new Set();
  for (const chapter of plan.modules) {
    assert.ok(chapter.lessons.length >= 5);
    assert.ok(chapter.go && chapter.js && chapter.notes.length >= 4);
    chapter.checkpoint.forEach((id) => ids.add(id));
    for (const l of chapter.lessons) {
      assert.ok(
        l.bridge &&
          l.task &&
          l.explanation.length >= 3 &&
          l.walkthrough.length >= 3 &&
          l.hints.length >= 2 &&
          l.tests.length >= 1,
      );
      assert.ok(l.starter.includes(l.target));
    }
  }
  const target = require("../../catalog-snapshots/js.json")
    .exercises.filter((e) => e.level >= 1 && e.level <= 4)
    .map((e) => e.id);
  assert.deepEqual([...ids].sort(), target.sort());
});
test("micro drafts, guided successes and retakes stay separate and restore predictably", () => {
  const env = setup(),
    s = env.store,
    id = lessons[0].id;
  assert.equal(s.summary().completed, 0);
  assert.equal(s.recommend(), id);
  s.saveDraft(id, "my draft");
  s.hint(id);
  s.reveal(id);
  s.record(id, "my draft", true, true);
  assert.equal(s.summary().completed, 1);
  assert.equal(s.summary().independent, 0);
  assert.equal(s.state(id).lastPassed, true);
  s.saveDraft(id, "edited");
  assert.equal(s.state(id).lastPassed, false);
  s.record(id, "my draft", true, true);
  assert.equal(s.state(id).lastPassed, false);
  s.retry(id);
  assert.equal(s.state(id).draft, lessons[0].starter);
  assert.equal(s.state(id).hints, 0);
  assert.equal(s.state(id).solutionSeen, false);
  s.saveDraft(id, "new answer");
  s.record(id, "new answer", true, false);
  assert.equal(s.summary().independent, 1);
  assert.equal(s.record(id, "new answer", null, false), false);
  s.select(lessons[1].id);
  const restored = setup(env.raw()).store;
  assert.equal(restored.selected(), lessons[1].id);
  assert.equal(restored.state(id).draft, "new answer");
  assert.equal(restored.summary().completed, 1);
  restored.clear();
  assert.equal(restored.summary().completed, 0);
});
test("micro storage stays bounded and does not overwrite a large draft silently", () => {
  const env = setup();
  const id = lessons[0].id;
  env.store.saveDraft(id, "safe");
  assert.equal(env.store.saveDraft(id, "x".repeat(8001)), false);
  assert.equal(env.store.state(id).draft, "safe");
  assert.equal(setup("bad json").store.summary().completed, 0);
  const raw = JSON.stringify({
    version: 1,
    selected: "__proto__",
    items: {
      [id]: {
        draft: "ok",
        completed: true,
        lastPassed: true,
        extraSecret: "remove me",
        hints: 999,
        attempts: 10000,
      },
    },
  });
  const dirty = setup(raw);
  dirty.store.select(id);
  assert.equal(dirty.raw().includes("remove me"), false);
  assert.equal(dirty.store.state(id).hints, 2);
  assert.equal(dirty.store.state(id).attempts, 999);
  const blocked = create({
    plan,
    getStorage: () => {
      throw Error("blocked");
    },
  });
  assert.equal(blocked.saveDraft(id, "memory draft"), false);
  assert.equal(blocked.state(id).draft, "memory draft");
});

test("all language curricula have precise steps and valid catalogue bridges", () => {
  const allIds = new Set();
  for (const track of ["go", "js", "rust", "java"]) {
    const plan = require(
      `../../learning-content/${track}-micro-path/curriculum.json`,
    );
    const catalogue = new Set(
      require(`../../catalog-snapshots/${track}.json`).exercises.map(
        (ex) => ex.id,
      ),
    );
    const lessons = plan.modules.flatMap((m) => m.lessons);
    assert.equal(lessons.length, track === "js" ? 63 : 18);
    for (const module of plan.modules) {
      assert.ok(module.notes.length >= 4);
      for (const id of module.checkpoint)
        assert.ok(catalogue.has(id), `${track} bridge ${id}`);
      for (const lesson of module.lessons) {
        assert.ok(!allIds.has(lesson.id));
        allIds.add(lesson.id);
        assert.ok(lesson.id.startsWith(`${track}-learn-`));
        assert.ok(lesson.explanation.length >= 3);
        assert.ok(lesson.walkthrough.length >= 3);
        assert.equal(lesson.hints.length, 2);
        assert.ok(lesson.tests.length >= 2);
      }
    }
  }
});
