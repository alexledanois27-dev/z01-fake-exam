# Version personnelle locale

La copie est indépendante : aucun dépôt distant Git n'est configuré.
L'historique Git local reste disponible pour revenir sur les changements.
Les licences et attributions d'origine sont conservées.

## Utilisation

Depuis la racine : `make start`, puis ouvrir http://localhost:8080.
Si Go installé via Snap échoue, utiliser `/usr/local/go/bin/go -C backend run ./cmd/dev`
si cette installation est disponible.
Go 1.22 ou supérieur et Docker sont nécessaires aux corrections.
Sans Make : `go -C backend run ./cmd/dev`.

- En entraînement, l’éditeur repart vide après navigation ou rechargement ; les réussites restent visibles.
- En examen, les brouillons sont sauvegardés dans leur propre session pour permettre la reprise.
- Le dernier exercice d’entraînement, filtre, mode et les sessions d’examen sont restaurés séparément.
- Les symboles ✓ et ↻ indiquent le résultat de la dernière tentative corrigée.
  Leur infobulle indique le nombre de tentatives.
- L’examen libre permet de passer un exercice sans timer ; l’examen chronométré
  dure 3 heures et exige une réussite dans la session pour avancer.
- Chaque nouvelle session d’examen commence avec des brouillons et résultats vierges.
  Les brouillons et réussites d’entraînement ne sont jamais repris.
- Les sauvegardes restent dans le stockage du navigateur pour cette adresse
  (hôte et port). Elles ne sont ni synchronisées ni exportées. Effacer les
  données du navigateur les efface aussi. Un stockage indisponible est signalé.

## Protections ajoutées

- Liste explicite des ressources HTTP publiques ; fichiers internes et liens
  symboliques refusés. Une ressource absente renvoie 404.
- Soumissions de 256 Kio maximum, deux corrections simultanées par processus.
- Sorties du runner limitées à 256 Kio par flux ; fichiers temporaires hors du
  dépôt ; CPU limité à 1 par défaut (`RUNNER_CPUS` reste configurable).
- Conteneurs nommés et suppression forcée lors d'une expiration du délai.
- DOMPurify assainit le HTML Markdown ; bibliothèques servies localement.

Cette configuration reste destinée à un usage personnel local. Les catalogues
Go/Rust/Java dépendent encore de Zone01 et les moulinettes de leurs images
externes. Il n'y a pas d'authentification pour une exposition publique.

## Vérification

- `node --test personal-progress.test.js`
- Depuis `backend/` : `go test ./...`, `go vet ./...`, `go build ./cmd/...`.
- Test Docker facultatif sans téléchargement :
  `RUN_DOCKER_SMOKE_IMAGE=<image-locale-avec-sh-et-sleep> go test -run TestDockerCancellationIntegration .`
- Les tests officiels des moulinettes restent facultatifs :
  `RUN_DOCKER_INTEGRATION=1 go test -run 'Test(Go|JS|Rust|Java)RunnerIntegrationWithOfficialImage' .`

## Interface Z01 Fake Exam

L’interface comporte un catalogue recherchable, l’énoncé et un espace de code
avec une console séparée. Les panneaux restent redimensionnables.

### Éditeur

CodeMirror 6 est fourni dans `vendor/editor.bundle.js`, sans CDN ni téléchargement
au chargement de la page. Go, JavaScript, Rust et Java ont leur coloration.
Les fonctions disponibles sont : numéros de ligne, indentation avec Tab,
fermeture des parenthèses, repli de code, annuler/rétablir, recherche et
remplacement, complétion de mots-clés et des mots présents dans le document.
La complétion est locale ; aucun serveur de langage ni diagnostic de compilation
en continu n’est installé. Les erreurs de compilation viennent du correcteur.

- Ctrl + Entrée : lancer les tests (Cmd + Entrée sur macOS).
- Ctrl + F : rechercher dans le code.
- Ctrl + K : rechercher un exercice.
- Les boutons A− et A+ règlent la taille du code.
- En entraînement, chaque nouvelle visite démarre avec un historique vide.
  En examen, les brouillons survivent au rechargement.

Les sources et dépendances sont dans `editor/`. Pour reconstruire le bundle :
`npm --prefix editor ci`, puis `npm --prefix editor run build`.
Ce n’est pas nécessaire pour démarrer l’application normalement.

### Compte à rebours

La durée par défaut est de 120 minutes. La roue de réglage accepte de 1 à 480
minutes. Appliquer une durée réinitialise le timer et le laisse à l’arrêt.
Un timer lancé continue après fermeture de l’onglet. Pause et Reprendre
conservent le temps restant ; le bouton ↺ réinitialise la durée choisie.
Ce timer réglable concerne seulement l’entraînement. À zéro, le code et les tests
restent accessibles pour continuer à s’entraîner ; aucune soumission automatique
n’est faite dans ce mode. Les examens utilisent leurs propres règles ci-dessous.
Le timer utilise l’horloge locale et n’est pas un mécanisme de surveillance.
Tests : `node --test personal-progress.test.js exam-timer.test.js`.

### Récupérer les énoncés

Le serveur charge déjà les énoncés publics Zone01 à partir des chemins du
catalogue officiel. L’URL `/api/content/root/01-edu_module/content/lastword/README.md`
renvoie du Markdown brut ; ce n’est pas une API de correction.
Le bouton « Exporter .md » télécharge l’énoncé courant.
Pour exporter le catalogue Go chargé par ton serveur, sans parcourir toutes les
URL distantes :

```sh
python3 scripts/export_statements.py --base-url http://127.0.0.1:8080 --track go --output ./enonces-go
```

