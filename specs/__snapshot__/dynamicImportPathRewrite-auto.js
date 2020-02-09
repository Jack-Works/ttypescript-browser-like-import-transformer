import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js";
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
__dynamicImportTransform(JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":\"auto\"}"), x, __dynamicImportNative, __UMDBindCheck);
__dynamicImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
function __dynamicImportNative(path) {
    return import(path);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
