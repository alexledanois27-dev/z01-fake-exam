## Swappable Object

### Instructions

Write a function `swappableObject(obj)` that takes an object and returns a new object where keys and values are automatically swappable when accessed.

The returned object should:

- Allow access using original keys (`obj.a` → `"apple"`).
- Allow access using original values as keys (`obj.apple` → `"a"`).
- Maintain this behavior dynamically for all properties.

> Looks like a Proxy 💡! you are allowed to use anything you want.

### Expected Function

```js
function swappableObject(obj) {
  // Your implementation here
}
```

### Usage

```js
const obj = swappableObject({ a: "apple", b: "banana" });

console.log(obj.a); // "apple"
console.log(obj.apple); // "a"
console.log(obj.b); // "banana"
console.log(obj.banana); // "b"
```

### Example Output

```sh
$ node main.js
apple
a
banana
b
```

### Tips

A **Proxy** is like a **wrapper** around an object that lets you **control or customize any action** performed on it — such as getting or setting a property — using special functions called **traps**.

```js
const user = { name: "Alice", age: 25 };

const proxyUser = new Proxy(user, {
  get(target, prop) {
    console.log(`Getting ${prop}`);
    return target[prop];
  },
  set(target, prop, value) {
    console.log(`Setting ${prop} to ${value}`);
    target[prop] = value;
    return true;
  },
});

proxyUser.name; // 👉 logs: Getting name
proxyUser.age = 30; // 👉 logs: Setting age to 30
```
