## PerfectNum

### Instructions

Write a function that takes a number (`n`) and returns:

- `true` → if the number **is a perfect number**.
- `false` → if it’s **not** a perfect number.

**What’s a perfect number?**

A **perfect number** is a positive number where:

- The sum of all its **proper divisors** (numbers that divide it _except itself_) equals the number.

For example:

- `6` → divisors: `1, 2, 3` → `1 + 2 + 3 = 6` → **perfect!**
- `28` → divisors: `1, 2, 4, 7, 14` → `1 + 2 + 4 + 7 + 14 = 28` → **perfect!**
- `12` → divisors: `1, 2, 3, 4, 6` → `1 + 2 + 3 + 4 + 6 = 16` → **not perfect.**

### Expected function

```javascript
function isPerfectNum(n) {}
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(isPerfectNum(6));
console.log(isPerfectNum(28));
console.log(isPerfectNum(12));
```

And its output:

```console
$ node main.js
true
true
false
$
```

### Tip

To check if a number is perfect:

1. Start with the total as `0`.
2. For every number less than `n` (from `1` to `n - 1`):
   - If it divides `n` with no remainder, add it to the total.

3. At the end, if the total equals `n`, it’s a perfect number.
