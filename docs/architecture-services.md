# Architecture des services

## Objectif et compatibilité

Le dépôt reste un monorepo Go 1.22. Quatre exécutables explicites démarrent les
composants : `cmd/web`, `cmd/catalog`, `cmd/runner` et `cmd/monolith`. Le
monolithe est conservé comme composition de compatibilité : il préserve les
URL et la composition des services. Aucun déploiement hérité n’est actif dans
la copie personnelle.

| Service | Exécutable | Responsabilité | Expose | Consomme |
| --- | --- | --- | --- | --- |
| Web | `backend/cmd/web` | Sert l'interface, les styles et les contenus statiques ; point d'entrée public | `/`, `/api/exercises`, `/api/run` | Catalogue et Runner en HTTP via les URL de service |
| Catalogue | `backend/cmd/catalog` | Construit et publie les catalogues Go, JS, Rust et Java | `GET /api/exercises?track=…` | API Zone01 pour les quatre langages ; `Js_exam_instructions/` en secours JS |
| Runner | `backend/cmd/runner` | Valide une soumission et lance la moulinette isolée | `POST /api/run` | Snapshot privé du Catalogue, Docker et images officielles `ghcr.io/01-edu/*` |
| Compatibilité | `backend/cmd/monolith` | Composition locale des trois responsabilités | Contrat public historique intégral | Fichiers, API Zone01 et Docker, comme avant |

Le navigateur ne connaît que l'origine Web et continue donc d'appeler les
mêmes routes relatives. Seul le Web sait où se trouvent le Catalogue et le
Runner : `CATALOG_SERVICE_URL` et `RUNNER_SERVICE_URL` sont des URLs absolues,
privées ou publiques selon la plate-forme de déploiement.

Hors monolithe, Catalogue et Runner ne doivent jamais être exposés sur une
interface publique. Leur `LISTEN_ADDR` est configurable : utiliser une adresse
de boucle locale ou un réseau privé, puis contrôler le pare-feu et les règles
réseau de la plate-forme. En particulier, `/internal/runner-catalog` est un
contrat privé protégé par le même middleware d’authentification en production ;
le cloisonnement réseau reste obligatoire.

## Frontières de code

```text
backend/
├── cmd/web/       point d'entrée public et passerelle HTTP
├── cmd/catalog/   point d'entrée du catalogue seul
├── cmd/runner/    point d'entrée de l'exécution Docker seule
├── cmd/monolith/  composition de compatibilité des trois rôles
├── exercises.go   modèle et chargement des catalogues
├── runner*.go     exécution isolée et adaptation des diagnostics
└── main.go        initialisation, composition et contrats HTTP
```

Règles de responsabilité à conserver lors d'une évolution :

- Une modification de l'interface, des fichiers statiques ou du proxy reste
  dans le rôle **Web** ; elle ne doit jamais appeler Docker.
- Une modification des énoncés ou des sources Zone01 relève du **Catalogue** ;
  elle ne doit pas exécuter de code élève.
- Une nouvelle moulinette, image ou limite d'isolation relève du **Runner** ;
  il lit le snapshot privé du Catalogue, ne sert aucun fichier HTTP et ne
  modifie pas le frontend.
- `cmd/monolith` n'ajoute aucune logique métier : il est uniquement le chemin
  de compatibilité et de retour arrière.

Pour ajouter une dépendance ou remplacer un composant, déclarer d'abord son
contrat HTTP dans cette page, l'injecter par variable d'environnement dans le
Web, puis ajouter un test de contrat. Ainsi, une IA ou un contributeur junior
peut modifier un rôle sans devoir comprendre ni déployer les deux autres.

```text
Navigateur ──► Web ──GET /api/exercises──► Catalogue ──► contenus / Zone01
                 │
                 └──POST /api/run────────► Runner ────► Docker / images Zone01
                                              │
                                              └────────► Catalogue (snapshot privé au démarrage)
```

## Contrats stables

- `GET /api/exercises?track=go|js|rust|java` conserve son JSON actuel.
- `POST /api/run` conserve le corps `{ "exerciseId": "…", "code": "…" }`
  et la réponse `{ "success": boolean, "output": string }`.
- `GET /internal/runner-catalog` est le contrat privé Catalogue → Runner. Il
  doit rester sur le réseau interne ; il fournit les métadonnées de moulinette
  absentes de l'API navigateur.
- Le Runner refuse toujours l'exécution sans `RUNNER_MODE=docker` et conserve
  les limites Docker existantes.
- Le Web ne route que ces deux API ; les fichiers restent servis localement.

## Démarrage

Conserver le comportement actuel :

```sh
cd backend
RUNNER_MODE=docker go run ./cmd/monolith
```

Pour séparer les services, chaque exécutable est construit depuis `backend/` :

