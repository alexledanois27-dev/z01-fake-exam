#!/usr/bin/env node
// Compare local pedagogical coverage with a running catalogue, without persisting data.
const { lookup, fingerprint } = require("../frontend/lib/training-hints.js");
const tracks = ["go", "js", "rust", "java"];
const guides = Object.fromEntries(
  tracks.map((track) => [track, require(`../frontend/hints/${track}.json`)]),
);
async function main() {
  const base = process.argv[2] || "http://127.0.0.1:8080";
  let issues = 0;
  for (const track of tracks) {
    const response = await fetch(
      new URL(`/api/exercises?track=${track}`, base),
      { signal: AbortSignal.timeout(30000) },
    );
    if (!response.ok) throw Error(`${track}: HTTP ${response.status}`);
    const exercises = await response.json();
    if (!Array.isArray(exercises) || exercises.length === 0)
      throw Error(`${track}: catalogue vide ou invalide`);
    let ready = 0;
    for (const ex of exercises) {
      const result = lookup(guides, track, ex);
      if (result.status === "ready") ready++;
      else {
        issues++;
        console.error(
          `${track}/${ex.id}: ${result.status} ; empreinte courante ${fingerprint(ex.statement)}`,
        );
      }
    }
    const ids = new Set(exercises.map((ex) => ex.id));
    for (const id of Object.keys(guides[track])) {
      if (!ids.has(id)) {
        issues++;
        console.error(`${track}/${id}: absent du catalogue`);
      }
    }
    console.log(
      `${track}: ${ready}/${exercises.length} fiches adaptées à l’énoncé courant`,
    );
  }
  if (issues) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
