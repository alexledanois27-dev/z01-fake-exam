## divisorFinder

### Instructions

Write a function that takes a number (`n`) and returns an **array of all its positive divisors**, **excluding itself**.

**What’s a divisor?**
A divisor is a number that divides `n` exactly (no remainder).

For example:

- Divisors of `15` → `1, 3, 5` (not `15`)
- Divisors of `28` → `1, 2, 4, 7, 14`
- Divisors of `1` → none (`[]`)
- For **negative numbers**, just use the positive divisors of the absolute value.

### Expected function

```javascript
function divisors(n) {}
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(divisors(15));
console.log(divisors(28));
console.log(divisors(1));
console.log(divisors(-15));
```

And its output:

```console
$ node main.js
[1, 3, 5]
[1, 2, 4, 7, 14]
[]
[1, 3, 5]
$
```

### Tip

To find divisors:

1. Make `n` positive (if it’s negative).
2. Start with an empty array.
3. For every number from `1` to `n - 1`:
   - If it divides `n` exactly, add it to the array.

4. Return the array.
