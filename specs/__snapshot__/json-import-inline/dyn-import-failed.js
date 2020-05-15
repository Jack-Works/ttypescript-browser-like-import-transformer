// @ts-ignore
__dynamicImportTransform('./not-found.json', JSON.parse("{\"jsonImport\":\"inline\"}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform).then(console.log, console.error);
// @ts-ignore
__dynamicImportTransform('https://raw.githubusercontent.com/angular/angular-cli/master/packages/angular/cli/lib/config/schema.json', JSON.parse("{\"jsonImport\":\"inline\"}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform).then(console.log, console.error);
// @ts-ignore
function __dynamicImportNative(path, json) {
    if (json)
        return dynamicImportWithJSONHelper(json, import.meta);
    return import(path);
    function dynamicImportWithJSONHelper(json, meta) {
        const url = new URL(json, meta.url).toString();
        return fetch(url).then((x) => x.ok ? x.text() : Promise.reject(new TypeError(`Failed to fetch dynamically imported module: ${url}`))).then(JSON.parse);
    }
}
import { __dynamicImportTransform as __dynamicImportTransform, __UMDBindCheck as __UMDBindCheck, moduleSpecifierTransform as moduleSpecifierTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.1.2/es/ttsclib.min.js";
