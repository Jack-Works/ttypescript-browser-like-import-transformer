function __importBindingCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
function __ttsc_importDefault(mod) {
    return (mod && mod
        .
            __esModule) ? mod : { "default": mod };
}
const ReactDOM = __importBindingCheck(__ttsc_importDefault(globalThis.ReactDOM), ["default"], "react-dom", "globalThis.ReactDOM").default;
import { App } from "./app.js";
ReactDOM.render(React.createElement(App, null), document.body);
