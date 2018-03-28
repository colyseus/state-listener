# @gamestdio/state-listener [![Build status](https://travis-ci.org/gamestdio/state-listener.svg?branch=master)](https://travis-ci.org/gamestdio/state-listener)

> Deeply compare JavaScript objects and listen to changes. Used in
[colyseus.js](http://github.com/gamestdio/colyseus.js)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/deltalistener.svg)](https://saucelabs.com/u/deltalistener)

## Usage

This library is meant for listening to changes in a JavaScript object.

```typescript
import { StateContainer } from "@gamestdio/state-listener"

// Create the container instance.
let container = new StateContainer({
    entities: {
        one: { x: 10, y: 10 }
    }
});
```

### Listening to changes

```typescript
container.listen("entities/:id/:attribute", (change: DataChange) => {
    console.log(change.path.id, change.path.attribute, change.operation, change.value);
});

// Setting new data into the container will trigger the matching listeners
container.set({ entities: { one: { x: 20 } } });

// Console output
// => "one", "x", "replace", 20
// => "one", "y", "remove", undefined
```

On this example, two properties has been changed (`"entities/one/x"`, and
`"entities/one/y"`). Thus, the callback will be triggered twice.

### Fallback listener

You can use a fallback listener when you're not sure how exactly the change will
come. Useful during development process.

Please note that `change.path` in the fallback listener will be an array
containing the full path to the property that has changed.

```typescript
container.listen((change: DataChange) => {
    console.log(change.path, change.operation, change.value);
})

// Setting new data into the container will trigger the matching listeners
container.set({ entities: { one: { x: 20 } } });

// Console output
// => ["entities", "one", "x"], "replace", 20
// => ["entities", "one", "y"], "remove", undefined
```

See [tests](test/delta_test.ts) for more usage examples.

Registering custom placeholders
---

Registering the placeholder:

```typescript
container.registerPlaceholder(":xyz", /([xyz])/);
```

Using the matcher:

```typescript
container.listen("entity/:id/:xyz", (change: DataChange) => {
    myEntities[ change.path.id ][ change.path.xyz ] = change.value;
});
```

Built-in placeholders
---

- `:id`: `/([a-zA-Z0-9\-_]+)/`
- `:number`: `/([0-9]+)/`
- `:string`: `/(\w+)/`
- `:axis`: `/^([xyz])$/`
- `:*`: `/(.*)/`

When any other name is used starting with `:` (e.g. `:example`), `*` will be
used by default.

Inspiration
---

The [`compare`](src/compare.ts) method is highly based on
[fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch/)
implementation.

License
---

MIT
