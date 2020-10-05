// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"umd"}
const a = _import_1(globalThis["a"], ["default"], "a", "globalThis.a", false).default;
const b = _import_1(globalThis["b"], ["default"], "b", "globalThis.b", false).default;
const { c: c2, d } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
const e = _import_1(globalThis["c"], [], "c", "globalThis.c", false);
const { c: c_1, d: d_1 } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
export { c_1 as c, d_1 as d };
const e_1 = _import_1(globalThis["c"], [], "c", "globalThis.c", false);
export { e_1 as e };
console.log('Should run after all imports', a, b, c2, d, e, c2);
"import \"d\" is eliminated because it expected to have no side effects in UMD transform.";
const c = 1;
const x = 1;
export { x };
import { _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.3.0/es/ttsclib.min.js";
