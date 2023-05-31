// CompilerOptions: {"module":"ESNext","esModuleInterop":true}
// PluginConfig: {"rules":{"react":"umd","lodash-es":"skypack","async-call-rpc":"unpkg","std:fs":false,"isarray":"unpkg","/^@material-ui\\/(.+)/g":{"type":"umd","target":"MaterialUI.$1","globalObject":"window"},"/(.+)/g":"unpkg"}}
const React = _import_1(__esModuleInterop_1(globalThis["React"]), ["default"], "react", "globalThis.React", true).default;
const MUI = _import_1(window["MaterialUI.core"], [], "@material-ui/core", "window.MaterialUI.core", true);
const MUILab = _import_1(window["MaterialUI.labs"], [], "@material-ui/labs", "window.MaterialUI.labs", true);
import lodash from "https://cdn.skypack.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc?module";
import fs from 'std:fs';
import isarray from "https://unpkg.com/isarray?module";
import "https://unpkg.com/other-polyfill?module";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
import { __esModuleInterop as __esModuleInterop_1, _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@4.0.0/es/runtime.min.js";
