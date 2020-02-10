import { __dynamicImportTransform as __dynamicImportTransform } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.3.0/es/ttsclib.js";
import { __UMDBindCheck as __UMDBindCheck } from "https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.3.0/es/ttsclib.js";
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2);
// Node style import
import a from 'a';
import b, { c, d } from 'b';
import * as e from 'c';
import 'd';
// relative import without ext name
import a1 from './a';
import b1, { c1, d1 } from './b';
import * as e1 from '/c';
import './d';
// browser style import
import a2 from 'http://example.com/';
import b2, { c2, d2 } from 'https://example.com';
import * as e2 from 'http://example.com/';
import 'http://example.com/';
const x = 1;
export { x };
// Node style export
export { c, d } from 'b';
export * as e from 'c';
// relative import without ext name
export { c1, d1 } from './b';
export * as e1 from './c';
// browser style import
export { c2, d2 } from 'http://example.com/';
export * as e2 from 'http://example.com/';
// Static dynamic import
import('a');
import('./a');
import('https://example.com');
// dynamic dynamic import
const y = '';
__dynamicImportTransform(JSON.parse("{\"after\":true,\"bareModuleRewrite\":{\"type\":\"noop\"}}"), y, __dynamicImportNative, __UMDBindCheck);
// invalid dynamic import (invalid currently)
__dynamicImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", y, 'second argument');
function __dynamicImportNative(path) {
    return import(path);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
