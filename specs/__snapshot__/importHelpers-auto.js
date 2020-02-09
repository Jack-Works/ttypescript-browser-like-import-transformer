import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js";
const __customImportHelper_1 = (x, y) => y(x);
import { __customDynamicImportHelper as __customDynamicImportHelper } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js";
__customImportHelper_1(x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"importHelpers\":\"auto\",\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(x, y) => y(x)\"}}"), __dynamicImportNative, __UMDBindCheck));
function __dynamicImportNative(path) {
    return import(path);
}
