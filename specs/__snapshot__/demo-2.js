const React = __bindCheck(__esModuleCheck(globalThis.React), ["default"], "react", "globalThis.React").default;
const MUI = __bindCheck(__esModuleCheck(window.MaterialUI.core), [], "@material-ui/core", "window.MaterialUI.core");
const MUILab = __bindCheck(__esModuleCheck(window.MaterialUI.labs), [], "@material-ui/labs", "window.MaterialUI.labs");
import lodash from "https://cdn.pika.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc@latest/?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
function __bindCheck(value, name, path, mappedName) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`;
    if (value === undefined) {
        value = {};
        if (name.length === 0)
            console.warn(`${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`);
    }
    if (typeof value !== "object" || value === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof value}`);
    }
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return value;
}
function __esModuleCheck(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
