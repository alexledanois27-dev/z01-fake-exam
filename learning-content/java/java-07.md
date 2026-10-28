# Listes simplement, doublement et circulairement chaînées

## Objectif

Modifier des liens sans perdre des nœuds et en maintenant les cas limites.

## À savoir

- Un nœud contient une valeur et un ou plusieurs liens ; la liste possède des références de tête et éventuellement de queue.
- Pour insérer, conserver les liens nécessaires avant de les remplacer.
- En double chaînage, next et previous doivent rester cohérents. En circulaire, la fin pointe vers le début.
- Une boucle sur une liste circulaire doit s’arrêter après un tour ou un nombre connu de nœuds, pas en attendant null.

## Exemple isolé de syntaxe

```java
class Demo {
    static class Node { int value; Node next; Node(int v) { value = v; } }
    public static void main(String[] args) {
        Node first = new Node(2);
        first.next = new Node(5);
        Node inserted = new Node(3);
        inserted.next = first.next;
        first.next = inserted;
        assert first.next.next.value == 5;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Perdre la suite de la liste pendant une insertion.
- Ne pas actualiser tête ou queue après un retrait.
- Boucler indéfiniment sur une liste circulaire.

## Vérification rapide

- Je dessine l’état avant et après.
- Je teste une liste vide et un seul nœud.
- Je peux expliquer chaque affectation de lien.

## À essayer seul

Dessiner l’insertion d’un nœud en tête, au milieu et en fin, puis écrire les affectations dans le même ordre.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
