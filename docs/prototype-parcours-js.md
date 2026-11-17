# Prototype : parcours intensif JavaScript

Branche `feat/js-checkpoint-sprint`, créée depuis la dernière `origin/main`
(`ae2d1ea`, fusion PR 19). Aucun changement de branche distante ni déploiement
n’est nécessaire pour tester localement. Le bouton **Parcours JS ↗** ouvre le
parcours depuis l’en-tête, hors examen. Un serveur de prévisualisation peut
fonctionner sur un port distinct : `PORT=8096 make start`.
Le port sépare les données du navigateur, pas les fichiers du projet : deux
serveurs démarrés depuis ce même checkout servent la branche courante. Pour
comparer avec `main` en parallèle, utiliser un second checkout.

## Objectif pédagogique

Viser le niveau 4 du checkpoint en sécurisant les niveaux précédents. Le
prototype couvre les **19 exercices N1 à N4** de la copie de référence Zone01,
avec les vrais identifiants et les fiches JavaScript existantes. Il ne mesure
pas la probabilité d’un score réel. Les groupes, consignes et conditions de
l’établissement peuvent changer ; aucun résultat en une semaine n’est garanti.

Sept séances libres, environ 1 h 40 à 2 h par séance (jusqu’à trois heures pour
la simulation finale). Ce rythme est une hypothèse de travail intensive,
particulièrement pour une personne qui connaît déjà les bases d’un langage.
Un débutant doit pouvoir prolonger une séance et refaire les prérequis.

| Séance | Priorité | Exercices |
| --- | --- | --- |
| 1 | Fonctions, boucles et accumulateurs | factorial, evensum, divisorfinder |
| 2 | État, diviseurs et construction de chaînes | perfectnum, fibonacci, sentencepyramid |
| 3 | Transformations et grilles N2 | array-reverse-chunks, nested-array-reverser, palindromic-chains, grid-words-finder |
| 4 | Compteurs de tri et voisinage N3 | bubble-sort-analyzer, insertion-sort-analyzer, grid-words-finder-2, snake-path-validator |
| 5 | Fonctions valeurs, composition et objets N4 | pipeline, election-mix, object-lab |
| 6 | Closures successives et récursion N4 | character-maker, flat-object |
| 7 | Rappel autonome et simulation | Exercices à revoir, puis mode examen JS existant |

La priorité aux fondamentaux suit les dépendances des sujets : les closures,
callbacks, objets et parcours de grille ne se résument pas à connaître la syntaxe.
C’est une première proposition pédagogique, pas un protocole évalué auprès
d’apprenants. Il faudra ajuster le rythme à partir de tests réels.

## Parcours utilisateur

1. Ouvrir **Parcours JS** : le code en cours reste intact.
2. Répondre aux six questions du diagnostic. Le feedback explique chaque réponse.
   Il s’agit d’un repérage du vocabulaire et de la syntaxe, pas d’une validation
   de compétence. La recommandation ne saute jamais au-delà de la séance 3.
3. Choisir une séance ; lire la méthode, le petit exemple et les pièges.
   Les fiches s’ouvrent dans le parcours sans remplacer le code de l’éditeur.
4. **Avec aide** lance le vrai exercice en entraînement, avec ses indices.
5. **Sans aide** repart d’une page blanche et masque indices, fiches et historique.
   Ouvrir à nouveau le parcours pendant ce défi bascule la tentative en guidé.
6. **Exécuter** utilise la moulinette existante. Seule une correction complète
   renseigne ce suivi. Tester et les erreurs techniques ne l’alimentent pas.
7. Refaire sans aide au moins 24 heures plus tard pour confirmer. Les derniers
   échecs et les rappels arrivés à échéance apparaissent dans la révision.
8. La séance 7 ouvre le mode examen JavaScript existant : choisir chronométré
   dans le lobby. Le prototype ne modifie ni le timer ni les règles d’examen.

## Ce qui compte comme progression

- Une réussite guidée est identifiée comme telle.
- Une réussite autonome signifie une correction réussie dans le défi sans aide.
- Deux réussites autonomes espacées d’au moins 24 heures après le dernier échec
  donnent le repère **Confirmé à 24 h**. Cela reste un indicateur local : ce n’est
  pas une preuve de compréhension ni une protection contre des aides externes.
- Un nouvel échec remet l’exercice à revoir. Une erreur de service ne modifie
  pas le repère précédent. Aucun malus n’est ajouté à l’entraînement ou à l’examen.
- Les anciens succès d’entraînement ne sont pas importés comme réussites autonomes.
- Cliquer sur une séance ne la valide pas et ne bloque pas l’accès aux autres.

## Organisation et données

- `frontend/learning/js-checkpoint-sprint.json` : séances, exemples, pièges,
  diagnostic, liens et groupes de référence. Éditer ici pour ajuster la pédagogie.
- `frontend/lib/checkpoint-sprint.js` : stockage borné et calcul des repères.
- `frontend/app/checkpoint-sprint.js` : tableau de bord, lecteur, sélection et défi.
- `frontend/styles/checkpoint-sprint.css` : interface adaptée à la nuance courante.
- `submission.js` capture le contexte du défi au moment de la soumission et
  enregistre seulement le résultat correspondant. La navigation empêche une
  correction tardive d’être attribuée à un autre exercice.
- `training-guide.js` synchronise la bannière et la fin d’un défi en changeant
  d’exercice, de langage ou de mode. Le parcours est inaccessible en examen.

Le builder intègre le JSON et la bibliothèque dans `app.js` : aucune nouvelle
route ni requête de catalogue supplémentaire. Refaire `npm run build` après
modification des sources. Les énoncés restent issus du catalogue existant ; si
un sujet manque ou change de groupe, son lancement depuis le parcours est désactivé.
Une actualisation des consignes peut exiger une revue pédagogique même sans
changement de groupe.

Clé locale `z01-js-checkpoint-sprint-v1`, indépendante des réussites et sessions.
Sont conservés la séance sélectionnée, les réponses au diagnostic et jusqu’à
six résultats par exercice (borne globale 200). Pas de copie de code dans cette
clé. Le défi actif et son code ne sont pas restaurés au rechargement, conformément
au fonctionnement de l’entraînement. Un stockage bloqué permet une utilisation
en mémoire avec un avertissement. Deux clics réinitialisent uniquement ce parcours.
Le serveur de prévisualisation sur 8096 a un stockage distinct de celui sur 8092.

## Vérifications et prochain retour utilisateur

Les tests valident la couverture exacte N1–N4, les liens vers les fiches JS,
la distinction guidé/autonome, l’écart de 24 heures, la reprise après échec,
le stockage invalide ou bloqué, la navigation, Tester et la séparation des modes.
`make check` doit rester vert ; le contrôle visuel complète ces vérifications.

Pour essayer : une séance avec une personne qui connaît Go mais débute en JS,
puis noter le temps, le nombre d’indices utiles et les exercices refaits sans
consultation le lendemain. Un bon score de diagnostic seul ne justifie pas de
supprimer ces essais de code. Les extensions possibles sont un diagnostic de
code dédié et des exercices de transfert nouveaux ; ils ne font pas partie de
ce prototype. Aucun modèle externe ni exécution de code via eval n’est utilisé.
