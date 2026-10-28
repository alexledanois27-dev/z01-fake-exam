# Instructions — Z01 Fake Exam personnel

Ce dépôt public appartient à son propriétaire GitHub. Il dérive de z01exam/z01exam,
mais ne publie rien sur leur dépôt ni leur infrastructure. Lire README.md,
docs/maintenance.md et docs/provenance.md avant une modification importante.

## Git et livraison

- `main` contient la version stable ; `develop` prépare les évolutions.
- Créer une branche courte depuis `develop` : `feat/...`, `fix/...`, `docs/...`.
- Faire des commits ciblés et expliquer les validations dans une pull request.
- Ne pas forcer un push ni réécrire l’historique partagé sans demande explicite.
- L’import initial autorisé du travail local peut initialiser `main` et `develop`
  après validation. Ensuite, privilégier les PR plutôt que les pushes sur `main`.
- Une fusion ou un push ne déploie jamais le site. Toute mise en ligne requiert
  une demande distincte et une validation de l’environnement cible.

## Mise en œuvre

- Modifier les sources `frontend/`, puis reconstruire avec `npm run build`.
  `app.js` et `style.css` sont générés et versionnés.
- Garder les licences, notices et la provenance de la base open source.
- Ne jamais commiter de secrets, `.env` privé, données du navigateur ou clés SSH.
- Préserver la séparation entraînement/examen, les contraintes du mode strict,
  les restrictions de fonctions Go et la distinction Tester/correction complète.
- Les changements de sécurité et les workflows doivent être expliqués et testés.
- Les anciens scripts de déploiement VPS sont historiques : ne pas les exécuter
  ni les réactiver implicitement.

## Vérification

- Exécuter `make check` (Node.js 22 et Go stable recommandés).
- Pour le runner, rejouer les tests Docker ciblés documentés dans
  docs/mise-en-ligne.md et docs/tests-securite.md.
- Ne pas supprimer un test pour masquer un échec. Mettre à jour ses attentes
  uniquement lorsqu’un changement fonctionnel autorisé le justifie.
