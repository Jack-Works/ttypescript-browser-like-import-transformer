// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":{"type":"custom","function":"x => Promise.reject(x)"}}
const _a = // Static dynamic import
// Static dynamic import
x => Promise.reject(x);
// Static dynamic import
Promise.resolve(globalThis["a"]);
import("./a.js");
import('https://example.com');
// dynamic dynamic import
const y = '';
_a(y, __customDynamicImportHelper_1(__dynamicImportTransform_1, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"x => Promise.reject(x)\"}}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1));
// invalid dynamic import (invalid currently)
__dynamicImport2Ary_1("@magic-works/ttypescript-browser-like-import-transformer: Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched.", y, 'second argument');
// Static dynamic import
function __dynamicImportNative_1(path) {
    return import(path);
} //example.com')
// Static dynamic import
function __dynamicImport2Ary_1(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
import { __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1, __customDynamicImportHelper as __customDynamicImportHelper_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.3.0/es/ttsclib.min.js";
