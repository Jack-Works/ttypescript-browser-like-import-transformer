// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"jspm"}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from "https://jspm.dev/a";
import b, { c as c2, d } from "https://jspm.dev/b";
import * as e from "https://jspm.dev/c";
import "https://jspm.dev/d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://jspm.dev/b";
export * as e from "https://jspm.dev/c";
