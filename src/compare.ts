export interface PatchObject {
    path: string[];
    op: "add" | "remove" | "replace";
    value?: any;
}

export function compare(tree1: any, tree2: any): any[] {
    var patches: PatchObject[] = [];
    generate(tree1, tree2, patches, []);
    return patches;
}

function deepClone(obj:any) {
    switch (typeof obj) {
        case "object":
            return JSON.parse(JSON.stringify(obj)); //Faster than ES5 clone - http://jsperf.com/deep-cloning-of-objects/5

        case "undefined":
            return null; //this is how JSON.stringify behaves for array items

        default:
            return obj; //no need to clone primitives
    }
}

function objectKeys (obj: any) {
    if (Array.isArray(obj)) {
        var keys = new Array(obj.length);

        for (var k = 0; k < keys.length; k++) {
            keys[k] = "" + k;
        }

        return keys;
    }

    if (Object.keys) {
        return Object.keys(obj);
    }

    var keys = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            keys.push(i);
        }
    }
    return keys;
};

// Dirty check if obj is different from mirror, generate patches and update mirror
function generate(mirror: any, obj: any, patches: PatchObject[], path: string[]) {
    var newKeys = objectKeys(obj);
    var oldKeys = objectKeys(mirror);
    var changed = false;
    var deleted = false;

    for (var t = oldKeys.length - 1; t >= 0; t--) {
        var key = oldKeys[t];
        var oldVal = mirror[key];
        if (obj.hasOwnProperty(key) && !(obj[key] === undefined && oldVal !== undefined && Array.isArray(obj) === false)) {
            var newVal = obj[key];
            if (typeof oldVal == "object" && oldVal != null && typeof newVal == "object" && newVal != null) {
                generate(oldVal, newVal, patches, path.concat(key));
            }
            else {
                if (oldVal !== newVal) {
                    changed = true;
                    patches.push({op: "replace", path: path.concat(key), value: deepClone(newVal)});
                }
            }
        }
        else {
            patches.push({op: "remove", path: path.concat(key)});
            deleted = true; // property has been deleted
        }
    }

    if (!deleted && newKeys.length == oldKeys.length) {
        return;
    }

    for (var t = 0; t < newKeys.length; t++) {
        var key = newKeys[t];
        if (!mirror.hasOwnProperty(key) && obj[key] !== undefined) {
            patches.push({op: "add", path: path.concat(key), value: deepClone(obj[key])});
        }
    }
}
