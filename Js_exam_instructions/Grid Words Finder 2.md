## Grid Words Finder 2

### Instructions

Write a function that takes:

- A **2D grid of letters** (`grid`)
- A **word** to search for (`word`)

Your function should:

1. **Find all occurrences** of the word in the grid.
2. For each occurrence, return an object:
   - `x`: column index (starting position)
   - `y`: row index (starting position)
   - `direction`: `"horizontal"` or `"vertical"`

> Note: The word should be searched only in the positive direction, left to right for horizontal, and top to bottom for vertical.

### Expected function

```js
function gridWordFinder2(grid, word) {}
```

### Usage

Here is a possible program to test your function:

```js
const grid = [
  ["c", "a", "t"],
  ["d", "o", "g"],
  ["r", "a", "t"],
];

console.log(gridWordFinder2(grid, "cat"));
```

And its output:

```console
$ node main.js
[{x:0, y:0, direction:"horizontal"}]
$
```

### Tip

To solve this:

1. **Horizontal search**:
   - For each row (`y`), check if the row joined as a string contains the word.
   - If yes, note down the starting `x` and `y`.

2. **Vertical search**:
   - Transpose the grid → turn columns into rows (can be done using `.map()`).
   - Repeat the horizontal search on this new grid.
   - When you find a word, swap `x` and `y` in the result.
