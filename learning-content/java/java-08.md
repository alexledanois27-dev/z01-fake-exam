# Piles et analyse de texte structuré

## Objectif

Utiliser une pile pour vérifier des structures imbriquées et gérer les erreurs de lecture.

## À savoir

- Une pile conserve le dernier élément ouvert ; ArrayDeque fournit push, pop et peek.
- Vérifier que la pile n’est pas vide avant un dépilement.
- Séparer lecture du prochain jeton et validation de sa relation avec les précédents.
- Pour du HTML simplifié, suivre les règles du sujet : une regex seule ne décrit pas toutes les structures imbriquées.

## Exemple isolé de syntaxe

```java
import java.util.ArrayDeque;
import java.util.Deque;
class Demo {
    public static void main(String[] args) {
        Deque<String> stack = new ArrayDeque<>();
        stack.push("outer"); stack.push("inner");
        assert stack.pop().equals("inner");
        assert stack.peek().equals("outer");
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Accepter une fermeture sans ouverture correspondante.
- Vérifier seulement le nombre de symboles et pas leur ordre.
- Oublier les ouvertures restantes à la fin.

## Vérification rapide

- Chaque jeton est traité une seule fois si possible.
- La pile finale correspond au contrat.
- Je teste une imbrication valide et deux types d’échec.

## À essayer seul

Simuler une suite d’ouvertures et de fermetures sur papier, avec une colonne montrant la pile après chaque symbole.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
