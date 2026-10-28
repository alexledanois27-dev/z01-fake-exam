## sentencePyramid

### Instructions

Write a function that takes a string (`sentence`) and **prints a pyramid** where:

- The **first line** prints the first word.
- The **second line** prints the first two words.
- The **third line** prints the first three words.
- And so on… until the full sentence is printed.

### Expected function

```js
function sentencePyramid(sentence) {}
```

### Usage

Here is a possible program to test your function:

```js
sentencePyramid("This is a simple sentence pyramid");
```

And its output:

```console
$ node main.js
This
This is
This is a
This is a simple
This is a simple sentence
This is a simple sentence pyramid
$
```

### Tip

To build the pyramid:

1. Split the sentence into words → use `.split(" ")`.
2. Start from the first word and print lines adding one more word each time.
3. Stop when all words are printed.
