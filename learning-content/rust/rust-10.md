# Box, Rc, RefCell et Drop

## Objectif

Choisir une indirection et comprendre les emprunts vérifiés à l’exécution.

## À savoir

- `Box<T>` possède une valeur allouée indirectement ; il rend possible un type récursif de taille connue.
- `Rc<T>` partage la propriété dans un seul thread ; il ne rend pas la valeur mutable par magie.
- `RefCell<T>` vérifie les règles d’emprunt à l’exécution. Ses gardes doivent être libérés avant un emprunt incompatible.
- `Drop` exécute une action de nettoyage quand une valeur est détruite. Attention aux cycles de Rc qui empêchent cette destruction.

## Exemple isolé de syntaxe

```rust
use std::cell::RefCell;
use std::rc::Rc;
fn main() {
    let value = Rc::new(RefCell::new(2));
    let other = Rc::clone(&value);
    { let mut guard = other.borrow_mut(); *guard += 1; }
    assert_eq!(*value.borrow(), 3);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Garder un `borrow_mut()` vivant puis faire `borrow()`.
- Employer Rc pour un besoin qui se résout avec un simple emprunt.
- Créer un cycle de propriété et supposer que Drop sera appelé.

## Vérification rapide

- Je connais le nombre de propriétaires.
- Mes gardes ont une portée courte.
- Je peux expliquer pourquoi mon type récursif a une taille connue.

## À essayer seul

Partager un compteur entre deux propriétaires, puis provoquer volontairement un conflit RefCell et le corriger en réduisant la portée de la garde.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
