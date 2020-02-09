const x = __UMDBindCheck(globalThis.MaterialUI.core, ["default"], "@material-ui/core", "globalThis.MaterialUI.core", false).default;
const i = __UMDBindCheck(globalThis.MaterialUI.icons, ["default"], "@material-ui/icons", "globalThis.MaterialUI.icons", false).default;
const y = __UMDBindCheck(globalThis.lodash, ["default"], "lodash", "globalThis.lodash", false).default;
import z from "https://unpkg.com/lodash-es@latest/?module";
import w from "/web_modules/other.js";
console.log(x, y, z, w, i);
function __UMDBindCheck(mod, bindings, path, mappedName, hasESModuleInterop) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`;
    const umdInvalid = `${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`;
    if (mod === undefined) {
        mod = {};
        if (bindings.length === 0) {
            console.warn(umdInvalid);
        }
    }
    if (typeof mod !== "object" || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof mod}`);
    }
    if (hasESModuleInterop && bindings.toString() === "default" && mod.default === undefined) {
        throw new SyntaxError(umdInvalid);
    }
    for (const i of bindings) {
        if (!Object.hasOwnProperty.call(mod, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return mod;
}
