/**
 * @packageDocumentation
 */

/**
 * Config of this transformer
 * @public
 */
export interface PluginConfigs {
    /**
     * Add '.js' extension for local import path.
     * @defaultValue .js
     * @remarks
     * - `false`: disable the transform
     *
     * - `true`: same as ".js"
     *
     * - a string: set your extension name like ".mjs", ".js" or ".ejs"
     * @example
     * Source code:
     * !src(extName-default.ts)
     * Outputs:
     * !out(extName-false.js)
     * !out(extName-true.js)
     * !out(extName-string.js)
     */
    extName?: string | boolean
    /**
     * @deprecated See "extName", will be removed in 3.0
     */
    appendExtensionName?: string | boolean
    /**
     * Also append extension '.js' to http:// or https:// URLs.
     * @defaultValue false
     * @example
     * Source code:
     * !src(extName-default.ts)
     * Outputs:
     * !out(extNameRemote-false.js)
     * !out(extNameRemote-true.js)
     */
    extNameRemote?: boolean
    /**
     * @deprecated use "extNameRemote", will be removed in 3.0
     */
    appendExtensionNameForRemote?: boolean
    /**
     * The transformation rule. Specify how this transformer will handle your imports.
     * @remarks
     * This is the most powerful part of this transformer.
     * You can specify the transform rule of bare imports (like `import 'React'`) to the form that browser can recognize.
     * See {@link RewriteRulesObject}
     *
     * When it is a `Record<string, RewriteRulesObject>`,
     * you can use two kinds of matching rule to matching your import paths.
     *
     * - Full match: use normal string to do a full match. (`"react"` will only match "react")
     *
     * - RegExp match: use JavaScript RegExp to match dependencies. (`"/^@material-ui\/(.+)/g"` will match all packages started with `@material-ui`)
     *
     * @example
     * A complex example:
     * ```js
     * {rules: {
     *      react: "umd",
     *      "lodash-es": "skypack",
     *      "async-call-rpc": "unpkg",
     *      "std:fs": false,
     *      "isarray": "unpkg",
     *      // === /^@material-ui\/(.+)/g
     *      "/^@material-ui\\/(.+)/g": {
     *          type: "umd",
     *          target: "MaterialUI.$1",
     *          globalObject: "window"
     *      },
     *      "/(.+)/g": "unpkg"
     * }}
     * ```
     * !src(demo-2.ts)
     * Output:
     * !out(demo-2.js)
     */
    rules?: Exclude<RewriteRulesObject, RewriteRulesUMD> & Record<string, RewriteRulesObject>
    /**
     * {@inheritdoc PluginConfigs.rules}
     * @deprecated Renamed to "rules", will be removed in 3.0
     */
    bareModuleRewrite?: PluginConfigs['rules']
    /**
     * Config how to rewrite dynamic import.
     * @remarks
     * - `false`: Do not rewrite
     *
     * - `'auto'`: try to optimise automatically
     *
     * - {@link DynamicImportPathRewriteCustom}: using a custom function to handle the import path
     * @defaultValue auto
     * @example
     *
     * Source:
     * !src(dynamicImportPathRewrite-default.ts)
     * Outputs:
     * !out(dynamicImportPathRewrite-auto.js)
     * !out(dynamicImportPathRewrite-custom-arrow.js)
     * !out(dynamicImportPathRewrite-false.js)
     */
    dynamicImportPathRewrite?: false | 'auto' | DynamicImportPathRewriteCustom
    /**
     * When using UMD import, this option indicates what global object will be used to find the UMD variables.
     * @defaultValue globalThis
     * @example
     * - "globalThis" in all modern ES platforms.
     *
     * - "window" or "self" in browsers.
     *
     * - "global" in NodeJS.
     *
     * Source:
     * !src(globalObject-default.ts)
     * Outputs:
     * !out(globalObject-undefined.js)
     * !out(globalObject-string.js)
     * !out(globalObject-window.js)
     */
    globalObject?: string
    /**
     * Use import map as the transform rules. (This has the highest priority.)
     * @remarks
     * **Experimental** may have many bugs on transforming with importMap.
     * See {@link ImportMapResolution} (static) or {@link ImportMapCustomResolution} (dynamic)
     * @defaultValue undefined
     * @example
     * Folder:
     * ```shell
     * /web_modules/ # where node_module lives
     * /src/ # your source code
     * /dist/ # your output
     * tsconfig.json # tsconfig at here
     * ```
     *
     * You must set `rootDir` when using importMap.
     * !src(import-map/tsconfig.json)
     * Source:
     * !src(import-map/src/index.ts)
     * Output:
     * !out(import-map/index.js)
     */
    importMap?: ImportMapResolution | ImportMapCustomResolution
    /**
     * Import emit helpers (e.g. `\_import`, `\__dynamicImportTransform`, etc..)
     * from runtime (a local file in this package).
     *
     * @remarks
     *
     * - "inline": All the import helpers will be injected in the file
     *
     * - "cdn": import it from jsdelivr
     *
     * - "node": import it as a bare import (from `@magic-works/...`)
     *
     * - "auto": Use the transformer default
     *
     * - string: A URL, will import helper from that place.
     *
     * @defaultValue auto
     * @example
     * Source:
     * ```ts
     * import(x)
     * ```
     * Output:
     * !out(importHelpers-auto.js)
     * !out(importHelpers-string.js)
     * !out(importHelpers-cdn.js)
     * !out(importHelpers-node.js)
     * !out(importHelpers-inline.js)
     */
    importHelpers?: 'inline' | 'auto' | 'cdn' | 'node' | string
    /**
     * Use property access syntax to access UMD variable
     * @defaultValue true
     * @remarks
     * By turning this off, this transformer will emit dangerous code.
     * This might be useful in some cases: e.g.
     * you want a limited code generation (before: import "a('b')", out: globalThis.a('b')).
     *
     * After opening this option, the code above will become `globalThis["a('b')"]`
     * which is safe.
     * @example
     * !src(safeAccess-default.ts)
     * !out(safeAccess-default.js)
     * !out(safeAccess-true.js)
     * !out(safeAccess-false.js)
     */
    safeAccess?: string
    /**
     * JSON import
     * @defaultValue undefined
     * @remarks
     * Resolve the JSON import.
     *
     * Not recommend because this is not a Web standard yet.
     *
     * Only open it when your codebase is not easy to migrate from Node specified behaviors.
     *
     * **Important**: if you want to keep JSON identity between different files, please use "data" mode.
     *
     * **Important**: if your environment use CSP and bans data URL, please use "inline" mode.
     *
     * - undefined: disable this feature
     *
     * - true: same as "inline"
     *
     * - "data": import it as a data url.
     *
     * - "inline": import it as a inline object.
     *
     * @example
     *
     * true / "inline"
     *
     * Source:
     * !src(json-import-auto/tsconfig.json)
     * !src(json-import-auto/index.ts)
     * !src(json-import-auto/import-failed.ts)
     * !src(json-import-auto/dyn-import-failed.ts)
     * Output:
     * !out(json-import-auto/index.js)
     * !out(json-import-auto/import-failed.js)
     * !out(json-import-auto/dyn-import-failed.js)
     *
     * "data"
     *
     * Source:
     * !src(json-import-data/index.ts)
     * !src(json-import-data/import-failed.ts)
     * !src(json-import-data/dyn-import-failed.ts)
     * Output:
     * !out(json-import-data/index.js)
     * !out(json-import-data/import-failed.js)
     * !out(json-import-data/dyn-import-failed.js)
     *
     */
    jsonImport?: 'data' | 'inline' | true
    /**
     * Resolve NodeJS style path './x' to './x/index.js'
     * @defaultValue undefined
     * @remarks
     *
     * Resolve NodeJS style folder import to their correct path.
     *
     * Not recommend because it never will become a Web standard.
     *
     * Only open it when your codebase is not easy to migrate from Node specified behaviors.
     *
     * @example
     *
     * Source:
     * !src(folder-import/index.ts)
     * !src(folder-import/folder/index.ts)
     * !src(folder-import/f2/index.ts)
     * !src(folder-import/f2/f2.ts)
     * !src(folder-import/f2/inner/f.ts)
     *
     * Output:
     * !out(folder-import/index.js)
     * !out(folder-import/folder/index.js)
     * !out(folder-import/f2/index.js)
     * !out(folder-import/f2/f2.js)
     * !out(folder-import/f2/inner/f.js)
     */
    folderImport?: boolean
    /**
     * Make _import cleaner.
     * @defaultValue false
     * @remarks
     *
     * Enable this option will make the generated code cleaner but will make the Error message less helpful.
     *
     * @example
     *
     * Source:
     * !src(umdCheckCompact-default.ts)
     *
     * Default (undefined):
     * !out(umdCheckCompact-default.js)
     *
     * true:
     * !out(umdCheckCompact-true.js)
     *
     * false:
     * !out(umdCheckCompact-false.js)
     */
    umdCheckCompact: boolean
}
/**
 * @public
 * @remarks
 * See {@link ImportMapFunctionOpts}
 */
