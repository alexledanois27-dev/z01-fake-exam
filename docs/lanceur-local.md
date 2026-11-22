# Lanceur Ubuntu

## Installation et utilisation

Depuis le dossier du projet, une seule fois :

```sh
python3 scripts/install-launcher.py
```

Puis chercher **Z01 Fake Exam** dans les applications Ubuntu et l’épingler aux
favoris. Le raccourci ouvre un terminal et le navigateur quand le serveur est
prêt. Le terminal affiche la compilation et les messages du serveur ; le fermer
ou utiliser Ctrl+C arrête l’instance qu’il a créée.

Le lanceur utilise Python 3, Go et xdg-open. Docker doit être accessible à
l’utilisateur pour les tests de code. Docker absent ou arrêté n’empêche pas de
lire le site, mais rend la correction indisponible. Le lanceur ne fait pas de
sudo, n’installe pas Docker et ne déploie rien.

## Port et instance existante

Le port par défaut est **8092** et l’écoute est limitée à **127.0.0.1**.
Si `/api/version` identifie déjà une instance Z01 Fake Exam sur ce port, une
nouvelle ouverture lance simplement le navigateur. Elle ne prend pas possession
de l’instance existante et ne l’arrête pas à sa fermeture.

Si un autre service occupe le port, un message demande de le libérer ou de choisir
un port. Aucun kill automatique ni changement silencieux de port n’est effectué.
La progression du navigateur dépend du port : les données de 8096 ne sont pas
celles de 8092.

Pour un démarrage particulier dans un terminal, toujours sans Make :

```sh
PORT=8096 python3 scripts/launch.py
```

Variables facultatives : `GO_BIN` pour un chemin de Go explicite,
`Z01_NO_BROWSER=1` pour ne pas ouvrir le navigateur. `TMPDIR` explicite et les
réglages du serveur sont conservés, sauf l’adresse d’écoute qui reste loopback.
Le point d’entrée Go garde son choix de dossier temporaire visible de Docker.

## Déplacement et désinstallation

Le raccourci contient le chemin absolu du projet. Après déplacement, relancer
l’installateur depuis son nouvel emplacement. Le fichier est :

`~/.local/share/applications/z01-fake-exam.desktop`

ou le sous-dossier `applications` de `XDG_DATA_HOME` si défini. Supprimer ce fichier
retire le raccourci sans toucher au projet ni aux données du navigateur.

## Vérifications

`make check` inclut six tests du lanceur : instance existante, autre service,
validation du port, nettoyage au délai de démarrage, installation utilisateur et
échappement du champ Exec. Une vérification réelle couvre aussi le démarrage,
la seconde ouverture et l’arrêt du serveur. Le `.desktop` est vérifié avec
`desktop-file-validate` lorsqu’il est installé. Aucun autostart n’est ajouté.
