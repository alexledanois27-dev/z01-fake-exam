# Vec, slices, itérateurs et tri

## Objectif

Choisir un parcours adapté et éviter les erreurs d’indices ou de déplacement.

## À savoir

- `Vec<T>` possède une liste extensible ; `&[T]` en est une vue empruntée.
- `iter()` emprunte, `iter_mut()` permet de modifier, `into_iter()` consomme la collection possédée.
- `enumerate()` fournit l’indice ; `map`, `filter` et `collect` décrivent des transformations.
- Une boucle `0..len` exclut la borne finale. Pour trier avec `sort_by`, produire un `Ordering` cohérent.

## Exemple isolé de syntaxe

```rust
fn main() {
    let values = vec![7, 2, 5];
    let doubled: Vec<i32> = values.iter().map(|x| x * 2).collect();
    let mut ordered = doubled.clone();
    ordered.sort();
    assert_eq!(ordered, vec![4, 10, 14]);
    assert_eq!(values.len(), 3);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Consommer un vecteur dont on a encore besoin.
- Accéder à `values[len]` ou modifier la taille pendant un emprunt.
- Trier toute l’entrée alors que le sujet demande un nombre limité d’étapes.

## Vérification rapide

- Mon parcours respecte les bornes.
- Je sais si l’entrée peut être modifiée.
- Mon tri traite doublons et liste vide.

## À essayer seul

Filtrer une liste puis la trier sans modifier l’original ; écrire ensuite la version avec une boucle explicite.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
