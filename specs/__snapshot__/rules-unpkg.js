// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"unpkg"}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from "https://unpkg.com/a?module";
import b, { c as c2, d } from "https://unpkg.com/b?module";
import * as e from "https://unpkg.com/c?module";
import "https://unpkg.com/d?module";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://unpkg.com/b?module";
export * as e from "https://unpkg.com/c?module";
