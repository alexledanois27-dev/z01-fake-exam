# Fiches de révision

70 fiches locales : 34 Go historiques, 12 Rust, 11 JavaScript et 13 Java.
Les nouvelles fiches expliquent les notions utilisées par les exercices : syntaxe,
algorithmes, exemples indépendants, pièges et points à vérifier. Elles ne fournissent
pas les solutions complètes des exercices.

## Organisation

- `manifest.json` : identifiant unique, langage (`track`), titre et chemin Markdown.
- `exercise-links.json` : références explicites pour les 175 exercices, par langage
  et identifiant d’exercice. Chaque référence vise une fiche du même langage.
- `rust/`, `js/`, `java/` : nouvelles fiches ; les fichiers Go historiques restent
  à leur emplacement d’origine.

L’onglet Fiches affiche uniquement le langage sélectionné. En entraînement,
« Fiches utiles » ouvre un lecteur superposé sans quitter l’exercice ni effacer
le code. Ces références sont absentes des examens. Elles dépendent de la validation
de l’empreinte de la consigne, comme les aides progressives : si le sujet évolue,
revoir son aide et ses références avant de réactiver leur affichage.

## Ajouter ou modifier une fiche

1. Écrire le Markdown local avec un exemple autonome, ses pièges et une checklist.
2. Ajouter une entrée unique dans le manifeste avec `id`, `track`, `title`, `path`.
3. Associer les exercices pertinents dans `exercise-links.json` après lecture du sujet.
4. Exécuter `npm run build`, puis `make check` ; versionner aussi les fichiers générés.

Le manifeste et les associations sont intégrés au JavaScript généré. Le Markdown
est chargé à la demande depuis le serveur local et mis en cache en mémoire.
Aucun appel à une API externe n’est nécessaire pour lire les fiches.

Les tests vérifient la couverture de tous les exercices, les chemins, les langages,
la navigation et la conservation du code. Pour compiler et exécuter les exemples
Rust et Java dans Docker :

```sh
RUN_REVISION_SNIPPETS_INTEGRATION=1 go -C backend test -run TestRevisionSnippetsIntegration -v .
```

Les exemples JavaScript sont exécutés par `npm test`.
