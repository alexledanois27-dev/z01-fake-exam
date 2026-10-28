# Matrices, ensembles et programmation dynamique

## Objectif

Distinguer validation locale, parcours de grille et réutilisation de sous-résultats.

## À savoir

- Une matrice peut être rectangulaire ou irrégulière : vérifier les dimensions demandées.
- Une validation de grille peut utiliser des ensembles distincts pour lignes, colonnes et blocs.
- Un parcours en spirale maintient quatre bornes et les resserre sans parcourir deux fois la dernière ligne ou colonne.
- En programmation dynamique, définir exactement ce que représente une case avant d’écrire une récurrence ; les cas des bords sont particuliers.

## Exemple isolé de syntaxe

```java
class Demo {
    public static void main(String[] args) {
        int[][] grid = {{2, 3, 1}, {4, 5, 2}};
        int[][] prefix = new int[grid.length][grid[0].length];
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                prefix[r][c] = grid[r][c] + (c == 0 ? 0 : prefix[r][c - 1]);
            }
        }
        assert prefix[1][2] == 11;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Confondre longueur du côté et aire d’un carré.
- Mélanger l’ensemble d’une ligne avec celui d’un bloc.
- Réutiliser une case de calcul avant de l’avoir initialisée.

## Vérification rapide

- Je teste une seule ligne et une seule colonne.
- Je peux expliquer le sens d’une case de mon tableau de calcul.
- Chaque cellule utile est visitée le nombre de fois prévu.

## À essayer seul

Construire un tableau de sommes de préfixes par ligne sur une matrice 2×3 et justifier chaque dépendance.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
