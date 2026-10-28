# Tableaux, indices, comparateurs et tri

## Objectif

Gérer les bornes d’un tableau et décider si l’entrée peut être modifiée.

## À savoir

- Un tableau a une taille fixe accessible par `.length`.
- `Arrays.copyOf` copie le tableau au premier niveau ; les références contenues restent partagées.
- `Arrays.sort` modifie le tableau. Pour un ordre personnalisé sur des objets, utiliser un Comparator cohérent.
- Pour une rotation ou une fusion, écrire une correspondance entre indice source et indice destination.

## Exemple isolé de syntaxe

```java
import java.util.Arrays;
class Demo {
    public static void main(String[] args) {
        int[] source = {8, 2, 5};
        int[] sorted = Arrays.copyOf(source, source.length);
        Arrays.sort(sorted);
        assert source[0] == 8;
        assert sorted[0] == 2;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Parcourir jusqu’à <= length.
- Se tromper de sens dans une rotation.
- Utiliser une soustraction comme comparateur au risque d’un débordement ; préférer Integer.compare.

## Vérification rapide

- Je teste tableau vide et singleton.
- Je sais si je dois retourner une copie.
- Je vérifie les doublons et les rotations dépassant la taille.

## À essayer seul

Dessiner les indices d’un tableau de cinq éléments avant et après un décalage de deux positions.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
