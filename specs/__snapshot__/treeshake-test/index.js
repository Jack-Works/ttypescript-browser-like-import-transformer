const { a, b: c } = __UMDBindCheck(dependencies["1"], ["a", "b"], "1", "dependencies.1", false);
const d = __UMDBindCheck(dependencies["2"], [], "2", "dependencies.2", false);
const e_1 = __UMDBindCheck(dependencies["5"], [], "5", "dependencies.5", false);
export { e_1 as e };
const { x: x_1, y: y_1, z: z_1 } = __UMDBindCheck(dependencies["6"], ["x", "y", "z"], "6", "dependencies.6", false);
export { x_1 as x, y_1 as y, z_1 as z };
console.log(a, c, d);
"import \"3\" is eliminated because it expected to have no side effects in UMD transform.";
"import \"4\" is eliminated because it expected to have no side effects in UMD transform.";
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.1.2/es/ttsclib.min.js";
