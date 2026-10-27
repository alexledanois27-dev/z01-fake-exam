const test = require("node:test");
const assert = require("node:assert/strict");
const { create } = require("../../frontend/lib/personal-progress.js");
test("drafts, attempts and exam resume survive a new instance, with language isolation", () => {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k),
    setItem: (k, v) => values.set(k, v),
  };
  const first = create(() => storage);
  first.draft("go", "same", "package main");
  first.draft("js", "same", "");
  first.result("go", "same", false);
  first.result("go", "same", true);
  first.session("go", {
    selected: "same",
    mode: "true-exam",
    series: ["a", "same"],
    index: 1,
  });
  assert.equal(first.flush(), true);
  const second = create(() => storage);
  assert.equal(second.draft("go", "same"), "package main");
  assert.equal(second.draft("js", "same"), "");
  assert.equal(second.draft("rust", "same"), null);
  assert.equal(second.result("go", "same").attempts, 2);
  assert.equal(second.result("go", "same").success, true);
  assert.equal(second.session("go").index, 1);
});
test("corrupt, denied and full storage do not destroy the in-memory draft", () => {
  const denied = create(() => {
    throw Error("denied");
  });
  denied.draft("go", "a", "code");
  assert.equal(denied.flush(), false);
  assert.equal(denied.draft("go", "a"), "code");
  const corrupt = create(() => ({
    getItem: () => "{",
    setItem: () => {
      throw Error("quota");
    },
  }));
  corrupt.draft("go", "a", "code");
  assert.equal(corrupt.flush(), false);
  assert.equal(corrupt.draft("go", "a"), "code");
});
