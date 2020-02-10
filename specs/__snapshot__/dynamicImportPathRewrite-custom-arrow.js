import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
const __customImportHelper_1 = x => Promise
    .reject(x);
import { __customDynamicImportHelper as __customDynamicImportHelper } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
__customImportHelper_1(x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"x => Promise.reject(x)\"}}"), __dynamicImportNative, __UMDBindCheck));
__dynamicImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
function __dynamicImportNative(path) {
    return import(path);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
