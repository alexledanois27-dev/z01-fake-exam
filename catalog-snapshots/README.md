# Snapshots de secours des quatre langages

Ces fichiers JSON sont des copies publiques des catalogues sélectionnés, des
énoncés et de leurs métadonnées de correction. Ils ne contiennent aucun code
soumis par un utilisateur, résultat personnel ou secret.

| Fichier | Exercices | Contenu |
| --- | ---: | --- |
| `go.json` | 61 | Consignes, règles Go, fichiers et image épinglée. |
| `js.json` | 31 | Consignes JS, identifiants historiques et métadonnées officielles. |
| `rust.json` | 38 | Consignes, modules, fichiers et image épinglée. |
| `java.json` | 45 | Trois checkpoints, classes, fichiers et image épinglée. |

Version du format : 1. Date précise de chaque copie : `savedAt`, en UTC.
Source : https://zone01normandie.org/api/object/rouen
Les contenus restent soumis aux droits de leurs auteurs Zone01/01-edu.

## Utilisation

Par défaut, l’API reste prioritaire. Si le catalogue ou une consigne ne peut pas
être récupéré, le serveur utilise cette copie validée et affiche sa provenance.
Les snapshots ne sont pas servis directement comme des fichiers statiques publics.

Pour ignorer complètement l’API :

```sh
CATALOG_MODE=offline PORT=8092 make start
```

Les énoncés, aides, sessions et métadonnées sont alors disponibles sans API.
Pour corriger sans connexion Internet, Go et Docker doivent être installés et les
images de correction déjà présentes. Les snapshots ne contiennent pas ces images.

## Mise à jour volontaire

Depuis la racine du projet, avec une connexion Internet :

```sh
go -C backend run ./cmd/sync-catalog -output ../catalog-snapshots
```

La commande exige que les quatre catalogues et toutes leurs consignes viennent de
l’API. Elle vérifie les métadonnées avant d’écrire : un échec ne remplace pas les
copies existantes par des placeholders ou des données de secours. Chaque fichier
est remplacé par renommage d’un fichier temporaire ; les quatre remplacements
ne constituent pas une transaction unique face à une interruption du système.

Relire le diff des énoncés et métadonnées avant de commiter. Une nouvelle consigne
peut nécessiter de revoir les aides ; ne pas changer leurs empreintes sans relecture.
Il n’y a pas de mise à jour automatique des fichiers du dépôt au démarrage.
