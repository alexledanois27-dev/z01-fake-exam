# Struct, traits et formatage Display

## Objectif

Définir un objet et contrôler exactement sa représentation texte.

## À savoir

- Une `struct` rassemble des champs ; `impl Type` contient ses méthodes.
- Un trait décrit un comportement partagé ; les noms et signatures imposés doivent être respectés.
- `Display::fmt` écrit dans le formateur avec `write!` et retourne `fmt::Result`.
- `Debug` (`{:?}`) et `Display` (`{}`) ne sont pas interchangeables. Préparer les largeurs et séparateurs avant un tableau formaté.

## Exemple isolé de syntaxe

```rust
use std::fmt;
struct Badge { number: u32 }
impl fmt::Display for Badge {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "badge:{}", self.number)
    }
}
fn main() { assert_eq!(Badge { number: 4 }.to_string(), "badge:4"); }
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Afficher avec `println!` au lieu d’écrire dans le formateur.
- Ajouter une ligne finale ou des espaces non demandés.
- Implémenter Debug alors que le correcteur appelle Display.

## Vérification rapide

- Je compare la sortie caractère par caractère.
- Je traite les colonnes vides et les valeurs absentes.
- Mes méthodes empruntent self selon la consigne.

## À essayer seul

Créer une structure à deux champs et formatter une ligne avec un séparateur ; varier la largeur des valeurs.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
