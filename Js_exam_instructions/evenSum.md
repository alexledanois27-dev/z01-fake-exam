## evenSum

### Instructions

Write a function that takes a number (`n`) and returns the **sum of all even numbers from `0` to `n`**.

**Even numbers** are numbers that can be divided by `2` with no remainder, like `0, 2, 4, 6, 8...`

For example:

- `evenSum(5)` → `0 + 2 + 4` → `6`
- `evenSum(1)` → `0` (because there are no even numbers between `0` and `1` except `0`)

### Expected function

```javascript
function evenSum(nums) {}
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(evenSum(5));
console.log(evenSum(1));
```

And its output:

```console
$ node main.js
6
0
$
```

### Tip

To calculate the sum:

1. Start with the total as `0`.
2. Go through every number from `0` to `n`.
3. If the number is even, add it to the total.
4. At the end, return the total.
