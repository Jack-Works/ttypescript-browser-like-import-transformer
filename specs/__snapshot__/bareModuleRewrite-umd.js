// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"bareModuleRewrite":"umd"}
const a = __UMDBindCheck(globalThis["a"], ["default"], "a", "globalThis.a", false).default;
const b = __UMDBindCheck(globalThis["b"], ["default"], "b", "globalThis.b", false).default;
const { c: c2, d } = __UMDBindCheck(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
const e = __UMDBindCheck(globalThis["c"], [], "c", "globalThis.c", false);
const { c_1, d_1 } = __UMDBindCheck(globalThis["b"], ["c", "d"], "b", "globalThis.b", false);
export { c_1 as c, d_1 as d };
const e_1 = __UMDBindCheck(globalThis["c"], [], "c", "globalThis.c", false);
export { e_1 as e };
console.log('Should run after all imports', a, b, c2, d, e, c2);
"import \"d\" is eliminated because it expected to have no side effects in UMD transform.";
const c = 1;
const x = 1;
export { x };
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.5/es/ttsclib.min.js";
