///<reference types="mocha" />

import { assert, expect } from "chai";
import { StateContainer, DataChange } from "../src";

function clone (state: any) {
    return JSON.parse(JSON.stringify(state));
}

describe("StateContainer", () => {
    let container: StateContainer<any>;
    let state: any;
    let numCalls: number;

    function completeWhenCalled(n: number, done: Function) {
        numCalls++;
        if (numCalls === n) done();
    }

    beforeEach(() => {
        numCalls = 0;
        state = {
            players: {
                one: 1,
                two: 1
            },
            entity: {
                x: 0, y: 0, z: 0,
                xp: 100,
                rotation: 10
            },
            entities: {
                one: { x: 10, y: 0 },
                two: { x: 0, y: 0 },
            },
            chests: {
                one: { items: { one: 1, } },
                two: { items: { two: 1, } }
            },
            npc_entities: {
                npc: {
                    one: { x: 10, y: 0 },
                    two: { x: 0, y: 0 },
                }
            },
            countdown: 10,
            sequence: [0, 1, 2, 3, 4, 5],
            board: [
                [0, 1, 0, 4, 0],
                [6, 0, 3, 0, 0],
            ],
        };
        container = new StateContainer<any>(clone(state));
    });

    it("should trigger callbacks for initial state", () => {
        let container = new StateContainer({});
        container.listen("players", (change: DataChange) => numCalls++);
        container.listen("players/:id", (change: DataChange) => numCalls++);
        container.listen("entity", (change: DataChange) => numCalls++);
        container.listen("entities/:id", (change: DataChange) => numCalls++);
        container.listen("chests/:id", (change: DataChange) => numCalls++);
        container.listen("chests/:id/items/:id", (change: DataChange) => numCalls++);
        container.listen("sequence/:number", (change: DataChange) => numCalls++);
        container.listen("board/:number/:number", (change: DataChange) => numCalls++);

        container.set(clone(state));
        assert.equal(numCalls, 26);
    });

    it("should trigger callback immediatelly after registering the listener", () => {
        let container = new StateContainer({});

        container.set(clone(state));
        container.listen("players/:id", (change: DataChange) => numCalls++, true);

        assert.equal(numCalls, 2);
    });

    it("should trigger container callbacks before its properties", () => {
        let container = new StateContainer({});
        let npcs: any = {};

        container.listen("npc_entities/npc/:id", (change: DataChange) => {
            npcs[change.path.id] = change.value;
        });

        container.listen("npc_entities/npc/:id/:attribute", (change: DataChange) => {
            const npcId = change.path.id;
            const attribute = change.path.attribute;
            assert.ok(npcs[npcId], "npc should already exist");
            assert.equal(npcs[npcId][attribute], change.value);
        });

        container.set(clone(state));
    });

    it("should listen to 'add' operation", (done) => {
        container.listen("players", () => assert.fail());
        container.listen("players/:string/:string", () => assert.fail());
        container.listen("players/:string", (change: DataChange) => {
            assert.deepEqual(change.rawPath, ["players", "three"]);
            assert.equal(change.path.string, "three");
            assert.equal(change.value, 3);
            done();
        });

        state.players.three = 3;
        container.set(state);
    });

    it("should match the full path", (done) => {

        container.listen(":name/x", (change: DataChange) => {
            assert.equal(change.path.name, "entity");
            assert.equal(change.value, 50);
            completeWhenCalled(2, done);
        });

        container.listen(":name/xp", (change: DataChange) => {
            assert.deepEqual(change.rawPath, ["entity", "xp"]);
            assert.equal(change.path.name, "entity");
            assert.equal(change.value, 200);
            completeWhenCalled(2, done);
        });

        state.entity.x = 50;
        state.entity.xp = 200;

        container.set(state);
    });

    it("should listen to 'remove' operation", (done) => {
        container.listen("players/:name", (change: DataChange) => {
            assert.deepEqual(change.rawPath, ["players", "two"]);
            assert.equal(change.path.name, "two");
            assert.equal(change.value, undefined);
            done();
        });

        delete state.players.two;
        container.set(state);
    });

    it("should allow multiple callbacks for the same operation", (done) => {
        let i = 0;
        function accept() {
            i++;
            if (i===3) {
                done();
            }
        }

        container.listen("players/:string/:string", () => assert.fail());
        container.listen("players/:string", accept);
        container.listen("players/:string", accept);
        container.listen("players/:string", accept);

        state.players.three = 3;
        container.set(state);
    });

    it("should fill multiple variables on listen", (done) => {
        container.listen("entities/:id/:attribute", (change: DataChange) => {
            if (change.path.id === "one") {
                assert.equal(change.path.attribute, "x");
                assert.equal(change.value, 20);

            } else if (change.path.id === "two") {
                assert.equal(change.path.attribute, "y");
                assert.equal(change.value, 40);
            }

            completeWhenCalled(2, done);
        });

        state.entities.one.x = 20;
        state.entities.two.y = 40;

        container.set(state);
    });

    it("should create custom placeholder ", (done) => {
        container.registerPlaceholder(":xyz", /([xyz])/);

        container.listen("entity/:xyz", (change: DataChange) => {
            if (change.path.xyz === "x") assert.equal(change.value, 1);
            else if (change.path.xyz === "y") assert.equal(change.value, 2);
            else if (change.path.xyz === "z") assert.equal(change.value, 3);
            else assert.fail();
            completeWhenCalled(3, done);
        });

        state.entity.x = 1;
        state.entity.y = 2;
        state.entity.z = 3;
        state.entity.rotation = 90;
        container.set(state);
    });

    it("should remove specific listener", () => {
        container.listen("players", (change: DataChange) => {
            assert.equal(change.value.ten, 10);
        });

        let listener = container.listen("players", () => assert.fail());
        container.removeListener(listener);

        state.players.ten = {ten: 10};
        container.set(state);
    });

    it("using the same placeholder multiple times in the path", (done) => {
        container.listen("chests/:id/items/:id", (change: DataChange) => {
            //
            // TODO: the current implementation only populates the last ":id" into `change.path.id`
            //
            assert.equal(change.path.id, "two");
            assert.equal(change.value, 2);
            done();
        });

        state.chests.one.items.two = 2;
        container.set(state);
    });

    it("should remove all listeners", () => {
        container.listen("players", () => assert.fail());
        container.listen("players", () => assert.fail());
        container.listen("entity/:attribute", () => assert.fail());
        container.removeAllListeners();

        delete state.players['one'];
        state.entity.x = 100;
        state.players.ten = {ten: 10};

        container.set(state);
    });

    it("should trigger default listener as fallback", (done) => {
        let numCallbacksExpected = 3;

        container.listen("players/:string", (change: DataChange) => {
            if (change.operation === "add") {
                assert.equal(change.path.string, "three");
                assert.equal(change.value, 3);

            } else if (change.operation === "remove") {
                assert.equal(change.path.string, "two");
                assert.equal(change.value, undefined);
            }
            completeWhenCalled(numCallbacksExpected, done);
        });

        container.listen((change:DataChange) => {
            assert.deepEqual(change.path, ["entity", "rotation"]);
            assert.equal(change.operation, "replace");
            assert.equal(change.value, 90);
            completeWhenCalled(numCallbacksExpected, done);
        });

        state.players.three = 3;
        delete state.players.two;
        state.entity.rotation = 90;
        container.set(state);
    });

    it("should allow removing listeners inside a listener", () => {
        let container = new StateContainer({});
        let listenerToRemove = container.listen("entities/:id", (change: DataChange) => {
            container.removeListener(listenerToRemove);
            numCalls++;
        });
        container.listen("players", (change: DataChange) => numCalls++);
        container.set(clone(state));
        assert.equal(numCalls, 2);
    });

    it("should trigger array changes on index order", (done) => {
        let container = new StateContainer({
            array: ["zero", "one"]
        });

        container.listen("array/:number", (change: DataChange) => {
            if (numCalls===0) {
                assert.equal(change.value, "two");
                assert.equal(change.path.number, "2");

            } else if (numCalls===1) {
                assert.equal(change.value, "three");
                assert.equal(change.path.number, "3");
            }
            completeWhenCalled(2, done);
        });

        container.set({
            array: ["zero", "one", "two", "three"]
        });
    });

    it("should prioritize order of registered listeners", (done) => {
        let container = new StateContainer({});
        let callbackOrder: string[] = [];

        container.listen("map", (change: DataChange) => {
            callbackOrder.push("MAP ARRIVED");
        });

        container.listen("array/:number", (change: DataChange) => {
            callbackOrder.push("ARRAY ARRIVED");
        });

        container.set({
            array: ["zero", "one"],
            map: { size: 10 }
        });

        setTimeout(() => {
            assert.deepEqual(callbackOrder, [
                "MAP ARRIVED",
                "ARRAY ARRIVED", "ARRAY ARRIVED"
            ]);
            done();
        }, 10);
    });

    xit("should trigger callback on object container", (done) => {
        state.entity.x = 100;
        state.entity.y = 200;
        state.entity.z = 300;

        container.listen("entity/x", (change: DataChange) => {
            assert.equal(change.value, 100);
        });

        container.listen("entity/y", (change: DataChange) => {
            assert.equal(change.value, 200);
        });

        container.listen("entity/z", (change: DataChange) => {
            assert.equal(change.value, 300);
        });

        container.listen("entity", (change: DataChange) => {
            console.log(change.value);
            assert.equal(change.value.x, 100);
            assert.equal(change.value.y, 200);
            assert.equal(change.value.z, 300);
            done();
        });

        container.set(state);
    });

})
