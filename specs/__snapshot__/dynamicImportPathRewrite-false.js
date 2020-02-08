Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
import(x);
__dynImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
function __dynImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
