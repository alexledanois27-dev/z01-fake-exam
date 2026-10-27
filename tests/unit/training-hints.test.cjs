const test = require("node:test");
const assert = require("node:assert/strict");
const {
  fingerprint,
  lookup,
  usefulGoTools,
} = require("../../frontend/lib/training-hints.js");
const tracks = ["go", "js", "rust", "java"];
const guides = Object.fromEntries(
  tracks.map((track) => [track, require(`../../frontend/hints/${track}.json`)]),
);
const fixtures = require("../fixtures/training-exercises.json");
test("175 local guides have progressive content and a statement revision", () => {
  assert.equal(
    Object.values(guides).reduce(
      (n, entries) => n + Object.keys(entries).length,
      0,
    ),
    175,
  );
  for (const [track, entries] of Object.entries(guides)) {
    for (const [id, guide] of Object.entries(entries)) {
      assert.match(guide.statementHash, /^[0-9a-f]{8}$/);
      assert.ok(guide.title && guide.strategy, `${track}/${id}`);
      for (const field of ["topics", "hints", "checks"]) {
        assert.ok(guide[field].length >= 2, `${id}/${field}`);
        assert.ok(
          guide[field].every(
            (value) => typeof value === "string" && value.trim(),
          ),
        );
      }
    }
  }
});
test("guide lookup matches track and statement, tolerating only whitespace changes", () => {
  for (const track of tracks) {
    const ex = fixtures[track][0];
    assert.equal(lookup(guides, track, ex).status, "ready");
    assert.equal(
      lookup(guides, track, {
        ...ex,
        statement: ex.statement.replace(/\n/g, " \n"),
      }).status,
      "ready",
    );
    assert.equal(
      lookup(guides, track, {
        ...ex,
        statement: ex.statement + " nouvelle contrainte",
      }).status,
      "stale",
    );
    assert.equal(lookup(guides, "other", ex).status, "missing");
  }
  assert.equal(lookup(guides, "go", { id: "new-exercise" }).status, "missing");
  assert.notEqual(fingerprint("a"), fingerprint("b"));
});
test("Go tools never suggest calls outside the current allowed functions", () => {
  assert.deepEqual(usefulGoTools({ allowedFunctions: [] }), []);
  assert.deepEqual(usefulGoTools({}), []);
  assert.deepEqual(
    usefulGoTools({ allowedFunctions: ["math.Log2", "--allow-builtin"] }).map(
      (x) => x.name,
    ),
    ["math.Log2"],
  );
  assert.deepEqual(
    usefulGoTools({ allowedFunctions: ["fmt.Print"] }).map((x) => x.name),
    ["fmt.Print"],
  );
  assert.deepEqual(
    usefulGoTools({ allowedFunctions: ["fmt.*"] }).map((x) => x.name),
    ["fmt.Print", "fmt.Println"],
  );
});
test("exercise-specific traps are documented instead of a generic recipe", () => {
  assert.match(guides.go.canjump.strategy, /exacte/);
  assert.match(
    guides.js["grid-words-finder-2"].hints.join(" "),
    /Aucune boucle/,
  );
  assert.match(
    guides.rust["rust-checkpoint-partial-sums"].strategy,
    /préfixes/,
  );
  assert.match(guides.java["java-next-prime"].strategy, /après/);
  assert.match(guides.go.onlyb.strategy, /lettre B/);
});
