# Option, Result et propagation des erreurs

## Objectif

Représenter une absence ou un échec sans faire paniquer le programme.

## À savoir

- `Option<T>` signifie `Some(value)` ou `None` ; `Result<T,E>` signifie `Ok(value)` ou `Err(error)`.
- `?` propage un échec dans une fonction au retour compatible ; il ne remplace pas la lecture de la signature.
- `match` permet de traiter explicitement les variantes. `map` transforme un succès, `and_then` enchaîne une opération qui peut échouer.
- La consigne peut imposer un message d’erreur exact ou un enum spécifique.

## Exemple isolé de syntaxe

```rust
fn read_count(text: &str) -> Result<u32, std::num::ParseIntError> {
    let value = text.parse::<u32>()?;
    Ok(value)
}
fn main() {
    assert_eq!(read_count("12").ok(), Some(12));
    assert!(read_count("oops").is_err());
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Utiliser `unwrap()` sur une entrée volontairement invalide.
- Retourner `None` quand le contrat demande un `Err`.
- Masquer toutes les erreurs avec une valeur par défaut non prévue.

## Vérification rapide

- Mes erreurs ont le type attendu.
- Je teste succès, absence et échec distinctement.
- Je peux décrire ce que propage `?`.

## À essayer seul

Écrire un parseur avec retour `Result`, puis remplacer l’appel par un `match` qui explique chaque branche.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
