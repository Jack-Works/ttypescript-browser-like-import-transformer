<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [config](./config.md) &gt; [RewriteRulesUMD](./config.rewriterulesumd.md)

## RewriteRulesUMD interface

Rewrite module to a UMD access

<b>Signature:</b>

```typescript
export interface RewriteRulesUMD 
```

## Example


```json
{ "type": "umd", target: "mylib", globalObject: "window" }

```

```ts
/// { rules: { "/@material-ui\\/(.+)/": {type: "umd", target: "MaterialUI.$1"}, "lodash": "umd", "jquery": "pikacdn", "lodash-es": "unpkg", "/.+/": "snowpack" } }

import x from '@material-ui/core'
import i from '@material-ui/icons'
import y from 'lodash'
import z from 'lodash-es'
import w from 'other'
console.log(x, y, z, w, i)

```
Output:

```js
// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"rules":{"/@material-ui\\/(.+)/":{"type":"umd","target":"MaterialUI.$1"},"lodash":"umd","jquery":"pikacdn","lodash-es":"unpkg","/.+/":"snowpack"}}
const x = __UMDBindCheck(globalThis["MaterialUI.core"], ["default"], "@material-ui/core", "globalThis.MaterialUI.core", false).default;
const i = __UMDBindCheck(globalThis["MaterialUI.icons"], ["default"], "@material-ui/icons", "globalThis.MaterialUI.icons", false).default;
const y = __UMDBindCheck(globalThis["lodash"], ["default"], "lodash", "globalThis.lodash", false).default;
import z from "https://unpkg.com/lodash-es?module";
import w from "/web_modules/other.js";
console.log(x, y, z, w, i);
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.6/es/ttsclib.min.js";

```
This option also support treeshake.

```json
{
    "compilerOptions": {
        "plugins": [
            {
                // @magic-works/ttypescript-browser-like-import-transformer
                "transform": "../../../cjs/node.js",
                "after": true,
                "rules": {
                    "/(.+)/": {
                        "type": "umd",
                        "target": "dependencies",
                        "treeshake": {
                            "out": "./deps.js"
                        }
                    }
                }
            }
        ],
        "target": "ESNext",
        "module": "ESNext",
        "outDir": "./dist",
        "rootDir": "./src",
        "moduleResolution": "node"
    }
}

```

```ts
import { a, b as c } from '1'
import * as d from '2'
console.log(a, c, d)
import '3'
export * from '4'
export * as e from '5'
export { x, y, z } from '6'

```
Output:

```js
const { a, b: c } = __UMDBindCheck(dependencies["1"], ["a", "b"], "1", "dependencies.1", false);
const d = __UMDBindCheck(dependencies["2"], [], "2", "dependencies.2", false);
const e_1 = __UMDBindCheck(dependencies["5"], [], "5", "dependencies.5", false);
export { e_1 as e };
const { x_1, y_1, z_1 } = __UMDBindCheck(dependencies["6"], ["x", "y", "z"], "6", "dependencies.6", false);
export { x_1 as x, y_1 as y, z_1 as z };
console.log(a, c, d);
"import \"3\" is eliminated because it expected to have no side effects in UMD transform.";
"import \"4\" is eliminated because it expected to have no side effects in UMD transform.";
import { __UMDBindCheck as __UMDBindCheck } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.6/es/ttsclib.min.js";

```
Extra file: (Therefore you can feed this file to Webpack / Rollup and get treeshaked.)

```js
const _ = new Map();
import { a as _1, b as _2 } from "1";
_.set("1", createESModuleInterop({ a: _1, b: _2 }));
import * as _3 from "2";
_.set("2", _3);
import "3";
import * as _4 from "4";
_.set("4", _4);
import * as _5 from "5";
_.set("5", _5);
import { x as _6, y as _7, z as _8 } from "6";
_.set("6", createESModuleInterop({ x: _6, y: _7, z: _8 }));
export default (function createExport() {
            return new Proxy(_, {
                get(target, key) {
                    return target.get(key);
                },
            });
        })();
function createESModuleInterop(x) {
            if (typeof x !== 'object' || x === null)
                return { default: x, __esModule: true };
            return new Proxy(x, {
                get(target, key) {
                    const v = target[key];
                    if (v)
                        return v;
                    if (key === '__esModule')
                        return true;
                    return undefined;
                },
            });
        };

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [globalObject](./config.rewriterulesumd.globalobject.md) | <code>string</code> | When using UMD import, this option indicates what global object will be used to find the UMD variables. |
|  [target](./config.rewriterulesumd.target.md) | <code>string</code> | Rewrite the matching import statement to specified global variable |
|  [treeshake](./config.rewriterulesumd.treeshake.md) | <code>{</code><br/><code>        out: string</code><br/><code>    }</code> |  |
|  [type](./config.rewriterulesumd.type.md) | <code>'umd'</code> |  |
|  [umdImportPath](./config.rewriterulesumd.umdimportpath.md) | <code>string</code> | should be a URL. Will use a <code>import 'umdImportPath'</code> to load the UMD then deconstruct from it. |
