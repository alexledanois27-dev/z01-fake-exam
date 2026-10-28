# Algorithmes numériques, matrices et états

## Objectif

Décomposer un calcul en étapes dont on peut vérifier les bornes et les invariants.

## À savoir

- Une récurrence peut conserver seulement les quelques termes précédents nécessaires.
- Pour chercher des diviseurs jusqu’à la racine, `d <= n / d` évite un débordement de `d*d`, si d est strictement positif.
- Sur une matrice, distinguer ligne, colonne et dimensions ; un déplacement doit toujours être validé.
- Un interpréteur sépare pointeur d’instruction, mémoire et pointeur de mémoire. Sur une grille, noter explicitement les cellules visitées.

## Exemple isolé de syntaxe

```rust
fn main() {
    let grid = [[2, 4], [6, 8]];
    let row = 1usize;
    let col = 0usize;
    if row < grid.len() && col < grid[row].len() {
        assert_eq!(grid[row][col], 6);
    }
    let n = 19u64;
    let d = 3u64;
    assert!(d <= n / d);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Traiter 0 ou 1 comme un nombre premier.
- Mélanger coordonnées et indices mémoire.
- Oublier le cas de base d’une récursion ou une limite d’entier.

## Vérification rapide

- Je peux écrire mon invariant en une phrase.
- Je teste les plus petites entrées valides.
- Chaque boucle ou récursion progresse vers une fin.

## À essayer seul

Dessiner une grille 3×3 et énumérer les déplacements valides depuis un coin, puis depuis le centre. Pour un calcul numérique, suivre les variables sur quatre étapes.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
