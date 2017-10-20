import { DeltaContainer, DataChange } from "../src";
import { compare } from "../src/compare";

import * as jsonpatch from "fast-json-patch";
import * as Benchmark from "benchmark";

let suite = new Benchmark.Suite()

let obj1: any = {
    biglist: [
        [0, 1, 2, 3, 0, 1, 2, 3],
        [0, 1, 2, 3, 0, 1, 2, 3],
        [0, 1, 2, 3, 0, 1, 2, 3]
    ],
    players: {
        one: 1,
        two: 1
    },
    entity: {
        x: 0, y: 0, z: 0,
        rotation: 10
    },
    entities: {
        one: { x: 10, y: 0 },
        two: { x: 0, y: 0 },
    }
};

let obj2: any = {
    biglist: [
        [0, 1, 2, 3, 0, 1, 2, 3],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 2, 3, 0, 1, 2, 3]
    ],
    newlist: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3],
    players: {
        one: 10,
        two: 1
    },
    entity: {
        x: 0, y: 0, z: 0,
        rotation: 10,
        hp: 100
    },
    entities: {
        one: { x: 10, y: 0 },
    }
};

console.log("patch list:", compare(obj1, obj2));

suite.add('fast-json-patch + if / else', function() {
    let container = new DeltaContainer(obj1);
    let patches = jsonpatch.compare(container.data, obj2);
    let removal = "";
    let addition = "";
    let replacement = "";
    for (var i = 0, len = patches.length; i < len; i++) {
        let patch = patches[i];
        if (patch.path.indexOf("/entities") === 0 && patch.op === "remove") {
            let [_, entityId] = patch.path.match(/\/entities\/(.*)/)
            removal = entityId;

        } else if (patch.path.indexOf("/players") === 0 && patch.op === "replace") {
            let [_, entityId] = patch.path.match(/\/players\/([^\/]+)/)
            replacement = entityId;

        } else if (patch.path.indexOf("/entity") === 0 && patch.op === "add") {
            let [_, property] = patch.path.match(/\/entity\/([^\/]+)/)
            addition = property;
        }
    }
    if (removal !== "two" && replacement !== "one" && addition !== "hp") {
        throw new Error("mismatch!");
    }
});


let removal = "";
let addition = "";
let replacement = "";
let tmpContainer = new DeltaContainer(obj1);
tmpContainer.listen("entities/:id", (change: DataChange) => {
    removal = change.path.id;
});

tmpContainer.listen("players/:id", (change: DataChange) => {
    replacement = change.path.id;
});

tmpContainer.listen("entity/:property", (change: DataChange) => {
    replacement = change.path.property;
});

suite.add('delta-listener', function() {
    let container = new DeltaContainer(obj1);
    (<any>container).listeners = (<any>tmpContainer).listeners;

    container.set(obj2);

    if (removal !== "two" && replacement !== "one" && addition !== "hp") {
        throw new Error("mismatch!");
    }
});

suite.on('cycle', function(event: any) {
  console.log(String(event.target));
})

suite.run();
