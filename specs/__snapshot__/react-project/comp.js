const React = _import_1(__esModuleInterop_1(globalThis["React"]), ["default"], "react", "globalThis.React", true).default;
const { useState } = _import_1(globalThis["React"], ["useState"], "react", "globalThis.React", true);
export function Comp() {
    const [s, sS] = useState('');
    return React.createElement("h1", null,
        "Hello, world ",
        s);
}
import { __esModuleInterop as __esModuleInterop_1, _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@4.0.0/es/runtime.min.js";
