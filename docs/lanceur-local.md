# Lanceur local : Linux, Windows et macOS

## Prérequis

Le lanceur démarre le code du dépôt : ce n’est pas un exécutable autonome qui
embarque les dépendances. Il faut Python 3 et Go. Docker doit être accessible
pour corriger ; Docker Desktop doit utiliser des conteneurs Linux sur Windows
et macOS. Les cours restent lisibles si Docker est arrêté.

Le lanceur utilise le même `backend/cmd/dev` que `make start`, avec écoute sur
**127.0.0.1:8092**. Il attend `/api/version` avant d’ouvrir le navigateur.

## Démarrage par système

| Système | Double-clic ou raccourci |
| --- | --- |
| Ubuntu/Linux | **Z01 Fake Exam** dans les applications après installation. |
| Windows | **Lancer Z01 Fake Exam.cmd** à la racine du dépôt. |
| macOS | **Lancer Z01 Fake Exam.command** à la racine du dépôt. |

Les deux fichiers racine doivent rester avec le dossier `scripts` du projet.
Sur Windows, le fichier cherche `py -3`, puis `python`. Sur macOS, il cherche
`python3`. Go est cherché dans PATH, puis dans ses emplacements usuels, ou via
`GO_BIN` explicite.

## Créer un raccourci une seule fois

Linux et macOS :

```sh
python3 scripts/install-launcher.py
```

Windows :

```text
py -3 scripts/install-launcher.py
```

L’installateur crée le raccourci adapté au système courant :

- Linux : `$XDG_DATA_HOME/applications/z01-fake-exam.desktop`, ou
  `~/.local/share/applications/z01-fake-exam.desktop` par défaut.
- Windows : `Z01 Fake Exam.cmd` dans le dossier Desktop, en tenant compte d’un
  dossier OneDrive/Desktop existant.
- macOS : `Z01 Fake Exam.command` sur le Bureau, avec permission d’exécution.

Pour un Bureau redirigé ou un autre emplacement sur Windows/macOS, ajouter
`--destination "chemin du dossier"`. Après déplacement du projet ou de Python,
relancer l’installation. Supprimer le raccourci désinstalle seulement celui-ci.

## Arrêt, port et instance existante

Garder le terminal ouvert et utiliser **Ctrl+C** pour arrêter l’instance créée.
Les processus du serveur sont regroupés ; sur Windows, le lanceur tente un
CTRL_BREAK de son groupe, puis supprime uniquement son arbre de processus si
l’arrêt n’aboutit pas. Il n’arrête jamais tous les processus Go de la machine.

Si une instance Z01 Fake Exam tourne déjà sur le port choisi, le lanceur ouvre
simplement le navigateur, sans prendre possession de cette instance. Un autre
service sur le port est signalé sans kill ni changement silencieux de port.

La progression dépend de l’origine du navigateur, donc les données de 8096 ne
sont pas celles de 8092. Variables facultatives : `PORT`, `GO_BIN`, `TMPDIR`,
`Z01_NO_BROWSER=1`. Le point d’entrée Go conserve ses réglages temporaires locaux.
Le lanceur ne fait pas de sudo, d’installation de dépendances, d’autostart ni de
déploiement. Il ne modifie pas le catalogue : le chargement API/les copies de
secours gardent leur fonctionnement habituel.

## Validation et limites

`make check` vérifie les tests du lanceur : instance existante, port occupé,
nettoyage, installation, échappements, navigateur macOS/Windows et groupe Windows.
Les branches Windows/macOS sont simulées depuis Linux ; le backend est également
compilé pour Windows amd64 et macOS arm64. Le cycle réel démarrage/deuxième
ouverture/arrêt et les corrections Docker sont vérifiés sur Linux.

**Aucun essai natif Windows ou macOS n’a été effectué dans cet environnement.**
Les permissions du bureau, les associations de fichiers et les partages de
fichiers Docker Desktop sont à valider sur la machine cible. Pour macOS, le
fichier `.command` exige son bit exécutable ; l’installateur le définit, y compris
lorsqu’une archive téléchargée n’a pas conservé les permissions Git.