export interface ImportMapCustomResolution {
    type: 'function'
    /**
     * The function that will resolve a path to another path.
     * @remarks
     * Since it is a function, it can't be specified in the tsconfig by tsconfig.
     */
    function: (opt: ImportMapFunctionOpts) => string | null
}
/**
 * @public
 */
export interface ImportMapResolution {
    type: 'map'
    /** Path of the ImportMap */
    mapPath: string
    /** The ImportMap */
    mapObject?: object
    /** The runtime path of your ImportMap */
    simulateRuntimeImportMapPosition: string
    /** The runtime path of your source root */
    simulateRuntimeSourceRoot?: string
}

/**
 * Predefined rewrite rules
 *
 * @remarks
 *
 * - umd: Rewrite to UMD import
 *
 * - unpkg: Rewrite to unpkg (a CDN)
 *
 * - skypack: Rewrite to skypack (another CDN)
 *
 * - jspm: Rewrite to jspm (another CDN)
 *
 * @example
 * Source code:
 * !src(rules-default.ts)
 * Outputs:
 * !out(rules-umd.js)
 * !out(rules-skypack.js)
 * !out(rules-jspm.js)
 * !out(rules-unpkg.js)
 * @public
 */
export type RewriteRulesSimple = 'umd' | 'unpkg' | 'skypack' | 'jspm' | 'jsdelivr' | 'esm.run'
/**
 * Rewrite module to a UMD access
 * @example
 * ```json
 * { "type": "umd", target: "mylib", globalObject: "window" }
 * ```
 *
 * !src(rules-complex.ts)
 * Output:
 * !out(rules-complex.js)
 *
 * This option also support treeshake.
 * !src(treeshake-test/tsconfig.json)
 * !src(treeshake-test/src/index.ts)
 *
 * Output:
 * !out(treeshake-test/index.js)
 * Extra file: (Therefore you can feed this file to Webpack / Rollup and get treeshaked.)
 * !src(treeshake-test/deps.js)
 * @public
 */
