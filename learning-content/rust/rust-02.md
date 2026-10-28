# Ownership, emprunts et durées de vie

## Objectif

Comprendre pourquoi une valeur est déplacée et quand emprunter au lieu de cloner.

## À savoir

- Une `String` ou un `Vec` est généralement déplacé lors d’une affectation ; les petits types `Copy` se copient.
- `&T` prête un accès partagé ; `&mut T` prête un accès exclusif pendant sa durée d’utilisation.
- On ne retourne pas une référence à une variable locale détruite en fin de fonction.
- Un paramètre `&str` accepte une vue sur du texte ; `String` transfère une valeur possédée. Les durées de vie décrivent des relations, elles ne prolongent pas les objets.

## Exemple isolé de syntaxe

```rust
fn decorate(text: &mut String) { text.push('!'); }
fn main() {
    let mut text = String::from("salut");
    let length = text.len();
    decorate(&mut text);
    assert_eq!(length, 5);
    assert_eq!(text, "salut!");
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Réutiliser une valeur après son déplacement.
- Garder un emprunt partagé encore utilisé pendant une mutation.
- Utiliser `clone()` partout au lieu de comprendre le contrat.

## Vérification rapide

- Je peux désigner le propriétaire de chaque valeur.
- Mes références ne survivent pas aux données.
- Je sais justifier chaque copie.

## À essayer seul

Déplacer une chaîne dans une autre variable, constater l’erreur si on réutilise la première, puis recommencer avec un emprunt.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
