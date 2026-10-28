const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const lessons = require("../../learning-content/manifest.json").lessons;
const links = require("../../learning-content/exercise-links.json");
test("70 language-specific lessons cover all 175 exercises with valid local references", () => {
  const unique = new Set();
  const counts = { go: 34, rust: 12, js: 11, java: 13 };
  let covered = 0;
  for (const lesson of lessons) {
    assert.ok(!unique.has(lesson.id), lesson.id);
    unique.add(lesson.id);
    assert.ok(lesson.track in counts);
    assert.ok(lesson.path.startsWith("learning-content/"));
    assert.ok(!lesson.path.split("/").includes(".."));
    const body = fs.readFileSync(path.join(root, lesson.path), "utf8");
    assert.match(body, /^# /);
    if (lesson.track !== "go")
      for (const heading of [
        "Objectif",
        "À savoir",
        "Exemple isolé",
        "Pièges fréquents",
        "Vérification rapide",
        "À essayer seul",
        "Référence",
      ])
        assert.ok(body.includes("## " + heading), lesson.id + "/" + heading);
  }
  for (const [track, count] of Object.entries(counts)) {
    assert.equal(lessons.filter((l) => l.track === track).length, count);
    const exercises = require(
      `../../catalog-snapshots/${track}.json`,
    ).exercises;
    assert.deepEqual(
      Object.keys(links[track]).sort(),
      exercises.map((ex) => ex.id).sort(),
    );
    for (const ex of exercises) {
      const ids = links[track][ex.id];
      assert.ok(ids.length >= 1 && ids.length <= 4, ex.id);
      assert.equal(new Set(ids).size, ids.length);
      for (const id of ids)
        assert.ok(
          lessons.some((l) => l.id === id && l.track === track),
          ex.id + "/" + id,
        );
      covered++;
    }
  }
  assert.equal(covered, 175);
});
test("JavaScript lesson snippets parse and their assertions succeed", async () => {
  for (const lesson of lessons.filter((l) => l.track === "js")) {
    const md = fs.readFileSync(path.join(root, lesson.path), "utf8");
    for (const [, code] of md.matchAll(/```javascript\n([\s\S]*?)```/g)) {
      const result = vm.runInNewContext(
        code,
        {
          setTimeout,
          clearTimeout,
          console: {
            assert: (condition) => assert.ok(condition, lesson.id),
            error: (error) => {
              throw error;
            },
          },
        },
        { timeout: 500, filename: lesson.path },
      );
      if (result && typeof result.then === "function") await result;
    }
  }
});
