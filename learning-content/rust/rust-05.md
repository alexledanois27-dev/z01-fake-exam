# HashMap, HashSet et collections ordonnées

## Objectif

Compter, dédupliquer et chercher des valeurs sans perdre le contrat d’ordre.

## À savoir

- `HashMap<K,V>` associe des clés à des valeurs ; `HashSet<T>` mémorise une présence.
- `entry(key).or_insert(value)` aide à initialiser un accumulateur.
- L’ordre d’itération d’une `HashMap` n’est pas un ordre de sortie stable. Trier explicitement ou utiliser une collection ordonnée si nécessaire.
- `get()` retourne une `Option<&V>` ; un minimum vide doit avoir une politique explicite.

## Exemple isolé de syntaxe

```rust
use std::collections::{HashMap, HashSet};
fn main() {
    let mut counts = HashMap::new();
    *counts.entry("rouge").or_insert(0) += 1;
    *counts.entry("rouge").or_insert(0) += 1;
    let unique: HashSet<_> = [2, 2, 9].into_iter().collect();
    assert_eq!(counts.get("rouge"), Some(&2));
    assert_eq!(unique.len(), 2);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Supposer que les clés ressortent dans l’ordre d’insertion.
- Confondre absence d’une clé et valeur zéro.
- Oublier que des clés empruntées dépendent de la durée de vie de leur texte.

## Vérification rapide

- Je traite une collection vide.
- Mon ordre de sortie est déterministe si demandé.
- Je peux expliquer la différence entre compter et tester la présence.

## À essayer seul

Construire un histogramme sur trois catégories, puis afficher les clés triées séparément de la table de comptage.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
