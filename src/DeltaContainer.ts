import { compare, PatchObject } from "./compare";

export type PatchOperation = PatchObject["op"];

export interface Listener {
    callback: Function,
    operation: PatchOperation,
    rules: RegExp[]
}

export class DeltaContainer<T> {
    public data: T;
    private listeners: {[op: string]: Listener[]};

    private matcherPlaceholders: {[id: string]: RegExp} = {
        ":id": /^([a-zA-Z0-9\-_]+)$/,
        ":number": /^([0-9]+)$/,
        ":string": /^(\w+)$/,
        ":axis": /^([xyz])$/,
        "*": /(.*)/,
    }

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

    public registerPlaceholder (placeholder: string, matcher: RegExp) {
        this.matcherPlaceholders[ placeholder ] = matcher;
    }

    public listen (segments: string | Function, operation?: PatchOperation, callback?: Function): Listener {
        let rules: string[];

        if (typeof(segments)==="function") {
            rules = [];
            callback = segments;

        } else {
            rules = segments.split("/");
        }

        let listener: Listener = {
            callback: callback,
            operation: operation,
            rules: rules.map(segment => {
                if (typeof(segment)==="string") {
                    // replace placeholder matchers
                    return (segment.indexOf(":") === 0)
                        ? this.matcherPlaceholders[segment] || this.matcherPlaceholders["*"]
                        : new RegExp(segment);
                } else {
                    return segment;
                }
            })
        };

        this.listeners[operation || ""].push(listener);

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
            let matched = false;
            let op = patches[i].op;
            for (let j = 0, len = this.listeners[op].length; j < len; j++) {
                let listener = this.listeners[op][j];
                let matches = this.checkPatch(patches[i], listener);
                if (matches) {
                    listener.callback(...matches, patches[i].value);
                    matched = true;
                }
            }

            // check for fallback listener
            if (!matched && this.listeners[""]) {
                for (var j = 0, len = this.listeners[""].length; j < len; j++) {
                    this.listeners[""][j].callback(patches[i].path, patches[i].op, patches[i].value);
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
            "": [], // fallback
            "add": [],
            "remove": [],
            "replace": []
        };
    }

}
