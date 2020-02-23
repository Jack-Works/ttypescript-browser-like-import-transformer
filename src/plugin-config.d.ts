/**
 * Config of this transformer
 * @public
 */
export interface PluginConfigs {
    /**
     * Add '.js' extension for local import path.
     * @defaultValue .js
     * @example
     * Source code:
     * !src(appendExtensionName-default.ts)
     * Outputs:
     * !out(appendExtensionName-false.js)
     * !out(appendExtensionName-true.js)
     * !out(appendExtensionName-string.js)
     */
    appendExtensionName?: string | boolean
    /**
     * Also append extension '.js' to http:// or https:// URLs.
     * @defaultValue false
     * @example
     * Source code:
     * !src(appendExtensionName-default.ts)
     * Outputs:
     * !out(appendExtensionNameForRemote-false.js)
     * !out(appendExtensionNameForRemote-true.js)
     */
    appendExtensionNameForRemote?: boolean
    /**
     * The transformation rule. Specify how this transformer will handle your imports.
     * @remarks
     * See {@link BareModuleRewriteObject}
     */
    bareModuleRewrite?: Exclude<BareModuleRewriteObject, BareModuleRewriteUMD>
    /**
     * Config how to rewrite dynamic import.
     * @remarks
     * `false`: Do not rewrite
     * `'auto'`: try to optimise automatically
     * `DynamicImportPathRewrite`: using a custom function to handle the import path (path: string, builtinImpl: (path) => Promise<any>): Promise<any>
     * @defaultValue auto
     */
    dynamicImportPathRewrite?: false | 'auto' | DynamicImportPathRewriteCustom
    /**
     * When using UMD import, this option indicates what global object will be used to find the UMD variables.
     * @defaultValue globalThis
     */
    globalObject?: string
    /**
     * Used in snowpack. web_modules module path
     * @defaultValue /web_modules/
     * @deprecated Should try the new importMap support
     */
    webModulePath?: string
    /**
     * Use import map as the transform rules. (This has the highest priority.)
     * @defaultValue undefined
     */
    importMap?: ImportMapResolution | ImportMapCustomResolution
    /**
     * Import emit helpers (e.g. `\__UMDBindCheck`, `\__dynamicImportTransform`, etc..)
     * from ttsclib (a local file in this package).
     *
     * @remarks
     *
     * - "inline": All helpers will emitted in each file
     * - "auto": Let the transform do it
     * - string: A URL, will import helper from that place.
     *
     * @defaultValue auto
     */
    importHelpers?: 'inline' | 'auto' | string
}
/**
 * @public
 */
export interface ImportMapCustomResolution {
    type: 'function'
    function: (opt: _ImportMapFunctionOpts) => string | null
}
/**
 * @public
 */
export interface ImportMapResolution {
    type: 'map'
    mapPath: string
    mapObject?: object
    simulateRuntimeImportMapPosition: string
    simulateRuntimeSourceRoot?: string
}

/**
 * Predefined rewrite rules
 *
 * snowpack: Rewrite to snowpack (/web_modules) @deprecated should use import map
 *
 * umd: Rewrite to UMD import
 *
 * unpkg: Rewrite to unpkg (a CDN)
 *
 * pikacdn: Rewrite to pikacdn (another CDN)
 * @public
 */
export type BareModuleRewriteSimple = 'snowpack' | 'umd' | 'unpkg' | 'pikacdn'
/**
 * Rewrite module to a UMD access
 * @example { type: 'umd', target: 'mylib', globalObject: 'window' }
 * @public
 */
export interface BareModuleRewriteUMD {
    type: 'umd'
    /**
     * @remarks
     * rewrite the matching import statement to specified global variable
     */
    target: string
    /**
     * @remarks define the globalObject
     * @defaultValue "globalThis"
     */
    globalObject?: string
    /**
     * should be a URL. Will use a `import 'umdImportPath'` to load the UMD then deconstruct from it.
     */
    umdImportPath?: string
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
 * !src(bareModuleRewrite-default.ts)
 * Output:
 * !out(bareModuleRewrite-url.js)
 */
export interface BareModuleRewriteURL {
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
 * - {@link BareModuleRewriteURL}: Rewrite to another URL
 *
 * - {@link BareModuleRewriteUMD}: Rewrite to a UMD variable access.
 *
 * - `Record<string, `{@link BareModuleRewriteObject}`>`: string can be a string or a RegExp to match import path. If you're using the package "type", you should write it as "/^type$/"
 *
 * - Enum {@link BareModuleRewriteSimple}:
 *
 * - - `"snowpack"`: if you are using {@link https://github.com/pikapkg/snowpack | snowpack}
 *
 * - - `"umd"`: make your `import a from 'b'` to `const a = globalThis.b`
 *
 * - - `"unpkg"`: try to transform imports path to "https://unpkg.com/package\@version/index.js?module"
 *
 * - - `"pikacdn"`: try to transform import path to "https://cdn.pika.dev/package\@version"
 *
 * @example
 * Example for `Record<string, `{@link BareModuleRewriteObject}`>`
 * ```jsonc
 * {
 *    "my-pkg": "umd", // to globalThis.myPkg
 *    "my-pkg2": "pikacdn", // to https://cdn.pika.dev/my-pkg2
 *    "my-pkg3": "unpkg", // to https://unpkg.com/my-pkg3
 *    "/my-pkg-(.+)/": {
 *        type: 'umd',
 *        target: 'getMyPkg("$1")'
 *    }, // for "my-pkg-12" to globalThis.getMyPkg("12")
 * }
 * ```
 *
 * Source code:
 * !src(bareModuleRewrite-default.ts)
 * Outputs:
 * !out(bareModuleRewrite-false.js)
 * !out(bareModuleRewrite-umd.js)
 * !out(bareModuleRewrite-pikacdn.js)
 * !out(bareModuleRewrite-snowpack.js)
 * !out(bareModuleRewrite-unpkg.js)
 * !out(bareModuleRewrite-url.js)
 *
 * Complex example:
 * !src(bareModuleRewrite-complex.ts)
 * Output:
 * !out(bareModuleRewrite-complex.js)
 * @defaultValue umd
 */
export type BareModuleRewriteObject = false | BareModuleRewriteSimple | BareModuleRewriteUMD | BareModuleRewriteURL
/**
 * Rewrite dynamic import with a custom function
 * @public
 * @example \{ type: 'custom', function: (path, defaultImpl) => defaultImpl('std:' + path) }
 */
export interface DynamicImportPathRewriteCustom {
    type: 'custom'
    /**
     * The function string. It must be an ArrowFunctionExpression.
     */
    function: string
}
/**
 * @internal
 */
export type _ImportMapFunctionOpts = {
    moduleSpecifier: string
    sourceFilePath: string
    currentWorkingDirectory: string
    rootDir: string
    config: PluginConfigs
}
