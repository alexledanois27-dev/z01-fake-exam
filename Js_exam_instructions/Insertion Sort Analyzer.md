## Insertion Sort Analyzer

### Instructions

Write a function that takes:

- An array (`arr`)
- A **comparator** function (`comparator`) that tells how to compare two numbers

Your function should:

1. **Sort the array using the insertion sort algorithm**.
2. Keep track of:
   - **iterations** → how many steps (comparisons) it made.
   - **swaps** → how many times two values were switched.

3. Return an object containing:
   - The **sorted array**.
   - The number of **iterations**.
   - The number of **swaps**.

### Expected function

```js
function insertionSortAnalyzer(arr, comparator) {}
```

### Usage

Here is a possible program to test your function:

```js
const comparator = (a, b) => a - b;

const result = insertionSortAnalyzer([5, 2, 4, 6, 1, 3], comparator);

console.log(result);
```

And its output:

```console
$ node main.js
{
  sortedArray: [1, 2, 3, 4, 5, 6],
  iterations: 12,
  swaps: 9
}
$
```

### Tip — How Insertion Sort Works

1. Start from the second item (`i = 1`).
2. Compare it with the previous items.
3. If it’s smaller, **swap** it backward until it’s in the right spot.
4. Count each step (iteration) and each time you swap two numbers.

### Tip - About the Comparator

The **comparator** tells the function how to compare numbers:

```javascript
(a, b) => a - b;
```

- If the result is `< 0`, `a` comes **before** `b`.
- If it’s `0`, they are **equal**.
- If it’s `> 0`, `a` comes **after** `b`.

### Notes

- The `comparator` function determines the sorting order:
  - If `comparator(a, b)` returns a value < 0, `a` is considered smaller than `b`.
  - If it returns 0, `a` and `b` are considered equal.
  - If it returns a value > 0, `a` is considered greater than `b`.
- You should implement a **step-by-step insertion sort**, counting both the number of iterations through the array and the number of swaps performed.
