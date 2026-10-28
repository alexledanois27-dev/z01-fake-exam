# Dates, UTC, Duration et Period

## Objectif

Choisir la bonne représentation pour un instant, une durée ou une période calendaire.

## À savoir

- Instant représente un instant ; LocalDate une date sans fuseau ; ZoneId ou ZoneOffset donne le contexte de conversion.
- Un timestamp en secondes et un timestamp en millisecondes ne s’utilisent pas avec la même fabrique.
- Duration mesure un temps écoulé ; Period décrit des années, mois et jours calendaires. Un mois n’a pas une durée constante.
- DateTimeFormatter suit un motif exact. Si le sujet impose UTC ou une locale, la fixer explicitement.

## Exemple isolé de syntaxe

```java
import java.time.*;
class Demo {
    public static void main(String[] args) {
        Instant instant = Instant.ofEpochSecond(0);
        assert instant.atOffset(ZoneOffset.UTC).getYear() == 1970;
        LocalDate start = LocalDate.of(2024, 1, 31);
        assert start.plusMonths(1).equals(LocalDate.of(2024, 2, 29));
        assert Duration.ofMinutes(2).getSeconds() == 120;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Laisser le fuseau du serveur influencer une sortie UTC.
- Remplacer un mois par 30 jours sans autorisation.
- Calculer un âge seulement par différence d’années sans comparer anniversaire et date de référence.

## Vérification rapide

- Je connais l’unité du timestamp.
- Je teste année bissextile et fin de mois.
- Les setters éventuels gardent l’état dérivé cohérent.

## À essayer seul

Comparer plusMonths(1) et plusDays(30) depuis une fin de mois, puis expliquer la différence.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
