// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":{"type":"custom","function":"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))"}}
const __customImportHelper = (path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}));
__customImportHelper('react' + x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))\"}}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform));
function __dynamicImportNative(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform, __UMDBindCheck as __UMDBindCheck, moduleSpecifierTransform as moduleSpecifierTransform, __customDynamicImportHelper as __customDynamicImportHelper } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.2/es/ttsclib.min.js";
