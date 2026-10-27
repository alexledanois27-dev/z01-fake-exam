/* Local pedagogical guides: no remote AI calls and no submitted code required. */
(function (root) {
  function fingerprint(statement) {
    const text = String(statement || "")
      .replace(/\s+/g, " ")
      .trim();
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function lookup(catalog, track, exercise) {
    const id = exercise?.id || exercise?.ID;
    const guide = catalog[track]?.[id];
    if (!guide) return { status: "missing" };
    const statement = exercise.statement || exercise.Statement || "";
    if (guide.statementHash !== fingerprint(statement))
      return { status: "stale" };
    return { status: "ready", guide };
  }
  // These are suggestions only when the current server catalogue permits them.
  const goTools = [
    [
      "github.com/01-edu/z01.PrintRune",
      "Afficher un caractère sur la sortie standard.",
    ],
    ["math.Log2", "Calculer le logarithme en base deux pour l’entropie."],
    [
      "strconv.Atoi",
      "Convertir un argument décimal en entier et contrôler l’erreur.",
    ],
    [
      "strconv.Itoa",
      "Convertir un entier en texte lorsque la consigne le permet.",
    ],
    ["strings.Fields", "Découper un texte en mots séparés par des espaces."],
    ["strings.Split", "Découper une chaîne à partir d’un séparateur précis."],
    ["strings.Join", "Assembler les éléments d’une liste avec un séparateur."],
    ["strings.Contains", "Rechercher la présence d’un texte dans un autre."],
    [
      "unicode.IsLetter",
      "Reconnaître une lettre Unicode quand cette définition convient à l’exercice.",
    ],
    [
      "fmt.Print",
      "Afficher sans ajouter automatiquement de retour à la ligne.",
    ],
    ["fmt.Println", "Afficher puis ajouter un retour à la ligne."],
  ];
  function usefulGoTools(exercise) {
    const allowed = exercise.allowedFunctions;
    if (!Array.isArray(allowed)) return [];
    return goTools
      .filter(([symbol]) =>
        allowed.some(
          (rule) =>
            rule === symbol ||
            (rule.endsWith(".*") && symbol.startsWith(rule.slice(0, -1))),
        ),
      )
      .map(([name, description]) => ({ name, description }));
  }
  const api = { fingerprint, lookup, usefulGoTools };
  if (typeof module !== "undefined") module.exports = api;
  else root.TrainingHints = api;
})(typeof window !== "undefined" ? window : globalThis);
