// @ts-ignore
__dynamicImportTransform_1('./not-found.json', JSON.parse("{\"jsonImport\":\"inline\"}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1).then(console.log, console.error);
// @ts-ignore
__dynamicImportTransform_1('https://raw.githubusercontent.com/angular/angular-cli/master/packages/angular/cli/lib/config/schema.json', JSON.parse("{\"jsonImport\":\"inline\"}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1).then(console.log, console.error);
// @ts-ignore
function __dynamicImportNative_1(path, json) {
    if (json)
        return dynamicImportWithJSONHelper(json, import.meta);
    return import(path);
    function dynamicImportWithJSONHelper(json, meta) {
        const url = new URL(json, meta.url).toString();
        return fetch(url).then((x) => x.ok ? x.text() : Promise.reject(new TypeError(`Failed to fetch dynamically imported module: ${url}`))).then(JSON.parse);
    }
}
import { __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.0/es/ttsclib.min.js";
