# Présenter les évolutions depuis la base open source

## Démarche

Z01 Fake Exam est une version personnelle du projet d’Alioune,
[z01exam/z01exam](https://github.com/z01exam/z01exam). La référence de comparaison
est `archive/upstream-base` (`c55677a`). L’historique et les licences sont conservés.
Les adaptations ont été développées avec l’aide de Codex, dans une démarche de
vibe coding : itérations sur le fonctionnement et l’interface, puis tests et
corrections. Cela ne constitue ni une réécriture intégrale ni une version officielle.

## Apports de la base

La première version fournit notamment les parcours multilangages, les catalogues,
les adaptateurs des moulinettes 01-edu, une première interface et les fiches Go.
Les moulinettes ne sont donc pas une création de cette version personnelle.

## Changements apportés

- **Interface** : identité Z01 Fake Exam, thème sombre inspiré de l’émargement,
  six nuances, éditeur CodeMirror, difficultés plus lisibles, transitions,
  réactions d’échec et confettis.
- **Entraînement** : réussites conservées localement, code remis à zéro à la
  navigation, aides progressives pour les 175 exercices, syntaxe et pièges.
  Le lecteur de fiches superposé préserve le code pendant sa consultation.
- **Révisions** : 36 nouvelles fiches (12 Rust, 11 JavaScript, 13 Java), soit
  70 avec les 34 Go ; références adaptées pour chacun des 175 exercices.
- **Examens** : mode libre sans timer avec saut et mode strict de trois heures
  sans saut ; exercices futurs masqués, sessions séparées de l’entraînement,
  reprise des brouillons, bilan et progression automatique après réussite.
  Le mode strict verrouille la navigation interne et demande le plein écran,
  sans prétendre bloquer les commandes système du navigateur.
- **Exécution** : distinction entre Tester sans points et correction complète,
  champ Args littéral, utilisation du programme d’appel de la consigne lorsqu’il
  existe, contrôle du package Go et cooldowns d’interface.
- **Catalogues** : chargement des quatre langages via les API Zone01 ; migration
  du catalogue JavaScript local vers le checkpoint officiel. Copies locales des
  175 énoncés et métadonnées en secours et démarrage offline explicite.
- **Sécurité** : restrictions Docker, limites de ressources et de sorties,
  validation des requêtes, assainissement du Markdown, protection des fichiers
  privés et tests de sécurité. Voir les limites dans SECURITY.md et la roadmap.
- **Maintenance** : sources frontend organisées par responsabilité, génération
  reproductible du bundle, tests de parcours, CI, documentation du fonctionnement,
  des API, du runner, des licences et de la mise en ligne.
- **Niveaux JavaScript** : groupes d’examen officiels N1 à N7 récupérés depuis
  l’API, filtrage réactivé et groupes conservés dans la copie locale.
- **Navigation** : changer de langage garde l’onglet actuel ; les fiches ne
  réaffichent ni le titre d’exercice ni un ancien bilan d’examen.

## Expliquer correctement les sources

Les énoncés et métadonnées viennent des API Zone01, avec un secours local daté.
La correction s’exécute dans Docker à travers les adaptateurs et ressources
01-edu utilisés par le projet ; ce n’est pas un appel à une API de correction
Zone01 distante. Les aides et nouvelles fiches sont des contenus pédagogiques
locaux, distincts des corrigés officiels.

## Limites à annoncer

Le projet est testé localement et dispose d’une CI, mais n’est pas encore déployé
publiquement. Il n’existe pas de validation de charge pour 60 utilisateurs.
Le runner accepte deux exécutions simultanées et n’a pas de file d’attente.
Les données sont conservées dans le navigateur, sans comptes synchronisés.
Les heuristiques de réponses codées en dur ne sont pas une preuve de triche et
n’infligent aucune pénalité. Voir [la roadmap](roadmap.md).
