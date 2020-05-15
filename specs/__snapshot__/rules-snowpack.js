// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"snowpack"}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from "/web_modules/a.js";
import b, { c as c2, d } from "/web_modules/b.js";
import * as e from "/web_modules/c.js";
import "/web_modules/d.js";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "/web_modules/b.js";
export * as e from "/web_modules/c.js";
