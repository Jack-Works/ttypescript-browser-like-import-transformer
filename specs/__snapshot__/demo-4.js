// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":{"type":"custom","function":"async (path, defaultImpl) => { return await defaultImpl(path) }"}}
const __customImportHelper = async (path, defaultImpl) => { return await defaultImpl(path); };
__customImportHelper('react' + x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"async (path, defaultImpl) => { return await defaultImpl(path) }\"}}"), __dynamicImportNative, _import, moduleSpecifierTransform));
function __dynamicImportNative(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform, _import as _import, moduleSpecifierTransform as moduleSpecifierTransform, __customDynamicImportHelper as __customDynamicImportHelper } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.3.0/es/ttsclib.min.js";
