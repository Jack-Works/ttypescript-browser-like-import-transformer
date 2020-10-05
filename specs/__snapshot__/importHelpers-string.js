// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"importHelpers":"/polyfill/ttsc-helper.js","dynamicImportPathRewrite":{"type":"custom","function":"(x, y) => y(x)"}}
const __customImportHelper_1 = (x, y) => y(x);
__customImportHelper_1(x, __customDynamicImportHelper_1(__dynamicImportTransform_1, JSON.parse("{\"after\":true,\"importHelpers\":\"/polyfill/ttsc-helper.js\",\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(x, y) => y(x)\"}}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1));
function __dynamicImportNative_1(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1, __customDynamicImportHelper as __customDynamicImportHelper_1 } from "/polyfill/ttsc-helper.js";
