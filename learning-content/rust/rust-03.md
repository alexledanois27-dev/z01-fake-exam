# Chaînes, caractères et Unicode

## Objectif

Parcourir du texte sans confondre octets, caractères Unicode et alphabet ASCII.

## À savoir

- Une `String` contient de l’UTF-8 ; `len()` compte les octets, `chars().count()` les valeurs scalaires Unicode.
- Un `char` ne représente pas nécessairement un caractère visuel complet ; un graphème peut contenir plusieurs valeurs scalaires.
- On ne peut pas indexer une chaîne par un entier comme un tableau de caractères.
- `is_ascii_lowercase()` et les opérations sur `u8` conviennent si la consigne impose ASCII. `split_whitespace()` découpe les espaces Unicode.

## Exemple isolé de syntaxe

```rust
fn main() {
    let text = "été";
    let chars: Vec<char> = text.chars().collect();
    assert_eq!(chars.len(), 3);
    assert!(text.len() > chars.len());
    let words: Vec<&str> = "un  deux".split_whitespace().collect();
    assert_eq!(words, vec!["un", "deux"]);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Découper un `&str` sur une position qui coupe un caractère UTF-8.
- Appliquer une formule sur les lettres ASCII à tout Unicode.
- Perdre les espaces alors que la sortie doit les conserver.

## Vérification rapide

- Je sais quelle unité je parcours.
- Je teste une entrée vide et une entrée accentuée.
- Je distingue texte normalisé et texte à conserver exactement.

## À essayer seul

Comparer les longueurs en octets et en caractères de plusieurs mots ; construire une nouvelle chaîne avec `push` et `push_str`.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
