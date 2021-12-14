// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"jsdelivr"}
console.log('Should run after all imports', a, b, c2, d, e, c2, ts, ts2);
// Node style import
import a from "https://cdn.jsdelivr.net/a";
import b, { c as c2, d } from "https://cdn.jsdelivr.net/b";
import * as e from "https://cdn.jsdelivr.net/c/subpath";
import "https://cdn.jsdelivr.net/d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://cdn.jsdelivr.net/b";
export * as e from "https://cdn.jsdelivr.net/c";
import * as ts from "https://cdn.jsdelivr.net/typescript@4.5.4";
import * as ts2 from "https://cdn.jsdelivr.net/typescript@4.5.4/lib/typescriptServices";
