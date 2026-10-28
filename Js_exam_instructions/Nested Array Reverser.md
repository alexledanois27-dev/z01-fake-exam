## Nested Array Reverser

### Instructions

Write a function that takes a **2D array of words** (an array that contains arrays of words).

Your function should:

1. **Reverse the order of the inner arrays**.
2. **Reverse the order of the words inside each inner array**.
3. **Join all the words** into a single string, separated by spaces.
4. **Return the string**.

If the input array is empty (`[]`), return an empty string (`""`).

### Expected function

```javascript
nestedArrayReverser(words);
```

### Usage

Here is a possible program to test your function:

```javascript
console.log(
  nestedArrayReverser([
    ["hello", "world"],
    ["this", "is"],
    ["a", "test"],
  ]),
);
console.log(nestedArrayReverser([[]]));
```

And its output:

```console
$ node main.js
test a is this world hello
$
$
```

### Tip

To solve it:

1. Reverse the whole outer array → `.reverse()`.
2. For each inner array, reverse it too.
3. Flatten all the arrays into one → `.flat()`.
4. Join the words into a string with `.join(" ")`.
