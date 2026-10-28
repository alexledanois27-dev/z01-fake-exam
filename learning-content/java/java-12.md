# Nombres, fenêtres glissantes et invariants

## Objectif

Choisir une stratégie de calcul plutôt qu’accumuler des cas particuliers.

## À savoir

- Un accumulateur nécessite une valeur initiale, une mise à jour et une borne de fin.
- Pour primalité/diviseurs, considérer 0 et 1, puis limiter les candidats selon le contrat ; `d <= n / d` évite d*d si d est positif.
- Une fenêtre glissante maintient une zone valide et déplace ses bornes au lieu de recommencer chaque recherche.
- Une formule arithmétique peut déborder avant son affectation : promouvoir les opérandes assez tôt.

## Exemple isolé de syntaxe

```java
class Demo {
    public static void main(String[] args) {
        int[] values = {2, 4, 7, 1};
        int left = 0, sum = 0;
        for (int right = 0; right < values.length; right++) {
            sum += values[right];
            while (sum > 8) sum -= values[left++];
            assert sum <= 8;
        }
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Appliquer une fenêtre fondée sur des valeurs positives à une entrée pouvant être négative.
- Faire un Math.abs sur la plus petite valeur d’un type signé sans gérer ce cas.
- Confondre premier strictement supérieur et premier supérieur ou égal.

## Vérification rapide

- Je sais dire ce que représente chaque variable.
- Je vérifie les extrêmes du domaine.
- Les deux pointeurs progressent sans revenir en arrière si mon invariant l’exige.

## À essayer seul

Tracer une fenêtre sous une borne de somme sur une liste positive ; expliquer pourquoi la même règle ne marche pas forcément avec des nombres négatifs.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
