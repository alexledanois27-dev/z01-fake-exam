// Small syntax references selected by language and the guide's learning topics.
// These are fragments to adapt, never complete exercise solutions.
const CodeHints = (() => {
  const references = {
    go: {
      base: {
        title: "Déclarer et tester une valeur",
        code: "score := 4\nif score > 0 {\n\tscore--\n}",
        explanation:
          "Fragment à placer dans une fonction. := déclare une variable locale ; = modifie une variable existante.",
        traps: [
          "Les accolades ouvrantes restent sur la même ligne que if, for ou func. Utilise des tabulations et le formatage Go.",
          "Une variable locale ou un import inutilisé empêche la compilation. == compare, = affecte.",
        ],
      },
      text: {
        match:
          /chaine|caractere|ascii|unicode|mot|compteur|parcours|compression/,
        title: "Parcourir des caractères",
        code: 'for position, lettre := range "été" {\n\t_ = position\n\t_ = lettre\n}',
        explanation:
          "range fournit un indice en octets et une rune. Le blanc _ permet d’ignorer une valeur ; ne l’utilise pas pour masquer une erreur de logique.",
        traps: [
          "s[i] lit un octet ; range lit une rune. Les deux ne coïncident pas pour les accents.",
          "Une rune s’écrit avec des apostrophes ('a'), une chaîne avec des guillemets (\"a\"). Un retour à la ligne supplémentaire peut faire échouer la sortie exacte.",
        ],
      },
      array: {
        match: /slice|tableau|pointeur|indice|bornes|decoupage|pile/,
        title: "Indices et bornes de slice",
        code: "valeurs := [3]int{8, 5, 2}\npremier := valeurs[0]\nportion := valeurs[1:3]\n_ = premier\n_ = portion",
        explanation:
          "La borne de début est incluse et celle de fin est exclue. Un tableau [3]int et un slice []int sont deux types différents.",
        traps: [
          "N’accède pas à un indice égal à la longueur. Vérifie le cas vide avant le premier ou le dernier élément.",
          "Deux slices peuvent partager le même tableau sous-jacent : modifier l’un peut changer l’autre.",
        ],
      },
      math: {
        match:
          /division|modulo|nombre|arithmetique|primalite|entier|base|factori|signe|accumulateur/,
        title: "Quotient et reste",
        code: "quotient := 17 / 5\nreste := 17 % 5\n_ = quotient // 3\n_ = reste    // 2",
        explanation:
          "Avec des entiers, / donne un quotient entier et % le reste. Ce fragment ne nécessite aucun import.",
        traps: [
          "Vérifie le diviseur avant / ou %. Une division entière perd la partie décimale.",
          "Changer le signe du plus petit entier signé ou multiplier de grands entiers peut déborder.",
        ],
      },
      builtin: {
        title: "Longueur et ajout à un slice",
        requiresBuiltin: true,
        code: "valeurs := []int{8, 5}\nvaleurs = append(valeurs, 2)\ntaille := len(valeurs)\n_ = taille",
        explanation:
          "append renvoie le slice mis à jour ; len donne sa longueur. Cet exemple n’est proposé que lorsque le catalogue autorise les fonctions intégrées.",
        traps: [
          "Réaffecte le résultat de append. len sur une chaîne compte des octets, pas des lettres Unicode.",
        ],
      },
    },
    js: {
      base: {
        title: "Variables et conditions",
        code: "let score = 4;\nconst seuil = 2;\nif (score > seuil) {\n  score -= 1;\n}",
        explanation:
          "const interdit la réaffectation de la variable ; let permet de la réaffecter. Un objet déclaré avec const peut encore être modifié.",
        traps: [
          "Utilise === pour comparer sans conversion implicite. Ne confonds pas une valeur fausse (0, false, '') avec une propriété absente.",
          "Une fonction sans return renvoie undefined. Vérifie si la consigne demande de retourner ou d’afficher le résultat.",
        ],
      },
      recursion: {
        match: /recursion/,
        title: "Une récursion avec arrêt",
        code: "function profondeur(n) {\n  if (n <= 0) return 0;\n  return 1 + profondeur(n - 1);\n}",
        explanation:
          "Le cas de base termine les appels ; chaque appel doit se rapprocher de ce cas. Exemple de syntaxe, pas une solution de recherche dans une grille.",
        traps: [
          "Pour les exercices interdisant les boucles, n’introduis ni for, ni while, ni do…while.",
          "Dans un parcours de grille, marque une cellule comme visitée avant de poursuivre pour ne pas revenir indéfiniment dessus.",
        ],
      },
      array: {
        match: /tableau|tri|pointeur|comparateur|mot|fenetre/,
        title: "Copier ou modifier un tableau",
        code: "const original = [8, 5, 2];\nconst copie = [...original];\ncopie[0] = 9;",
        explanation:
          "Le spread copie les éléments du premier niveau. Modifier copie[0] ne remplace pas original[0].",
        traps: [
          "reverse et sort modifient le tableau reçu. Une copie superficielle ne clone pas les objets imbriqués.",
          "Un comparateur de tri doit indiquer un ordre cohérent ; sans comparateur, le tri par défaut compare des représentations textuelles.",
        ],
      },
      object: {
        match:
          /objet|propriete|cle|fusion|fermeture|proxy|curryfication|reference|recursion|chemin/,
        title: "Lire une propriété sans confondre absence et zéro",
        code: 'const objet = { points: 0 };\nconst presente = Object.prototype.hasOwnProperty.call(objet, "points");\nconst valeur = objet["points"];',
        explanation:
          "La présence d’une clé et la valeur de cette clé sont deux questions différentes. La notation entre crochets accepte une clé calculée.",
        traps: [
          "typeof null vaut 'object' : teste null avant une descente récursive.",
          "Une référence copiée n’est pas un clone profond. Pour les transformations d’objets, vérifie si l’entrée doit rester intacte.",
        ],
      },
      async: {
        match: /promesse|async|relance|temporelle/,
        title: "Attendre et intercepter une promesse",
        code: "async function exemple() {\n  try {\n    const valeur = await Promise.resolve(6);\n    return valeur;\n  } catch (erreur) {\n    throw erreur;\n  }\n}",
        explanation:
          "Une fonction async retourne une promesse. await permet au try/catch d’intercepter son rejet à cet endroit.",
        traps: [
          "Promise.race n’annule pas les promesses perdantes. Un timer ou une opération peut continuer après la réponse.",
          "Une promesse déjà créée peut déjà s’exécuter. Un timeout global ne doit pas être redémarré à chaque étape.",
        ],
      },
    },
    rust: {
      base: {
        title: "Mutabilité et expression retournée",
        code: "fn augmenter(n: i32) -> i32 {\n    let mut resultat = n;\n    resultat += 1;\n    resultat\n}",
        explanation:
          "let crée une liaison immuable par défaut ; mut permet sa modification. La dernière expression sans point-virgule est retournée.",
        traps: [
          "Ajouter ; à la dernière expression change sa valeur en (), ce qui peut contredire le type de retour.",
          "Les entiers non signés ne représentent pas les négatifs. Une soustraction ou une conversion doit respecter les bornes.",
        ],
      },
      ownership: {
        match: /ownership|emprunt|mutabilite|duree|liste|drop|generique/,
        title: "Lire sans consommer",
        code: 'fn lire(mot: &str) -> bool {\n    mot == "salut"\n}\n// Dans une fonction :\n// let nom = String::from("salut");\n// let reconnu = lire(&nom);',
        explanation:
          "Un emprunt permet de lire une valeur sans en prendre la propriété. Le préfixe & et le type attendu déterminent le contrat.",
        traps: [
          "Déplacer un String peut empêcher sa réutilisation. Ne clone pas systématiquement pour contourner un problème d’emprunt.",
          "Un emprunt mutable doit rester exclusif pendant sa durée de vie. Garde les emprunts aussi courts que possible.",
        ],
      },
      result: {
        match: /option|result|enum|validation|pattern/,
        title: "Distinguer absence et valeur",
        code: "fn valeur_ou_zero(entree: Option<i32>) -> i32 {\n    match entree {\n        Some(valeur) => valeur,\n        None => 0,\n    }\n}",
        explanation:
          "match distingue explicitement les variantes. Pour Result, les variantes sont Ok et Err ; leur sens dépend du contrat de l’exercice.",
        traps: [
          "unwrap provoque un panic sur None ou Err. Une erreur prévue par l’énoncé doit généralement rester une valeur de retour.",
          "Some(0), None et Err ne sont pas interchangeables. Respecte chaque niveau d’Option et de Result.",
        ],
      },
      text: {
        match:
          /chaine|ascii|caractere|lettre|mot|chiffre|composition|transposition|display|format|colonne/,
        title: "Octets et caractères",
        code: 'let texte = "été";\nlet octets = texte.len();\nlet caracteres = texte.chars().count();\n// octets = 5, caracteres = 3',
        explanation:
          "Une chaîne UTF-8 n’est pas un tableau de caractères de taille fixe. chars parcourt les valeurs Unicode.",
        traps: [
          "Découper une chaîne à une position qui n’est pas une frontière UTF-8 provoque un panic.",
          "Display, Debug et l’affichage manuel ne produisent pas les mêmes séparateurs ; respecte le format demandé.",
        ],
      },
      collection: {
        match:
          /hashmap|collection|vec|pile|file|table|tri|prefixe|accumulateur|minimum|matrice/,
        title: "Empiler et dépiler",
        code: "let mut valeurs = vec![8, 5];\nvaleurs.push(2);\nlet dernier = valeurs.pop();\n// dernier vaut Some(2)",
        explanation:
          "pop retourne une Option parce qu’un vecteur peut être vide. Pour une pile, le dernier élément ajouté sort en premier.",
        traps: [
          "FIFO (file) et LIFO (pile) sont différents : vérifie quel élément doit sortir.",
          "Une HashMap ne garantit pas un ordre d’affichage ; un BTreeSet maintient un ordre trié.",
        ],
      },
    },
    java: {
      base: {
        title: "Déclarer et tester une valeur",
        code: "int score = 4;\nif (score > 0) {\n    score--;\n}",
        explanation:
          "Fragment à placer dans une méthode. Le type est explicite, les instructions se terminent par un point-virgule et les blocs utilisent des accolades.",
        traps: [
          "Une méthode static appartient à la classe ; une méthode d’instance nécessite un objet.",
          "Vérifie le nom de la classe publique et celui du fichier .java. Le nom et la signature de la méthode doivent correspondre à l’énoncé.",
        ],
      },
      text: {
        match:
          /chaine|caractere|frequence|prefixe|regex|palindrome|concatena|normalisation|fenetre/,
        title: "Comparer des chaînes",
        code: 'String mot = "salut";\nboolean identique = "salut".equals(mot);\nchar premier = mot.charAt(0);',
        explanation:
          "equals compare le contenu ; == compare les références des objets. charAt utilise un indice à partir de zéro.",
        traps: [
          "charAt(0) est invalide sur une chaîne vide. Une référence null n’est pas une chaîne vide.",
          "Les String sont immuables ; une méthode de transformation retourne une nouvelle chaîne.",
        ],
      },
      array: {
        match:
          /tableau|pointeur|indice|tri|matrice|grille|liste|noeud|fusion|ensemble|tas/,
        title: "Copier un tableau et accéder à sa longueur",
        code: "int[] source = {8, 5, 2};\nint[] copie = source.clone();\nint taille = copie.length;",
        explanation:
          "Un tableau utilise length, une String utilise length() et une collection utilise généralement size().",
        traps: [
          "Le dernier indice est longueur - 1. Vérifie le cas vide avant de calculer un indice ou un modulo par la longueur.",
          "Copier un tableau d’objets copie leurs références ; les objets peuvent encore être partagés.",
        ],
      },
      math: {
        match:
          /division|arithmetique|produit|puissance|chiffre|nombre|factori|somme|diviseur|primalite/,
        title: "Division entière ou décimale",
        code: "int entier = 7 / 2;\ndouble decimal = 7.0 / 2;\n// entier = 3, decimal = 3.5",
        explanation:
          "Affecter un quotient entier à un double ne recrée pas sa partie décimale : au moins un opérande doit être décimal.",
        traps: [
          "Le type int peut déborder pendant un produit même si le résultat est ensuite stocké dans un long.",
          "Le reste d’une valeur négative peut être négatif ; normalise les indices circulaires avant d’accéder au tableau.",
        ],
      },
      date: {
        match: /date|utc|timestamp|calendaire|duree|setter/,
        title: "Analyser une date calendaire",
        code: 'java.time.LocalDate date =\n    java.time.LocalDate.parse("2024-02-29");\nint annee = date.getYear();',
        explanation:
          "LocalDate représente une date sans heure ni fuseau. Un timestamp et une durée représentent des notions différentes.",
        traps: [
          "Une année calendaire n’est pas toujours 365 jours et un mois n’est pas toujours 30 jours.",
          "Distingue secondes UNIX et millisecondes ; pour les formats personnalisés, respecte la convention et le fuseau demandés.",
        ],
      },
      oop: {
        match:
          /classe|interface|polymorphisme|factory|builder|instance|constructeur|objet|surcharge/,
        title: "Initialiser une instance",
        code: "class Exemple {\n    private int valeur;\n    Exemple(int valeur) {\n        this.valeur = valeur;\n    }\n}",
        explanation:
          "Le constructeur porte le nom de la classe et n’a pas de type de retour. this distingue le champ de son paramètre homonyme.",
        traps: [
          "Une surcharge change les paramètres ; une redéfinition doit respecter la signature héritée.",
          "Ne recrée pas l’instance à chaque accès dans un Singleton et ne partage pas accidentellement l’état de plusieurs objets via static.",
        ],
      },
    },
  };
  references.go.iteration = {
    match:
      /boucle|combinaison|formatage|interpreteur|etat|blocs|alternance|symboles|bits/,
    title: "Faire évoluer un indice",
    code: "total := 0\nfor position := 0; position < 3; position++ {\n\ttotal += position\n}\n_ = total",
    explanation:
      "Une boucle comporte une initialisation, une condition et une progression. Écris d’abord ce que représente l’indice avant de modifier plusieurs compteurs.",
    traps: [
      "Un indice qui n’avance pas dans une branche crée une boucle infinie. Vérifie aussi la condition de sortie après chaque saut.",
    ],
  };
  references.js.numeric = {
    match:
      /diviseur|modulo|parite|accumulateur|produit|base|recurrence|iteration|palindrome|somme/,
    title: "Reste et progression d’un compteur",
    code: "let valeur = 11;\nconst reste = valeur % 3;\nvaleur += 2;",
    explanation:
      "Le reste permet de tester une divisibilité. JavaScript utilise des nombres qui peuvent avoir une partie décimale : / n’est pas automatiquement une division entière.",
    traps: [
      "Un grand entier peut perdre sa précision au-delà de Number.MAX_SAFE_INTEGER. Ne mélange pas Number et BigInt dans une opération.",
    ],
  };
  references.js.functional = {
    match: /composition|historique/,
    title: "Passer une fonction en argument",
    code: "const ajouterUn = n => n + 1;\nfunction appliquer(fn, valeur) {\n  return fn(valeur);\n}",
    explanation:
      "La fonction est une valeur que tu peux transmettre, puis appeler avec des parenthèses. Transmettre ajouterUn et transmettre ajouterUn(3) ont des effets différents.",
    traps: [
      "Ne déclenche pas une fonction au moment où tu dois simplement transmettre sa référence.",
    ],
  };
  references.js.grid = {
    match: /grille/,
    title: "Lire une cellule de grille",
    code: 'const grille = [["a", "b"], ["c", "d"]];\nconst cellule = grille[1][0]; // "c"',
    explanation:
      "Le premier indice choisit une ligne, le second une colonne. La convention x/y de la consigne doit rester cohérente avec cette représentation.",
    traps: [
      "Vérifie les limites de ligne et de colonne avant de lire une cellule voisine.",
    ],
  };
  references.rust.numeric = {
    match:
      /produit|recurrence|primalite|coordonnee|diagonal|indice|interpreteur|memoire/,
    title: "Calculs typés et reste",
    code: "let nombre: i32 = 17;\nlet quotient = nombre / 5;\nlet reste = nombre % 5;",
    explanation:
      "Les opérandes entiers donnent un quotient entier. i32 accepte des nombres négatifs ; usize sert notamment aux indices et ne représente pas une valeur négative.",
    traps: [
      "Ne soustrais pas avant de vérifier les bornes d’un entier non signé ; évite aussi un diviseur nul.",
    ],
  };
  references.rust.repeat = {
    match: /ligne|repetition/,
    title: "Construire une chaîne répétée",
    code: 'let motif = "x";\nlet ligne = motif.repeat(3); // "xxx"',
    explanation:
      "repeat produit une nouvelle chaîne ; l’indentation doit être construite séparément lorsque l’exercice demande des espaces en début de ligne.",
    traps: [
      "Un espace de trop ou une ligne ajoutée à l’affichage peut suffire à faire échouer une comparaison exacte.",
    ],
  };
  references.java.iteration = {
    match: /boucle|formatage|pile|liens/,
    title: "Parcourir avec une borne exclusive",
    code: "int total = 0;\nfor (int i = 0; i < 3; i++) {\n    total += i;\n}",
    explanation:
      "La condition est vérifiée avant chaque passage. Ici les indices visités sont 0, 1 et 2.",
    traps: [
      "Une condition avec <= au lieu de < peut provoquer un accès au-delà du dernier indice.",
    ],
  };
  function get(track, exercise, guide) {
    const reference = references[track];
    if (!reference) return null;
    const topics = guide.topics
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const noLoops =
      track === "js" &&
      /not allowed to use any kind of loops/i.test(exercise.statement || "");
    const examples = [reference.base];
    const candidates = Object.values(reference).filter((item) =>
      item.match?.test(topics),
    );
    if (noLoops && !candidates.includes(reference.recursion))
      candidates.unshift(reference.recursion);
    examples.push(...candidates.slice(0, 2));
    if (
      track === "go" &&
      exercise.allowedFunctions?.includes("--allow-builtin") &&
      /slice|tableau|pile/.test(topics)
    )
      examples.push(reference.builtin);
    if (track === "go") {
      const rules = exercise.allowedFunctions || [];
      const permits = (symbol) =>
        rules.some(
          (rule) =>
            typeof rule === "string" &&
            (rule === symbol ||
              (rule.endsWith(".*") && symbol.startsWith(rule.slice(0, -1)))),
        );
      if (permits("github.com/01-edu/z01.PrintRune"))
        examples.push({
          title: "Afficher une rune autorisée",
          code: "// Import en tête du fichier : github.com/01-edu/z01\nz01.PrintRune('X')",
          explanation:
            "Fragment à placer dans une fonction après avoir ajouté l’import z01. Une rune utilise des apostrophes ; cet appel n’ajoute pas de retour à la ligne.",
          traps: [
            "Ajouter un retour à la ligne ou un affichage de débogage peut modifier la sortie exacte attendue.",
          ],
        });
      if (permits("math.Log2"))
        examples.push({
          title: "Appeler une fonction du package math",
          code: "// Import en tête du fichier : math\nlogarithme := math.Log2(8)\n_ = logarithme // 3",
          explanation:
            "L’appel est préfixé par le nom du package. Cet exemple est affiché uniquement si math.Log2 est autorisée pour l’exercice.",
          traps: [
            "Autoriser math.Log2 n’autorise pas automatiquement les autres fonctions de math.",
          ],
        });
    }
    return {
      examples,
      traps: [...new Set(examples.flatMap((item) => item.traps))],
      noLoops,
    };
  }
  return { get };
})();
if (typeof module !== "undefined") module.exports = CodeHints;
