# Expressions régulières et remplacements ciblés

## Objectif

Extraire des groupes ou remplacer seulement la partie visée d’un texte.

## À savoir

- Pattern compile une expression ; Matcher permet find, matches et l’accès aux groupes.
- `matches()` valide toute la chaîne ; `find()` cherche une occurrence.
- Dans une chaîne Java, un antislash de la regex doit lui-même être échappé.
- Les chaînes de remplacement interprètent notamment $ et les antislashs ; utiliser Matcher.quoteReplacement pour un remplacement littéral.

## Exemple isolé de syntaxe

```java
import java.util.regex.*;
class Demo {
    public static void main(String[] args) {
        Matcher matcher = Pattern.compile("([a-z]+):([0-9]+)").matcher("port:42");
        assert matcher.matches();
        assert matcher.group(1).equals("port");
        String literal = Matcher.quoteReplacement("$5");
        assert "cost".replaceAll("cost", literal).equals("$5");
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Lire un groupe avant une correspondance réussie.
- Écrire un motif gourmand qui avale plusieurs champs.
- Remplacer plus de texte que ne l’autorise la consigne.

## Vérification rapide

- Je teste absence de correspondance et champs optionnels.
- Je sais différencier find et matches.
- Je contrôle le sens des caractères spéciaux dans les remplacements.

## À essayer seul

Extraire une paire clé:valeur avec deux groupes puis ajouter une entrée invalide et vérifier qu’aucun groupe n’est lu trop tôt.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
