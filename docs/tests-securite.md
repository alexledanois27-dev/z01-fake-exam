# Tests adversariaux locaux — 27 octobre 2026

Périmètre : copie personnelle Z01 Fake Exam. Essais sur serveurs HTTP de test
locaux, DOM jsdom avec les bibliothèques réellement livrées, et conteneurs Docker
locaux utilisant l’image JavaScript officielle épinglée. Aucun service Zone01
n’a été ciblé. Aucun déploiement ni modification de Docker système.

## Problème confirmé et corrigé

Le nettoyeur HTML bloquait les scripts mais conservait les formulaires et les
styles intégrés au Markdown. Un énoncé importé compromis pouvait ainsi afficher
un faux formulaire de connexion ou un élément recouvrant la page. La preuve
utilisée était un formulaire avec champ password et un div en position fixed.
Cela démontre une possibilité de tromperie visuelle ; aucun vol de données n’a
été effectué ni démontré.

La configuration de nettoyage retire désormais les styles, les formulaires et
leurs principaux contrôles, ainsi que les attributs style/autofocus. Le test de
régression échouait avant la correction et passe ensuite. Le bundle app.js a été
régénéré. Actualiser la page pour charger cette correction.

## Résultats

| Essai | Résultat observé |
| --- | --- |
| Script, gestionnaire onerror/onload, SVG, URI javascript encodée, iframe srcdoc, objet HTML et variante de mutation HTML | Éléments actifs/attributs dangereux filtrés dans les assertions DOM ; parser normal et secours testés |
| Bibliothèque de nettoyage absente | Contenu rendu comme texte échappé |
| Faux formulaire et CSS recouvrant la page | Bloqués après correction |
| Identifiant contenant une commande shell et ../ | HTTP 404, pas de sélection d’un runner |
| Corps trop volumineux, mauvais type JSON, mode inconnu, second objet JSON | HTTP 413 ou 400 |
| Origine étrangère/null, faux hôte, text/plain | HTTP 403 ou 415 |
| Rafale de mauvais identifiants avec X-Forwarded-For variable | HTTP 401 puis 429 ; les bons identifiants restent utilisables |
| Corps HTTP incomplet envoyé par connexion TCP | Lecture interrompue avec délai de test raccourci ; aucune place de correction réservée |
| Fuzzing des identifiants/chemins du catalogue | 219 464 exécutions en 15 secondes, deux workers, aucun contournement trouvé |
| Socket Docker et dossier personnel de l’hôte dans le conteneur | Absents aux chemins testés |
| Capabilities / no-new-privileges / seccomp | CapEff nul, NoNewPrivs=1, Seccomp=2 observés |
| Réseau sortant | Aucune route externe et connexion à une adresse de documentation refusée |
| Écriture dans /etc du conteneur et montage source | Refusée ; contenu du fichier hôte inchangé |
| Remplissage de /workspace, tentative de 140 Mio | Échec au plafond tmpfs de 128 Mio |
| Processus ne terminant pas | Délai d’une seconde imposé pour le test, conteneur absent après annulation |
| 4 Mio stdout et 4 Mio stderr réels | Chaque flux conservé plafonné à 256 Kio, processus correctement drainé |

La validation complète donne 32 tests JavaScript réussis, les tests Go avec
`-race` réussis et `go vet` sans diagnostic. Les nouveaux essais Docker ont aussi
été exécutés avec la détection de concurrence Go.

## Rejouer

```sh
npm test
go -C backend test -race ./...
go -C backend vet ./...
RUN_HARDENING_INTEGRATION=1 go -C backend test -race -run 'TestAdversarial|TestReadOnlyAndDiskLimitIntegration' -v .
go -C backend test -run '^$' -fuzz '^FuzzRunnerMetadataBoundary$' -fuzztime=15s -parallel=2 .
```

Les tests reproductibles se trouvent dans `backend/adversarial_security_test.go`,
`backend/docker_hardening_test.go` et `tests/unit/security-rendering.test.cjs`.

## Limites et suite

Les assertions DOM ne remplacent pas des essais dans tous les navigateurs. Les
sondes Docker ne constituent pas un test d’exploitation de vulnérabilités du
noyau, une preuve d’impossibilité de sortie de conteneur ou un scan complet des
images. Les images contiennent leurs propres outils et contenus : leur intégrité
et les mises à jour de sécurité restent une responsabilité d’exploitation.

Les essais d’épuisement sont bornés : aucun fork bomb, remplissage du disque hôte
ou déni de service massif n’a été lancé. Le fuzzing porte sur les validateurs de
métadonnées, pas sur toute l’application. La politique réseau vérifiée concerne
les programmes soumis, pas les téléchargements de catalogues par le backend.

Le proxy HTTPS, Docker rootless et cgroup v2 devront être testés sur l’hôte final.
Ce rapport ne valide pas un serveur de production. Suivre le guide
[mise en ligne](mise-en-ligne.md), garder le runner isolé des données personnelles
et des secrets, et maintenir le système et les images à jour. Les scores et
chronomètres stockés dans le navigateur ne sont pas une protection anti-triche.
