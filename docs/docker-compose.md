# Installer avec Docker Compose

Cette configuration prépare un **hôte Linux dédié**, sans déployer automatiquement
le site. Elle conserve le monolithe Go : interface, catalogue et orchestration des
corrections. Le service `https`, optionnel, ajoute Caddy. Il n’y a ni cluster,
ni compte individuel, ni file d’attente. Deux corrections peuvent fonctionner
simultanément ; la capacité de 30 visiteurs actifs reste à mesurer.

## Architecture et frontière de confiance

```text
Visiteurs → Caddy (ports 80/443) → app:8080
                                  │
                                  └→ socket du Docker rootless dédié
                                      └→ conteneurs de correction sans réseau
```

Seul `app` reçoit le socket. **Cet accès donne le contrôle du daemon de correction**,
même avec une racine en lecture seule et des capabilities supprimées. Les
conteneurs d’élèves ne reçoivent jamais ce socket. Utiliser un compte système
réservé, sans secrets personnels, et un daemon distinct de celui qui gère Compose.
Ne pas remplacer ce socket par `/var/run/docker.sock` d’un daemon rootful.
Le backend vérifie toujours rootless, cgroup v2 et les limites au démarrage.

Les dossiers de soumission sont montés au **même chemin absolu** dans `app` et sur
l’hôte du daemon de correction : Docker résout les montages sur son hôte, pas dans
le client. Le daemon doit être sur la même machine. Un volume nommé ou un tmpfs
uniquement dans `app` ne conviendrait pas. Un dossier dédié 0700 appartient au
compte de correction ; le code élève n’y reçoit qu’un montage en lecture seule.
Les dossiers sont supprimés après les requêtes normales. Un arrêt brutal peut
laisser des restes : surveiller l’espace et nettoyer uniquement à l’arrêt, après
avoir vérifié qu’aucune correction n’est active. Ne jamais utiliser un répertoire
personnel ou un dossier partagé avec d’autres applications.

Compose applique des limites distinctes à l’application et au proxy. Les limites
des corrections sont appliquées **par le daemon rootless**, hors des quotas du
conteneur `app` : prévoir environ 1 Gio pour l’app, jusqu’à 2 × 512 Mio pour les
corrections par défaut, le proxy, Docker et le système, avec marge à mesurer.
Le réseau `edge` autorise app et Caddy à communiquer et possède une sortie Internet
pour les catalogues. Il n’est pas un filtrage fin des flux. Les corrections gardent
`--network none` et les protections du [guide de sécurité](mise-en-ligne.md).

## Prérequis à préparer sur le VPS

