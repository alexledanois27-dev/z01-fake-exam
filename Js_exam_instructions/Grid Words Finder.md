## Grid Words Finder

### Instructions

Write a function that takes:

- A **grid** (2D array of letters).
- An **array of words**.

The function should:

- **Find and return** all the words from the array that can be traced:
  - **Horizontally** (left to right).
  - **Vertically** (top to bottom).

_(You don’t need to check backwards or diagonal directions.)_

### Expected function

```js
function gridWordsFinder(grid, words) {}
```

### Usage

Here is a possible program to test your function:

```js
const grid = [
  ["c", "a", "t"],
  ["a", "a", "t"],
  ["r", "a", "t"],
  ["d", "o", "g"],
];

console.log(
  gridWordsFinder(grid, ["cat", "dog", "rat", "tar", "car", "rac", "g"]),
);
console.log(gridWordsFinder(grid, []));
```

And its output:

```console
$ node main.js
["cat", "dog", "rat", "car", "g"]
[]
$
```

### Tip

To solve it:

1. For **each row**, join the letters into a word.
2. For **each column**, join the letters into a word.
3. For every word in the list, check if it appears in any row or column.
4. Collect and return all matching words.
