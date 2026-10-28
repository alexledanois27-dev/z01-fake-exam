## factorial

### Instructions

Write a function that receives a number (`n`) and returns **its factorial**.

**The factorial** of a number means multiplying all the numbers from `n` down to `1`.
For example:

- `factorial(5)` → `5 * 4 * 3 * 2 * 1` → `120`
- `factorial(0)` → `1` (By definition, factorial of `0` is always `1`.)

### Expected function

```javascript
function factorial(n) {}
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(factorial(5));
console.log(factorial(0));
```

And its output:

```console
$ node main.js
120
1
$
```

### Tip

If you’re not sure how to start, try writing the steps in plain language first:

1. Start with the result as `1`.
2. Multiply it by each number from `n` down to `1`.
3. Return the result.