- Docker Engine et le plugin Compose pour les services d’infrastructure.
- Un **second daemon rootless**, sous un compte réservé aux corrections, avec
  cgroup v2 et délégation des limites : suivre la [documentation rootless Docker](https://docs.docker.com/engine/security/rootless/).
- Le socket de ce compte accessible à l’administrateur et au conteneur `app`, sans
  en élargir les droits à tous. Configurer la persistance du service utilisateur
  selon cette documentation. Ne pas contourner une erreur de limites.
- Un dossier dédié, par exemple `/var/lib/z01-corrections`, appartenant à l’UID/GID
  de ce compte (exemple 1001:1001), mode 0700. Le créer avec l’administrateur ;
  ne pas changer récursivement les droits d’un dossier existant arbitraire.
- Pour HTTPS : domaine pointant vers le VPS, ports TCP 80/443 disponibles et ouverts.
  Ne pas ouvrir le port de l’app ni un port réseau pour le daemon Docker.

Cette procédure n’installe pas les daemons et ne change pas le pare-feu.
Les montages sont refusés si leurs sources n’existent pas.

## Configurer et vérifier

Depuis la racine du projet, copier `deploy/compose.env.example` dans un fichier
privé hors du dépôt, par exemple `/etc/z01-fake-exam/compose.env`, droits 0600.
Remplir le domaine, les UID/GID réels, les chemins et un mot de passe solide
(`openssl rand -hex 24`). Le champ `ACCESS_PASSWORD` vide empêche le lancement.
`BUILD_SHA` doit désigner la version déployée (`git rev-parse HEAD` sur un checkout
propre). Les variables exportées du shell ont priorité sur le fichier Compose :
éviter les variables résiduelles. Ne pas afficher la configuration résolue dans
un ticket : elle contient le mot de passe, également visible à l’administrateur
Docker. Les arguments ne doivent jamais contenir ce mot de passe.

```sh
docker compose --env-file /etc/z01-fake-exam/compose.env config --quiet
python3 scripts/check-compose.py /etc/z01-fake-exam/compose.env
docker compose --env-file /etc/z01-fake-exam/compose.env build app
```

Le contrôle préalable ne lance pas de conteneur. Il vérifie les chemins, droits,
la séparation des daemons et les capacités rootless. Il ne remplace pas le test
des corrections. Les images de base Go, Docker CLI et Caddy sont verrouillées par digest dans
les fichiers. Ces empreintes garantissent la reproductibilité, pas l’absence
de vulnérabilités : les scanner et les actualiser après validation lors des
mises à jour de sécurité.
Les images **de correction** restent épinglées par digest dans `backend/images.go`.
Les images de correction doivent être préchargées dans le **daemon rootless**,
pas seulement dans celui de Compose, pour éviter un premier lancement lent.

## Démarrer d’abord sans exposition publique

```sh
docker compose --env-file /etc/z01-fake-exam/compose.env up -d app
docker compose --env-file /etc/z01-fake-exam/compose.env ps
docker compose --env-file /etc/z01-fake-exam/compose.env logs --tail=80 app
# curl demande le mot de passe sans l’inscrire dans la commande :
curl --fail --user testeurs http://127.0.0.1:8095/api/version
```

Adapter `testeurs` au nom choisi. L’application écoute sur toutes les interfaces
**dans le conteneur** ; le port hôte 8095 reste lié à 127.0.0.1. HTTP Basic ne doit
pas transiter en clair sur Internet. Tester les quatre catalogues avec
`/api/exercises?track=go|js|rust|java`, puis les corrections et Tester des quatre
langages selon [les vérifications Docker](mise-en-ligne.md#vérifications-avant-exposition).
Les tests Go d’intégration se lancent avec `DOCKER_HOST` pointant vers le daemon
rootless. Vérifier également un dépassement de délai et le nettoyage des conteneurs.

`CATALOG_MODE=offline` est le défaut reproductible de Compose : les 175 copies
locales sont utilisées. Choisir `auto` pour l’API avec secours local. Cela ne
modifie pas le défaut `auto` du lancement historique `make start`.

## Activer le HTTPS après validation locale

```sh
docker compose --env-file /etc/z01-fake-exam/compose.env --profile https up -d
```

Caddy conserve Host et Authorization, stocke ses certificats dans `caddy_data`
et compresse les réponses. Son API d’administration est désactivée. Il écoute
sur 8080/8443 dans son conteneur et publie 80/443 sur l’hôte. Aucun port du daemon
Docker n’est publié. Sauvegarder les données Caddy selon la politique du serveur.
Le démarrage de Caddy ne garantit pas que l’app soit prête : une erreur 502
transitoire est possible pendant le chargement ; vérifier les journaux et les API.

**Limite actuelle pour un groupe de testeurs :** le backend ignore les en-têtes
IP transmis. Les visiteurs derrière Caddy partagent donc la limitation de débit
du proxy. Compose ne corrige pas ce point et ne certifie pas 30 utilisateurs.
Mesurer la charge et adapter la gestion de saturation avant d’ouvrir au groupe.

## Arrêter, mettre à jour, revenir en arrière

```sh
# Prévenir les testeurs, terminer les corrections avant une mise à jour.
docker compose --env-file /etc/z01-fake-exam/compose.env --profile https down
# Après sélection de la nouvelle version et validation :
docker compose --env-file /etc/z01-fake-exam/compose.env build app
docker compose --env-file /etc/z01-fake-exam/compose.env --profile https up -d
```

Ne pas utiliser `down -v` : cela supprimerait les certificats sauvegardés dans les
volumes. Les conteneurs de correction appartiennent à l’autre daemon : `down`
ne les arrête pas. Avant arrêt, attendre leur fin (délai maximal configuré) et
vérifier le daemon rootless. Une interruption de l’app peut laisser un conteneur
orphelin, à supprimer explicitement sur le daemon de correction après inspection.
Pour revenir en arrière, sélectionner le checkout précédent et son `BUILD_SHA`,
reconstruire puis relancer. Prévoir une courte interruption, pas un déploiement
sans coupure. Les progressions restent dans le navigateur, pas dans ces volumes.

## Validation et limites de cette livraison

La validation de structure `docker compose config --quiet`, les tests de
configuration (`python3 tests/compose-config.test.py`) et `make check` sont
reproductibles sans daemon. La construction de l’image a été réussie en local. Le démarrage effectif des
services, le HTTPS et les corrections rootless restent à valider sur un hôte
Docker accessible avant exposition réelle.
Aucune installation sur VPS ni publication n’est déclenchée par cette configuration.

Références : [services Compose](https://docs.docker.com/reference/compose-file/services/),
[montages et chemins du daemon](https://docs.docker.com/engine/storage/bind-mounts/).
