# Limites connues et prochaines étapes

Ce document décrit ce qui reste à faire ; il ne promet pas des fonctions déjà disponibles.

## Pour accueillir un groupe

- Ajouter une file d’attente bornée et une réponse de suivi des tâches. Actuellement
  seules deux exécutions sont admises ; les suivantes reçoivent HTTP 429.
- Introduire des comptes/quotas si l’accès devient collectif. HTTP Basic est un
  accès partagé ; les données restent dans le navigateur et les cooldowns UI se
  contournent. La limite serveur utilise l’adresse directe, partagée derrière proxy.
- Mesurer une charge réaliste de 60 utilisateurs, dont les rafales de soumissions,
  avec les quatre langages. Aucun résultat de capacité n’est encore établi.
- Tester l’hébergeur réel : HTTPS, rootless, cgroup, nettoyage des images, disque,
  supervision, redémarrage et récupération après incident.

## Hébergement

Le runner suppose un daemon Docker disponible. Déployer le HTML sur Vercel ne
rend pas automatiquement les corrections disponibles. Une adaptation vers un
service d’exécution distant ou Sandbox demande un prototype et des mesures de
coût, de quotas et de sécurité. Aucun fournisseur ni budget n’est configuré.

## Produit et maintenance

- Les tests de fonction sans programme d’appel ne peuvent pas être inventés à
  partir du champ Args ; prévoir des adaptateurs validés exercice par exercice.
- La détection de réponses codées en dur est heuristique et partielle ; elle ne
  doit jamais produire de pénalité ou être présentée comme une preuve de triche.
- Les sessions ne sont pas synchronisées entre appareils. Prévoir éventuellement
  un export/import explicite avant une synchronisation authentifiée.
- Optimiser les médias, compléter les vérifications visuelles mobiles et garder
  les dépendances, images épinglées et notices à jour.
- L’état frontend reste partagé dans un bundle assemblé. Une migration vers de
  vrais modules serait un travail distinct, avec maintien des tests de parcours.
