function __ttsc_importDefault(mod) {
    return (mod && mod
        .
            __esModule) ? mod : { "default": mod };
}
const ReactDOM = __ttsc_importDefault(globalThis.reactDom).default;
import { App } from "./app.js";
ReactDOM.render(React.createElement(App, null), document.body);
