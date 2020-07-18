// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"safeAccess":false}
const x = _import((() => {
    throw new SyntaxError("@magic-works/ttypescript-browser-like-import-transformer: Invalid source text after transform: 0123");
})(), ["default"], "0123", "globalThis.0123", false).default;
throw new SyntaxError("@magic-works/ttypescript-browser-like-import-transformer: Failed to transform the path \"())\" to UMD import declaration.");
console.log(x, y);
import { _import as _import } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.1.2/es/ttsclib.min.js";
