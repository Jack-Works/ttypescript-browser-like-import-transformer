const React = __bindCheck(__esModuleCheck(globalThis.React), ["default"], "react", "globalThis.React").default;
export default function App() {
    return React.createElement("h1", null, "Hello world!");
}
function __bindCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
function __esModuleCheck(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod
    };
}
