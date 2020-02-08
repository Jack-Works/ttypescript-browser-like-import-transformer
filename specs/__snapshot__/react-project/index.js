const ReactDOM = __bindCheck(__esModuleCheck(globalThis.ReactDOM), ["default"], "react-dom", "globalThis.ReactDOM").default;
import { App } from "./app.js";
ReactDOM.render(React.createElement(App, null), document.body);
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
function __esModuleCheck(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