```sh
# catalogue
cd backend && LISTEN_ADDR=127.0.0.1:8081 go run ./cmd/catalog

# runner (Docker doit être disponible sur cet hôte)
cd backend && LISTEN_ADDR=127.0.0.1:8082 \
  CATALOG_SERVICE_URL=http://127.0.0.1:8081 \
  RUNNER_MODE=docker go run ./cmd/runner

# web / passerelle
cd backend && \
  LISTEN_ADDR=127.0.0.1:8080 \
  CATALOG_SERVICE_URL=http://127.0.0.1:8081 \
  RUNNER_SERVICE_URL=http://127.0.0.1:8082 \
  go run ./cmd/web
```

Les assets Web et les contenus source sont lus depuis le dépôt. Seul le
Catalogue lit les énoncés et l'API Zone01 ; le Runner reçoit les métadonnées
privées Rust/Java dans son snapshot. Le Runner a néanmoins besoin d'un espace
inscriptible : il crée un dossier dans le répertoire temporaire système pour chaque requête
puis le supprime. Aucun volume de soumission n'est partagé entre services.

## Migration et exploitation

1. Déployer d'abord Catalogue et Runner sans les exposer au navigateur ;
   vérifier leurs routes directement et vérifier Docker sur le Runner.
2. Déployer Web avec les deux URLs de service, puis vérifier les deux contrats
   publics via Web.
3. Faire basculer le domaine public vers Web uniquement.
4. Conserver la configuration `monolith` comme retour arrière immédiat tant
   que la supervision des trois services n'est pas établie.

`render.yaml` reste intentionnellement en mode `monolith` afin de ne pas
modifier un déploiement fonctionnel sans URLs inter-services confirmées. Une
fois les noms/régions Render choisis, créer trois services à partir du même
build et renseigner les deux variables du Web ; cela constitue le point de
bascule réversible ci-dessus.

Sur le VPS, le service `z02intra.service` reste également en mode monolithique.
Le déploiement construit d'abord un candidat dans une release isolée, le sonde
sur `127.0.0.1:8088`, puis fait une bascule brève du binaire et du checkout. Il
ne faut pas présenter cette séquence comme sans interruption : le redémarrage
systemd crée une courte indisponibilité. La procédure d'exploitation détaillée
du serveur est tenue dans un dépôt privé.

## Vérifications

Depuis `backend/`, exécuter les tests unitaires et la compilation des quatre
exécutables avec `go test ./...`, `go vet ./...` et `go build ./cmd/...`.
`RUN_DOCKER_INTEGRATION=1 go test -run 'Test(Go|JS|Rust|Java)RunnerIntegrationWithOfficialImage' .`
valide les quatre moulinettes officielles. Enfin,
`./scripts/test_services_e2e.sh` vérifie la topologie réelle Catalogue →
Runner → Web et une soumission Go de bout en bout.

## Restrictions Go — version personnelle

Le catalogue Go publie deux métadonnées : `expectedFiles` et `allowedFunctions`.
`allowedFunctions: null` signifie que les restrictions sont inconnues ; une
liste vide représente des règles connues sans import ni builtin autorisé.
Le snapshot privé du Runner conserve ces valeurs. Le contrat de soumission
`POST /api/run` reste `{exerciseId, code}` ; des règles envoyées par le navigateur
ne remplacent jamais celles du catalogue.

Pour le cursus CDA (`module-go`), des restrictions absentes bloquent la correction.
Le Runner prépare le fichier attendu (package `main` pour un `main.go`, package
`student` pour une fonction) puis contrôle les imports et les accès exacts aux
symboles importés avec l’AST Go. Les alias explicites sont gérés ; les imports
pointés sont refusés. Ce contrôle complémentaire est nécessaire : l’image
épinglée laisse passer certains membres non listés d’un package autorisé.
Il transmet ensuite `FILE` et `ALLOWED_FUNCTIONS` à la moulinette Docker,
qui applique RC, le contrôle de formatage et les tests fonctionnels.
Le chemin historique des exercices sans ces métadonnées reste compatible.

`RUN_GO_RESTRICTIONS_INTEGRATION=1 go test -run '^TestGoRestrictionsIntegration$' -v .`
(depuis `backend/`) vérifie l’image réelle sur des fonctions, programmes, imports
interdits et fonctions interdites au sein d’un package partiellement autorisé.

## Exécution du programme de la consigne

`Exercise.example` contient le programme extrait de l’énoncé. Le mode `example`
de `POST /api/run` utilise exclusivement ce programme serveur avec la solution.
Les anciens champs de configuration client sont ignorés. Le mode `harness`
est imposé pour associer la solution au programme de l’énoncé.
La réponse `{success, output}` décrit l’exécution et ne valide pas l’exercice.
La correction complète demeure inchangée.

## Organisation du code de cette copie

La [carte de maintenance](maintenance.md) détaille les fichiers de l’interface
et du backend. Les routes sont définies dans `backend/http_routes.go` ;
les handlers sont répartis entre `http_catalog.go`, `http_run.go` et
`http_static.go`. `backend/main.go` conserve le démarrage des services.
Les sources d’interface sont assemblées par `npm run build` ; les bundles
racine restent livrés pour que les services Go fonctionnent sans Node.js.
