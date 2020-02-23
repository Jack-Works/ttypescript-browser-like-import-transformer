// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"bareModuleRewrite":false}
console.log('Should run after all imports', a, b, c2, d, e, c2);
// Node style import
import a from 'a';
import b, { c as c2, d } from 'b';
import * as e from 'c';
import 'd';
const c = 1;
const x = 1;
export { x };
// Node style export
export { c, d } from 'b';
export * as e from 'c';
