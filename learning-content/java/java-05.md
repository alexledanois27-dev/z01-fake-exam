# Objets, constructeurs et état dérivé

## Objectif

Maintenir un objet cohérent après construction et après chaque modification.

## À savoir

- Un constructeur initialise l’état valide ; il n’a pas de type de retour.
- `this` désigne l’instance courante et distingue les champs des paramètres.
- Une valeur dérivée peut être recalculée à la lecture ou mise à jour après chaque setter. Choisir une stratégie cohérente.
- Définir précisément capacité, index valides, ajout refusé et suppression dans les collections d’objets.

## Exemple isolé de syntaxe

```java
class Demo {
    static class Counter {
        private int value;
        Counter(int value) { this.value = value; }
        void setValue(int value) { this.value = value; }
        int doubled() { return 2 * value; }
    }
    public static void main(String[] args) {
        Counter c = new Counter(3); c.setValue(4);
        assert c.doubled() == 8;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Modifier un champ sans actualiser une autre valeur stockée qui en dépend.
- Oublier une validation dans un setter alors qu’elle existe dans le constructeur.
- Partager un tableau fourni par l’appelant quand une copie est requise.

## Vérification rapide

- L’objet est cohérent après chaque opération.
- Je teste plusieurs setters successifs.
- Les bornes et capacités sont explicites.

## À essayer seul

Créer un objet dont une propriété dépend de deux champs puis vérifier le résultat après modification de chacun des champs.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
