function __bindCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
function __esModuleCheck(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
const React = __bindCheck(__esModuleCheck(globalThis.React), ["default"], "react", "globalThis.React").default;
const { useState } = __bindCheck(__esModuleCheck(globalThis.React), ["useState"], "react", "globalThis.React");
export function Comp() {
    const [s, sS] = useState('');
    return React.createElement("h1", null,
        "Hello, world ",
        s);
}
