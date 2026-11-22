# Lanceur graphique local

Le lanceur affiche une fenêtre dans le style du Fake Exam, sans terminal à garder
ouvert. Il démarre le serveur, indique quand il est prêt et propose **Ouvrir Fake
Exam**, **Arrêter le serveur** et **Quitter le lanceur**. Les détails du démarrage
restent consultables dans un panneau replié.

## Prérequis et installation

Python 3 et Go restent nécessaires. Docker doit être démarré pour corriger, avec
des conteneurs Linux sur Windows/macOS. Aucun module Python supplémentaire ni
Tkinter n’est nécessaire. Les fichiers du dépôt doivent rester ensemble.

Créer ou actualiser le raccourci une fois :

```sh
# Linux et macOS
python3 scripts/install-launcher.py
```

```text
# Windows
py -3 scripts/install-launcher.py
```

| Système | Raccourci créé |
| --- | --- |
| Linux | Z01 Fake Exam dans les applications, sans terminal (`Terminal=false`). |
| Windows | Z01 Fake Exam.vbs sur le Bureau, lancement masqué via Windows Script Host. |
| macOS | Z01 Fake Exam.app sur le Bureau, application Finder sans Terminal. |

`--destination "dossier"` choisit le dossier du raccourci Windows/macOS. Windows
prend en compte un dossier OneDrive/Desktop existant. Après déplacement du projet
ou de Python, relancer l’installateur. Les anciens raccourcis `.cmd`/`.command`
créés sur le Bureau peuvent être supprimés manuellement ; ils ne sont pas effacés.

À la racine, **Lancer Z01 Fake Exam.vbs** ouvre directement le lanceur Windows,
avec `pyw -3`, puis `pythonw` si nécessaire. Le `.cmd` racine redirige vers lui.
Sur macOS, le `.command` racine reste une alternative qui ouvre Terminal ; utiliser
l’application `.app` installée pour un lancement sans console.

Chrome, Chromium ou Edge sont utilisés en mode fenêtre d’application lorsqu’ils
sont trouvés. À défaut, l’interface s’ouvre dans le navigateur habituel, dans un
onglet. Aucune installation de navigateur n’est effectuée. Le comportement de
la fenêtre dépend donc du navigateur disponible.

## Démarrage, arrêt et journaux

Le lanceur démarre `scripts/launch.py`, qui supervise le même `backend/cmd/dev`
que `make start`. Le site écoute sur **127.0.0.1:8092** par défaut ; le lanceur
attend `/api/version`. Sa propre interface utilise un port local aléatoire distinct.
La progression du site reste attachée à son port habituel, pas à celui du lanceur.
Variables conservées : `PORT`, `GO_BIN`, `TMPDIR`.

Le journal courant est `.local-runner/launcher.log`, ignoré par Git. Seuls ses
16 derniers ko sont affichés, comme texte, jamais comme HTML. Il est remplacé au
prochain démarrage du serveur depuis ce lanceur.

- **Arrêter le serveur** arrête uniquement le processus créé par ce lanceur et
  ses descendants. Le bouton est désactivé pour une instance déjà existante.
- **Quitter le lanceur** demande cet arrêt puis ferme le service du lanceur.
  L’interface indique ensuite qu’on peut fermer sa fenêtre.
- Fermer seulement la fenêtre/son onglet **laisse le serveur et le lanceur actifs**.
  Conserver la fenêtre et utiliser Quitter pour terminer proprement.
- Un port occupé par un autre service est signalé, sans le tuer ni changer
  silencieusement le port du site.

Pour diagnostiquer depuis un terminal, le mode précédent reste disponible :
`python3 scripts/launch.py` (ou `py -3 scripts/launch.py`), arrêt avec Ctrl+C.
Le lanceur ne fait ni sudo, ni installation de dépendances, ni autostart, ni déploiement.

## Vérification des mises à jour

Au démarrage puis avec **Vérifier**, le lanceur compare le commit Git local à
`main` sur `alexledanois27-dev/z01-fake-exam` via l’API publique GitHub. La requête
communique le SHA du commit local, sans jeton GitHub, sans code, sans brouillons
ni journaux. L’adresse du dépôt est fixe : le lanceur ne se fie pas à un remote
configuré vers une autre destination.

Il distingue une mise à jour disponible, une version à jour, une branche locale
en avance et des historiques divergents. Les fichiers modifiés sont signalés.
Une coupure réseau, une limite GitHub, Git absent, un téléchargement ZIP sans
historique ou un commit local encore inconnu de GitHub rendent la vérification
indisponible, sans empêcher de travailler.

**Aucun téléchargement ou remplacement automatique du code.** Le lien ouvre les
commits de `main` sur GitHub. Pour mettre à jour un clone propre placé sur `main`,
quitter d’abord le lanceur, puis exécuter `git pull --ff-only` dans le projet et
relancer. Conserver ou commiter les modifications locales avant toute opération ;
ne pas appliquer cette procédure aveuglément à une branche de développement ou
à un historique divergent. Les archives ZIP sont à retélécharger manuellement.

## Sécurité locale et validation

L’interface de contrôle écoute exclusivement sur 127.0.0.1. Un secret aléatoire
par lancement, placé dans le fragment de son URL, est exigé pour les états et
les actions. Le fragment n’est pas envoyé aux liens GitHub (`noreferrer`). Les
requêtes provenant d’une autre origine et les noms d’hôte étrangers sont rejetés.
Aucune commande, aucun chemin ni aucune URL à exécuter ne vient des requêtes.
CSP restrictive, absence de CORS et d’intégration en iframe, réponses sans cache.
Un logiciel malveillant déjà installé sur la machine reste hors de ce périmètre.

`make check` vérifie le cycle du lanceur, les raccourcis, les contrôles HTTP réels,
la comparaison de versions, l’absence d’écrasement de fichiers et l’affichage des
journaux en texte. Le cycle démarrer/arrêter/redémarrer est vérifié sur Linux.
Les raccourcis Windows/macOS sont testés par simulation : **aucun essai natif
Windows ou macOS n’est réalisé dans cet environnement**. Les restrictions locales
Windows Script Host, les permissions macOS et les partages Docker Desktop restent
à valider sur ces systèmes.
