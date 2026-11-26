> Mise à jour : le parcours se trouve désormais dans l’onglet **Apprendre**,
> en pleine page et selon le langage sélectionné. Go, Rust et Java disposent aussi
> d’un premier parcours de 30 étapes chacun. Voir [le guide actuel](parcours-apprendre.md).
> Les détails ci-dessous décrivent le contenu JS et son historique.

# Prototype : de Go au checkpoint JavaScript, pas à pas

Branche `feat/js-checkpoint-sprint`, issue de `main` (`ae2d1ea`). Le prototype a
été réorienté : il ne propose plus de calendrier de sept séances ni un simple
regroupement des sujets. Il explique les différences Go → JS et les fait
pratiquer dans **30 petits exercices**, répartis en **12 chapitres**.

## Ce que l’apprenant fait

Ouvrir **Apprendre**, puis suivre la prochaine étape. Chaque page présente :

1. Un repère Go et son équivalent ou sa différence JavaScript, dans le chapitre.
2. Une notion précise, expliquée avant de demander du code.
3. Une petite fonction à compléter, avec contrat et cas publics lisibles.
4. Un éditeur CodeMirror, ou un textarea de secours, avec brouillon conservé.
5. **Vérifier mon code**, qui exécute les cas dans Docker et compare attendu/obtenu.
6. Des indices ciblés et un corrigé commenté étape par étape, consultables au besoin.
7. L’étape suivante, activée après réussite des cas pour le code actuellement testé.
8. Un pont vers les vrais sujets du checkpoint, à essayer après les petites briques.

Les chapitres restent accessibles librement pour une personne qui connaît déjà
certaines notions. **Reprendre ma prochaine étape** revient au premier exercice
non réussi. On ne valide pas un chapitre en cliquant sur son titre. Lire un indice
ou un corrigé identifie la réussite comme guidée. Repartir du squelette masque les
aides et permet de refaire de mémoire. Cela reste un suivi local, pas un contrôle
anti-triche. Une ancienne réussite est conservée, mais modifier le brouillon
oblige à vérifier de nouveau avant d’utiliser le bouton Étape suivante.

## Progression pédagogique

| Chapitre | Petites briques |
| --- | --- |
| Syntaxe Go → JS | return, let, égalité stricte |
| Nombres et boucles | modulo, somme |
| Briques du N1 | diviseurs propres, couple d’états |
| Chaînes | découpage en mots, inversion |
| Tableaux | ajout copié, groupes, copies imbriquées |
| Objets | présence propre, entries |
| Callbacks | map, filter |
| Closures | fonction retournée, état privé, appels chaînés |
| Grilles | bornes, Set, connexité |
| Promesses N5 | course avec délai, allSettled, relance |
| Structures profondes N6 | copie gelée, égalité, chemin protégé |
| Proxy et transformation N7 | trap get, transformation récursive de clés |

Le public visé sait déjà programmer en Go. On ne réexplique pas ce qu’est une
boucle dans l’absolu : on rend explicites les parenthèses de for, l’absence de
types dans les signatures JS, l’absence de package/main dans une fonction,
return face à console.log, les nombres flottants, la portée de let/const,
les références de tableaux/objets et les callbacks. Les unités UTF-16 ne sont
pas assimilées aux octets Go ou aux runes ; les exercices de chaînes qui le
nécessitent déclarent leur contrat ASCII.

L’objectif est d’assembler progressivement les outils utiles aux **31 sujets
N1–N7** du catalogue de référence. Les liens de chapitre couvrent ces 31 sujets.
Les chapitres N5 à N7 ajoutent Promise/async, structures profondes et Proxy.
Les niveaux et les conditions du vrai checkpoint peuvent changer. Réussir les
cas publics des petits exercices ne garantit ni une note ni un délai d’apprentissage.
Le rythme de 5–12 minutes par petit exercice est indicatif, hors lecture approfondie,
révisions et sujets complets. Aucun calendrier ne force à avancer sans comprendre.

## Organisation du contenu

`learning-content/js-micro-path/curriculum.json` contient toute la matière :
chapitres, exemples Go/JS, explications, signatures, squelettes, indices,
solutions commentées et tests publics. C’est le fichier à modifier pour améliorer
la pédagogie. Les tests vérifient ses 30 corrections maintenues et la couverture
réelle des liens vers le checkpoint. Ne pas ajouter une solution sans cas limites.

