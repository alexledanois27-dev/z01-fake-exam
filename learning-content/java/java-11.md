# Builder, Factory et Singleton

## Objectif

Identifier le besoin auquel répond chaque patron de construction.

## À savoir

- Builder prépare progressivement un objet et termine avec build ; vérifier les champs obligatoires au bon moment.
- Factory choisit et construit une implémentation à partir d’un critère.
- Singleton contrôle la création pour exposer une instance unique dans le contexte demandé.
- Les signatures et noms de méthodes de l’exercice restent prioritaires ; choisir un patron ne dispense pas de gérer les entrées invalides.

## Exemple isolé de syntaxe

```java
class Demo {
    static final class Settings {
        final int limit;
        Settings(int limit) { this.limit = limit; }
    }
    static final class Builder {
        int limit = 1;
        Builder limit(int value) { limit = value; return this; }
        Settings build() { return new Settings(limit); }
    }
    public static void main(String[] args) { assert new Builder().limit(3).build().limit == 3; }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Retourner null pour une variante non prévue sans regarder le contrat.
- Partager un objet mutable entre plusieurs résultats du builder.
- Rendre un constructeur public qui devait contrôler l’instanciation.

## Vérification rapide

- Je peux expliquer pourquoi le patron est utilisé.
- Je teste plusieurs constructions successives.
- La validation produit le comportement attendu.

## À essayer seul

Dessiner les responsabilités de la fabrique et de l’objet créé, puis comparer cela à une construction étape par étape.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
