// CompilerOptions: {"module":"ESNext","esModuleInterop":true}
// PluginConfig: {"bareModuleRewrite":{"react":"umd","lodash-es":"pikacdn","async-call-rpc":"unpkg","std:fs":false,"isarray":"snowpack","/^@material-ui\\/(.+)/g":{"type":"umd","target":"MaterialUI.$1","globalObject":"window"},"/(.+)/g":"snowpack"}}
const React = __UMDBindCheck(__esModuleInterop(globalThis["React"]), ["default"], "react", "globalThis.React", true).default;
const MUI = __UMDBindCheck(window["MaterialUI.core"], [], "@material-ui/core", "window.MaterialUI.core", true);
const MUILab = __UMDBindCheck(window["MaterialUI.labs"], [], "@material-ui/labs", "window.MaterialUI.labs", true);
import lodash from "https://cdn.pika.dev/lodash-es";
import * as AsyncCall from "https://unpkg.com/async-call-rpc?module";
import fs from 'std:fs';
import isarray from "/web_modules/isarray.js";
import "/web_modules/other-polyfill.js";
console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab);
import { __esModuleInterop as __esModuleInterop, __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.1/es/ttsclib.min.js";
