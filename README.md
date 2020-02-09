# ttypescript-browser-like-import-transformer

A custom transformer that can be used with ttypescript to transform ts imports to browser style imports

Treat your import like:

Before

```ts
import React from 'react'
import * as AsyncCall from 'async-call-rpc'
import isarray from 'isarray'
```

After

```ts
const React = __bindCheck(__esModuleCheck(globalThis.React), ['default'], 'react', 'globalThis.React').default
import * as AsyncCall from 'https://unpkg.com/async-call-rpc@latest/?module'
import isarray from '/web_modules/isarray.js'
```

## Abstract

This is a [ttypescript](https://github.com/cevek/ttypescript) transformer to transform your `import` and `export` declarations into the form that browser can run directly. Including rewrite to another path or redirect to a global UMD variable.

## Motivation

Nowadays most of codes in our codebase are ESModules. You can emit browser executable JS files by `tsc` directly but you have to add the annoying `.js` extension to the end. (Related: [PR: New --emitExtension and --noImplicitExtensionName compiler options](https://github.com/microsoft/TypeScript/pull/35148))

On the other hand, it is hard to run ES Module codes with Node style dependencies, there're some solutions to this including [Snowpack](https://www.snowpack.dev/) but Snowpack also have it's limits.

# Usage

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

## Options

There're some options you can use to modify the behavior of this transformer.

### `appendExtensionName`?: string | boolean

Add '.js' extension for local module specifier

-   `false`: disable this feature
-   `true`: equals to '.js'
-   string: will append the given file extension (e.g. `".mjs"`)

**Default value**: `".js"`

```ts
// before
import x from './file'
// after
import x from './file.js'
```

### `appendExtensionNameForRemote`?: boolean

Also do append extension name for remote (http/https://) import.

**Default value**: false

```ts
// before
import 'https://polyfill.io/'
// after (with appendExtensionNameForRemote: true)
// yes it's a bug
import 'https://polyfill.io/.js'
```

### `bareModuleRewrite`?: false | BareModuleRewriteSimple | Record<string, BareModuleRewriteObject>

This is the most powerful part of this transformer. You can specify the transform rule of bare imports (like `import 'React'`) to the form that browser can recognize.

-   `false`: disable the transform
-   `BareModuleRewriteSimple`: See `enum BareModuleRewriteSimple` below
-   `Record<string, BareModuleRewriteObject>`: See "advance options" below

##### enum BareModuleRewriteSimple

```ts
enum BareModuleRewriteSimple {
    // If you are using snowpack (https://github.com/pikapkg/snowpack)
    snowpack = 'snowpack',
    // Try to get imports from a global object.
    umd = 'umd',
    // Try to transform to https://unpkg.com/package@latest/index.js?module
    unpkg = 'unpkg',
    // Try to transform to https://cdn.pika.dev/package
    pikacdn = 'pikacdn',
}
```

**Default value**: `"umd"`

#### Advance options

`bareModuleRewrite` accepts a `Record<string, BareModuleRewriteObject>` as it's parameter.

```ts
{ [matchingRules: key]: BareModuleRewriteObject }
```

You can use two kinds of matching rule to matching your import paths.

##### Matching rules:

-   Full match: use normal string to do a full match. (`"react"` will only match "react")
-   RegExp match: use JavaScript RegExp to match dependencies. (`"/^@material-ui\/(.+)/g"` will match all packages started with `@material-ui`)

#### BareModuleRewriteObject

```ts
type BareModuleRewriteObject = false | BareModuleRewriteSimple | BareModuleRewriteUMD
type BareModuleRewriteUMD = {
    // Rewrite as UMD
    type: 'umd'
    // Rewrite target
    target: string
    // globalObject, default to "globalThis"
    globalObject?: string
}
```

#### Examples

##### `bareModuleRewrite: false`

```ts
// before
import x from 'react'
// after
import x from 'react'
```

##### `bareModuleRewrite: "snowpack"`

```ts
// before
import x from 'react'
// after
import x from '/web_modules/react.js'
```

##### `bareModuleRewrite: "unpkg"`

```ts
// before
import x from 'react'
// after
import x from 'https://unpkg.com/react@latest/?module'
```

##### `bareModuleRewrite: "pikacdn"`

```ts
// before
import x from 'react'
// after
import x from 'https://cdn.pika.dev/react'
```

##### `bareModuleRewrite: "umd"`

```ts
// before
import x from 'react'
import { useState } from 'react'
import * as React from 'react'
/* TypeScript 3.8 supported */
export * as React from 'react'
export { useState } from 'react'
// ---------------------------------------
// after
const x = __bindCheck(globalThis.React, ["default"], "react", "globalThis.React").default;
const { useState } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
const React = __bindCheck(globalThis.React, [], "react", "globalThis.React");
const React_1 = __bindCheck(globalThis.React, [], "react", "globalThis.React");
export { React_1 as React };
const { useState_1 } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
export { useState_1 as useState };
```

##### `bareModuleRewrite: Record<string, BareModuleRewriteObject>`

```js
{
    bareModuleRewrite: {
        react: "umd",
        "lodash-es": "pikacdn",
        "async-call-rpc": "unpkg",
        "std:fs": false,
        "isarray": "snowpack",
        // === /^@material-ui\/(.+)/g
        "/^@material-ui\\/(.+)/g": {
            type: "umd",
            target: "MaterialUI.$1",
            globalObject: "window"
        },
        "/(.+)/g": "snowpack"
    }
}
```

```ts
// before with { esModuleInterop: true }
import React from 'react'
import lodash from 'lodash-es'
import * as AsyncCall from 'async-call-rpc'
import fs from 'std:fs'
import isarray from 'isarray'
import * as MUI from '@material-ui/core'
import * as MUILab from '@material-ui/labs'
import 'other-polyfill'
// ------------------------------
// after
const React = __bindCheck(__esModuleCheck(globalThis.React), ['default'], 'react', 'globalThis.React').default
const MUI = __bindCheck(window.MaterialUI.core, [], '@material-ui/core', 'window.MaterialUI.core')
const MUILab = __bindCheck(window.MaterialUI.labs, [], '@material-ui/labs', 'window.MaterialUI.labs')
import lodash from 'https://cdn.pika.dev/lodash-es'
import * as AsyncCall from 'https://unpkg.com/async-call-rpc@latest/?module'
import fs from 'std:fs'
import isarray from '/web_modules/isarray.js'
import '/web_modules/other-polyfill.js'
```

### `dynamicImportPathRewrite`?: false | 'auto' | DynamicImportPathRewriteCustom

-   `false`: Disable the _dynamic_ dynamic import rewrite (still rewrite for dynamic import that static analyzable like `import("react")`)
-   `"auto"`: let the transformer do it for you.
-   `DynamicImportPathRewriteCustom`: Provide a function your self.

**Default value**: `"auto"`

#### type `DynamicImportPathRewriteCustom`

```typescript
type DynamicImportPathRewriteCustom = {
    type: 'custom'
    // The string must be a arrow function
    // e.g.: x => Promise.reject
    function: string
}
```

#### `{ dynamicImportPathRewrite: false }`

```ts
// before
import('react')
import('react' + x)
// after
import('react')
import('react' + x)
```

#### `{ dynamicImportPathRewrite: "auto" }`

```ts
// before
import('react')
import('react' + x)

// after
// Or import("/web_modules/react.js") etc, based on your config.
Promise.resolve(globalThis.react)
__dynamicImportHelper('react' + x)
```

#### `{ dynamicImportPathRewrite: { type: "custom", function: "(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))" } }`

The function in the `function` should have the signature of: `(path: string, defaultImpl: (path: string) => Promise<unknown>) => Promise<unknown>` where the `defaultImpl` is the transformer's default runtime helper.

The function must be an ArrowFunctionExpression on the syntax level.

```ts
// before
import('react' + x)

// after
const __customImportHelper_1 = (path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))
__customImportHelper_1('react' + x, __dynamicImportHelper)
```

### `globalObject`?: string

Choose what globalObject to use when transform as UMD import. You may want to use `"window"`, `"self"` or `"global"` as your global object.

**Default value**: `"globalThis"`

`{ globalObject: "window" }`

```ts
// before
import('a')

// after
Promise.resolve(window.a)
```

### `webModulePath`?: string

Choose what `webModulePath` to use when transform as snowpack import. See document of [snowpack](https://www.snowpack.dev/).

**Default value**: `"/web_modules/"`

`{ webModulePath: "https://cdn.example.com/web_modules/", bareModuleRewrite: "snowpack" }`

```ts
// before
import('a')

// after
import('https://cdn.example.com/web_modules/a.js')
```

### `importHelpers`?: string

Choose where to inject the helpers needed to do the transform.

-   `"auto"`: Use the transformer default
-   `"inline"`: All the import helpers will be injected in the file
-   `string`: A URL, will used as the target of the import path.

**Default value**: `"auto"`

#### `{ importHelpers: "auto" }`

```ts
// before
import(x)

// after
import { __dynamicImportTransform } from 'https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js'
import { __UMDBindCheck } from 'https://unpkg.com/@magic-works/ttypescript-browser-like-import-transformer@1.1.0/es/ttsclib.js'
__dynamicImportTransform(JSON.parse('{"after":true,"importHelpers":"auto"}'), x, __dynamicImportNative, __UMDBindCheck)
function __dynamicImportNative(path) {
    return import(path)
}
```

#### `{ importHelpers: "https://cdn.example.com/ttsc-$version$.js" }`

```ts
// before
import(x)

// after
import { __dynamicImportTransform } from 'https://cdn.example.com/ttsc-1.2.0.js'
import { __UMDBindCheck } from 'https://cdn.example.com/ttsc-1.2.0.js'
__dynamicImportTransform(JSON.parse('{"after":true,"importHelpers":"auto"}'), x, __dynamicImportNative, __UMDBindCheck)
function __dynamicImportNative(path) {
    return import(path)
}
```
