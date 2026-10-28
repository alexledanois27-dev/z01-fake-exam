# Contribuer à cette version personnelle

Le projet est maintenu dans un dépôt GitHub public. Il est indépendant du dépôt
[z01exam/z01exam](https://github.com/z01exam/z01exam), dont il conserve les notices
et l’historique. Voir [la provenance](docs/provenance.md).

## Organisation Git

| Branche | Rôle |
| --- | --- |
| `main` | Version stable et testée de la copie personnelle. |
| `develop` | Point de départ et intégration des évolutions. |
| `archive/upstream-base` | Référence immuable de la base open source importée. |
| `feat/...`, `fix/...`, `docs/...` | Une modification ciblée, puis PR vers develop. |

```sh
git switch develop
git pull --ff-only
git switch -c feat/description-courte
# modifier les sources
npm run build
make check
git add <fichiers-concernes>
git commit -m "feat: décrire le comportement ajouté"
git push -u origin feat/description-courte
```

Ouvrir ensuite une PR vers `develop`, en précisant le problème, le comportement
obtenu et les tests exécutés. Pour une livraison, proposer `develop` vers `main`.
Les préfixes `feat:`, `fix:`, `refactor:`, `test:`, `docs:` et `ci:` facilitent la
lecture de l’historique. Un ticket est utile pour les travaux importants ; il
n’est pas obligatoire pour une petite correction personnelle.

## Modifier le code

Lire la [carte du code](docs/maintenance.md), puis modifier les sources concernées.
Ne pas modifier directement les bundles racine ou l’éditeur compilé. Pour
CodeMirror : `npm --prefix editor ci`, puis `npm run build:editor`.

`make check` contrôle les bundles, les tests JavaScript, les tests Go et `go vet`.
Les tests Docker sont explicites et doivent être ajoutés à la validation d’une
modification du runner. La CI standard ne télécharge pas les images officielles.
Elle ne prouve donc pas à elle seule la compatibilité des quatre moulinettes.

## Données et publication

Ne pas publier de secrets ni exporter le localStorage des utilisateurs dans le
dépôt. Les fichiers `.env` privés et les dépendances sont ignorés. Un dépôt public
n’est pas un coffre-fort : vérifier chaque diff avant un push.

Aucun workflow ne déploie automatiquement. Les anciens scripts VPS restent des
références historiques, à ne pas lancer sur une infrastructure non validée.
Un changement de branche ou une fusion ne rend pas le site accessible en ligne.
