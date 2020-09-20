// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":{"/@material-ui\\/(.+)/":{"type":"umd","target":"MaterialUI.$1"},"lodash":"umd","jquery":"pikacdn","lodash-es":"unpkg","/.+/":"snowpack"}}
const x = _import(globalThis["MaterialUI.core"], ["default"], "@material-ui/core", "globalThis.MaterialUI.core", false).default;
const i = _import(globalThis["MaterialUI.icons"], ["default"], "@material-ui/icons", "globalThis.MaterialUI.icons", false).default;
const y = _import(globalThis["lodash"], ["default"], "lodash", "globalThis.lodash", false).default;
import z from "https://unpkg.com/lodash-es?module";
import w from "/web_modules/other.js";
console.log(x, y, z, w, i);
import { _import as _import } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.3.0/es/ttsclib.min.js";
