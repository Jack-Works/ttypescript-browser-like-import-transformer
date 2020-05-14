const _ = new Map();
import { a as _1, b as _2 } from "1";
_.set("1", createESModuleInterop({ a: _1, b: _2 }));
import * as _3 from "2";
_.set("2", _3);
import "3";
import * as _4 from "4";
_.set("4", _4);
import * as _5 from "5";
_.set("5", _5);
import { x as _6, y as _7, z as _8 } from "6";
_.set("6", createESModuleInterop({ x: _6, y: _7, z: _8 }));
export default (function createExport() {
            return new Proxy(_, {
                get(target, key) {
                    return target.get(key);
                },
            });
        })();
function createESModuleInterop(x) {
            if (typeof x !== 'object' || x === null)
                return { default: x, __esModule: true };
            return new Proxy(x, {
                get(target, key) {
                    const v = target[key];
                    if (v)
                        return v;
                    if (key === '__esModule')
                        return true;
                    return undefined;
                },
            });
        };
