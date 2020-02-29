const _ = new Map();
import { a as _1, c as _2 } from "1";
_.set("1", { a: _1, c: _2 });
import * as _3 from "2";
_.set("2", _3);
import "3";
import * as _4 from "4";
_.set("4", _4);
import * as _5 from "5";
_.set("5", _5);
import { x as _6, y as _7, z as _8 } from "6";
_.set("6", { x: _6, y: _7, z: _8 });
export default (function createGetter() {
            return new Proxy(_, {
                get(target, key) {
                    return target.get(key);
                },
            });
        })();
