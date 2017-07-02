import { DeltaContainer } from "../src";
import * as jsonpatch from "fast-json-patch";
import * as Benchmark from "benchmark";

let suite = new Benchmark.Suite()

let obj1 = {
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

let obj2 = {
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

suite.add('fast-json-patch + if / else', function() {
    let container = new DeltaContainer<any>(obj1);
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
let tmpContainer = new DeltaContainer<any>(obj1);
tmpContainer.listen("entities/:id", (entityId: string) => {
    removal = entityId;
});

tmpContainer.listen("players/:id", (entityId: string, value: any) => {
    replacement = entityId;
});

tmpContainer.listen("entity/:property", (property: string, value: any) => {
    replacement = property;
});

suite.add('delta-listener', function() {
    let container = new DeltaContainer<any>(obj1);
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
