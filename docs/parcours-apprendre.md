# Parcours Apprendre — prototype

## Utilisation

Choisir un langage dans l’en-tête, puis **Apprendre**. Le parcours prend toute la
page ; aucun catalogue d’exercices, ancien titre ou bilan d’examen ne doit apparaître.
Changer de langage conserve cet onglet et ouvre le parcours correspondant.
En examen strict actif, l’accès reste verrouillé comme les autres onglets.

1. Lire la comparaison et les explications du chapitre.
2. Compléter la petite fonction dans l’éditeur.
3. Vérifier : chaque cas montre le résultat attendu et obtenu.
4. Utiliser un indice ou le corrigé expliqué si nécessaire ; la réussite reste
   distinguée d’un essai sans aide.
5. Passer à la suite après réussite du code courant. Modifier le code exige une
   nouvelle vérification. Les chapitres restent consultables librement.
6. Assembler les acquis dans les vrais exercices proposés en fin d’étape.

## Contenu maintenu

| Langage | Étapes | Chapitres | Objectif du premier parcours |
| --- | --- | --- | --- |
| Go | 30 | 6 | Contrats, UTF-8, copies, sous-séquences, RLE, bases, bits, pile RPN et machine à états. |
| JavaScript | 30 | 12 | N1 à N7 : syntaxe, collections, closures, grilles, promesses, structures profondes et Proxy. |
| Rust | 30 | 6 | Emprunts, Result, génériques, FIFO, tri par étapes, Display, Box, Rc/RefCell et Drop. |
| Java | 30 | 6 | Méthodes, regex, fenêtres, tas, Builder/Factory/Singleton, listes, abstraction, matrices et dates UTC. |

Les nouvelles étapes sont des exercices locaux rédigés pour l’apprentissage ;
elles ne proviennent pas de l’API officielle. Les ponts ouvrent les vrais sujets
du catalogue : les 175 sujets possèdent un pont de préparation. Une association
indique des notions utiles, pas une solution complète ni une maîtrise démontrée.
Les petits exercices ne couvrent pas tous les cas particuliers de ces sujets.
Les fiches et la pratique complète restent nécessaires, notamment pour les
variantes de matrices, de structures et de règles métier.

Les chapitres affichent les groupes officiels associés : JS N1 à N7, Rust N1 à N10,
Java N1 à N5 séparément pour chacun des trois checkpoints. Ils proviennent de
`attrs.group`, pas du niveau de cursus `attrs.level`. Go conserve son classement
local existant. Les étapes de cours restent organisées par compétences.
Voir [la carte des associations](couverture-parcours.md).

## Contrat des moteurs

Le client transmet seulement `mode: lesson`, l’identifiant et le code. Le serveur
sélectionne le curriculum, les appels de test et l’image depuis des listes fermées.
Aucun code utilisateur n’est exécuté dans la page ni sur l’hôte : compilation et
exécution utilisent le même Docker durci que les autres soumissions, avec limites
de ressources, réseau désactivé et fichiers temporaires nettoyés. La préparation
d’une image conserve le contrat HTTP 202 ; une indisponibilité n’ajoute pas d’échec.

- JS : appels Node synchrones ou asynchrones attendus avec await ; rejets rendus
  comme des échecs de test. Comparaison profonde et mutation des arguments contrôlée.
  Les timers des exercices de course doivent être nettoyés par le code.
- Go : fonctions sans package/main ; enveloppe `package main` fournie. Les paquets
  fmt, strings, strconv et sort sont disponibles dans ces leçons seulement.
- Rust : fonctions/types sans main ; compilation edition 2024. Les valeurs sont
  comparées via leur format Debug, donc les String attendues portent des guillemets.
- Java : méthodes et types imbriqués dans la classe fournie Lesson ; compilation
  javac puis exécution java. Les tableaux sont rendus avec Arrays.toString dans
  les cas qui en ont besoin.

Les cas sont publics et limités. Ce sont des retours pédagogiques, pas un examen
anti-triche ni une preuve de correction sur toutes les entrées. Les tests compilés
comparent les valeurs affichées ; ils ne détectent pas automatiquement toutes les
mutations ou tous les algorithmes incorrects. Les restrictions d’import du vrai
sujet ne sont pas implicitement appliquées à ces petites leçons.

## Données et maintenance

Contenus : `learning-content/{langage}-micro-path/curriculum.json`. Le build
`npm run build` les embarque ; ils restent aussi lus côté serveur. Chaque étape
possède un identifiant stable, un squelette, une solution, des indices, un
raisonnement détaillé et au moins deux cas publics. Les expressions `invoke`
sont du code de test maintenu côté dépôt, pas du contenu importé d’une API.

Stockage courant : `z01-{go,rust,java}-micro-path-v2` et `z01-js-micro-path-v3`.
Les clés précédentes restent intactes. Seuls les identifiants d’étapes conservées
sont repris : brouillon, aides et résultat. Un ancien exercice remplacé ne donne
pas automatiquement une réussite sur son successeur.

Pour JS, v3 peut importer v2, ou directement v1 si v2 n’existe pas. Une sauvegarde
v2 vide issue d’une réinitialisation reste prioritaire sur v1. Réinitialiser la
version courante ne ressuscite pas ensuite une ancienne progression.
La réinitialisation vise uniquement le parcours du langage courant. Ce stockage
reste local au navigateur et au port, sans compte ni synchronisation.

Validation normale : `make check`. Les tests compilent les corrections maintenues
avec les outils de l’hôte lorsqu’ils existent ; aucun code utilisateur n’y passe.
Pour valider les 120 corrections, y compris le JavaScript asynchrone, dans les vraies images, les précharger
puis lancer depuis la racine, avec un TMPDIR visible du daemon Docker :

```sh
RUN_MICRO_DOCKER_TESTS=1 TMPDIR="$HOME/z01-exam-tmp" \
  go -C backend test -run TestMicroDockerOtherCurricula -v .
```

Les tests UI couvrent le changement de langage et d’onglet, la reprise des
brouillons, les réponses tardives, les aides, la séparation des scores et le
verrouillage d’examen.
