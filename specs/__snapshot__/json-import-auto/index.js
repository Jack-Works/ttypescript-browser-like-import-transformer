const file = JSON.parse("{\n    \"json\": true\n}\n");
const file2 = __esModuleInterop_1(JSON.parse("{\n    \"json\": true\n}\n")).default;
const { json: b } = JSON.parse("{\n    \"json\": true\n}\n");
console.log('ns import', file);
console.log('default import', file2);
console.log('named import', b);
Promise.resolve(JSON.parse("{\n    \"json\": true\n}\n")).then((x) => console.log('Deterministic dynamic import', x));
__dynamicImportTransform_1(`./file${''}.json`, JSON.parse("{\"jsonImport\":true}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1).then((x) => console.log('Nondeterministic dynamic import', x));
function __dynamicImportNative_1(path, json) {
    if (json)
        return dynamicImportWithJSONHelper(json, import.meta);
    return import(path);
    function dynamicImportWithJSONHelper(json, meta) {
        const url = new URL(json, meta.url).toString();
        return fetch(url).then((x) => x.ok ? x.text() : Promise.reject(new TypeError(`Failed to fetch dynamically imported module: ${url}`))).then(JSON.parse);
    }
}
import { __esModuleInterop as __esModuleInterop_1, __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.2/es/runtime.min.js";
