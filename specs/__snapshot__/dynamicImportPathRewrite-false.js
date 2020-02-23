// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":false}
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
import(x);
__dynamicImport2Ary("@magic-works/ttypescript-browser-like-import-transformer: Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched.", x, 'y');
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
