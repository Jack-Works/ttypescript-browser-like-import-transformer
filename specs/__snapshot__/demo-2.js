function __ttsc_importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
const React = __ttsc_importDefault(globalThis.react).default;
const MUI = __ttsc_importDefault(window.MaterialUI.core);
const MUILab = __ttsc_importDefault(window.MaterialUI.labs);
import lodash from "https://cdn.pika.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc@latest/?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
