import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
const __customImportHelper_1 = (path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}));
import { __customDynamicImportHelper as __customDynamicImportHelper } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
__customImportHelper_1('react' + x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))\"}}"), __dynamicImportNative, __UMDBindCheck));
function __dynamicImportNative(path) {
    return import(path);
}