Les options `js`, `rust` et `java` sont également disponibles. L’export inclut
un manifeste avec les identifiants et les empreintes SHA-256 ; les auteurs et
conditions des contenus restent applicables.

## Moulinette Go et fonctions autorisées

La correction des exercices Go du catalogue CDA utilise l’image officielle
`module-go` épinglée dans le backend. Le bloc « Fonctions autorisées » affiche les
règles exactes du catalogue et le fichier attendu ; le nom de ce fichier est
également affiché dans l’onglet de l’éditeur.

Exemples : `math.Log2` autorise seulement cette fonction ; `unicode.*` autorise
les symboles du package unicode ; `--allow-builtin` permet les fonctions intégrées
et conversions, avec l’interdiction supplémentaire de print/println de l’image.
Une fonction importée peut être refusée même si elle calcule le bon résultat.

Les règles viennent du serveur, pas de la requête du navigateur. Le backend
contrôle les imports et les accès aux fonctions, puis lance RC et les tests
fonctionnels dans Docker. Les imports aliasés sont supportés (`m "math"`) ; les
imports pointés (`import . "math"`) sont refusés. Des règles manquantes dans le
catalogue bloquent la correction CDA au lieu de lancer des tests sans restriction.
L’image impose aussi son formatage ; un refus de formatage reste donc possible.

Cette intégration des fonctions autorisées concerne Go. Les parcours JS, Rust et
Java gardent leur correcteur existant.

Vérification complète ciblée (image Docker requise) :

```sh
cd backend
RUN_GO_RESTRICTIONS_INTEGRATION=1 go test -run '^TestGoRestrictionsIntegration$' -v .
```

## Deux conditions d’examen blanc

L’onglet « Examen » ouvre un choix de conditions :

| Mode | Durée | Passer un exercice | Passage au suivant |
| --- | --- | --- | --- |
| Libre | Sans timer | Oui, bouton « Passer cet exercice » | Après validation ou via le saut |
| Chronométré | 3 heures fixes, sans pause | Non | Après une soumission réussie dans cette session |

La liste des exercices tirés n’est pas affichée et n’est pas rendue dans le DOM.
Seul l’exercice courant est révélé. Le bilan ne nomme que les exercices déjà
présentés ; les suivants restent anonymes et sont comptés comme « non présentés ».

Chaque nouvelle session possède un identifiant et des brouillons indépendants.
Une réussite antérieure en entraînement ne débloque pas l’examen. Modifier une
solution après sa validation demande de la soumettre à nouveau avant d’avancer.
Reprendre une session conserve ses propres brouillons et son échéance ; démarrer
une nouvelle session repart à blanc. Le bouton « Modes » permet de revenir au
choix des conditions. Le timer chronométré continue si l’on quitte l’onglet.

« Soumettre l’exercice » lance la correction ; « Rendre l’examen » fige la session,
corrige le brouillon courant s’il a changé depuis sa dernière soumission et affiche
le nombre d’exercices validés et les statuts détaillés. À l’échéance de 3 heures,
la session est verrouillée puis rendue automatiquement. Une correction déjà en
cours est attendue, sans soumettre deux fois le même brouillon. Si une correction
est indisponible, le bilan le signale comme partiel.

Vérifications des règles et des parcours d’interface : depuis la racine,
`npm ci`, puis `npm test`. Ces dépendances ne servent qu’aux tests ; les scripts
nécessaires au fonctionnement normal restent fournis localement.

## Tester le programme de la consigne

Le bouton « Tester » associe la solution écrite dans l’éditeur au programme de
test fourni dans l’énoncé (notamment sa fonction `main` en Go), puis affiche la
sortie. Ce programme est consultable en lecture seule. Aucune configuration
n’est nécessaire et les anciens réglages manuels sont ignorés.

Le bouton est disponible lorsqu’un programme de test a été extrait du catalogue.
Il ne valide pas l’exercice et n’ajoute pas de points. La correction complète
reste accessible avec « Exécuter » ou « Soumettre l’exercice ».

Lancement local conseillé : `PORT=8092 make start`. Cette commande active Docker
pour les soumissions et lie le serveur à l’adresse locale.

## Organisation des sources

Les sources de l’interface sont dans `frontend/app/`, `frontend/lib/` et
`frontend/styles/`. Après modification : `npm run build`, puis `npm test`.
Les fichiers racine `app.js` et `style.css` sont générés. Voir le
[guide de maintenance](docs/maintenance.md) et le [README](README.md).

## Aides progressives en entraînement

Au-dessus de l’énoncé, « Un coup de pouce ? » ouvre une fiche pédagogique locale.
Les notions sont proposées en premier, puis tu peux révéler une piste, deux
indices et des cas à tester. Les fonctions Go expliquées sont filtrées selon les
autorisations de l’exercice. Il n’y a pas de code de solution à copier.

Les 175 exercices actuels ont une fiche ; une consigne modifiée suspend son aide
jusqu’à actualisation. Une nouvelle fiche doit être rédigée pour un nouvel exercice.
Les aides sont retirées des modes d’examen et ne modifient pas les réussites.

Les coups de pouce comprennent aussi deux volets repliés : « Syntaxe et petits
exemples » et « Pièges fréquents et débogage ». Les exemples illustrent les
notions du langage avec d’autres valeurs, sans compléter ton code. Les rappels
portent notamment sur les indices, les types, la casse, les références et les
sorties exactes. Ces volets restent réservés à l’entraînement.

## Nuance de l’interface et réussite

Le sélecteur « Nuance » du bandeau permet de choisir jaune, gris, bleu, vert,
rouge ou violet. Le choix reste mémorisé dans ce navigateur. Une nouvelle
validation d’exercice est accompagnée de petits confettis pendant environ deux
secondes ; cet effet respecte la réduction des animations du navigateur.