export interface RewriteRulesUMD {
    type: 'umd'
    /**
     * Rewrite the matching import statement to specified global variable
     * @example "mylib.$1"
     */
    target: string
    /**
     * {@inheritdoc PluginConfigs.globalObject}
     */
    globalObject?: string
    /**
     * should be a URL. Will use a `import 'umdImportPath'` to load the UMD then deconstruct from it.
     */
    umdImportPath?: string
    treeshake?: {
        out: string
    }
}
/**
 * Rewrite module to another URL
 * @public
 * @example
 * ```json
 * {
 *     "type": "url",
 *     "withVersion": "https://cdn.example.com/$packageName$/v$version$""
 *     "noVersion": "https://cdn.example.com/$packageName$/latest"
 * }
 * ```
 *
 * Source code:
 * !src(rules-default.ts)
 * Output:
 * !out(rules-url.js)
 */
export interface RewriteRulesURL {
    type: 'url'
    /**
     * Rewrite to this URL if the transformer can read the version of the package
     */
    withVersion?: string
    /**
     * Rewrite to this URL if the transformer can't read the version of the package
     */
    noVersion?: string
}
/**
 * Rewrite the module by complex rules.
 * @remarks
 * - `false`: disable the transform
 *
 * - {@link RewriteRulesURL}: Rewrite to another URL
 *
 * - {@link RewriteRulesUMD}: Rewrite to a UMD variable access.
 *
 * - `Record<string, `{@link RewriteRulesObject}`>`: string can be a string or a RegExp to match import path. If you're using the package "type", you should write it as "/^type$/"
 *
 * - Enum {@link RewriteRulesSimple}:
 *
 * - - `"umd"`: make your `import a from 'b'` to `const a = globalThis.b`
 *
 * - - `"unpkg"`: try to transform imports path to "https://unpkg.com/package\@version/index.js?module"
 *
 * - - `"skypack"`: try to transform import path to "https://cdn.skypack.dev/package\@version"
 *
 * - - `"jspm"`: try to transform import path to "https://jspm.dev/package\@version"
 *
 * @example
 * Example for `Record<string, `{@link RewriteRulesObject}`>`
 * ```jsonc
 * {
 *    "my-pkg": "umd", // to globalThis.myPkg
 *    "my-pkg2": "skypack", // to https://cdn.skypack.dev/my-pkg2
 *    "my-pkg3": "unpkg", // to https://unpkg.com/my-pkg3
 *    "my-pkg4": "jspm", // to https://jspm.dev/my-pkg4
 *    "/my-pkg-(.+)/": {
 *        type: 'umd',
 *        target: 'getMyPkg("$1")'
 *    }, // for "my-pkg-12" to globalThis.getMyPkg("12")
 * }
 * ```
 *
 * Source code:
 * !src(rules-default.ts)
 * Outputs:
 * !out(rules-false.js)
 * !out(rules-umd.js)
 * !out(rules-skypack.js)
 * !out(rules-unpkg.js)
 * !out(rules-url.js)
 *
 * Complex example:
 * !src(rules-complex.ts)
 * Output:
 * !out(rules-complex.js)
 * @defaultValue umd
 * @public
 */
export type RewriteRulesObject = false | RewriteRulesSimple | RewriteRulesUMD | RewriteRulesURL
/**
 * Rewrite dynamic import with a custom function
 * @public
 * @remarks
 * The function in the `function` should have the signature of:
 *
 * ```ts
 * (path: string, defaultImpl: (path: string) => Promise<unknown>) => Promise<unknown>
 * ```
 *
 * where the `defaultImpl` is the transformer's default runtime helper.
 *
 * The function must be an ArrowFunctionExpression on the syntax level.
 * @example
 * ```js
 * {
 *      type: 'custom',
 *      function: "(path, defaultImpl) => defaultImpl('std:' + path)"
 * }
 * ```
 */
export interface DynamicImportPathRewriteCustom {
    type: 'custom'
    /**
     * The function string. It must be an ArrowFunctionExpression.
     */
    function: string
}
/**
 * @public
 * @remarks Internal usage.
 */
export type ImportMapFunctionOpts = {
    moduleSpecifier: string
    sourceFilePath: string
    rootDir: string
    config: PluginConfigs
    tsconfigPath: string
}
