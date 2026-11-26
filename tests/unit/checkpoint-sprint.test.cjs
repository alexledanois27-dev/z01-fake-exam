const test = require("node:test");
const assert = require("node:assert/strict");
const { create, DAY } = require("../../frontend/lib/checkpoint-sprint.js");
const plan = require("../../frontend/learning/js-checkpoint-sprint.json");
function setup(raw) {
  let value = raw || null,
    now = 1700000000000;
  const storage = {
    getItem: () => value,
    setItem: (key, next) => {
      value = next;
    },
  };
  return {
    store: create({ plan, getStorage: () => storage, now: () => now }),
    advance: (delta) => (now += delta),
    raw: () => value,
  };
}
test("sprint covers every reference N1-N4 exercise exactly once and uses actual JS lessons", () => {
  const all = plan.days.flatMap((d) => d.exercises);
  const exercises = require("../../catalog-snapshots/js.json").exercises;
  const target = exercises
    .filter((e) => e.level >= 1 && e.level <= 4)
    .map((e) => e.id);
  assert.equal(plan.days.length, 7);
  assert.equal(all.length, 19);
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual([...all].sort(), target.sort());
  const lessons = require("../../learning-content/manifest.json").lessons;
  for (const day of plan.days)
    for (const id of day.lessons)
      assert.ok(lessons.some((l) => l.track === "js" && l.id === id));
});
test("guided success, independent success, spaced recall and failure remain distinct", () => {
  const env = setup(),
    s = env.store;
  const record = (success, assisted) =>
    s.record({ id: "factorial", success, assisted });
  assert.equal(s.evidence("factorial").status, "new");
  record(true, true);
  assert.equal(s.evidence("factorial").status, "guided");
  record(true, false);
  assert.equal(s.evidence("factorial").status, "independent");
  record(true, false);
  assert.equal(s.evidence("factorial").status, "independent");
  env.advance(DAY);
  assert.equal(s.summary().review.length, 1);
  record(true, false);
  assert.equal(s.evidence("factorial").status, "consolidated");
  record(false, false);
  assert.equal(s.evidence("factorial").status, "review");
  record(true, false);
  assert.equal(s.evidence("factorial").status, "independent");
  assert.equal(
    s.record({ id: "factorial", success: null, assisted: false }),
    false,
  );
  assert.equal(
    s.record({ id: "unknown", success: true, assisted: false }),
    false,
  );
  assert.equal(s.evidence("factorial").status, "independent");
  for (let i = 0; i < 15; i++) record(true, false);
  assert.equal(s.evidence("factorial").attempts, 6);
  assert.ok(!env.raw().includes("code"));
});
test("diagnostic recommendations persist, never count as exercise passes, and malformed storage stays bounded", () => {
  const env = setup(),
    s = env.store;
  for (const q of plan.questions)
    s.answer(q.id, q.id === "mutation" ? 0 : q.answer);
  assert.equal(s.diagnostic().suggestedDay, 3);
  assert.equal(s.summary().independent, 0);
  s.selectDay(5);
  const restored = setup(env.raw()).store;
  assert.equal(restored.day(), 5);
  assert.equal(restored.diagnostic().correct, 5);
  restored.clear();
  assert.equal(restored.day(), 1);
  assert.equal(restored.diagnostic().answered, 0);
  assert.equal(setup("bad json").store.summary().total, 19);
  const unavailable = create({
    plan,
    getStorage: () => {
      throw Error("blocked");
    },
  });
  assert.equal(
    unavailable.record({ id: "factorial", success: true, assisted: false }),
    false,
  );
  assert.equal(unavailable.summary().independent, 1);
  const corrupted = setup(
    JSON.stringify({
      version: 1,
      day: 100,
      answers: { return: 99 },
      attempts: [
        {
          id: "factorial",
          success: true,
          assisted: false,
          at: 1700000000000,
          code: "UNWANTED",
        },
        { id: "__proto__", at: 0 },
      ],
    }),
  );
  corrupted.store.selectDay(2);
  assert.equal(corrupted.raw().includes("UNWANTED"), false);
  assert.equal(corrupted.store.diagnostic().answered, 0);
});
