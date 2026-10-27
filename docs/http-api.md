# Contrats HTTP de la copie personnelle

Le navigateur utilise la même origine pour les pages et les API. Les services
séparés restent derrière le composant Web. En production, les accès utilisent
les identifiants HTTP Basic configurés ; ne pas les placer dans les URL.

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
  "args": ["bonjour monde", "42"]
}
```

Ce programme affiche `1` ; il ignore volontairement ses arguments. Les Args ne
sont pas des appels de fonction ou des commandes shell.

- `mode` absent ou `tests` : correction complète.
- `mode: preview` : programme autonome ou programme d’appel extrait de la consigne,
  avec les arguments littéraux ; aucune validation de progression côté interface.
- `mode: example` : contrat de compatibilité, programme de consigne imposé, sans
  arguments personnalisés. Préférer `preview` pour l’interface actuelle.
- Le serveur refuse les modes inconnus. Les champs de programme de test, stdin
  ou configuration fournis par le client ne lui donnent pas le contrôle du harness.
- Au plus 64 arguments de 4096 caractères, sans caractère nul. Les identifiants,
  chemins du catalogue et images exécutées sont validés côté serveur.

Réponse :

```json
{"success": true, "output": "1"}
```

Dans un aperçu, success signifie seulement que l’exécution a abouti. Le code HTTP
200 peut aussi transporter success=false lorsqu’un test ou une compilation échoue.

| Code | Signification |
| --- | --- |
| 400 | JSON, code ou mode invalide. |
| 401 | Authentification absente ou incorrecte. |
| 403 | Hôte, origine ou contexte intersite refusé. |
| 404 | Exercice inconnu. |
| 413 | Requête trop volumineuse. |
| 415 | Type de contenu incorrect. |
| 429 | Correcteur occupé ou fréquence dépassée ; réessayer après le délai indiqué. |
| 503 | Runner non activé. |

## Autres routes

- `GET /api/version` : métadonnées de version du serveur.
- `/internal/runner-catalog` : snapshot privé, uniquement dans le service Catalogue.
  Ne jamais publier ce port directement.
- Les ressources statiques sont explicitement autorisées. Les sources backend,
  configurations privées et dossiers Git ne font pas partie des assets publics.

Les sorties des processus sont bornées et affichées comme texte, jamais comme HTML.
Le middleware ajoute les en-têtes de sécurité et interdit le cache des API. Voir
[la préparation de mise en ligne](mise-en-ligne.md) pour les limites complètes.
