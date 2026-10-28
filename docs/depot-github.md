# Dépôt GitHub personnel

Dépôt : [alexledanois27-dev/z01-fake-exam](https://github.com/alexledanois27-dev/z01-fake-exam).
La visibilité est publique : chacun peut lire le code et créer un fork. La lecture
publique ne donne pas le droit de pousser dans ce dépôt. Le projet d’origine est
[z01exam/z01exam](https://github.com/z01exam/z01exam).

## Branches

- `main` : version stable, actualisée par une PR de livraison depuis `develop`.
- `develop` : intégration des évolutions validées avant leur livraison sur `main`.
- `archive/upstream-base` : base open source `c55677a` ; ne pas la modifier.

L’ancien historique est conservé. L’import des modifications locales est regroupé
en trois lots : backend/sécurité, interface/parcours, documentation/GitHub,
avec un ajustement documentaire du canal de modération personnel.
Cette organisation ne prétend pas recréer des commits correspondant à chacune
des anciennes demandes de personnalisation.

Pour les prochaines modifications, créer une branche depuis `develop`, ouvrir une
PR puis intégrer vers `main` lors d’une livraison. Voir [CONTRIBUTING](../CONTRIBUTING.md).
## Protections de main et develop

Les deux branches imposent une pull request et une approbation avant fusion.
Les approbations sont invalidées si de nouveaux commits sont ajoutés ; les
conversations de revue doivent être résolues. Les contrôles CI `frontend` et
`backend` doivent réussir, sur une branche à jour avec la cible.
Les règles s’appliquent aussi aux administrateurs : pushes directs, pushes forcés
et suppression des branches sont interdits. L’auteur d’une PR ne peut pas
s’approuver lui-même ; un autre collaborateur doit la relire.

La suppression automatique des branches après fusion est désactivée pour garder
`develop` après une livraison vers `main`. Les branches de travail peuvent être
supprimées manuellement une fois leur PR intégrée. Les protections sont des
paramètres GitHub : vérifier leur état après un changement de visibilité ou d’offre.

## Automatisation

- CI frontend : Node.js 22, installation reproductible, bundles et tests JS.
- CI backend : Go stable, tests avec détection de concurrence, vet et compilation.
- Actions épinglées par SHA ; permissions de la CI limitées à la lecture du code.
- Dependabot hebdomadaire pour les actions et les deux projets npm, vers develop.
- Aucun workflow de déploiement ; l’ancien workflow VPS de l’amont est retiré.
- Aucun secret de déploiement requis. Ne pas ajouter de secret avant d’avoir
  défini et validé un hébergement dans une tâche distincte.

Les workflows d’intégration n’exécutent pas les moulinettes Docker réelles. Leurs
commandes de vérification manuelle sont dans le README et le guide de sécurité.
Les droits et paramètres du dépôt peuvent évoluer indépendamment des fichiers
versionnés ; vérifier la visibilité avant tout partage.
