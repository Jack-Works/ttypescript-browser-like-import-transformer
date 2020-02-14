export interface PluginConfigNotParsed {
    /**
     * Add '.js' extension for local module specifier
     * @default .js
     */
    appendExtensionName?: string | boolean
    /**
     * Also append extension to http:// or https://
     * @default false
     */
    appendExtensionNameForRemote?: boolean
    /**
     * @description
     * `false`: disable the transform
     *
     * `BareModuleRewriteSimple.snowpack`: if you are using snowpack (https://github.com/pikapkg/snowpack)
     *
     * `BareModuleRewriteSimple.umd`: make your `import a from 'b'` to `const a = globalThis.b`
     *
     * `BareModuleRewriteSimple.unpkg`: try to transform imports path to https://unpkg.com/package@version/index.js?module
     *
     * `BareModuleRewriteSimple.pikacdn`: try to transform import path to https://cdn.pika.dev/package@version
     *
     * `{type: 'url', withVersion: string, noVersion: string }`: Provide your own rewrite rule. Two variables possible: $version$ and $packageName$
     *
     * `Record<string, BareModuleRewriteObject>`: string can be a string or a RegExp to match import path. If you're using the package "type", you should write it as "/^type$/"
     * @example
     * {
     *    "my-pkg": "umd", // to globalThis.myPkg
     *    "my-pkg2": "pikacdn", // to https://cdn.pika.dev/my-pkg2
     *    "my-pkg3": "unpkg", // to https://unpkg.com/my-pkg3
     *    "/my-pkg-(.+)/": { type: 'umd', target: 'getMyPkg("$1")' }, // for "my-pkg-12" to globalThis.getMyPkg("12")
     * }
     * @default umd
     */
    bareModuleRewrite?:
        | false
        | BareModuleRewriteSimple
        | BareModuleRewriteURL
        | { [key: string]: BareModuleRewriteObject }
    /**
     * Rewrite dynamic import
     * @description
     * `false`: Do not rewrite
     * `'auto'`: try to optimise automatically
     * `DynamicImportPathRewrite`: using a custom function to handle the import path (path: string, builtinImpl: (path) => Promise<any>): Promise<any>
     * @default auto
     */
    dynamicImportPathRewrite?: false | 'auto' | DynamicImportPathRewriteCustom
    /**
     * Used in UMD.
     * For what object will store the UMD variables
     * @default globalThis
     */
    globalObject?: string
    /**
     * Used in snowpack. web_modules module path
     * @default /web_modules/
     * @deprecated
     */
    webModulePath?: string
    /**
     * Use import map to resolve paths. (Note: import map has the highest priority.)
     */
    importMap?: ImportMapResolution | ImportMapCustomResolution
    /**
     * Specify where is the helper is.
     *
     * - "inline": All helpers will emitted in each file
     * - "auto": Let the transform do it
     * - string: A URL, will import helper from that place.
     *
     * @default auto
     */
    importHelpers?: 'inline' | 'auto' | string
}

interface ImportMapCustomResolution {
    type: 'function'
    function: (opt: ImportMapFunctionOpts) => string | null
}

interface ImportMapResolution {
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
 */
export type BareModuleRewriteSimple = 'snowpack' | 'umd' | 'unpkg' | 'pikacdn'
/**
 * Rewrite module to a UMD access
 * @example { type: 'umd', target: 'mylib', globalObject: 'window' }
 */
export interface BareModuleRewriteUMD {
    type: 'umd'
    /**
     * @description
     * rewrite the matching import statement to specified global variable
     */
    target: string
    /**
     * @description define the globalObject
     * @default "globalThis"
     */
    globalObject?: string
}
/**
 * Rewrite module to another URL
 * @example {
 * type: 'url',
 * withVersion: 'https://cdn.example.com/$packageName$/v$version$'
 * noVersion: 'https://cdn.example.com/$packageName$/latest'
 * }
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
type BareModuleRewriteObject = false | BareModuleRewriteSimple | BareModuleRewriteUMD | BareModuleRewriteURL
/**
 * Rewrite dynamic import with a custom function
 * @example { type: 'custom', function: (path, defaultImpl) => defaultImpl('std:' + path) }
 */
interface DynamicImportPathRewriteCustom {
    type: 'custom'
    /**
     * The function string. It must be an ArrowFunctionExpression.
     */
    function: string
}
export type ImportMapFunctionOpts = {
    moduleSpecifier: string
    sourceFilePath: string
    currentWorkingDirectory: string
    rootDir: string
    config: PluginConfigNotParsed
}
