// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"umd"}
const a = _import_1(globalThis["a"], ["default"], "a", "globalThis.a", false).default;
const b = _import_1(globalThis["b"], ["default"], "b", "globalThis.b", false).default;
const { c: c2, d } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
const e = _import_1(globalThis["c.subpath"], [], "c/subpath", "globalThis.c.subpath", false);
const { c: _a, d: _b } = _import_1(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
export { _a as c, _b as d };
const _c = _import_1(globalThis["c"], [], "c", "globalThis.c", false);
export { _c as e };
const ts = _import_1(globalThis["typescript"], [], "typescript", "globalThis.typescript", false);
const ts2 = _import_1(globalThis["typescript.lib.typescriptServices"], [], "typescript/lib/typescriptServices", "globalThis.typescript.lib.typescriptServices", false);
console.log('Should run after all imports', a, b, c2, d, e, c2, ts, ts2);
"import \"d\" is eliminated because it expected to have no side effects in UMD transform.";
const c = 1;
const x = 1;
export { x };
import { _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.0/es/ttsclib.min.js";
