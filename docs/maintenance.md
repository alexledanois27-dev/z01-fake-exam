# Maintenance de Z01 Fake Exam

## Principes

Garder les parcours utilisateur et les contrats HTTP stables. Une nouvelle
session d’examen ne réutilise jamais le code d’entraînement. Une exécution du
programme d’exemple ne valide jamais un exercice. Une nouvelle série prend un exercice par niveau disponible, dans l’ordre N1 à N10
(N1 à N7 pour le catalogue JavaScript actuel), indépendamment du filtre ou de
l’exercice d’entraînement. Une session reprise conserve sa série et sa position.
Les exercices à venir restent
masqués en examen. Les données du navigateur restent locales.
Changer de langage conserve le mode courant et le type d’examen ; seuls le filtre
et l’exercice choisi sont repris depuis la progression du langage de destination.
Les fiches ne doivent jamais afficher le titre d’un exercice ni le bilan d’examen.

## Interface : sources et fichiers livrés

`frontend/build.json` fixe l’ordre d’assemblage. `npm run build` produit les
fichiers racine `app.js` et `style.css`, qui restent livrés avec le projet : le
serveur Go n’a donc besoin ni de Node.js ni de npm en fonctionnement normal.

L’application JavaScript utilise encore un état partagé entre ses différentes
parties. Les fichiers de `frontend/app/` sont des sections d’une même application,
assemblées dans une fonction fermée ; ce ne sont pas des modules ES indépendants.
Cette organisation conserve les dépendances et l’ordre d’initialisation existants
sans ajouter de framework. Les symboles internes ne sont plus exposés sur `window`.
La fonction `window.getExamTimerContext` reste le contrat explicite avec le timer.

| Fichier dans `frontend/app/` | Responsabilité |
| --- | --- |
| `context.js` | Références DOM, éditeur, état partagé et statut d’exécution. |
| `configuration.js` | Niveaux, alias et données initiales des fiches. |
| `progress.js` | Persistance et identité de la visite dans l’éditeur. |
| `navigation.js` | Langage courant, navigation entre les trois modes. |
| `exam-controller.js` | Série, échéance, soumission finale et bilan. |
| `exercise-model.js` | Identifiants, sélection des niveaux et métadonnées d’exercice. |
| `markdown.js` | Conversion Markdown et assainissement du HTML. |
| `learning.js` | Chargement local et navigation des fiches par langage. |
| `learning-journal.js` | Lecteur des tentatives, comparaison et suggestions de fiches après correction. |
| `revisions.js` | Associations exercice/fiche et lecteur modal qui préserve le code. |
| `catalog-loader.js` | Appels des quatre catalogues et restauration de la sélection. |
| `catalog-view.js` | Filtres, liste des exercices et ouverture d’un exercice. |
| `submission.js` | Requête de correction, résultat et protection contre les réponses tardives. |
| `events.js` | Boutons, raccourcis et export d’énoncé. |
| `layout.js` | Redimensionnement des panneaux. |
| `brute-force.js` | Indices de réponses codées en dur ; aucun impact sur les points. |
| `exam-focus.js` | Verrouillage interne et reprise du plein écran en examen strict. |
| `appearance.js`, `failure-reaction.js`, `motion.js` | Nuances, réactions, confettis et transitions accessibles. |
| `bootstrap.js` | Démarrage et restauration du langage/mode. |

Les bibliothèques de `frontend/lib/` exposent leur petite API existante et
peuvent être testées sans DOM. Les clés de stockage restent inchangées pour
préserver les réussites et les sessions déjà enregistrées. L’ancienne API de
brouillons d’entraînement reste lisible par la bibliothèque pour compatibilité,
mais l’interface ne les restaure ni ne les écrit désormais.

### Styles

