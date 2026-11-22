# Contrats HTTP de la copie personnelle

Le navigateur utilise la même origine pour les pages et les API. Les services
séparés restent derrière le composant Web. En production, les accès utilisent
les identifiants HTTP Basic configurés ; ne pas les placer dans les URL.

Pour les endpoints externes et checkpoints, voir [API Zone01 et chemins](api-zone01.md).

## GET /api/exercises

`?track=go`, `js`, `rust` ou `java` sélectionne le catalogue (Go par défaut).
La réponse est un tableau d’exercices comprenant l’identifiant, le titre, la
consigne et les métadonnées publiques. L’énoncé n’est pas une instruction
exécutable : son HTML est assaini avant affichage.

## POST /api/run

Content-Type `application/json`, corps maximal de 256 Kio. Exemple d’exécution
sans validation :

```json
{
  "exerciseId": "only1",
  "code": "package main\nimport \"github.com/01-edu/z01\"\nfunc main(){ z01.PrintRune('1') }\n",
  "mode": "preview",
  "args": ["Hello World", "42"]
}
```

Ce programme affiche `1` ; il ignore volontairement ses arguments. Les Args ne
sont pas des appels de fonction ou des commandes shell.

- `mode` absent ou `tests` : correction complète.
- `mode: preview` : programme autonome ou programme d’appel extrait de la consigne,
  avec les arguments littéraux ; aucune validation de progression côté interface.
- `mode: lesson` : petite leçon locale Go, JavaScript, Rust ou Java ; `exerciseId` désigne un identifiant
  `go-learn-*`, `js-learn-*`, `rust-learn-*` ou `java-learn-*` du curriculum serveur.
  Le préfixe est vérifié sur une liste fermée, sans chemin fourni par le client.
  Le serveur impose cible, cas publics et image officielle épinglée du langage et retourne aussi `checks`
  (label, expected, actual, passed et error éventuel). Aucun score d’examen
  n’est modifié. Les paramètres de test ou d’image transmis par le client sont ignorés.
- `mode: example` : contrat de compatibilité, programme de consigne imposé, sans
  arguments personnalisés. Préférer `preview` pour l’interface actuelle.
- Le serveur refuse les modes inconnus. Les champs de programme de test, stdin
  ou configuration fournis par le client ne lui donnent pas le contrôle du harness.
- Au plus 64 arguments de 4096 caractères, sans caractère nul. Les identifiants,
  chemins du catalogue et images exécutées sont validés côté serveur.

Réponse finale (HTTP 200) :

```json
{"success": true, "output": "1"}
```

Si l’image manque, le serveur répond HTTP 202 avec `Retry-After: 5` :

```json
{"status":"preparing","output":"Préparation de la moulinette…"}
```

Cette réponse ne contient pas de résultat `success`. Le navigateur réenvoie la
même requête après cinq secondes jusqu’à la réponse finale ou une erreur. Le
serveur ne conserve pas le code pendant le téléchargement. Seules les cinq images
officielles épinglées sont éligibles, avec un téléchargement partagé par image,
deux téléchargements simultanés au maximum et un délai global de dix minutes
(attente incluse). Les échecs ont une pause de trente secondes avant nouvel essai.
La place de correction est libérée entre les requêtes d’attente. Un redémarrage du
serveur perd cet état en mémoire ; la demande suivante vérifie l’image et peut
relancer le téléchargement.

Le délai court d’exécution du code ne commence qu’après la préparation. Les
conteneurs utilisent `--pull never` : une image supprimée entre la vérification
et l’exécution ne provoque pas un téléchargement implicite dans ce délai.
Le navigateur attend au maximum environ douze minutes et arrête l’attente si
le temps de l’examen est écoulé. Les clients API doivent prendre en charge 202 ;
un ancien frontend doit être actualisé en même temps que le backend.

Dans un aperçu, success signifie seulement que l’exécution a abouti. Le code HTTP
200 peut aussi transporter success=false lorsqu’un test ou une compilation échoue.

| Code | Signification |
| --- | --- |
| 202 | Image en préparation ; aucun exercice encore évalué. |
| 400 | JSON, code ou mode invalide. |
| 401 | Authentification absente ou incorrecte. |
| 403 | Hôte, origine ou contexte intersite refusé. |
| 404 | Exercice inconnu. |
| 413 | Requête trop volumineuse. |
| 415 | Type de contenu incorrect. |
| 429 | Correcteur occupé ou fréquence dépassée ; réessayer après le délai indiqué. |
| 503 | Runner non activé ou préparation de l’image indisponible. |

## Autres routes

- `GET /api/version` : métadonnées de version du serveur.
- `/internal/runner-catalog` : snapshot privé, uniquement dans le service Catalogue.
  Ne jamais publier ce port directement.
- Les ressources statiques sont explicitement autorisées. Les sources backend,
  configurations privées et dossiers Git ne font pas partie des assets publics.

Les sorties des processus sont bornées et affichées comme texte, jamais comme HTML.
Le middleware ajoute les en-têtes de sécurité et interdit le cache des API. Voir
[la préparation de mise en ligne](mise-en-ligne.md) pour les limites complètes.

Le endpoint `/api/version` expose aussi `application: "z01-fake-exam"` en plus de
`sha` et `dirty`. Le lanceur local s’en sert pour reconnaître une instance existante,
sans prendre le contrôle d’un autre service sur le même port.

Les exercices Rust/Java exposent `level` depuis `attrs.group`, et `checkpoint`
depuis leur examen parent. Java conserve trois checkpoints à groupes N1–N5 ;
ces groupes ne sont pas renumérotés en N1–N15. `attrs.level` désigne le cursus
et ne constitue pas le niveau de l’exercice. Le runner conserve les mêmes IDs.
