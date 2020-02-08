function __dynamicImportTransformFailedHelper2(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
import(x);
__dynamicImportTransformFailedHelper2("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
