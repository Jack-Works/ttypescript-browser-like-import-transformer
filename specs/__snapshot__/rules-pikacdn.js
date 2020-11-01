// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"pikacdn"}
console.log('Should run after all imports', a, b, c2, d, e, c2, ts, ts2);
// Node style import
import a from "https://cdn.skypack.dev/a";
import b, { c as c2, d } from "https://cdn.skypack.dev/b";
import * as e from "https://cdn.skypack.dev/c/subpath";
import "https://cdn.skypack.dev/d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://cdn.skypack.dev/b";
export * as e from "https://cdn.skypack.dev/c";
import * as ts from "https://cdn.skypack.dev/typescript@4.1.0-dev.20201004";
import * as ts2 from "https://cdn.skypack.dev/typescript@4.1.0-dev.20201004/lib/typescriptServices";
