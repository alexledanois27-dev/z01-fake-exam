const test = require("node:test");
const assert = require("node:assert/strict");
const { create, THREE_HOURS } = require("../../frontend/lib/exam-sessions");
function fixture() {
  const map = new Map();
  let clock = 1000000;
  let sequence = 0;
  return {
    options: {
      getStorage: () => ({
        getItem: (k) => map.get(k),
        setItem: (k, v) => map.set(k, v),
      }),
      now: () => clock,
      idFactory: () => String(++sequence),
    },
    advance: (ms) => (clock += ms),
  };
}
test("new sessions and exam kinds have independent drafts and successes", () => {
  const f = fixture(),
    repo = create(f.options);
  const free = repo.start("go", "free", ["only1", "lastword"]);
  assert.equal(repo.draft(free, "only1"), "");
  repo.draft(free, "only1", "FREE");
  repo.record(free, "only1", "FREE", true);
  const strict = repo.start("go", "strict", ["only1", "lastword"]);
  assert.equal(repo.draft(strict, "only1"), "");
  assert.equal(repo.passed(strict, "only1"), false);
  const next = repo.start("go", "free", ["only1", "lastword"]);
  assert.notEqual(next.id, free.id);
  assert.equal(repo.draft(next, "only1"), "");
});
test("free allows skipping, strict requires validation of the current draft", () => {
  const f = fixture(),
    repo = create(f.options),
    free = repo.start("go", "free", ["a", "b"]);
  assert.equal(free.deadline, null);
  assert.equal(repo.advance(free, true), true);
  assert.equal(free.index, 1);
  const strict = repo.start("go", "strict", ["a", "b"]);
  assert.equal(repo.advance(strict, true), false);
  assert.equal(repo.advance(strict), false);
  repo.draft(strict, "a", "correct");
  repo.record(strict, "a", "correct", true);
  repo.draft(strict, "a", "changed");
  assert.equal(repo.advance(strict), false);
  repo.draft(strict, "a", "correct");
  assert.equal(repo.advance(strict), true);
});
test("strict deadline survives reload; expired sessions cannot edit or advance", () => {
  const f = fixture(),
    repo = create(f.options),
    session = repo.start("go", "strict", ["a", "b"]);
  repo.draft(session, "a", "frozen");
  const deadline = session.deadline;
  f.advance(1000);
  const reload = create(f.options),
    saved = reload.current("go", "strict");
  assert.equal(saved.deadline, deadline);
  f.advance(THREE_HOURS);
  assert.equal(reload.expired(saved), true);
  reload.draft(saved, "a", "late");
  assert.equal(reload.draft(saved, "a"), "frozen");
  assert.equal(reload.advance(saved, true), false);
});
test("final report only names revealed exercises; finished records stay immutable", () => {
  const f = fixture(),
    repo = create(f.options),
    s = repo.start("go", "strict", ["a", "hidden-b", "hidden-c"]);
  repo.draft(s, "a", "correct");
  repo.lock(s, "submitted");
  repo.record(s, "a", "correct", true);
  repo.finish(s, "submitted");
  assert.equal(repo.summary(s).passed, 1);
  assert.equal(repo.summary(s).unseen, 2);
  assert.deepEqual(
    repo.summary(s).rows.map((r) => r.id),
    ["a"],
  );
  assert.equal(repo.record(s, "a", "correct", false), false);
  repo.draft(s, "a", "changed");
  assert.equal(repo.draft(s, "a"), "correct");
});
