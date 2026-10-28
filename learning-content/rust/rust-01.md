# Types, fonctions et expressions

## Objectif

Relire une signature Rust et construire un résultat du bon type.

## À savoir

- `let` crée une liaison immuable ; `let mut` permet de la réaffecter.
- Les paramètres et le retour d’une fonction sont typés. `usize` sert aux indices et longueurs.
- Une expression finale sans point-virgule est retournée ; avec `;`, sa valeur est abandonnée.
- Une conversion avec `as` peut tronquer : choisir une conversion vérifiée quand la plage est incertaine.

## Exemple isolé de syntaxe

```rust
fn label(count: usize) -> String {
    if count == 0 { String::from("vide") } else { count.to_string() }
}
fn main() {
    let mut count: usize = 2;
    count += 1;
    assert_eq!(label(count), "3");
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Confondre `usize` et un entier signé issu de l’entrée.
- Ajouter `;` à l’expression qui devait produire le résultat.
- Soustraire 1 à zéro avec un type non signé.

## Vérification rapide

- Je connais le type exact de mon retour.
- Je distingue valeur retournée et texte affiché.
- Je contrôle les bornes avant une conversion.

## À essayer seul

Écrire une fonction qui retourne une étiquette selon un compteur, puis changer son type de retour et expliquer les erreurs du compilateur.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
