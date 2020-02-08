const x = __bindCheck(globalThis.MaterialUI.core, ["default"], "@material-ui/core", "globalThis.MaterialUI.core").default;
const i = __bindCheck(globalThis.MaterialUI.icons, ["default"], "@material-ui/icons", "globalThis.MaterialUI.icons").default;
const y = __bindCheck(globalThis.lodash, ["default"], "lodash", "globalThis.lodash").default;
import z from "https://unpkg.com/lodash-es@latest/?module";
import w from "/web_modules/other.js";
console.log(x, y, z, w, i);
function __bindCheck(value, name, path, mappedName) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`;
    if (value === undefined) {
        value = {};
        if (name.length === 0)
            console.warn(`${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`);
    }
    if (typeof value !== "object" || value === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof value}`);
    }
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return value;
}
