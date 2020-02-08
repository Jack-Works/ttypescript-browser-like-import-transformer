function __bindCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
const x = __bindCheck(globalThis.MaterialUI.core, ["default"], "@material-ui/core", "globalThis.MaterialUI.core").default;
const i = __bindCheck(globalThis.MaterialUI.icons, ["default"], "@material-ui/icons", "globalThis.MaterialUI.icons").default;
const y = __bindCheck(globalThis.lodash, ["default"], "lodash", "globalThis.lodash").default;
import z from "https://unpkg.com/lodash-es@latest/?module";
import w from "/web_modules/other.js";
console.log(x, y, z, w, i);
