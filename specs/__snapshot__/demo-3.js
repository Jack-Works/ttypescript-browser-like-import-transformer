// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":{"type":"custom","function":"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))"}}
const __customImportHelper = (path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}));
__customImportHelper('react' + x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))\"}}"), __dynamicImportNative, _import, moduleSpecifierTransform));
function __dynamicImportNative(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform, _import as _import, moduleSpecifierTransform as moduleSpecifierTransform, __customDynamicImportHelper as __customDynamicImportHelper } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.1.2/es/ttsclib.min.js";
