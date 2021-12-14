// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {}
const a = _import_1(globalThis["a"], ["default"], "a", "globalThis.a", false).default;
const b = _import_1(globalThis["b"], ["default"], "b", "globalThis.b", false).default;
const { c, d } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
const e = _import_1(globalThis["c"], [], "c", "globalThis.c", false);
const { c: _a, d: _b } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
export { _a as c, _b as d };
const _c = _import_1(globalThis["c"], [], "c", "globalThis.c", false);
export { _c as e };
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2);
"import \"d\" is eliminated because it expected to have no side effects in UMD transform.";
// relative import without ext name
import a1 from "./a.js";
import b1, { c1, d1 } from "./b.js";
import * as e1 from "/c.js";
import "./d.js";
// browser style import
import a2 from 'http://example.com/';
import b2, { c2, d2 } from 'https://example.com';
import * as e2 from 'http://example.com/';
import 'http://example.com/';
const x = 1;
export { x };
// relative import without ext name
export { c1, d1 } from "./b.js";
export * as e1 from "./c.js";
// browser style import
export { c2, d2 } from 'http://example.com/';
export * as e2 from 'http://example.com/';
import { _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.1/es/ttsclib.min.js";
