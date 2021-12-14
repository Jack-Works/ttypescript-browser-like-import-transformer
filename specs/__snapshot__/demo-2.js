// CompilerOptions: {"module":"ESNext","esModuleInterop":true}
// PluginConfig: {"rules":{"react":"umd","lodash-es":"pikacdn","async-call-rpc":"unpkg","std:fs":false,"isarray":"snowpack","/^@material-ui\\/(.+)/g":{"type":"umd","target":"MaterialUI.$1","globalObject":"window"},"/(.+)/g":"snowpack"}}
const React = _import_1(__esModuleInterop_1(globalThis["React"]), ["default"], "react", "globalThis.React", true).default;
const MUI = _import_1(window["MaterialUI.core"], [], "@material-ui/core", "window.MaterialUI.core", true);
const MUILab = _import_1(window["MaterialUI.labs"], [], "@material-ui/labs", "window.MaterialUI.labs", true);
import lodash from "https://cdn.skypack.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
import { __esModuleInterop as __esModuleInterop_1, _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.1/es/ttsclib.min.js";
