import { compare, PatchObject } from "./compare";

const matcherPlaceholders: {[id: string]: RegExp} = {
    ":id": /^([a-zA-Z0-9\-_]+)$/,
    ":number": /^([0-9]+)$/,
    ":string": /^(\w+)$/,
    ":axis": /^([xyz])$/,
    "*": /(.*)/,
}

export type PatchOperation = PatchObject["op"];

export interface Listener {
    callback: Function,
    operation: PatchOperation,
    rules: RegExp[]
}

export class DeltaContainer<T> {
    public data: T;
    private listeners: {[op: string]: Listener[]};

    constructor (data: T) {
        this.data = data;
        this.reset();
    }

    public set (newData: T): PatchObject[] {
        let patches = compare(this.data, newData);
        this.checkPatches(patches);
        this.data = newData;
        return patches;
    }

    public listen (segments: string | (string | RegExp)[], operation: PatchOperation, callback: Function) {
        if (typeof(segments) === "string") {
            segments = segments.split("/");
        }

        let listener: Listener = {
            callback: callback,
            operation: operation,
            rules: segments.map(segment => {
                if (typeof(segment)==="string") {
                    // replace placeholder matchers
                    return (segment.indexOf(":") === 0)
                        ? matcherPlaceholders[segment] || matcherPlaceholders["*"]
                        : new RegExp(segment);
                } else {
                    return segment;
                }
            })
        };

        this.listeners[operation].push(listener);

        return listener;
    }

    public removeListener (listener: Listener) {
        for (var i = this.listeners[listener.operation].length-1; i >= 0; i--) {
            if (this.listeners[listener.operation][i] === listener) {
                this.listeners[listener.operation].splice(i, 1);
            }
        }
    }

    public removeAllListeners () {
        this.reset();
    }

    private checkPatches (patches: PatchObject[]) {
        for (let i = patches.length - 1; i >= 0; i--) {
            let op = patches[i].op;
            for (let j = 0, len = this.listeners[op].length; j < len; j++) {
                let listener = this.listeners[op][j];
                let matches = this.checkPatch(patches[i], listener);
                if (matches) {
                    listener.callback(...matches, patches[i].value);
                }
            }
        }
    }

    private checkPatch (patch: PatchObject, listener: Listener): any {
        // skip if rules count differ from patch
        if (patch.path.length !== listener.rules.length) {
            return false;
        }

        let pathVars: any[] = [];

        for (var i = 0, len = listener.rules.length; i < len; i++) {
            let matches = patch.path[i].match(listener.rules[i]);

            if (!matches || matches.length === 0 || matches.length > 2) {
                return false;

            } else {
                pathVars = pathVars.concat( matches.slice(1) );
            }
        }

        return pathVars;
    }

    private reset () {
        this.listeners = {
            "add": [],
            "remove": [],
            "replace": []
        };
    }

}
