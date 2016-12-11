delta-listener [![Build status](https://travis-ci.org/endel/delta-listener.svg?branch=master)](https://travis-ci.org/endel/delta-listener)
===

Deeply compare JavaScript objects and listen to changes. Used in
[colyseus.js](http://github.com/gamestdio/colyseus.js) v0.6.0+.

Usage
---

```
import { DeltaContainer } from "delta-listener"
let container = new DeltaContainer({
    entities: {
        one: { x: 10, y: 10 },
        two: { x: 10, y: 10 }
    }
});

container.listen("entities/:id", "add", (entityId: string, value: any) => {
    console.log("new entity", entityId, value);
})

container.set({
    entities: {
        one: { x: 20, y: 10 },
        two: { x: 10, y: 10 }
    }
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

```
container.listen("players/:entityId", "replace", (entityId: string, value: any) => {
    console.log(key, "changed to", value);
})
```

Is equivalent to:

```
container.listen("players/*", "replace", (entityId: string, value: any) => {
    console.log(key, "changed to", value);
})
```

Special thanks
---

The [`compare`](src/compare.ts) method is highly based on
[fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch/)
implementation.

License
---

MIT
