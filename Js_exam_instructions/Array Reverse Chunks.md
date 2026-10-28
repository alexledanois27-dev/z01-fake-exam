## Array Reverse Chunks

### Instructions

Write a function that takes:

- An array (`arr`)
- A number (`chunkSize`) **(must be bigger than 0)**

The function should:

1. **Split the array into chunks** (groups) of size `chunkSize`.
2. **Reverse the elements inside each chunk**.
3. Put all the reversed chunks back into one array and return it.

**If the last chunk is smaller than chunkSize, reverse whatever is left.**

### Expected function

```js
function reverseChunks(arr, chunkSize) {}
```

### Usage

Here is a possible program to test your function:

```js
console.log(reverseChunks([1, 2, 3, 4, 5, 6, 7], 3));
console.log(reverseChunks([10, 20, 30, 40, 50], 2));
console.log(reverseChunks([1, 2, 3, 4, 5], 4));
```

And its output:

```console
$ node main.js
[3, 2, 1, 6, 5, 4, 7]
[20, 10, 40, 30, 50]
[4, 3, 2, 1, 5]
$
```

### 💡 Tip

Here’s how to think about it:

1. Start at index `0`.
2. Take a slice of the array from `i` to `i + chunkSize`.
3. Reverse that slice.
4. Add it to the final result.
5. Move `i` forward by `chunkSize` and repeat until the end.
