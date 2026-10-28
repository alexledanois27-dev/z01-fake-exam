## Palindromic Chains

### Instructions

Write a function that takes an array of numbers.

For **each number** in the array:

1. **Check if it’s a palindrome** (reads the same forwards and backwards).
2. If it’s not, **reverse it and add it to itself**.
3. Repeat step 2 until:
   - It becomes a palindrome, or
   - You’ve tried **100 times**. (If it doesn’t work after 100 tries, return `0` for that number.)

Finally, return an **array of the resulting palindromes**.

### Expected function

```js
function palindromicChain(numbers) {}
```

### Usage

Here is a possible program to test your function:

```js
console.log(palindromicChain([87, 33, 123, 196]));
```

And its output:

```console
$ node main.js
[4884, 33, 444, 0]
$
```

### 🔎 Explanation

| Number | Steps                                       | Result |
| ------ | ------------------------------------------- | ------ |
| 87     | 87 + 78 = 165 → 726 → 1353 → 4884           | 4884   |
| 33     | Already a palindrome                        | 33     |
| 123    | 123 + 321 = 444                             | 444    |
| 196    | Tried 100 times → never became a palindrome | 0      |

---

### Tip

To solve it:

1. **Write a function to check if a number is a palindrome**.
2. For each number:
   - If it’s already a palindrome → keep it.
   - Else → repeat reversing and adding up to 100 times.

3. Collect the results in an array.
