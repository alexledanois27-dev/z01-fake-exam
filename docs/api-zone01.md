# API Zone01 : catalogues, chemins et énoncés

Cette documentation décrit les endpoints publics utilisés par **cette version**
de Z01 Fake Exam. Les chemins et nombres ci-dessous ont été vérifiés le
**28 octobre 2026**. Ce n’est pas une spécification officielle de Zone01 : leurs
ressources peuvent changer indépendamment de notre dépôt.

Pour les routes de notre propre serveur, voir [http-api.md](http-api.md).

## 1. Deux API à distinguer

| Service | Exemple | Rôle |
| --- | --- | --- |
| Zone01 externe | `https://zone01normandie.org/api/object/rouen` | Arbre des parcours, exercices et métadonnées. |
| Contenus Zone01 externes | `https://zone01normandie.org/api/content/root/01-edu_module/content/js-factorial/README.md` | Texte Markdown d’une consigne. |
| Notre application locale | `http://127.0.0.1:8092/api/exercises?track=js` | Catalogue adapté au navigateur, identifiants stables et consignes chargées. |
| Notre correcteur | `POST http://127.0.0.1:8092/api/run` | Lance un conteneur local ; ne transmet pas la correction à une API privée Zone01. |

Le navigateur interroge notre serveur. C’est le backend Go qui récupère les
ressources Zone01. Le code soumis est envoyé à notre runner pour exécution dans
les images publiques 01-edu ; récupérer une consigne ne la corrige pas.

## 2. Catalogue racine

```text
GET https://zone01normandie.org/api/object/rouen
```

La réponse JSON contient un arbre de nœuds. `children` est un objet indexé par
clés, pas un tableau. Le serveur le parcourt récursivement pour trouver les nœuds
dont `path` correspond aux checkpoints configurés.

### Chemins sélectionnés par notre serveur

| Langage | `path` dans l’arbre JSON | Exercices observés |
| --- | --- | ---: |
| Go | `/rouen/cursus-cda/checkpoint` | 61 |
| JavaScript | `/rouen/cursus-cda/checkpoint-js` | 31 |
| Rust | `/rouen/cursus-cda/piscine-rust/final-checkpoint-rust` | 38 |
| Java | `/rouen/cursus-cda/piscine-java/checkpoint-01-java` | 15 |
| Java | `/rouen/cursus-cda/piscine-java/checkpoint-02-java` | 15 |
| Java | `/rouen/cursus-cda/piscine-java/checkpoint-03-java` | 15 |

Le total Java est de 45 exercices. Le catalogue complet contient aussi d’autres
parcours et exercices, mais notre application ne les importe pas tous.

**Un `path` de parcours est ici une valeur à chercher dans le JSON.** La présence
de ce champ ne garantit pas qu’une URL construite en le collant à un préfixe
quelconque soit un endpoint accessible. Utiliser le catalogue et les champs
`attrs.subject`, plutôt que deviner les adresses.

### Métadonnées utilisées

Exemple simplifié de nœud JavaScript :

```json
{
  "name": "js-factorial",
  "type": "exercise",
  "key": "js-factorial",
  "path": "/rouen/cursus-cda/checkpoint-js/js-factorial",
  "attrs": {
    "subject": "/api/content/root/01-edu_module/content/js-factorial/README.md",
    "expectedFiles": ["factorial.js"],
    "validations": [
      {
        "type": "tester",
        "testImage": "ghcr.io/01-edu/module-js",
        "cooldown": 180000
      }
    ]
  }
}
```

| Champ | Usage dans notre code |
| --- | --- |
| `type` | Retenir les enfants de type `exercise`. |
| `key` | Identifiant officiel ; sert à la correspondance et au runner. |
| `name` | Nom du nœud ; utilisé selon les adaptateurs de langage. |
| `path` | Identifier le checkpoint sélectionné. |
| `attrs.subject` | Chemin du Markdown à télécharger. |
| `attrs.expectedFiles` | Fichiers attendus ; JS reprend actuellement le fichier officiel unique. |
| `attrs.allowedFunctions` | Règles disponibles dans le catalogue, notamment utilisées pour Go. |
| `attrs.validations[].testImage` | Nom de l’image de correction pour une validation `tester`. |
| `attrs.codeEditor.providedFiles` | Métadonnées présentes dans le modèle ; ne signifient pas que tous ces fichiers sont automatiquement importés. |

`cooldown` figure dans l’exemple parce que le catalogue l’annonce, mais il **n’est
pas appliqué automatiquement** par notre code. Les 10/15 secondes de l’interface
et la limitation de fréquence serveur sont nos propres réglages.

## 3. Téléchargement d’une consigne

L’application utilise le chemin exact annoncé par `attrs.subject`.

### Forme actuelle

```text
https://zone01normandie.org
  + /api/content/root/01-edu_module/content/js-factorial/README.md
```

### Forme historique également acceptée

```text
/markdown/root/public/subjects/nom/README.md
        ↓ normalisation
/api/content/root/public/subjects/nom/README.md
```

