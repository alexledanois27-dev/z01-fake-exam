# String, caractères et comparaison

## Objectif

Parcourir du texte en distinguant égalité de contenu, indices et unités Unicode.

## À savoir

- `equals` compare le contenu des chaînes ; `==` compare leurs références.
- String est immuable ; StringBuilder convient à des ajouts répétés.
- `length()` et `charAt()` utilisent les unités UTF-16. Les points de code peuvent nécessiter `codePoints()`.
- Si le sujet impose ASCII ou une normalisation précise, ne pas élargir arbitrairement la définition des caractères acceptés.

## Exemple isolé de syntaxe

```java
class Demo {
    public static void main(String[] args) {
        String text = new String("salut");
        assert text.equals("salut");
        StringBuilder builder = new StringBuilder();
        builder.append("item").append(':').append(4);
        assert builder.toString().equals("item:4");
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Utiliser == pour comparer du texte.
- Appeler equals sur une référence potentiellement null.
- Supposer qu’un char représente toujours un caractère visuel complet.

## Vérification rapide

- Je teste la chaîne vide.
- La normalisation respecte la consigne.
- Je vérifie les bornes avant charAt.

## À essayer seul

Comparer deux String créées séparément puis construire une phrase avec StringBuilder sans modifier les chaînes d’origine.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