- `base.css`, `header.css` : fondations et navigation principale.
- `catalog.css`, `workspace.css` : catalogue, progression, titre et timer.
- `statement.css`, `editor.css`, `learning.css` : panneaux et contenu.
- `responsive.css` : adaptation de la disposition aux différentes tailles d’écran.
- `sessions.css` : restrictions, exemples et états des examens.
- `theme.css` : identité visuelle finale et adaptations du thème aux petits écrans.

L’ordre de cascade est intentionnel : le thème est suivi des styles ciblés des aides, réactions, apparence et transitions. Modifier les
variables de couleur dans `theme.css` pour faire évoluer l’identité graphique.
Éviter les nouvelles surcharges locales dispersées. Le build retire les anciens
styles de configuration manuelle des tests, fonctionnalité abandonnée.

`npm run build:check` compare les fichiers livrés aux sources et échoue si
une compilation a été oubliée. Le build vérifie aussi la syntaxe du JavaScript
avant d’écrire le bundle. `npm test` commence par cette vérification.

### Éditeur

`editor/editor.js` est l’entrée CodeMirror. Ses dépendances sont isolées dans
`editor/package.json` et verrouillées dans son propre lockfile. Après modification,
exécuter `npm run build:editor` ; ne pas modifier `vendor/editor.bundle.js` à la main.

## Backend Go

Le package Go reste unique pour conserver les contrats et les tests existants.
Les commandes de `backend/cmd/` choisissent la topologie ; les autres fichiers
se répartissent les responsabilités :

| Fichier / groupe | Responsabilité |
| --- | --- |
| `main.go` | Démarrage, découverte de la racine et sélection du mode de service. |
| `catalog_init.go` | Chargement des quatre catalogues et snapshot du runner séparé. |
| `http_routes.go` | Table de routage et reverse proxies. |
| `http_catalog.go` | API publique des exercices et snapshot interne. |
| `http_run.go` | Validation HTTP, limite de concurrence et dispatch par langage. |
| `http_static.go` | Liste explicite des assets publics et protection des fichiers privés. |
| `exercises.go`, `zone.go`, `java.go`, `rust.go` | Modèles, récupération et adaptation des catalogues. |
| `runner.go`, `runner_js_exec.go`, `java.go`, `rust.go` | Exécution de la correction complète. |
| `go_restrictions.go`, `go_allowed_access.go` | Règles de fonctions autorisées. |
| `go_example.go`, `manual_example.go` | Extraction et exécution du programme de la consigne. |
| `docker_*.go`, `limited_output.go` | Conteneurs, annulation, ressources et sorties bornées. |
| `images.go` | Versions épinglées des images officielles. |

L’état des catalogues est initialisé au démarrage. Le serveur conserve cette
architecture ; transformer tous les handlers en services injectés serait une
évolution supplémentaire, distincte de cette réorganisation.

### Contrats publics

- `GET /api/exercises?track=go|js|rust|java` : liste des exercices.
- `POST /api/run` : `{exerciseId, code, mode?}` → `{success, output}`.
- `GET /api/version` : informations de version.

`mode: "example"` utilise exclusivement le programme du catalogue serveur.
Il ignore les anciennes options de test envoyées par un navigateur. Les modes
absent / `tests` gardent la correction complète. La liste des assets est explicite :
un nouveau fichier public doit être ajouté dans `http_static.go` et à son test.
Les sources `frontend/app/`, les documents et les fichiers Go restent privés.

## Avant de terminer un changement

```sh
npm run build
npm test
go -C backend test ./...
go -C backend vet ./...
go -C backend build ./cmd/...
```

Les tests d’interface chargent les scripts déclarés dans le vrai `index.html`.
Ils couvrent l’isolation entraînement/examen, les exercices masqués, les deux
modes d’examen, les expirations, les réponses en attente et le rôle de « Tester ».
Les tests unitaires JavaScript sont dans `tests/unit/` ; ceux de Go restent à
côté de leurs sources.

Après une modification du runner, lancer les tests Docker ciblés documentés dans
le README. Les tests officiels exhaustifs de `backend/e2e_official_test.go` restent
optionnels : lire leurs variables d’activation avant de les lancer.

