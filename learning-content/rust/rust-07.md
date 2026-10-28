# Enums et pattern matching

## Objectif

Représenter des cas métier et écrire une décision exhaustive.

## À savoir

- Un `enum` définit des variantes, éventuellement avec des données différentes.
- `match` vérifie que tous les cas sont couverts ; `_` doit être choisi volontairement.
- `if let` convient à une variante intéressante mais ne force pas le traitement de toutes les autres.
- Une table de compatibilité doit venir de la consigne, pas de l’ordre des variantes.

## Exemple isolé de syntaxe

```rust
enum Ticket { Free, Paid(u32) }
fn price(ticket: &Ticket) -> u32 {
    match ticket { Ticket::Free => 0, Ticket::Paid(value) => *value }
}
fn main() {
    assert_eq!(price(&Ticket::Paid(8)), 8);
    assert_eq!(price(&Ticket::Free), 0);
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Inverser le sens donneur/receveur d’une relation.
- Ajouter une branche fourre-tout qui cache un oubli.
- Déplacer les données alors qu’on veut seulement les lire.

## Vérification rapide

- Chaque variante a un comportement défini.
- Je vérifie les deux sens d’une relation asymétrique.
- Mon match retourne toujours le même type.

## À essayer seul

Représenter trois états d’une commande et décrire les transitions autorisées avant de les coder.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