`frontend/lib/js-micro-progress.js` gère le suivi indépendant. Le module
`frontend/app/js-micro-path.js` affiche une seule étape et son éditeur ;
`checkpoint-sprint.js` conserve le pont vers les vrais exercices et leur suivi
guidé/autonome. Le précédent JSON de sept séances n’est plus présenté comme
parcours ; il reste une référence de groupes pour ce pont et ses données locales.
`frontend/styles/js-micro-path.css` porte l’interface détaillée. Refaire
`npm run build` après toute modification des sources ou du curriculum.

## Correction et frontière de sécurité

Le navigateur envoie `POST /api/run` avec `mode: "lesson"`, l’identifiant de la
petite leçon dans `exerciseId` et le code. Le serveur relit son curriculum local,
choisit lui-même la fonction et les cas, puis écrit un script dans un dossier
temporaire. Les tests proposés par le client, noms de cible et images client ne
sont jamais utilisés. Le script utilise Node **dans l’image officielle JS
épinglée**, avec le confinement existant : réseau coupé, racine et montage d’entrée
en lecture seule, capacités retirées, ressources et durée limitées. Le dossier
source est supprimé après l’exécution normale. Aucune soumission utilisateur n’est
évaluée dans le navigateur ou directement dans le processus Go/hôte.

L’image manquante utilise la préparation HTTP 202 existante ; une indisponibilité
Docker reste HTTP 503 et ne devient pas une faute d’apprentissage. Une syntaxe
JS invalide, un résultat incorrect ou un dépassement du délai d’exécution produit
une correction non réussie. Les retours de tests sont affichés avec textContent.
Les erreurs techniques n’augmentent pas le compteur de tentatives du parcours.
Le endpoint garde les contrôles d’origine, authentification en production,
corps de requête, fréquence et concurrence du runner existant.

Les callbacks des tests sont des fonctions prédéfinies explicitement autorisées,
pas du texte exécuté via eval. Les entrées sont aussi comparées avant/après pour
signaler une mutation indésirable, même si le résultat retourné est correct.
Les objets JS/prototypes et les nombres ont leur vraie sémantique Node, pas une
simulation maison du langage. Les cas sont publics, les corrigés consultables et
les programmes soumis peuvent contourner leur propre exercice : le test pédagogique
n’est pas un dispositif certifiant et ne modifie jamais le score du checkpoint.

`backend/js_micro_path_test.go` exécute uniquement les **solutions maintenues dans
le dépôt** avec Node sur l’hôte pour valider le contenu rapidement. Ce raccourci
de test n’est jamais utilisé pour les programmes utilisateurs. Les essais réels
du endpoint et du confinement utilisent Docker. Le curriculum est copié avec
`learning-content/` dans l’image Compose existante.

## Stockage et reprise

Clé `z01-js-micro-path-v3` (reprise des étapes conservées depuis v2 ou v1, laissées intactes) : étape sélectionnée, brouillon par étape (8 000
caractères maximum), aides consultées, tentatives et réussites. Les champs sont
normalisés au chargement, les identifiants inconnus ignorés et les compteurs bornés.
Un code trop long n’est pas tronqué silencieusement : l’interface demande de le
copier et ne remplace pas le dernier brouillon sauvegardé. Un stockage bloqué
permet de continuer en mémoire avec avertissement.

Deux clics réinitialisent uniquement cette clé. Les succès d’entraînement,
l’historique et les sessions d’examen ne sont pas effacés. Le code de l’exercice
principal reste intact quand on lit ou utilise les petites étapes. Le lancement
volontaire d’un vrai sujet depuis le pont suit les règles d’entraînement habituelles
(page blanche). Le parcours est fermé/inaccessible en mode examen.

## Tester le prototype

```sh
PORT=8096 make start
```

Ouvrir http://127.0.0.1:8096/ puis **Apprendre**. Un autre port sépare le
stockage du navigateur, pas le code : deux serveurs du même checkout servent la
branche courante. Une comparaison avec main demande un second checkout.

Essayer d’abord une fonction qui affiche sans return : le test doit expliquer
que le résultat obtenu est undefined. Puis corriger, passer à l’étape suivante,
recharger et vérifier le brouillon. Tester aussi une inversion qui modifie son
entrée, un callback oublié et une closure qui renvoie un nombre trop tôt.

`make check` couvre les parcours UI, le stockage, les 30 corrections, la mutation,
les erreurs de retour/curryfication, le contrat HTTP et les paramètres client
ignorés. Un retour d’apprenant reste nécessaire : relever les points de blocage
sur les premiers chapitres, puis vérifier le transfert sur des sujets complets.

Références de langage : [fonctions JS](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Functions),
[fonctions fléchées](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/Arrow_functions),
[slices Go](https://go.dev/tour/moretypes/7). Les contenus pédagogiques sont rédigés
pour ce projet ; les petits exercices ne sont pas des sujets officiels Zone01.
