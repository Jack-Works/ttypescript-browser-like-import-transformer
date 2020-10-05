import * as file from "./file.json.js";
import file2 from "./file.json.js";
import { json as b } from "./file.json.js";
console.log('ns import', file);
console.log('default import', file2);
console.log('named import', b);
import("./file.json.js").then((x) => console.log('Deterministic dynamic import', x));
__dynamicImportTransform_1(`./file${''}.json`, JSON.parse("{}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1).then((x) => console.log('Nondeterministic dynamic import', x));
function __dynamicImportNative_1(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform_1, _import as _import_1, moduleSpecifierTransform as moduleSpecifierTransform_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.3.0/es/ttsclib.min.js";
