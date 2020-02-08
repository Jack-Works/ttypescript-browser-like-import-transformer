function __importBindingCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty
            .call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
function __ttsc_importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
const React = __importBindingCheck(__ttsc_importDefault(globalThis.React), ["default"], "react", "globalThis.React").default;
const MUI = __ttsc_importDefault(window.MaterialUI.core);
const MUILab = __ttsc_importDefault(window.MaterialUI.labs);
import lodash from "https://cdn.pika.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc@latest/?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
