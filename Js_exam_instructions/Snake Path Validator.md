## Snake Path Validator

### Instructions

Write a function `isSnakePath(grid)` that checks if all the `1`s in a 2D grid form **a single, connected snake** path.

Each cell in the grid is either:

- `1` → part of the snake
- `0` → empty space

#### ✅ Rules for a valid snake path

1. All the `1`s must be **connected** — only **horizontally or vertically** (no diagonal connection).
2. There must be **only one connected group of `1`s** — no disconnected parts.
3. A snake of just **one single `1`** is also valid.
4. ❗ You **cannot use**:
   - `for`, `while`, `do while`
   - Recursion
   - Manual indexing

5. ✅ You **can use**:
   - `.map()`, `.filter()`, `.flatMap()`, `.reduce()` and other array methods

### Expected function

```js
function isSnakePath(grid) {}
```

### Usage

Here is a possible program to test your function:

```js
const grid1 = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
];

const grid2 = [
  [1, 0, 0, 0],
  [1, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
];

console.log(isSnakePath(grid1)); // true
console.log(isSnakePath(grid2)); // false
```

And its output:

```console
$ node main.js
true
false
$
```

### Tip

- Use `.flatMap()` or `.map()` to collect all the positions of the `1`s.
- Use `.some()` or `.every()` to check connections between them.
- You can simulate a search or use sets to track visited `1`s — all using array methods!
