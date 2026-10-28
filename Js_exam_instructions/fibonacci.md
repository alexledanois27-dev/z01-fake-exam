## fibonacci

### Instructions

Write a function that takes a number (`n`) and returns the **n-th number** in the **Fibonacci sequence**.

**What’s the Fibonacci sequence?**

It starts like this:

```
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...
```

- The first two numbers are always `0` and `1`.
- Every next number is the **sum of the two before it**.

For example:

- `fibonacci(0)` → `0`
- `fibonacci(1)` → `1`
- `fibonacci(2)` → `1` (`0 + 1`)
- `fibonacci(3)` → `2` (`1 + 1`)
- `fibonacci(4)` → `3` (`2 + 1`)
- and so on.

### Expected function

```javascript
function fibonacci(n) {}
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(fibonacci(6));
console.log(fibonacci(10));
```

And its output:

```console
$ node main.js
8
55
$
```

### Tip

To get the Fibonacci number:

1. Start from `0` and `1`.
2. Add them to get the next number.
3. Repeat this until you reach the `n`-th number.
