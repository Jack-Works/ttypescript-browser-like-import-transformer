// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"esm.run"}
console.log('Should run after all imports', a, b, c2, d, e, c2, ts, ts2);
// Node style import
import a from "https://esm.run/a";
import b, { c as c2, d } from "https://esm.run/b";
import * as e from "https://esm.run/c/subpath";
import "https://esm.run/d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://esm.run/b";
export * as e from "https://esm.run/c";
import * as ts from "https://esm.run/typescript@4.1.0-dev.20201004";
import * as ts2 from "https://esm.run/typescript@4.1.0-dev.20201004/lib/typescriptServices";