La conversion remplace seulement le préfixe `/markdown/` par `/api/content/`.
Elle ne convertit pas `root/public/subjects` en `root/01-edu_module/content`.
Le reste du chemin est conservé tel qu’annoncé par le catalogue.

### Exemples vérifiés

- Go : [onlya](https://zone01normandie.org/api/content/root/01-edu_module/content/onlya/README.md)
- JavaScript : [js-factorial](https://zone01normandie.org/api/content/root/01-edu_module/content/js-factorial/README.md)
- Rust : [previousprime](https://zone01normandie.org/api/content/root/01-edu_module/content/previousprime/README.md)
- Java : [goodbye-mars](https://zone01normandie.org/api/content/root/01-edu_module/content/goodbye-mars/README.md)

Ces exemples ont répondu HTTP 200 lors de la vérification. Ils ne constituent pas
une garantie de disponibilité future.

## 4. Chargement JavaScript et secours local

```text
Catalogue Zone01 partagé
  → checkpoint-js
  → validation des identifiants, chemins, fichiers et image
  → téléchargement des 31 consignes (jusqu’à 8 workers)
  → extraction du programme d’exemple
  → publication dans notre GET /api/exercises?track=js
```

- **API disponible :** consignes et fichiers attendus viennent du checkpoint.
- **Une consigne échoue :** sa copie dans `Js_exam_instructions/` est utilisée si
  elle existe ; les métadonnées du catalogue restent celles de l’API.
- **Catalogue absent, vide, inaccessible ou métadonnées invalides :** retour à
  l’ensemble des exercices locaux disponibles, avec un message dans les logs.
  Au démarrage de l’application, l’enveloppe commune privilégie les métadonnées
  complètes du snapshot JSON ; les Markdown JS restent un dernier secours local.
- **Aucune source utilisable :** erreur de chargement plutôt qu’un faux énoncé.

Le champ public `statementSource` vaut `zone01-api` ou `local` pour JavaScript.
Il alimente le libellé sous la consigne. Ce champ est également renseigné pour Go, Rust et Java. Une copie des quatre
catalogues dans `catalog-snapshots/` sert de secours général, avec la date
`snapshotDate` dans notre API.

La copie locale a été synchronisée le 28 octobre 2026. Elle ne se met pas à jour
automatiquement. Les aides utilisent une empreinte du texte : un changement
ultérieur non relu suspend l’aide concernée au lieu d’afficher un conseil périmé.

### Identifiants, fichiers et progression

Il faut distinguer les trois noms :

```text
Clé officielle : js-array-chunk-reversal
ID navigateur : array-reverse-chunks
Runner : array-chunk-reversal
Fichier attendu officiel : array-chunk-reversal.js
```

Les ID historiques restent stables pour ne pas perdre les réussites, brouillons
et aides du navigateur. Le runner conserve le nom officiel de la moulinette.
La correspondance est dans `jsSubjectIDForRunner` et `jsTestIDForSubject`.

### Correspondances des 31 exercices JavaScript

Chaque clé officielle ci-dessous possède un chemin de contenu annoncé par le
catalogue. La forme observée est `/api/content/root/01-edu_module/content/<clé>/README.md` ;
le chargement conserve toutefois `attrs.subject` comme source de vérité.

| Clé officielle | ID navigateur conservé | Fichier attendu officiel |
| --- | --- | --- |
| `js-array-chunk-reversal` | `array-reverse-chunks` | `array-chunk-reversal.js` |
| `js-bubble-sort-analyzer` | `bubble-sort-analyzer` | `bubble-sort-analyzer.js` |
| `js-character-maker` | `character-maker` | `character-maker.js` |
| `js-deep-clone` | `deep-clone` | `deep-clone.js` |
| `js-deep-equal` | `deep-equal` | `deep-equal.js` |
| `js-deep-find` | `deep-find` | `deep-find.js` |
| `js-deep-freeze` | `deep-freeze` | `deep-freeze.js` |
| `js-divisor-finder` | `divisorfinder` | `divisor-finder.js` |
| `js-election-mix` | `election-mix` | `election-mix.js` |
| `js-even-sum` | `evensum` | `even-sum.js` |
| `js-exam-grader` | `exam-grader` | `exam-grader.js` |
| `js-factorial` | `factorial` | `factorial.js` |
| `js-fibonacci` | `fibonacci` | `fibonacci.js` |
| `js-final-attempt` | `final-attempt` | `final-attempt.js` |
| `js-flat-object` | `flat-object` | `flat-object.js` |
| `js-flatten-object` | `flatten-object` | `flatten-object.js` |
| `js-grid-word-finder` | `grid-words-finder` | `grid-word-finder.js` |
| `js-grid-word-finder2` | `grid-words-finder-2` | `grid-word-finder2.js` |
| `js-insertion-sort-analyzer` | `insertion-sort-analyzer` | `insertion-sort-analyzer.js` |
| `js-nested-array-reverser` | `nested-array-reverser` | `nested-array-reverser.js` |
| `js-object-lab` | `object-lab` | `object-lab.js` |
| `js-palindromic-chains` | `palindromic-chains` | `palindromic-chains.js` |
| `js-perfect-num` | `perfectnum` | `perfect-num.js` |
| `js-pipeline` | `pipeline` | `pipeline.js` |
| `js-sentence-pyramid` | `sentencepyramid` | `sentence-pyramid.js` |
| `js-sleep-breaker` | `sleep-breaker` | `sleep-breaker.js` |
| `js-snakepath-validator` | `snake-path-validator` | `snakepath-validator.js` |
| `js-swappable-object` | `swappable-object` | `swappable-object.js` |
| `js-transform-keys` | `transform-keys` | `js-transform-keys.js` |
| `js-trap-object` | `trap-object` | `trap-object.js` |
| `js-zoo-race` | `zoo-race` | `zoo-race.js` |

## 5. Cache, démarrage et limites

Le catalogue racine téléchargé avec succès est mis en cache **en mémoire**, partagé
par Go, JavaScript, Rust et Java. Un échec de récupération n’est pas mémorisé.
Les catalogues sont construits au démarrage : ils ne sont pas rafraîchis à chaque
visite ni automatiquement à intervalle régulier. Redémarrer le serveur pour
recharger les données. Il n’existe pas de cache disque automatiquement actualisé du catalogue distant.
Des copies complètes versionnées sont disponibles dans `catalog-snapshots/`.
`CATALOG_MODE=offline` ignore les API ; la commande `cmd/sync-catalog` permet une
mise à jour volontaire. Voir [le guide des snapshots](../catalog-snapshots/README.md).

Les requêtes de chargement utilisent un contexte avec le délai du runner, dix
secondes par défaut. Le lecteur de consigne est limité à 2 Mio. Les métadonnées
restent des données externes : les chemins et images sont contrôlés avant exécution,
le Markdown est assaini et les sorties des programmes sont affichées comme texte.

Le nom `testImage` du catalogue est résolu vers une version épinglée dans
`backend/images.go`. Une nouvelle image ou version n’est pas automatiquement
acceptée. Le chargement d’un énoncé n’accorde aucun privilège Docker au navigateur.

## 6. Explorer l’API soi-même

Télécharger le catalogue une fois :

```sh
curl --fail --silent --show-error --max-time 20 \
  https://zone01normandie.org/api/object/rouen > /tmp/zone01-catalog.json
```

Trouver le checkpoint JS avec Python, sans bibliothèque supplémentaire :

```python
import json

with open("/tmp/zone01-catalog.json", encoding="utf-8") as file:
    root = json.load(file)


def walk(node):
    if node.get("path") == "/rouen/cursus-cda/checkpoint-js":
        for exercise in node.get("children", {}).values():
            if exercise.get("type") == "exercise":
                attrs = exercise.get("attrs", {})
                print(exercise["key"], attrs.get("subject"),
                      attrs.get("expectedFiles"))
        return
    for child in node.get("children", {}).values():
        walk(child)


walk(root)
```

Récupérer une consigne précise :

```sh
curl --fail --silent --show-error --max-time 15 \
  https://zone01normandie.org/api/content/root/01-edu_module/content/js-factorial/README.md
```

Vérifier notre intégration, y compris une correction Docker réelle de factorial :

```sh
RUN_JS_CATALOG_INTEGRATION=1 go -C backend test -run TestJSAPI -v .
```

Vérifier la couverture des aides contre un serveur de cette version :

```sh
npm run hints:check -- http://127.0.0.1:8092
```

Les scripts d’exploration sont des exemples manuels ; ils ne doivent pas être
lancés en boucle par chaque navigateur. Le backend centralise déjà le chargement.

## 7. Où modifier les chemins

| Fichier | Responsabilité |
| --- | --- |
| `backend/zone.go` | URL du catalogue, cache partagé, parcours et chargement des consignes. |
| `backend/go_cda.go` | Checkpoint Go sélectionné. |
| `backend/js_catalog.go` | Checkpoint JavaScript, alias, contrôle des métadonnées et secours. |
| `backend/rust.go` | Checkpoint Rust, modèle de nœud et lecteur commun des consignes. |
| `backend/java.go` | Trois checkpoints Java. |
| `backend/exercises.go` | Modèle public, lecture des fichiers locaux JS et alias historiques. |
| `backend/images.go` | Digests des images de correction autorisées. |
| `Js_exam_instructions/` | Snapshot des consignes JS de secours. |
| `frontend/hints/` | Aides locales et empreintes des consignes approuvées. |

Pour changer de checkpoint : vérifier le nœud et ses contrats, adapter les chemins
explicitement, tester les noms de fichiers et la correction, puis revoir les aides.
Ne pas supposer qu’un changement de chemin conserve les mêmes signatures ou tests.

## Références

- [Catalogue public Zone01 Normandie](https://zone01normandie.org/api/object/rouen)
- [Exemple de contenu officiel JavaScript](https://zone01normandie.org/api/content/root/01-edu_module/content/js-factorial/README.md)
- [API de notre application](http-api.md)
- [Architecture des services](architecture-services.md)
- [Images et moulinettes](moulinettes.md)
