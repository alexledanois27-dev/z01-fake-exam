# Piles, files et structures récursives

## Objectif

Associer une structure au bon ordre de traitement et maintenir ses invariants.

## À savoir

- Une pile utilise LIFO : dernier ajouté, premier retiré ; `Vec::push/pop` suffit souvent.
- Une file utilise FIFO ; `VecDeque::push_back/pop_front` évite les suppressions répétées en tête d’un Vec.
- Une liste chaînée peut utiliser `Option<Box<Node>>`. `take()` déplace un lien en laissant `None`.
- Après chaque insertion ou retrait, vérifier tête, liens et cas vide. Une pile convient aux délimiteurs imbriqués ou aux expressions postfixées.

## Exemple isolé de syntaxe

```rust
use std::collections::VecDeque;
fn main() {
    let mut queue = VecDeque::from(["premier", "second"]);
    assert_eq!(queue.pop_front(), Some("premier"));
    let mut stack = vec!["ouvert"];
    stack.push("imbriqué");
    assert_eq!(stack.pop(), Some("imbriqué"));
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Inverser l’ordre des opérandes après deux dépilements.
- Accéder à une pile vide sans traiter None.
- Perdre la suite d’une liste en remplaçant un lien trop tôt.

## Vérification rapide

- Je dessine les liens avant de les modifier.
- Je teste vide, un élément et plusieurs éléments.
- Je contrôle les invariants après chaque opération.

## À essayer seul

Simuler à la main cinq opérations sur une pile et une file, puis vérifier que les deux ordres de sortie diffèrent.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
