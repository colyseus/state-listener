import { compare, PatchObject } from "./compare";

const matcherPlaceholders: {[id: string]: RegExp} = {
    ":id": /^([a-zA-Z0-9\-_]+)$/,
    ":number": /^([0-9]+)$/,
    ":string": /^(\w+)$/,
    ":axis": /^([xyz])$/,
    "*": /(.*)/,
}

export interface Rule {
    callback: Function,
    rules: RegExp[]
}

export type PatchOperation = PatchObject["op"];

export class DeltaContainer<T> {
    public data: T;
    private rules: {[op: string]: Rule[]};

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

        let rule: Rule = {
            callback: callback,
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

        this.rules[operation].push(rule);

        return rule;
    }

    public removeListener (rule: Rule, operation: PatchOperation) {
        for (var i = this.rules[operation].length-1; i >= 0; i--) {
            if (this.rules[operation][i] === rule) {
                this.rules[operation].splice(i, 1);
            }
        }
    }

    public removeAllListeners () {
        this.reset();
    }

    private checkPatches (patches: PatchObject[]) {
        for (let i = patches.length - 1; i >= 0; i--) {
            let op = patches[i].op;
            for (let j = 0, len = this.rules[op].length; j < len; j++) {
                let rule = this.rules[op][j];
                let matches = this.checkPatch(patches[i], rule);
                if (matches) {
                    rule.callback(...matches, patches[i].value);
                }
            }
        }
    }

    private checkPatch (patch: PatchObject, rule: Rule): any {
        // skip if rules count differ from patch
        if (patch.path.length !== rule.rules.length) {
            return false;
        }

        let pathVars: any[] = [];

        for (var i = 0, len = rule.rules.length; i < len; i++) {
            let matches = patch.path[i].match(rule.rules[i]);

            if (!matches || matches.length === 0 || matches.length > 2) {
                return false;

            } else {
                pathVars = pathVars.concat( matches.slice(1) );
            }
        }

        return pathVars;
    }

    private reset () {
        this.rules = {
            "add": [],
            "remove": [],
            "replace": []
        };
    }

}
