const LEVEL_SPECS = {
  1: ["onlyz", "onlya", "onlyb", "onlyf", "only1"],
  2: [
    "rectperimeter",
    "countcharacter",
    "checknumber",
    "countalpha",
    "printf",
    "printfnot",
    "retainfirsthalf",
  ],
  3: [
    "digitlen",
    "fishandchips",
    "cameltosnakecase",
    "gcd",
    "hash-code",
    "lastword",
    "firstword",
    "repeatalpha",
    "searchreplace",
  ],
  4: [
    "findprevprime",
    "thirdtimeisacharm",
    "printrevcomb",
    "printmemory",
    "weareunique",
    "itoa",
    "iscapitalized",
    "fromto",
    "zipstring",
    "expandstr",
    "cleanstr",
  ],
  5: [
    "concatalternate",
    "reversestrcap",
    "wdmatch",
    "hiddenp",
    "concatslice",
    "inter",
    "union",
    "saveandmiss",
    "chunk",
    "addprimesum",
    "fprime",
    "canjump",
  ],
  6: ["notdecimal", "slice", "fifthandskip", "revconcatalternate"],
  7: ["wordflip", "revwstr", "rostring", "findpairs"],
  8: ["options", "romannumbers", "piglatin", "itoabase"],
  9: ["rpncalc", "brackets"],
  10: ["brainfuck", "grouping"],
};

const LEVEL_ALIASES = {
  printf: "printif",
  printfnot: "printifnot",
  "hash-code": "hashcode",
};

const LEVEL_MAP = (() => {
  const map = {};
  Object.entries(LEVEL_SPECS).forEach(([level, ids]) => {
    ids.forEach((id) => {
      const key = normalizeExerciseId(id);
      const alias = LEVEL_ALIASES[key] || LEVEL_ALIASES[id] || id;
      const resolved = normalizeExerciseId(alias);
      if (resolved) {
        map[resolved] = Number(level);
      }
    });
  });
  return map;
})();
const defaultLearningMd = `
# Mode learning

Ajoutez vos notes ou fiches Markdown dans \`window.LEARNING_MD\` pour alimenter ce panneau.

- Conçu pour réviser avant de lancer les tests.
- Vous pouvez inclure du code, des listes ou des rappels rapides.
`;
let learningSource = typeof window !== "undefined" ? window.LEARNING_MD : "";
const defaultLessonMsg =
  "Sélectionne une leçon dans la liste pour afficher son contenu.";
let learningManifest = null;
let learningLessons = [];
let learningCurrentLessonId = null;
let learningLoaded = false;
const learningLessonCache = {};
const learningSelections = {};
let learningRequestSequence = 0;
