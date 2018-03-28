import { compare, PatchObject } from "./compare";

export interface Listener {
    callback: Function,
    rules: RegExp[]
    rawRules: string[]
}

export interface DataChange extends PatchObject {
    path: any;
    rawPath: string[];
}

export class StateContainer<T=any> {
    public state: T;
    private listeners: Listener[] = [];
    private defaultListener: Listener;

    private matcherPlaceholders: {[id: string]: RegExp} = {
        ":id": /^([a-zA-Z0-9\-_]+)$/,
        ":number": /^([0-9]+)$/,
        ":string": /^(\w+)$/,
        ":axis": /^([xyz])$/,
        ":*": /(.*)/,
    }

    constructor (state: T) {
        this.state = state;
        this.reset();
    }

    public set (newState: T): PatchObject[] {
        let patches = compare(this.state, newState);
        this.checkPatches(patches);
        this.state = newState;
        return patches;
    }

    public registerPlaceholder (placeholder: string, matcher: RegExp) {
        this.matcherPlaceholders[ placeholder ] = matcher;
    }

    public listen (segments: string | Function, callback?: Function): Listener {
        let rules: string[];

        if (typeof(segments)==="function") {
            rules = [];
            callback = segments;

        } else {
            rules = segments.split("/");
        }

        if (callback.length > 1) {
            console.warn(".listen() accepts only one parameter.");
        }

        let listener: Listener = {
            callback: callback,
            rawRules: rules,
            rules: rules.map(segment => {
                if (typeof(segment)==="string") {
                    // replace placeholder matchers
                    return (segment.indexOf(":") === 0)
                        ? this.matcherPlaceholders[segment] || this.matcherPlaceholders[":*"]
                        : new RegExp(`^${ segment }$`);
                } else {
                    return segment;
                }
            })
        };

        if (rules.length === 0) {
            this.defaultListener = listener;

        } else {
            this.listeners.push(listener);
        }

        return listener;
    }

    public removeListener (listener: Listener) {
        for (var i = this.listeners.length-1; i >= 0; i--) {
            if (this.listeners[i] === listener) {
                this.listeners.splice(i, 1);
            }
        }
    }

    public removeAllListeners () {
        this.reset();
    }

    private checkPatches (patches: PatchObject[]) {
        for (let i = patches.length - 1; i >= 0; i--) {
            let matched = false;

            for (let j = 0, len = this.listeners.length; j < len; j++) {
                let listener = this.listeners[j];
                let pathVariables = listener && this.getPathVariables(patches[i], listener);
                if (pathVariables) {
                    listener.callback({
                        path: pathVariables,
                        rawPath: patches[i].path,
                        operation: patches[i].operation,
                        value: patches[i].value
                    });
                    matched = true;
                }
            }

            // check for fallback listener
            if (!matched && this.defaultListener) {
                this.defaultListener.callback(patches[i]);
            }

        }
    }

    private getPathVariables (patch: PatchObject, listener: Listener): any {
        // skip if rules count differ from patch
        if (patch.path.length !== listener.rules.length) {
            return false;
        }

        let path: any = {};

        for (var i = 0, len = listener.rules.length; i < len; i++) {
            let matches = patch.path[i].match(listener.rules[i]);

            if (!matches || matches.length === 0 || matches.length > 2) {
                return false;

            } else if (listener.rawRules[i].substr(0, 1) === ":") {
                path[ listener.rawRules[i].substr(1) ] = matches[1];
            }
        }

        return path;
    }

    private reset () {
        this.listeners = [];
    }

}
