// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"bareModuleRewrite":{"/@material-ui\\/(.+)/":{"type":"umd","target":"MaterialUI.$1"},"lodash":"umd","jquery":"pikacdn","/lodash-es/":"unpkg","/.+/":"snowpack"}}
const a = __UMDBindCheck(globalThis.MaterialUI.core, ["default"], "@material-ui/core", "globalThis.MaterialUI.core", false).default;
const x = __UMDBindCheck((() => {
    throw new SyntaxError("@magic-works/ttypescript-browser-like-import-transformer: Invalid source text after transform: MaterialUI.core/abc");
})(), ["default"], "@material-ui/core/abc", "globalThis.MaterialUI.core/abc", false).default;
import y from "/web_modules/lodash/fp.js";
import z from "https://unpkg.com/lodash-es?module";
import "https://unpkg.com/lodash-es/oaoao?module";
import p from "/web_modules/@jsenv/import-map/src.js";
import w from "/web_modules/@jsenv/import-map.js";
console.log(a, x, y, z, w, p);
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.5.0/es/ttsclib.min.js";
