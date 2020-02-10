import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.2.0/es/ttsclib.js";
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2);
// Node style import
import a from "https://cdn.pika.dev/a@latest";
import b, { c, d } from "https://cdn.pika.dev/b@latest";
import * as e from "https://cdn.pika.dev/c@latest";
import "https://cdn.pika.dev/d@latest";
// relative import without ext name
import a1 from "./a.js";
import b1, { c1, d1 } from "./b.js";
import * as e1 from "/c.js";
import "./d.js";
// browser style import
import a2 from 'http://example.com/';
import b2, { c2, d2 } from 'https://example.com';
import * as e2 from 'http://example.com/';
import 'http://example.com/';
const x = 1;
export { x };
// Node style export
export { c, d } from "https://cdn.pika.dev/b@latest";
export * as e from "https://cdn.pika.dev/c@latest";
// relative import without ext name
export { c1, d1 } from "./b.js";
export * as e1 from "./c.js";
// browser style import
export { c2, d2 } from 'http://example.com/';
export * as e2 from 'http://example.com/';
// Static dynamic import
import("https://cdn.pika.dev/a@latest");
import("./a.js");
import('https://example.com');
// dynamic dynamic import
const y = '';
__dynamicImportTransform(JSON.parse("{\"after\":true,\"bareModuleRewrite\":{\"enum\":\"pikacdn\",\"type\":\"simple\"}}"), y, __dynamicImportNative, __UMDBindCheck);
// invalid dynamic import (invalid currently)
__dynamicImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", y, 'second argument');
function __dynamicImportNative(path) {
    return import(path);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
