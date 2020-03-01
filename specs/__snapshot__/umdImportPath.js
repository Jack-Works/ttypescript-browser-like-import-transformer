// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"bareModuleRewrite":{"/.+/":{"umdImportPath":"https://unpkg.com/$packageName$","type":"umd","target":"$umdName$"}}}
const React = __UMDBindCheck(globalThis["react2"], ["default"], "react2", "globalThis.react2", false).default;
const { a: b } = __UMDBindCheck(globalThis["react4"], ["a"], "react4", "globalThis.react4", false);
import "https://unpkg.com/react1";
import "https://unpkg.com/react2";
import "https://unpkg.com/react4";
Promise.resolve(globalThis["react3"], console.warn("@magic-works/ttypescript-browser-like-import-transformer: umdImportPath doesn't work for dynamic import. You must load it by yourself. Found config: https://unpkg.com/react3"));
console.log(React, b);
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.2/es/ttsclib.min.js";
