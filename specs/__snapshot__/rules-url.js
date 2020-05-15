// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":{"type":"url","withVersion":"std:$packageName$@$version$","noVersion":"std:$packageName$"}}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from "std:a";
import b, { c as c2, d } from "std:b";
import * as e from "std:c";
import "std:d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "std:b";
export * as e from "std:c";
