// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {}
import { __dynamicImportTransform as __dynamicImportTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
import { moduleSpecifierTransform as moduleSpecifierTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
__dynamicImportTransform(x, JSON.parse("{\"after\":true}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform);
__dynamicImport2Ary("@magic-works/ttypescript-browser-like-import-transformer: Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched.", x, 'y');
function __dynamicImportNative(path) {
    return import(path);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
