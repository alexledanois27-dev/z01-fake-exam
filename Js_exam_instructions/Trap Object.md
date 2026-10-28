## Trap Object

### Instructions

Write a function **`trapObject(obj, fn)`** that takes an object and a callback function.
The function should return a new object that behaves like the original, but **calls `fn` every time a property is accessed or modified.**

The callback **`fn`** should be invoked with the following arguments:

- On **property access**: `"get"`, the property key, and its current value.
- On **property modification**: `"set"`, the property key, the old value, and the new value.

### Expected Function

```js
function trapObject(obj, fn) {
  // Your implementation here
}
```

### Usage

```js
const logger = (action, key, value, newValue) => {
  if (action === "get") {
    console.log(`Accessed ${key}: ${value}`);
  } else if (action === "set") {
    console.log(`Modified ${key}: ${value} → ${newValue}`);
  }
};

const obj = trapObject({ name: "Alice", age: 25 }, logger);

console.log(obj.name); // Logs: Accessed name: Alice
obj.age = 30; // Logs: Modified age: 25 → 30
console.log(obj.age); // Logs: Accessed age: 30
```

### Example Output

```sh
$ node main.js
Accessed name: Alice
Alice
Modified age: 25 → 30
Accessed age: 30
30
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
