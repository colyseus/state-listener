///<reference types="mocha" />

import { assert, expect } from "chai";
import { DeltaContainer, DataChange } from "../src";

function clone (data: any) {
    return JSON.parse(JSON.stringify(data));
}

describe("DeltaContainer", () => {
    let container: DeltaContainer<any>;
    let data: any;
    let numCalls: number;

    function completeWhenCalled(n: number, done: Function) {
        numCalls++;
        if (numCalls === n) done();
    }

    beforeEach(() => {
        numCalls = 0;
        data = {
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
            countdown: 10,
            sequence: [0, 1, 2, 3, 4, 5],
            board: [
                [0, 1, 0, 4, 0],
                [6, 0, 3, 0, 0],
            ],
        };
        container = new DeltaContainer<any>(clone(data));
    });

    it("should trigger callbacks for initial state", () => {
        let container = new DeltaContainer({});
        container.listen("players", (change: DataChange) => numCalls++);
        container.listen("entity", (change: DataChange) => numCalls++);
        container.listen("entities/:id", (change: DataChange) => numCalls++);
        container.listen("chests/:id", (change: DataChange) => numCalls++);
        container.listen("chests/:id/items/:id", (change: DataChange) => numCalls++);
        container.listen("sequence/:number", (change: DataChange) => numCalls++);
        container.listen("board/:number/:number", (change: DataChange) => numCalls++);

        container.set(clone(data));
        assert.equal(numCalls, 24);
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

        data.players.three = 3;
        container.set(data);
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

        data.entity.x = 50;
        data.entity.xp = 200;

        container.set(data);
    });

    it("should listen to 'remove' operation", (done) => {
        container.listen("players/:name", (change: DataChange) => {
            assert.deepEqual(change.rawPath, ["players", "two"]);
            assert.equal(change.path.name, "two");
            assert.equal(change.value, undefined);
            done();
        });

        delete data.players.two;
        container.set(data);
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

        data.players.three = 3;
        container.set(data);
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

        data.entities.one.x = 20;
        data.entities.two.y = 40;

        container.set(data);
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

        data.entity.x = 1;
        data.entity.y = 2;
        data.entity.z = 3;
        data.entity.rotation = 90;
        container.set(data);
    });

    it("should remove specific listener", () => {
        container.listen("players", (change: DataChange) => {
            assert.equal(change.value.ten, 10);
        });

        let listener = container.listen("players", () => assert.fail());
        container.removeListener(listener);

        data.players.ten = {ten: 10};
        container.set(data);
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

        data.chests.one.items.two = 2;
        container.set(data);
    });

    it("should remove all listeners", () => {
        container.listen("players", () => assert.fail());
        container.listen("players", () => assert.fail());
        container.listen("entity/:attribute", () => assert.fail());
        container.removeAllListeners();

        delete data.players['one'];
        data.entity.x = 100;
        data.players.ten = {ten: 10};

        container.set(data);
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

        data.players.three = 3;
        delete data.players.two;
        data.entity.rotation = 90;
        container.set(data);
    });

    it("should allow removing listeners inside a listener", () => {
        let container = new DeltaContainer({});
        let listenerToRemove = container.listen("entities/:id", (change: DataChange) => {
            container.removeListener(listenerToRemove);
            numCalls++;
        });
        container.listen("players", (change: DataChange) => numCalls++);
        container.set(clone(data));
        assert.equal(numCalls, 2);
    })

})
