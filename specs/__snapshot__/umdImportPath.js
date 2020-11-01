// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":{"/.+/":{"umdImportPath":"https://unpkg.com/$packageName$","type":"umd","target":"$umdName$"}}}
const React = _import_1(globalThis["react2"], ["default"], "react2", "globalThis.react2", false).default;
const { a: b } = _import_1(globalThis["react4"], ["a"], "react4", "globalThis.react4", false);
import "https://unpkg.com/react1";
import "https://unpkg.com/react2";
import "https://unpkg.com/react4";
console.warn("@magic-works/ttypescript-browser-like-import-transformer: umdImportPath doesn't work for dynamic import. You must load it by yourself. Found config: https://unpkg.com/react3"), Promise.resolve(globalThis["react3"]);
console.log(React, b);
import { _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.0/es/ttsclib.min.js";
