# Dépôt GitHub personnel

Dépôt : [alexledanois27-dev/z01-fake-exam](https://github.com/alexledanois27-dev/z01-fake-exam).
La visibilité est privée : le compte connecté doit disposer d’un accès pour
cloner, consulter les issues ou lire les actions.

## Branches

- `main` : version stable importée après les vérifications locales.
- `develop` : même point de départ à l’import, puis intégration des évolutions.
- `archive/upstream-base` : base open source `c55677a` ; ne pas la modifier.

L’ancien historique est conservé. L’import des modifications locales est regroupé
en trois commits : backend/sécurité, interface/parcours, documentation/GitHub.
Cette organisation ne prétend pas recréer des commits correspondant à chacune
des anciennes demandes de personnalisation.

Pour les prochaines modifications, créer une branche depuis `develop`, ouvrir une
PR puis intégrer vers `main` lors d’une livraison. Voir [CONTRIBUTING](../CONTRIBUTING.md).
Les rôles des branches sont une convention ; ils ne prouvent pas qu’une protection
technique GitHub est activée. Les protections disponibles dépendent du compte et
de l’offre GitHub pour les dépôts privés. Aucune offre payante n’est souscrite.

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
