function __ttsc_importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod
    };
}
const React = __ttsc_importDefault(globalThis.react).default;
const { useState } = __ttsc_importDefault(globalThis.react);
export function Comp() {
    const [s, sS] = useState('');
    return React.createElement("h1", null,
        "Hello, world ",
        s);
}
