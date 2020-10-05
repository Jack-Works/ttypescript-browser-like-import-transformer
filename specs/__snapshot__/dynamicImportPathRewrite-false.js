// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"dynamicImportPathRewrite":false}
// Static dynamic import
Promise.resolve(globalThis["a"]);
import("./a.js");
import('https://example.com');
// dynamic dynamic import
const y = '';
import(y);
// invalid dynamic import (invalid currently)
__dynamicImport2Ary_1("@magic-works/ttypescript-browser-like-import-transformer: Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched.", y, 'second argument');
// Static dynamic import
function __dynamicImport2Ary_1(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
