# Map, Set, fréquences et ordre

## Objectif

Compter ou dédupliquer sans confondre contenu, ordre de parcours et ordre demandé.

## À savoir

- HashMap associe une clé à une valeur ; HashSet teste la présence.
- `getOrDefault` et `merge` simplifient un comptage.
- Une HashMap ne garantit pas un ordre d’insertion. LinkedHashMap le conserve, TreeMap ordonne les clés.
- Un PriorityQueue organise un accès prioritaire mais son itération n’est pas une liste triée. Définir le départage des égalités.

## Exemple isolé de syntaxe

```java
import java.util.HashMap;
import java.util.Map;
class Demo {
    public static void main(String[] args) {
        Map<String, Integer> counts = new HashMap<>();
        counts.merge("bleu", 1, Integer::sum);
        counts.merge("bleu", 1, Integer::sum);
        assert counts.getOrDefault("bleu", 0) == 2;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Supposer un ordre stable non garanti.
- Confondre une clé absente avec une valeur légitime.
- Oublier une règle de départage quand plusieurs fréquences sont égales.

## Vérification rapide

- Je peux justifier le type de collection.
- Je teste les doublons et une collection vide.
- Le résultat respecte l’ordre demandé.

## À essayer seul

Compter des couleurs, puis produire séparément une liste triée des clés ou une liste triée par fréquence.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
