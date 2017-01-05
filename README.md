# delta-listener [![Build status](https://travis-ci.org/endel/delta-listener.svg?branch=master)](https://travis-ci.org/endel/delta-listener)

> Deeply compare JavaScript objects and listen to changes. Used in
[colyseus.js](http://github.com/gamestdio/colyseus.js) v0.6.0+.

[![Sauce Test Status](https://saucelabs.com/browser-matrix/deltalistener.svg)](https://saucelabs.com/u/deltalistener)

## Usage

### Instantiation

```typescript
import { DeltaContainer } from "delta-listener"
let container = new DeltaContainer({
    entities: {
        one: { x: 10, y: 10 }
    }
});
```

### Listening to additions

```typescript
container.listen("entities/:id", "add", (entityId: string, value: any) => {
    console.log("new entity", entityId, value);
})
```

### Listening to changes/replacements

```typescript
container.listen("entities/:id/:attribute", "replace", (entityId: string, attribute: string, value: any) => {
    console.log(entityId, "changed", attribute, "to", value);
})
```

### Listening to deletions

```typescript
container.listen("entities/:id", "remove", (entityId: string) => {
    console.log(entityId, "has been removed");
})
```

### Fallback listener

You can use a fallback listener when you're not sure how exactly the change will
come. Useful during development process.

```typescript
container.listen((segments: string[], op: PatchOperation, value?: any) => {
    console.log("Patch coming:", segments, op, value);
})
```

See [tests](test/delta_test.ts) for more usage examples.

Built-in placeholders
---

- `:id`: `/([a-zA-Z0-9\-_]+)/`
- `:number`: `/([0-9]+)/`
- `:string`: `/(\w+)/`
- `*`: `/(.*)/`

When any other name is used starting with `:` (e.g. `:example`), `*` will be
used instead.

**Example:**

```typescript
container.listen("players/:entityId", "replace", (entityId: string, value: any) => {
    console.log(key, "changed to", value);
})
```

Is equivalent to:

```typescript
container.listen("players/*", "replace", (entityId: string, value: any) => {
    console.log(key, "changed to", value);
})
```

Registering custom placeholders
---

Registering the placeholder:

```typescript
container.registerPlaceholder(":xyz", /([xyz])/);
```

Using the matcher:

```typescript
container.listen("entity/:id/:xyz", "replace", (id: string, axis: string, value: number) => {
    entities[ id ][ axis ] = value;
});
```

Special thanks
---

The [`compare`](src/compare.ts) method is highly based on
[fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch/)
implementation.

License
---

MIT
