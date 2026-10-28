# Provenance, licences et périmètre personnel

## Base conservée

Z01 Fake Exam est une version personnelle dérivée du projet open source
[z01exam/z01exam](https://github.com/z01exam/z01exam). La base importée est le
commit `c55677a` (référence complète accessible par `git rev-parse archive/upstream-base`).
L’historique des contributeurs d’origine est conservé, sans réécriture de leurs
commits. `archive/upstream-base` permet de comparer la base à la version actuelle.

Le dépôt personnel n’a pas de remote pointant vers l’amont. `origin` désigne
uniquement le dépôt personnel public. Il ne s’agit pas d’une version officielle
Zone01 et aucune équivalence avec leurs conditions d’examen n’est revendiquée.

## Ce qui vient de la base

La base apporte notamment les catalogues, les adaptateurs des moulinettes
01-edu, les exercices locaux JavaScript, les fiches historiques et une première
interface. Les sources et adaptations restent consultables dans l’historique.

## Travaux personnels

La version personnelle ajoute/refond l’organisation de l’interface, CodeMirror,
les parcours entraînement/examens libre et strict, le stockage local des sessions,
les tests d’exemples et Args, les 175 aides pédagogiques, la personnalisation
visuelle, les réactions, les garde-fous de sécurité et leurs tests reproductibles.
Les catalogues des quatre langages sont reliés aux API Zone01, avec copies locales
de secours. Les 34 fiches Go historiques sont complétées par 36 nouvelles fiches
Rust/JavaScript/Java, associées explicitement aux exercices en entraînement.
Voir [l’historique fonctionnel](../CHANGELOG.md) et [la carte du code](maintenance.md).
Les changements ont été développés avec l’assistance de Codex ; ils doivent
continuer à être relus, testés et maintenus comme tout autre code.

## Licences et ressources

- Code de la base : double licence [MIT](../LICENSE-MIT) ou
  [Apache-2.0](../LICENSE-APACHE), au choix selon leurs conditions. Les notices
  et copyrights d’origine sont conservés. Les modifications personnelles du code
  suivent ces mêmes licences, sauf indication propre à une ressource tierce.
- Bibliothèques navigateur : licences dans [vendor](../vendor/README.md) et leurs
  fichiers `LICENSE-*`. Les dépendances CodeMirror sont verrouillées séparément.
- Énoncés et images de correction : ressources externes de Zone01/01-edu ; leur
  disponibilité et leurs droits ne sont pas transférés par la licence du code.
- Logo fourni par l’utilisateur et médias de réaction : provenance dans
  [assets/README.md](../assets/README.md). Les droits des médias restent à leurs
  titulaires. La publication du code ne transfère pas les droits de ces médias ; vérifier les droits
  avant une diffusion publique.

## Hébergement et données

Aucun site public n’a été déployé par cet import. La préparation de sécurité
n’équivaut pas à une certification. Les scores, brouillons et historiques sont
conservés dans le navigateur, pas dans un compte utilisateur sur le serveur.
Le dépôt public est destiné au développement personnel ; l’application ne possède
pas encore de gestion de comptes individuels ni de file d’attente de corrections.