Vérifier visuellement l’entraînement, le bilan d’examen et les fiches, ainsi qu’une
fenêtre étroite lorsque la mise en page a changé. Ne pas effacer le stockage du
navigateur pour faire passer une vérification : les sessions existantes comptent.

## Éléments hérités

Les ressources pédagogiques, notices de licence, configurations de déploiement
et workflows historiques sont conservés. Ils ne participent pas au build de
l’interface. Cette copie se développe localement ; aucune publication ou
synchronisation vers le dépôt d’origine n’est nécessaire.

## Fiches pédagogiques d’entraînement

Les quatre fichiers `frontend/hints/{go,js,rust,java}.json` contiennent les fiches
rédigées à partir des énoncés : `title`, `statementHash`, `topics`, `strategy`,
`hints` (deux étapes) et `checks` (cas à tester). Les clés sont les identifiants
exacts des exercices, dans un dictionnaire séparé par langage.

`frontend/lib/training-hints.js` vérifie l’identifiant, le langage et l’empreinte
de la consigne. L’empreinte FNV-1a sur les unités UTF-16, après normalisation des
espaces, sert uniquement à détecter une évolution ; ce n’est pas un contrôle de
sécurité. Les descriptions de fonctions Go sont filtrées par `allowedFunctions`
avec correspondance exacte ou règle `package.*`. Les autres appels ne sont pas
présentés comme autorisés.

`frontend/app/training-guide.js` construit les aides avec des nœuds DOM et du
texte, sans interpréter les fiches comme du HTML. Le volet commence fermé et
chaque indice demande une action. Il est retiré du DOM au changement d’exercice,
à l’entrée dans les fiches de révision et dans les deux modes d’examen. Une aide
absente ou périmée n’est jamais remplacée par un conseil générique inventé.

Les fiches sont incorporées au bundle par `npm run build` ; leurs sources JSON
restent privées dans le serveur statique. Cela ne constitue pas une protection
contre l’inspection du bundle : la séparation entraînement/examen concerne le
parcours d’interface d’un outil personnel, sans mécanisme anti-triche serveur.

Pour maintenir la couverture :

1. Lancer `npm run hints:check -- http://127.0.0.1:8092` sur le serveur courant.
2. Relire la consigne et ses restrictions pour chaque fiche absente ou périmée.
3. Adapter la démarche, les deux indices et les cas limites, sans solution complète.
4. Mettre à jour `statementHash` avec l’empreinte courante indiquée par le contrôle,
   seulement après cette relecture.
5. Reconstruire avec `npm run build`, lancer `npm test`, puis refaire le contrôle.

Les tests utilisent des exemples de consignes des quatre langages et vérifient
notamment les indices progressifs, la remise à zéro à la navigation, les appels
Go autorisés et l’absence d’aides dans les examens. La présence et la structure
des 175 fiches sont contrôlées ; ces tests ne prouvent pas qu’une démarche constitue
une solution officielle pour tous les tests cachés de la plateforme.

### Syntaxe et pièges

`frontend/app/code-hints.js` contient un socle de références par langage et des
compléments sélectionnés par les notions de la fiche. Il est assemblé avant le
rendu du volet pédagogique. Chaque exemple indique son contexte : les fragments
ne sont pas des programmes complets à soumettre et ne sont jamais insérés dans
l’éditeur. Les deux volets « Syntaxe et petits exemples » et « Pièges fréquents
et débogage » commencent repliés.

Les exemples Go avec `append` et `len` nécessitent le marqueur `--allow-builtin`.
Les appels à `z01.PrintRune` et `math.Log2` ne sont proposés que si le catalogue
courant les autorise explicitement ou par une règle de package. Les exercices
JavaScript sans boucles reçoivent un exemple récursif et un rappel de contrainte.
Le socle couvre tous les exercices ; les exemples sont des références de notions,
pas 175 corrigés individuels. Les tests vérifient la couverture, ces restrictions,
la syntaxe des fragments JavaScript et la présence des volets repliés.

