const test = require("node:test");
const assert = require("node:assert/strict");
const { create, format } = require("../../frontend/lib/exam-timer");
function fixture() {
  let clock = 1000000;
  const values = new Map();
  const options = {
    getStorage: () => ({
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    }),
    now: () => clock,
  };
  return { options, advance: (ms) => (clock += ms) };
}
test("a running timer keeps its deadline across reloads, without interval drift", () => {
  const f = fixture();
  const first = create(f.options);
  first.configure(2);
  first.start();
  f.advance(12345);
  assert.equal(first.snapshot().remaining, 107655);
  const reloaded = create(f.options);
  assert.equal(reloaded.snapshot().remaining, 107655);
  f.advance(120000);
  assert.deepEqual(reloaded.snapshot(), {
    duration: 120000,
    remaining: 0,
    running: false,
    expired: true,
  });
  assert.equal(create(f.options).snapshot().expired, true);
});
test("pause survives reload, resume uses remaining time, reset and duration are explicit", () => {
  const f = fixture();
  const timer = create(f.options);
  timer.configure(1);
  timer.start();
  f.advance(10000);
  timer.pause();
  f.advance(120000);
  const next = create(f.options);
  assert.equal(next.snapshot().remaining, 50000);
  next.start();
  f.advance(10000);
  assert.equal(next.snapshot().remaining, 40000);
  next.reset();
  assert.equal(next.snapshot().remaining, 60000);
  assert.equal(next.snapshot().running, false);
  for (const bad of [0, -1, 481, 1.5, NaN, Infinity, ""])
    assert.equal(next.configure(bad), false);
  assert.equal(next.snapshot().duration, 60000);
});
test("unavailable storage does not prevent timer use; formatting rounds up", () => {
  let now = 0;
  const timer = create({
    getStorage: () => {
      throw Error("denied");
    },
    now: () => now,
  });
  assert.equal(timer.start(), false);
  now = 999;
  assert.equal(timer.snapshot().remaining, 7200000 - 999);
  assert.equal(format(1), "00:00:01");
  assert.equal(format(7200000), "02:00:00");
  assert.equal(format(-1), "00:00:00");
});
