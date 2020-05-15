// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":"pikacdn"}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from "https://cdn.pika.dev/a";
import b, { c as c2, d } from "https://cdn.pika.dev/b";
import * as e from "https://cdn.pika.dev/c";
import "https://cdn.pika.dev/d";
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from "https://cdn.pika.dev/b";
export * as e from "https://cdn.pika.dev/c";