### Réaction après correction échouée

`frontend/app/failure-reaction.js` ajoute un GIF Picard après une correction
non validée de l’exercice visible. Les tests d’exemple, erreurs de transport et
rendus finaux ne le déclenchent pas. La réaction est un élément de la console :
effacer celle-ci, lancer une nouvelle exécution ou changer d’exercice la retire.
Le bouton « Masquer la réaction » permet d’arrêter l’animation. La préférence
`prefers-reduced-motion` remplace le GIF par un symbole fixe.

Le GIF est servi localement depuis `assets/wrong-answer.gif` ; sa provenance
est conservée dans `assets/README.md`. Le navigateur ne contacte pas Tenor.

Le catalogue des quatre réactions est défini dans `failure-reaction.js`.
Un sac mélangé présente chaque réaction une fois avant de recommencer ;
le premier élément du nouveau cycle est échangé s’il répète la dernière réaction.
Les médias ne sont chargés que lorsqu’ils sont affichés. Pour ajouter une réaction,
mettre son fichier dans `assets/`, documenter sa provenance, ajouter son entrée
au catalogue et autoriser exactement son chemin dans le serveur statique.

### Nuances et confettis

`frontend/app/appearance.js` gère le sélecteur, la clé locale
`z01fakeexam-accent` et l’animation de réussite. `frontend/styles/appearance.css`
définit les six palettes, le contrôle du bandeau et les confettis. Les autres
styles utilisent `--accent`, `--accent-hue` et `--theme-chroma` pour teinter les
fonds, traits et accents ; la nuance grise annule la saturation de ces surfaces.
Ne pas réintroduire de jaunes fixes dans les composants. Les couleurs sémantiques
de réussite, d’erreur et de coloration syntaxique restent indépendantes.

La correction capture l’état de réussite précédent et ne célèbre qu’une nouvelle
validation visible, hors exemples et rendu final. L’animation ne bloque aucun
clic, contient 32 petits éléments et se supprime après 2,1 secondes. Elle n’est
pas créée lorsque `prefers-reduced-motion` est actif. Le changement de nuance
n’altère ni les résultats ni les sessions.

## Catalogue JavaScript officiel

`backend/js_catalog.go` lit `/rouen/cursus-cda/checkpoint-js` dans le catalogue
Zone01 partagé. Il valide les métadonnées et télécharge les consignes via un
maximum de huit workers. Les fichiers attendus viennent du catalogue officiel.
Les alias conservent les identifiants de progression et les aides historiques.

Si le catalogue est indisponible, `LoadLocalJSExercises` charge le snapshot local.
Si une seule consigne échoue, son fichier local est utilisé sans remplacer les
métadonnées officielles. Le champ public `statementSource` vaut `zone01-api` ou
`local` et alimente le libellé sous la consigne. Une nouvelle consigne sans copie
locale manquante fait échouer le chargement API plutôt que publier un faux énoncé.
Les échecs sont journalisés ; la copie locale ne se met pas à jour automatiquement.

Après une synchronisation manuelle, comparer les contrats avant d’actualiser les
empreintes des aides et les fixtures. Un changement API non relu garde l’aide
suspendue. Vérification réelle :

```sh
RUN_JS_CATALOG_INTEGRATION=1 go -C backend test -run TestJSAPI -v .
```

## Copies de secours des quatre langages

`backend/catalog_backup.go` enveloppe les chargements au démarrage. Il lit les
snapshots versionnés, valide images/chemins/règles et conserve les métadonnées
nécessaires aux corrections. En mode auto, la source API est prioritaire ; un
échec global utilise le catalogue local complet. Un énoncé manquant peut utiliser
la copie du même exercice et de la même URL, avec les métadonnées API courantes.

