# Historique fonctionnel

## 29 octobre 2026 — historique et bilan d’apprentissage

- Historique local des corrections, code et sortie consultables, comparaison de deux essais.
- Bilan par langage avec fiches conseillées selon les derniers essais non validés.
- Historique d’examen accessible après le rendu uniquement ; erreurs de service distinguées.
- Stockage borné et effacement par langage indépendant de la progression.

## 29 octobre 2026 — couleur d’interface personnalisée

- Palette native et saisie hexadécimale dans le menu des nuances.
- Sauvegarde locale, retour aux six nuances et adaptation des tons de fond.
- Texte des boutons remplis et logo adaptés aux couleurs sombres ou claires.

## 28 octobre 2026 — publication du dépôt et protections

- Attribution du projet d’origine mise en évidence dans le README.
- Dépôt public et documentation de contribution adaptée.
- Protections main/develop : PR, CI, conversations résolues,
  branche à jour, interdiction des pushes forcés et des suppressions.
- Approbation externe facultative pour permettre la fusion de ses propres PR.

## 28 octobre 2026 — niveaux JavaScript officiels

- Filtrage JavaScript réactivé et niveaux issus de `attrs.group` de l’API (N1 à N7).
- Groupes conservés dans les 31 copies locales ; aucun classement par index.
- Niveaux absents regroupés sous « Non classés » ; tests API, secours et interface.

## 28 octobre 2026 — cohérence de navigation

- Changer de langage conserve l’onglet actuel et les conditions d’examen choisies.
- Le nom de l’exercice d’entraînement ne remplace plus le titre des fiches.
- Le bilan et l’écran de préparation d’examen restent masqués dans les fiches.
- Tests de transition entre fiches, entraînement et bilan, dans les quatre langages.

## 28 octobre 2026 — fiches multilangages et références en entraînement

- 36 nouvelles fiches : 12 Rust, 11 JavaScript et 13 Java, soit 70 avec Go.
- Références explicites pour les 175 exercices vers les notions utiles.
- Lecteur superposé qui conserve le code ; références masquées en examen.
- Onglet Fiches filtré par langage, chargement local à la demande.
- Tests de couverture, navigation et exemples exécutables dans les trois langages.

## 28 octobre 2026 — secours local des quatre langages

- Copies complètes de 175 exercices, avec consignes et métadonnées de correction.
- Secours automatique si l’API est indisponible, sans restaurer de faux énoncés
  lorsqu’une copie correspondante existe.
- `CATALOG_MODE=offline` pour démarrer sans appeler les API.
- Synchronisation manuelle validée, provenance/date visibles et tests sans API.

## 28 octobre 2026 — catalogue JavaScript depuis l’API

- Chargement prioritaire des 31 exercices du checkpoint JavaScript Zone01.
- Métadonnées et fichiers attendus officiels, identifiants de progression conservés.
- Copie locale synchronisée en secours et source visible sous la consigne.
- Empreintes des aides mises à jour après comparaison des consignes et signatures.
- Tests des alias, du secours, des chemins et correction réelle de factorial.

## Version personnelle initiale — 27 octobre 2026

Import du travail local à partir de la base open source `c55677a`. Les commits
personnels regroupent des changements déjà réalisés localement ; leurs dates ne
prétendent pas représenter chaque étape du développement.

### Interface et apprentissage

- Identité Z01 Fake Exam, interface sombre, logo personnel et six nuances.
- Filtres de difficulté en grille, transitions courtes et éditeur CodeMirror.
- Réussites conservées ; code d’entraînement vidé à la navigation/recharge.
- 175 aides locales : démarche, syntaxe, pièges et exemples progressifs.
- Fiches de révision sans barre latérale d’exercices et sans chrono d’entraînement.
- Six GIFs d’échec en rotation et confettis ascendants sur une nouvelle réussite.

### Examens et exécution

- Examen libre sans chronomètre avec saut ; examen strict de 3 heures sans saut.
- Série future masquée, brouillons et échéance restaurables, bilan final.
- Passage automatique après correction réussie ; Tester ne donne aucun point.
- Navigation interne verrouillée et onglets masqués en strict, plein écran demandé.
  Les sorties d’onglet/plein écran déclenchent un écran de reprise, sans arrêter le temps.
- Liens documentaires conservés dans les consignes, ouverts dans un autre onglet.
- Champ Args transmis comme arguments littéraux ; programme de consigne utilisé
  pour les fonctions seules lorsqu’il existe. Aucun appel de fonction inventé.
- Cooldowns d’interface : Tester 10 s, correction 15 s ; rendu final non bloqué.
- Package Go explicite et conforme : piscine pour les fonctions, main pour les
  programmes attendus, puis adaptation interne aux images.
- Compteur indicatif de réponses codées en dur, sans refus ni changement de score.
  Image de bilan si plus de la moitié des réussites sont signalées.

### Sécurité, organisation et maintenance

- Sources frontend découpées, bundles reproductibles et tests d’interface.
- Serveur Go découpé par responsabilité ; monolithe et services séparés conservés.
- Vérifications Host/Origin, JSON borné, délais HTTP, concurrence et fréquence limitées.
- CSP, nettoyage du Markdown et protection de la distribution des fichiers statiques.
- Docker sans réseau, ressources limitées, images épinglées, sources hôtes en lecture
  seule, racine en lecture seule, espaces temporaires bornés et nettoyage sur délai.
- Profil production protégé, HTTPS attendu et Docker rootless/cgroup v2 exigés.
- Tests adversariaux reproductibles ; les limites et résultats sont documentés.
- Dépôt personnel privé, branches main/develop et CI sans déploiement automatique.
