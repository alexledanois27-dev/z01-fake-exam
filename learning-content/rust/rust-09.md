# Génériques, modules et conversions

## Objectif

Lire les contraintes d’une signature générique et organiser les noms exportés.

## À savoir

- `T` est un paramètre de type ; une opération nécessite les bornes de traits correspondantes.
- `pub` rend un élément visible à l’extérieur de son module.
- `From` décrit une conversion choisie ; `TryFrom` permet de signaler un échec.
- Le nom du module, du type et des variantes compte autant que le calcul : les tests importent ces éléments.

## Exemple isolé de syntaxe

```rust
fn echo<T>(value: T) -> T { value }
mod labels {
    pub struct Label(pub String);
    impl From<&str> for Label {
        fn from(text: &str) -> Self { Self(text.to_owned()) }
    }
}
fn main() {
    let label = labels::Label::from("bleu");
    assert_eq!(echo(label).0, "bleu");
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Ajouter une borne trop restrictive sans nécessité.
- Oublier `pub` sur un type ou une fonction attendu par les tests.
- Confondre `Self` et un type générique quelconque.

## Vérification rapide

- Je sais quels traits sont requis et pourquoi.
- Je vérifie le chemin d’import attendu.
- Mes conversions ne cachent pas une entrée invalide.

## À essayer seul

Rendre une petite structure importable depuis un module et essayer sa conversion depuis une chaîne.

## Référence

[Rust Book](https://doc.rust-lang.org/book/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
