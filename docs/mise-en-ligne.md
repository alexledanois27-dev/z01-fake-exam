# Préparer une mise en ligne protégée

Cette préparation ne publie pas le site. La copie locale continue de fonctionner
sur 127.0.0.1. Le profil proposé est celui d’un outil privé à accès partagé,
pas celui d’une plateforme d’examen certifiante ouverte à tous.

## Ce que le serveur impose

- Hôte local ou hôte de PUBLIC_ORIGIN ; origine des écritures cohérente et refus
  des requêtes déclarées intersites par le navigateur.
- Content-Type application/json pour les soumissions.
- Corps limité à 256 Kio, lecture HTTP limitée à 5 secondes, en-têtes limités,
  écriture bornée selon la durée maximale du runner.
- Lecture et validation de tout le corps avant de réserver l’une des deux places
  de correction. Un corps lent ne réserve plus un conteneur.
- Au maximum 6 soumissions en rafale, puis une place regagnée toutes les 5 secondes
  par adresse source. Les tentatives d’authentification échouées ont un compteur
  indépendant. Les cartes de suivi sont bornées et leurs entrées expirent.
- CSP compatible CodeMirror, nosniff, interdiction d’encadrement, politique de
  référent et restrictions caméra/micro/géolocalisation. Les API sont no-store.
- Les images exécutées appartiennent à la liste officielle épinglée. Les noms
  d’exercices et chemins de fichiers du catalogue sont validés avant leur écriture.

En APP_ENV=production, le démarrage exige aussi :

- PUBLIC_ORIGIN avec HTTPS, sans chemin, requête ni identifiants ;
- ACCESS_USERNAME d’au moins 3 caractères et ACCESS_PASSWORD d’au moins 16 ;
- une durée de correction comprise entre 1 et 60 secondes, 0,1 à 2 CPU,
  16 à 256 processus et une mémoire parmi 256m, 512m, 768m ou 1g ;
- pour les composants exécutant du code : un daemon Docker rootless et cgroup v2,
  avec limites mémoire, swap, CPU et processus disponibles.

Sans mode production, une écoute non locale explicite est refusée.

## Confinement des corrections

Les mêmes images et tests officiels sont utilisés. Le système de fichiers de
l’image est en lecture seule et les journaux Docker du conteneur sont désactivés.
Les fichiers du navigateur arrivent dans un montage hôte en lecture seule, puis
sont copiés dans un espace tmpfs. Le code soumis ne peut pas écrire dans le
répertoire source hôte.

Les écritures et compilations se font dans des espaces mémoire temporaires :
/tmp est borné à 256 Mio ; les espaces /workspace ou /jail/student, lorsqu’ils
sont nécessaires, sont bornés à 128 Mio. La limite mémoire du conteneur inclut
ces espaces et le swap est plafonné à la même valeur que la mémoire, donc sans
allocation supplémentaire de swap. Les caches utiles aux images Go et Rust
sont copiés dans ces espaces avant l’exécution, sous le même délai d’exécution.
Le réseau reste désactivé, les capabilities sont retirées et les conteneurs sont
supprimés à la fin ou lors du dépassement de délai.

L’utilisateur root à l’intérieur des images officielles est conservé pour leur
compatibilité ; en production il doit être remappé par Docker rootless. Cela
réduit l’impact possible et ne transforme pas un conteneur en machine virtuelle.
Le runner devrait se trouver sur une machine dédiée, sans données personnelles
ni secrets inutiles. Les images Docker téléchargées restent sur le disque :
prévoir aussi de l’espace et un entretien côté administrateur.

## Configuration proposée

1. Préparer un hôte Linux dédié et son Docker rootless. Vérifier `docker info` :
   option rootless, cgroup v2 et limites de ressources actives. Le serveur utilise
   le contexte/DOCKER_HOST du compte qui le lance. Il refuse un daemon rootful en
   production ; ne pas contourner cette vérification.
2. Copier `deploy/production.env.example` dans un fichier privé hors des assets.
   Choisir un vrai domaine et des identifiants solides. Un générateur local tel que
   `openssl rand -hex 24` peut produire le mot de passe. Ne pas commiter ce fichier.
3. Charger ces variables dans l’environnement du service. L’application ne charge
   pas automatiquement les fichiers .env.
4. Compiler avec `go -C backend build -o /chemin/prive/z01-fake-exam ./cmd/monolith`.
   Lancer depuis la racine du projet pour que le serveur trouve ses assets.
5. Configurer un reverse proxy HTTPS. `deploy/Caddyfile.example` illustre Caddy,
   avec EXAM_DOMAIN correspondant au domaine de PUBLIC_ORIGIN. Le proxy conserve
   Host et Authorization. Il compresse les contenus texte avec gzip/zstd.
6. N’exposer que les ports du proxy HTTPS. Le backend reste lié à 127.0.0.1:8092.
   Prévoir HTTPS fonctionnel avant d’utiliser les identifiants ; l’authentification
   utilise le mécanisme HTTP Basic du navigateur et ne fournit pas de compte
   individuel, de récupération de mot de passe ou de bouton de déconnexion.

Le serveur ignore volontairement X-Forwarded-For et X-Forwarded-Proto : un client
ne peut pas contourner les limites avec de faux en-têtes. Derrière le proxy,
la limite de soumission est donc partagée par les utilisateurs venant de ce proxy.
Pour davantage de monde, ajouter une limitation par IP réelle au niveau du proxy
et une gestion d’utilisateurs adaptée ; ne pas faire confiance aveuglément aux
adresses transmises dans les en-têtes.

La topologie séparée Web/Catalogue/Runner conserve ses contrats. Les trois services
ont besoin de la même origine publique et des mêmes identifiants s’ils utilisent
le profil production. Les requêtes de snapshot du runner envoient les identifiants.
Leurs ports internes doivent rester sur le réseau privé et ne pas être publiés.

## Vérifications avant exposition

```sh
npm run build:check
npm test
go -C backend test -race ./...
go -C backend vet ./...
RUN_HARDENING_INTEGRATION=1 go -C backend test -run 'TestReadOnlyAndDiskLimitIntegration|TestHardenedOfficialRunnersIntegration' -v .
RUN_GO_EXAMPLE_INTEGRATION=1 RUN_GO_RESTRICTIONS_INTEGRATION=1 RUN_MANUAL_EXAMPLE_INTEGRATION=1 go -C backend test -run 'TestGoExampleIntegration|TestGoRestrictionsIntegration|TestFourLanguageManualExamplesIntegration' -v .
```

Rejouer ces vérifications avec le daemon rootless de la future machine, puis tester
via HTTPS : authentification, refus d’origine étrangère, correction des quatre
langages, expiration d’un examen, chargement de CodeMirror et téléchargement des
énoncés. Les images modifiées ou non officielles sont désormais refusées.

Les tests exécutés dans le développement local ne remplacent pas ces vérifications
sur l’hôte final. Aucun scan complet des images ou du noyau, audit d’intrusion,
sauvegarde de serveur ou installation de reverse proxy n’est effectué par ce profil.
Les scores et chronomètres locaux restent une aide d’entraînement modifiable par
l’utilisateur, sans garantie anti-triche.

Références :
- [Sécurité Docker](https://docs.docker.com/engine/security/)
- [Docker rootless](https://docs.docker.com/engine/security/rootless/)
