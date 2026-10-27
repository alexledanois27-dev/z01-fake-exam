// Indicators of memorized answers, never an algorithmic-complexity judgement.
function hardcodedCases(code) {
  const literals = [];
  const text = String(code || "")
    .slice(0, 65536)
    .replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`/g,
      (token) => {
        if (token.startsWith("//") || token.startsWith("/*")) return " ";
        const index = literals.push(token.slice(1, -1)) - 1;
        return `__L${index}__`;
      },
    );
  const cases = [];
  const hash = (value) => {
    let h = 2166136261;
    for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16);
  };
  for (const match of text.matchAll(/\bif\s*([^{}]{1,1024})\{/g)) {
    // Read the balanced branch, including a loop printing a fixed string.
    const start = match.index + match[0].length;
    let end = start,
      depth = 1;
    for (; end < Math.min(text.length, start + 4096) && depth; end++) {
      if (text[end] === "{") depth++;
      if (text[end] === "}") depth--;
    }
    if (depth) continue;
    const condition = match[1],
      body = text.slice(start, end - 1);
    // Boundary checks such as len(s)==0 are ordinary logic, not exact input lookup.
    const inputCondition = condition
      .replace(
        /\b(?:len|length|size|isEmpty|empty)\s*\([^)]*\)\s*===?\s*\d+/g,
        " ",
      )
      .replace(/\b\w+\.(?:length|size)\s*===?\s*\d+/g, " ");
    if (!/(?:===?|\.equals\s*\()\s*(?:__L\d+__|-?\d+\b)/.test(inputCondition))
      continue;
    const result =
      body.match(/\breturn\s+(__L\d+__|-?\d+(?:\.\d+)?\b)\s*[;\n]?\s*$/) ||
      body.match(
        /\b(?:PrintRune|Print|Println|Printf|print|println|log|write)\s*\(\s*(__L\d+__|-?\d+(?:\.\d+)?\b)\s*\)\s*;?\s*(?:return\s*;?\s*)?$/,
      );
    const fixedRange = body.match(
      /\brange\s+(__L\d+__)\s*\{[\s\S]*?\bPrintRune\s*\(/,
    );
    const repeatedRunes = [
      ...body.matchAll(/\bPrintRune\s*\(\s*(__L\d+__)\s*\)/g),
    ];
    const output = fixedRange
      ? fixedRange[1]
      : result?.[1] ||
        (repeatedRunes.length
          ? repeatedRunes.map((item) => item[1]).join("+")
          : "");
    if (!output) continue;
    const expand = (value) =>
      value.replace(/__L(\d+)__/g, (_, n) =>
        JSON.stringify(literals[Number(n)]),
      );
    const key = hash(
      expand(condition.replace(/\s+/g, "")) + "=>" + expand(output),
    );
    const values = [...condition.matchAll(/__L(\d+)__/g)].map(
      (m) => literals[Number(m[1])],
    );
    const returnLiteral = output.match(/^__L(\d+)__$/);
    if (returnLiteral) values.push(literals[Number(returnLiteral[1])]);
    cases.push({ key, values });
    if (cases.length >= 64) break;
  }
  return [...new Map(cases.map((item) => [item.key, item])).values()];
}
function hardcodingEvidence(code, previous) {
  const cases = hardcodedCases(code);
  const current = new Set(cases.map((item) => item.key));
  const before = new Set(
    hardcodedCases(previous?.code).map((item) => item.key),
  );
  const learned = new Set(
    (previous?.hardcoding?.learned || []).filter((key) => current.has(key)),
  );
  const matched = new Set(
    (previous?.hardcoding?.matched || []).filter((key) => current.has(key)),
  );
  if (previous?.success === false) {
    for (const item of cases)
      if (!before.has(item.key)) {
        learned.add(item.key);
        const diagnostic = String(previous.output || "");
        if (
          item.values.some(
            (value) => value.length >= 2 && diagnostic.includes(value),
          )
        )
          matched.add(item.key);
      }
  }
  return {
    version: 1,
    learned: [...learned].slice(0, 64),
    matched: [...matched].slice(0, 64),
  };
}
function analyzeBruteForce(code, exerciseId, evidence) {
  const cases = hardcodedCases(code),
    keys = new Set(cases.map((item) => item.key));
  const learned = (evidence?.learned || []).filter((key) =>
    keys.has(key),
  ).length;
  const matched = (evidence?.matched || []).filter((key) =>
    keys.has(key),
  ).length;
  const reasons = [];
  if (cases.length >= (/repeatalpha$/i.test(String(exerciseId)) ? 3 : 6))
    reasons.push(
      "Nombreux tests d’entrées exactes associés à des réponses constantes.",
    );
  if (cases.length >= 3 && learned >= 3 && (matched >= 2 || cases.length >= 4))
    reasons.push(
      `${learned} cas constants ajoutés après des échecs${matched ? `, dont ${matched} reprenant du texte du diagnostic` : ""}.`,
    );
  return { suspected: reasons.length > 0, reasons };
}
