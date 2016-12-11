delta-listener
===

Deeply compare JavaScript objects and listen to changes. Used in
[colyseus.js](http://github.com/gamestdio/colyseus.js).

> `compare` algorithm is highly based on
> [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch/)
> implementation.

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

container.listen("entities/:id", "replace", (, ) => {
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
used instead. Example:

```
container.listen("players/*", "replace", (key: string, value: any) => {
    console.log(key, "changed to", value);
})
```

License
---

MIT
