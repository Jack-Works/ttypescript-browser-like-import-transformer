const React = __UMDBindCheck(__esModuleInterop(globalThis.React), ["default"], "react", "globalThis.React", true).default;
const MUI = __UMDBindCheck(window.MaterialUI.core, [], "@material-ui/core", "window.MaterialUI.core", true);
const MUILab = __UMDBindCheck(window.MaterialUI.labs, [], "@material-ui/labs", "window.MaterialUI.labs", true);
import lodash from "https://cdn.pika.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc@latest/?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
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
    return mod && mod.
        __esModule ? mod : { default: mod };
}
