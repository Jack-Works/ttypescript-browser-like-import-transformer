// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":{"type":"custom","function":"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))"}}
const _a = (path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}));
_a('react' + x, __customDynamicImportHelper_1(__dynamicImportTransform_1, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))\"}}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1));
function __dynamicImportNative_1(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1, __customDynamicImportHelper as __customDynamicImportHelper_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.2/es/runtime.min.js";
