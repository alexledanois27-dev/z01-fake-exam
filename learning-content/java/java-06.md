# Interfaces, héritage et polymorphisme

## Objectif

Implémenter un contrat commun sans confondre surcharge et redéfinition.

## À savoir

- Une interface définit des comportements ; une classe abstraite peut aussi porter de l’état et une implémentation partielle.
- Une méthode redéfinie doit garder une signature compatible. `@Override` permet au compilateur de détecter les erreurs.
- La surcharge choisit entre signatures différentes ; ce n’est pas la même chose que redéfinir une méthode héritée.
- Le type de référence et le type concret de l’objet jouent des rôles différents dans les appels.

## Exemple isolé de syntaxe

```java
class Demo {
    interface Metric { int value(); }
    static class Fixed implements Metric {
        @Override public int value() { return 4; }
    }
    public static void main(String[] args) {
        Metric metric = new Fixed();
        assert metric.value() == 4;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Ajouter une méthode au nom proche au lieu d’implémenter la signature.
- Réduire la visibilité d’une méthode héritée.
- Mettre tout dans static alors que le contrat est polymorphe.

## Vérification rapide

- Le code compile avec @Override.
- Je peux appeler l’objet via son interface.
- Je sais expliquer surcharge et redéfinition.

## À essayer seul

Créer deux implémentations d’une interface et les utiliser dans une même liste sans tester leur classe concrète.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
