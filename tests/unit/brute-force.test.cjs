const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(
    require("node:path").join(__dirname, "../../frontend/app/brute-force.js"),
    "utf8",
  ),
  context,
);
const analyze = (code, id) => context.analyzeBruteForce(code, id);
test("exhaustive algorithms are not memorized answers", () => {
  assert.equal(
    analyze(
      "func gcd(a,b int)int { for i:=1;i<=a;i++ {if a%i==0 && b%i==0 {r=i}};return r}",
      "gcd",
    ).suspected,
    false,
  );
});
test("flags long numeric lookup ladders, leaves normal branching alone", () => {
  assert.equal(
    analyze(
      Array.from({ length: 6 }, (_, i) => `if n==${i} {return ${i + 1}}`).join(
        "\n",
      ),
      "test",
    ).suspected,
    true,
  );
  assert.equal(
    analyze(
      'if len(s)==0 || len(s)>=3 {return "G\\n"};return "Invalid Input\\n"',
      "printif",
    ).suspected,
    false,
  );
});

test("tracks new constant cases after failures, including strings and diagnostic matches", () => {
  let previous;
  for (let n = 0; n < 4; n++) {
    const code = Array.from(
      { length: n + 1 },
      (_, i) => `if s == "input${i}" {return "answer${i}"}`,
    ).join("\n");
    const evidence = context.hardcodingEvidence(code, previous);
    previous = {
      code,
      success: false,
      output: `input${n + 1} expected answer${n + 1}`,
      hardcoding: evidence,
    };
  }
  assert.equal(analyzeWithEvidence(previous).suspected, true);
  const same = context.hardcodingEvidence(previous.code, previous);
  assert.equal(same.learned.length, previous.hardcoding.learned.length);
  assert.equal(
    analyzeWithEvidence({ code: "return calculate(s)", hardcoding: same })
      .suspected,
    false,
  );
  function analyzeWithEvidence(p) {
    return context.analyzeBruteForce(p.code, "demo", p.hardcoding);
  }
});
test("attempt evidence persists with the session and never changes points", () => {
  const { create } = require("../../frontend/lib/exam-sessions.js");
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
  const repo = create({ getStorage: () => storage });
  const s = repo.start("go", "free", ["demo"]);
  const code = "package piscine";
  repo.draft(s, "demo", code);
  repo.record(s, "demo", code, true, "OK", {
    version: 1,
    learned: ["a"],
    matched: ["a"],
  });
  const restored = create({ getStorage: () => storage }).current("go", "free");
  assert.equal(restored.results.demo.hardcoding.learned[0], "a");
  assert.equal(repo.summary(restored).passed, 1);
});
test("repeatalpha recognizes fixed string loops and direct rune outputs", () => {
  const code = Array.from(
    { length: 6 },
    (_, i) =>
      `if s == "input${i}" { for _, r := range "fixed${i}" { z01.PrintRune(r) }; return }`,
  ).join("\n");
  assert.equal(analyze(code, "repeatalpha").suspected, true);
  const runes = Array.from(
    { length: 6 },
    (_, i) =>
      `if c == '${String.fromCharCode(97 + i)}' {z01.PrintRune('a');return}`,
  ).join("\n");
  assert.equal(analyze(runes, "repeatalpha").suspected, true);
  assert.equal(
    analyze(
      `for _,c := range s {if c >= 'a' && c <= 'z' {for i:=0;i<int(c-'a'+1);i++ {z01.PrintRune(c)}}}`,
      "repeatalpha",
    ).suspected,
    false,
  );
});

test("repeatalpha checks with argument length guards are still recognized", () => {
  const code = Array.from(
    { length: 3 },
    (_, i) =>
      `if len(args)==2 && args[1]=="input${i}" {for _,r:=range "fixed${i}" {z01.PrintRune(r)}}`,
  ).join("\n");
  assert.equal(analyze(code, "repeatalpha").suspected, true);
});
