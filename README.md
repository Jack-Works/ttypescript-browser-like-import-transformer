<h2 align="center">Emit a ES Module Web project by only <sup>t</sup>typescript</h2>

<p align="center">
  <a href="https://www.npmjs.com/package/@magic-works/ttypescript-browser-like-import-transformer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@magic-works/ttypescript-browser-like-import-transformer.svg?style=flat-square"></a>
</p>

Jump to [Install](#install), [Use cases](#use-cases), [Motivation](#motivation), or [Documentation of options](https://jack-works.github.io/ttypescript-browser-like-import-transformer/config.pluginconfigs.html)

## Intro

This typescript transformer helps you to emit a browser compatible ESModule output. In general, it does two things:

1. Add a ".js" after the local import
1. Transform the node style dependencies (e.g. `import React from "react"`) to
    1. A global variable access (`const React = globalThis.React`)
    1. A CDN (`import _ from "https://cdn.skypack.dev/lodash-es@4.17.15"`)
    1. Another CDN (`import _ from "https://unpkg.com/lodash-es@4.17.15?module"`)
    1. [Snowpack](https://www.snowpack.dev/) style import (`import _ from "/web_modules/lodash-es.js"`)
    1. **\[🧪Experimental\]** Read import rule from [Import Map](https://github.com/WICG/import-maps)

### Input

```js
import './polyfill'
import * as React from 'react'
```

### Output

<!-- prettier-ignore -->
```js
const React = _import(globalThis["React"], [], "react", "globalThis.React", false);
import "./polyfill.js";
import { _import as _import } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@2.0.6/es/ttsclib.min.js";
```

## Install

1. Install `typescript` and `ttypescript`, and this transformer into your project if you don't already have them.

    ```
    npm install --save-dev typescript
    npm install --save-dev ttypescript
    npm install --save-dev @magic-works/ttypescript-browser-like-import-transformer
    ```

1. You should use ESModule like target (`es2015`, `esnext`, etc) in your compiler options
    ```jsonc
    // tsconfig.json
    {
        "compilerOptions": {
            "module": "es2015",
            "plugins": [
                {
                    "transform": "@magic-works/ttypescript-browser-like-import-transformer",
                    "after": true
                    // Configs go here.
                }
            ]
        }
    }
    ```
1. Write some typescript with normal imports
    ```typescript
    import React from 'react'
    ```
1. Compile using `ttsc`

    ```
    ttsc --project tsconfig.json
    ```

## Use cases

### Use with classic UMD dependencies

The default config of this transformer is "UMD" mode. All bare imports will be translated to a "UMD import". (e.g. `import React from "react"` becomes `const React = globalThis.React`). Then add a regular script tag to load React UMD.

### Use with Webpack

Here is [a template repo](https://github.com/Jack-Works/ttsc-browser-import-template) to help you use this transformer with Webpack. In this repo, all node style import is imported in [a single file](https://github.com/Jack-Works/ttsc-browser-import-template/blob/master/dependencies.js) and packed by Webpack. The rest of the source code never gets handled by Webpack but emitted by [ttypescript](https://github.com/cevek/ttypescript) (an enhanced typescript cli that allows you to specify transformer programmatically).

### Use with Snowpack

See the **TTypeScript Support** in the [Importing Packages by Name](https://www.snowpack.dev/#importing-packages-by-name) section.

```jsonc
/* tsconfig.json */
{
    "compilerOptions": {
        "module": "es2015",
        "plugins": [
            {
                "transform": "@magic-works/ttypescript-browser-like-import-transformer",
                "after": true,
                "rules": "snowpack"
            }
        ]
    }
}
```

### Use with CDN

[Skypack CDN](https://www.skypack.dev/) and [unpkg](https://unpkg.com/#query-params) are two CDNs that friendly to ES Module dependencies. This transformer also supports CDN import. (e.g. Before `import _ from 'lodash-es'` After `import _ from 'https://cdn.skypack.dev/lodash-es'`)

```jsonc
/* tsconfig.json */
{
    "compilerOptions": {
        "module": "es2015",
        "plugins": [
            {
                "transform": "@magic-works/ttypescript-browser-like-import-transformer",
                "after": true,
                "rules": "skypack" // or "unpkg"
            }
        ]
    }
}
```

## Motivation

Nowadays most of the codes in our codebase are ESModules. You can emit browser executable JS files by `tsc` directly but you have to add the annoying `.js` extension to the end. (Related: [PR: New --emitExtension and --noImplicitExtensionName compiler options](https://github.com/microsoft/TypeScript/pull/35148))

On the other hand, it is hard to run ES Module codes with Node style dependencies, there're some solutions to this including [Snowpack](https://www.snowpack.dev/) but Snowpack also has its limits.

## Options

See [Options](https://jack-works.github.io/ttypescript-browser-like-import-transformer/config.pluginconfigs.html)

## Use programmatically

If you are using Node.js, import `@magic-works/ttypescript-browser-like-import-transformer/cjs/node.js`, it will export a `ts.TransformerFactory<SourceFile>`.

If you are in another environment or you want to modify the behavior of the transformer, use `./es/core.js` and provide related I/O operations to create a `ts.TransformerFactory<SourceFile>`.

Once you get the `ts.TransformerFactory<SourceFile>`, you can use it like

```ts
const result = ts.transpileModule(source, {
    compilerOptions,
    transformers: {
        after: [
            transformer.default(
                {}, // Should be a Program but not used today.
                {
                    after: true,
                    // config here
                },
            ),
        ],
    },
})
```
