const React = __UMDBindCheck(__esModuleInterop(globalThis.React), ["default"], "react", "globalThis.React", true).default;
export default function App() {
    return React.createElement("h1", null, "Hello world!");
}
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
function __esModuleInterop(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
}
