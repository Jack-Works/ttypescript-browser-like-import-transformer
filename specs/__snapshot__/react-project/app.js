const React = _import_1(__esModuleInterop_1(globalThis["React"]), ["default"], "react", "globalThis.React", true).default;
const { useState } = _import_1(globalThis["React"], ["useState"], "react", "globalThis.React", true);
import { Comp } from "./comp.js";
export function App() {
    const [s, sS] = useState('');
    return (React.createElement("h1", null,
        "Hello, world ",
        s,
        React.createElement(Comp, null)));
}
import { __esModuleInterop as __esModuleInterop_1, _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.2/es/ttsclib.min.js";
