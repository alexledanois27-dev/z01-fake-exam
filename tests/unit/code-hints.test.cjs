const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { get } = require("../../frontend/app/code-hints.js");
const tracks = ["go", "js", "rust", "java"];
test("every current exercise gets syntax references and pitfalls", () => {
  for (const track of tracks) {
    const guides = require(`../../frontend/hints/${track}.json`);
    for (const [id, guide] of Object.entries(guides)) {
      const reference = get(track, { id, allowedFunctions: [] }, guide);
      assert.ok(reference.examples.length && reference.traps.length, id);
      for (const example of reference.examples)
        assert.ok(example.code && example.explanation && example.title, id);
    }
  }
});
test("Go calls are restricted to explicitly allowed tools and builtins", () => {
  const guide = { topics: ["Slices", "Indices"] };
  const snippets = (rules) =>
    get("go", { allowedFunctions: rules }, guide)
      .examples.map((x) => x.code)
      .join("\n");
  assert.doesNotMatch(snippets([]), /append\(|len\(|PrintRune\(|Log2\(/);
  assert.match(snippets(["--allow-builtin"]), /append\(/);
  assert.doesNotMatch(snippets(["--allow-builtin"]), /PrintRune\(|Log2\(/);
  assert.match(snippets(["github.com/01-edu/z01.PrintRune"]), /PrintRune\(/);
  assert.match(snippets(["math.Log2"]), /math.Log2\(/);
});
test("no-loop exercises get recursion with no looping syntax", () => {
  for (const id of ["grid-words-finder-2", "snake-path-validator"]) {
    const guide = require("../../frontend/hints/js.json")[id];
    const reference = get(
      "js",
      { id, statement: "You are not allowed to use any kind of loops" },
      guide,
    );
    assert.equal(reference.noLoops, true);
    const code = reference.examples.map((x) => x.code).join("\n");
    assert.match(code, /function profondeur/);
    assert.doesNotMatch(code, /\b(for|while|do)\b/);
    new vm.Script(code);
  }
});
test("JavaScript example fragments parse across the catalogue topics", () => {
  for (const guide of Object.values(require("../../frontend/hints/js.json"))) {
    for (const example of get("js", {}, guide).examples)
      new vm.Script(example.code);
  }
});
