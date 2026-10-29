const test = require("node:test");
const assert = require("node:assert/strict");
const { create, LIMITS } = require("../../frontend/lib/attempt-journal.js");
function memory(initial) {
  let value = initial,
    writes = 0;
  return {
    getItem: () => value,
    setItem: (_, next) => {
      value = next;
      writes++;
    },
    get value() {
      return value;
    },
    get writes() {
      return writes;
    },
  };
}
const entry = (extra = {}) => ({
  track: "go",
  exercise: "only1",
  code: "package main",
  output: "result",
  success: false,
  ...extra,
});
test("attempts survive reload, are isolated by language and release only after exam finish", () => {
  const storage = memory();
  const repo = create(() => storage);
  repo.add(entry());
  repo.add(entry({ track: "rust", success: true }));
  repo.add(entry({ session: "exam1", code: "EXAM SECRET" }));
  assert.equal(repo.list("go").length, 1);
  assert.equal(repo.list("rust")[0].success, true);
  repo.flush();
  const reload = create(() => storage);
  assert.equal(reload.list("go").length, 1);
  reload.releaseExam("other");
  assert.equal(reload.list("go").length, 1);
  reload.releaseExam("exam1");
  reload.flush();
  const final = create(() => storage);
  assert.equal(final.list("go", "only1")[0].code, "EXAM SECRET");
  assert.equal(final.list("java").length, 0);
  const detached = final.list("go");
  detached[0].code = "changed";
  assert.equal(final.list("go")[0].code, "EXAM SECRET");
});
test("retention limits apply across modes and large code/output are marked as incomplete", () => {
  const storage = memory();
  const repo = create(() => storage);
  for (let i = 0; i < 15; i++) repo.add(entry({ code: String(i) }));
  assert.equal(repo.list("go").length, LIMITS.perExercise);
  assert.equal(repo.list("go")[0].code, "14");
  for (let i = 0; i < 120; i++) repo.add(entry({ exercise: "ex" + i }));
  assert.equal(repo.list("go").length, LIMITS.total);
  repo.add(
    entry({
      exercise: "large",
      code: "x".repeat(50000),
      output: "y".repeat(20000),
    }),
  );
  const large = repo.list("go", "large")[0];
  assert.equal(large.code.length, LIMITS.code);
  assert.equal(large.output.length, LIMITS.output);
  assert.equal(large.truncated, true);
  for (let i = 0; i < 90; i++)
    repo.add(
      entry({
        exercise: "big" + i,
        code: "x".repeat(50000),
        output: "y".repeat(20000),
      }),
    );
  repo.flush();
  assert.ok(storage.value.length <= LIMITS.characters + 100);
});
test("bad local storage and malformed records are rejected without breaking the app", () => {
  for (const raw of [
    "{bad",
    "null",
    JSON.stringify({ version: 2, items: [] }),
    JSON.stringify({
      version: 1,
      items: [
        null,
        {},
        entry({ at: Infinity }),
        entry({ at: 1, track: "unknown" }),
      ],
    }),
  ]) {
    assert.deepEqual(create(() => memory(raw)).list("go"), []);
  }
  const repo = create(() => {
    throw Error("denied");
  });
  repo.add(entry());
  assert.equal(repo.flush(), false);
  assert.equal(repo.list("go").length, 1);
});
test("clearing one language preserves others and clean history is not rewritten on every editor input", () => {
  const storage = memory();
  const repo = create(() => storage);
  repo.add(entry());
  repo.add(entry({ track: "js" }));
  repo.flush();
  for (let i = 0; i < 50; i++) repo.flush();
  assert.equal(storage.writes, 1);
  repo.clear("go");
  repo.flush();
  assert.equal(repo.list("go").length, 0);
  assert.equal(repo.list("js").length, 1);
  repo.releaseExam("unknown");
  repo.flush();
  assert.equal(storage.writes, 2);
});