`CATALOG_MODE=offline` empêche ces chargements API. Les snapshots ne sont pas un
cache utilisateur : aucune soumission n’y est écrite et le démarrage n’écrit pas
dans le dépôt. `cmd/sync-catalog` exporte volontairement quatre catalogues complets
uniquement après validation de toutes les données live. Voir le README du dossier.

```sh
RUN_OFFLINE_CATALOG_INTEGRATION=1 go -C backend test -run TestOfflineCatalogCorrectionIntegration -v .
```

Ce test corrige un exercice de chaque langage depuis les métadonnées des copies.
Le test `TestAllCatalogsStartOfflineWithoutNetwork` interdit les requêtes HTTP et
vérifie les 175 exercices ; un autre test simule l’API en panne en mode automatique.

## Fiches et références pédagogiques

Le catalogue des 70 fiches et les associations des 175 exercices sont intégrés par
`scripts/build-frontend.cjs` depuis `learning-content/manifest.json` et
`learning-content/exercise-links.json`. Toute modification de ces JSON impose un
rebuild. Le Markdown reste chargé à la demande et assaini avant affichage.
Les sélections sont indépendantes par langage ; des compteurs de requêtes évitent
qu’une réponse tardive s’affiche après un changement de langage, de mode ou la
fermeture du lecteur. Le raccourci de correction est suspendu dans le lecteur.

Voir [le guide de contribution des fiches](../learning-content/README.md) pour les
associations et la compilation Docker des exemples Rust/Java. `npm test` couvre
les exemples JavaScript, les références, les filtres et la conservation du code.

## Couleur personnalisée

`appearance.js` accepte les six noms de nuances historiques ou un code `#rrggbb`
strictement validé dans la même clé locale `z01fakeexam-accent`. Le sélecteur natif
et le champ hexadécimal restent synchronisés. Les composantes HSL adaptent les
fonds ; une comparaison de contraste choisit le texte clair ou sombre des boutons
remplis et de la marque. Revenir à une nuance supprime les variables de couleur personnalisée. Le logo et
le titre partagent le même contraste noir/blanc pour toutes les nuances.
Les couleurs choisies restent locales au navigateur et ne modifient pas les scores.

## Historique local des corrections

`frontend/lib/attempt-journal.js` utilise la clé séparée `z01-attempt-journal-v1`.
Les ajouts sont bornés à 100 entrées, 10 par exercice et 800 000 caractères JSON,
avec copies limitées à 24 000 caractères de code et 8 000 de sortie. Les copies
abrégées sont signalées. La sauvegarde n’est réécrite que lorsqu’elle change,
même si le statut général de progression est actualisé pendant la saisie.

`submission.js` enregistre la correction complète, y compris les erreurs de
service avec `success: null`. Les tests préliminaires sont exclus. Une tentative
d’examen porte son identifiant de session et ne devient consultable qu’après
`releaseExam`, au rendu ou lors de la restauration d’un bilan terminé. Ce verrou
est un comportement d’interface local, pas une protection contre la modification
manuelle des données du navigateur. Les limites peuvent évincer des essais
anciens, y compris ceux d’un examen long ; les résultats d’examen restent séparés.

Le bilan ignore les erreurs de service dans le dernier résultat corrigé par
exercice. Les suggestions utilisent les associations explicites de
`learning-content/exercise-links.json` ; aucune analyse automatique du niveau de
compétence, du temps ou du code n’est revendiquée. Les données ne sont pas envoyées
à une API supplémentaire. Le code et les sorties sont affichés via `textContent`,
sans insertion de HTML. Les lecteurs de fiches utilisent l’assainissement Markdown
existant et invalident les réponses tardives à leur fermeture ou à l’effacement.

Les tests unitaires couvrent le stockage, ses limites, son indisponibilité, les
langages et la libération après examen. Les tests UI couvrent la comparaison sans
modification de l’éditeur, l’effacement indépendant de la progression, les liens
pédagogiques et la distinction entre échec, erreur de service et Tester.
