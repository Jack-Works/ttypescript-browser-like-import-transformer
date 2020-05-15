import * as file from "./file.json.js";
import file2 from "./file.json.js";
import { json as b } from "./file.json.js";
console.log('ns import', file);
console.log('default import', file2);
console.log('named import', b);
import("./file.json.js").then((x) => console.log('Deterministic dynamic import', x));
__dynamicImportTransform(`./file${''}.json`, JSON.parse("{}"), __dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform).then((x) => console.log('Nondeterministic dynamic import', x));
function __dynamicImportNative(path) {
    return import(path);
}
import { __dynamicImportTransform as __dynamicImportTransform, __UMDBindCheck as __UMDBindCheck, moduleSpecifierTransform as moduleSpecifierTransform } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.1.2/es/ttsclib.min.js";
