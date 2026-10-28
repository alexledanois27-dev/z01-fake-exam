# Classes, types et méthodes statiques

## Objectif

Respecter le nom de fichier, la classe et la signature importés par les tests.

## À savoir

- Une classe publique porte le nom du fichier `.java`.
- Une méthode static appartient à la classe ; une méthode d’instance utilise un objet.
- Les types primitifs ont des valeurs ; les références peuvent être null. Une division entre entiers reste entière.
- Afficher avec System.out et retourner une valeur sont deux contrats différents.

## Exemple isolé de syntaxe

```java
class Demo {
    static long triple(int value) { return 3L * value; }
    public static void main(String[] args) {
        long result = triple(4);
        assert result == 12;
    }
}
```

Cet exemple illustre une notion ; il ne constitue pas la solution complète d’un
exercice. Conserver la signature et les restrictions annoncées dans la consigne.

## Pièges fréquents

- Changer une signature parce qu’une autre paraît plus pratique.
- Oublier static quand les tests appellent la méthode sur la classe.
- Faire déborder un int avant de convertir le résultat en long.

## Vérification rapide

- Le fichier et la classe ont le bon nom.
- Je sais si les tests créent une instance.
- Mon type de retour est exact.

## À essayer seul

Écrire une méthode statique et une méthode d’instance, puis comparer leurs appels depuis un petit programme séparé.

## Référence

[Dev.java — apprendre Java](https://dev.java/learn/). Cette fiche est une synthèse pédagogique personnelle, pas un corrigé officiel.
