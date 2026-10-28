## Bubble Sort Analyzer

### Instructions

Write a function that takes:

- An array (`arr`)
- A **comparator** function (`comparator`) to compare two numbers.

Your function should:

1. **Sort the array using the bubble sort algorithm**.
2. Count:
   - **iterations** → total number of comparisons/steps.
   - **swaps** → total times two numbers were switched.

3. Return an object with:
   - The **sorted array**.
   - The number of **iterations**.
   - The number of **swaps**.

### Expected function

```js
function bubbleSortAnalyzer(arr, comparator) {}
```

### Usage

Here is a possible program to test your function:

```js
const comparator = (a, b) => a - b;

const result = bubbleSortAnalyzer([4, 2, 7, 1, 3], comparator);

console.log(result);
```

And its output:

```console
$ node main.js
{
  sortedArray: [1, 2, 3, 4, 7],
  iterations: 10,
  swaps: 6
}
$
```

### Tip — How Bubble Sort Works

1. Compare each pair of items in the array.
2. If they’re in the wrong order (according to the **comparator**), swap them.
3. Repeat this process for the whole array multiple times until no swaps are needed.

**On every pass, the largest item "bubbles up" to the end.**

### Tip - About the Comparator

The **comparator** decides how to compare two numbers:

```javascript
(a, b) => a - b;
```

- If result `< 0` → `a` comes **before** `b`.
- If result `0` → `a` and `b` are **equal**.
- If result `> 0` → `a` comes **after** `b`.

### Notes

- The `comparator` function determines the sorting order:
  - If `comparator(a, b)` returns a value < 0, `a` is considered smaller than `b`.
  - If it returns 0, `a` and `b` are considered equal.
  - If it returns a value > 0, `a` is considered greater than `b`.
- You should implement a **step-by-step bubble sort**, counting both the number of iterations through the array and the number of swaps performed.
