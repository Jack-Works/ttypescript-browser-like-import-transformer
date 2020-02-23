// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"importHelpers":"auto"}
import { __dynamicImportTransform as __dynamicImportTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
import { moduleSpecifierTransform as moduleSpecifierTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@1.4.1/es/ttsclib.min.js";
__dynamicImportTransform(x, JSON.parse("{\"after\":true,\"importHelpers\":\"auto\"}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform);
function __dynamicImportNative(path) {
    return import(path);
}
