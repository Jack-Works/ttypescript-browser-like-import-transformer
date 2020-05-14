// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"snowpack"}
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2);
// Node style import
import a from "/web_modules/a.js";
import b, { c, d } from "/web_modules/b.js";
import * as e from "/web_modules/c.js";
import "/web_modules/d.js";
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
export { c, d } from "/web_modules/b.js";
export * as e from "/web_modules/c.js";
// relative import without ext name
export { c1, d1 } from "./b.js";
export * as e1 from "./c.js";
// browser style import
export { c2, d2 } from 'http://example.com/';
export * as e2 from 'http://example.com/';
