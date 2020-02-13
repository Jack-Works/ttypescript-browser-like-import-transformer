/**
 * This file is used by ttypescript-browser-like-import-transformer.
 *
 * This file should have no import declarations after compile
 * and expected to run in any ES2020 compatible environment (with console.warn).
 */

import {
    BareModuleRewriteUMD,
    CustomTransformationContext,
    NormalizedPluginConfig,
    NormalizedBareModuleRewrite,
} from './core'

/**
 * This function is a helper for UMD transform.
 * To emulate the behavior when the imported module doesn't provided the expected export bindings.
 *
 * When using namespace import it will check if the record is undefined.
 * It indicates that developer forget to set the UMD module on the globalObject.
 *
 * @param mod The module record
 * @param bindings Expected import bindings
 * @param path The original import specifier
 * @param mappedName The mapped name
 * @param hasESModuleInterop Does this module need __esModuleInterop
 *
 * @example
 * ```ts
 * import * as ns from 'path'
 * import { x } from 'path2'
 * import 'path3'
 * import y from 'path4'
 * ```
 * should generate the following call
 * ```ts
 * __UMDBindCheck(globalThis.path, [], 'path', 'globalThis.path')
 * __UMDBindCheck(globalThis.path2, ['x'], 'path2', 'globalThis.path2')
 * // Eliminated in UMD import
 * __UMDBindCheck(globalThis.path4, ['default'], 'path4', 'globalThis.path3')
 * ```
 */
export function __UMDBindCheck(
    mod: unknown,
    bindings: string[],
    path: string,
    mappedName: string,
    hasESModuleInterop: boolean,
) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`
    const umdInvalid = `${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`
    if (mod === undefined) {
        mod = {}
        if (bindings.length === 0) {
            console.warn(umdInvalid)
        }
    }
    if (typeof mod !== 'object' || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof mod}`)
    }
    if (hasESModuleInterop && bindings.toString() === 'default' && (mod as any).default === undefined) {
        throw new SyntaxError(umdInvalid)
    }
    for (const i of bindings) {
        if (!Object.hasOwnProperty.call(mod, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`)
    }
    return mod
}

/**
 * @see https://stackoverflow.com/questions/50943704/whats-the-purpose-of-object-definepropertyexports-esmodule-value-0
 * @param mod module record
 */
export function __esModuleInterop(mod: object) {
    return mod && (mod as any).__esModule ? mod : { default: mod }
}

/**
 * The dynamic import helper
 * @param config PluginConfig
 * @param path import path
 * @param dynamicImport dynamic importer
 */
export function __dynamicImportTransform(
    config: NormalizedPluginConfig,
    _path: unknown,
    dynamicImport: (path: string) => Promise<unknown>,
    UMDBindCheck: typeof __UMDBindCheck,
) {
    if (typeof _path !== 'string') _path = String(_path)
    const path = _path as string
    const result = moduleSpecifierTransform({
        config,
        path,
        queryWellknownUMD: () => void 0,
        parseRegExp: () => (console.warn('RegExp rule is not supported in runtime yet'), null),
        queryPackageVersion: () => null,
    })
    const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`
    switch (result.type) {
        case 'noop':
            return dynamicImport(path)
        case 'error':
            console.error(header, result.message, `raw specifier:`, path)
            return dynamicImport(path)
        case 'rewrite':
            return dynamicImport(result.nextPath)
        case 'umd': {
            // ? treat it as ns import
            const _ = (v: unknown) =>
                UMDBindCheck(v, [], path, `${result.globalObject ?? 'globalThis'}.${result.target}`, false)
            if (config.globalObject === 'globalThis' || config.globalObject === undefined)
                return Promise.resolve((globalThis as any)[result.target]).then(_)
            if (config.globalObject === 'window') return Promise.resolve((window as any)[result.target]).then(_)
            return Promise.reject(header + 'Unreachable transform case')
        }
        default:
            unreachable(result)
    }
    function unreachable(_x: never): never {
        throw new Error('Unreachable case' + _x)
    }
}

export function __customDynamicImportHelper(
    _: typeof __dynamicImportTransform,
    c: NormalizedPluginConfig,
    d: (x: string) => Promise<unknown>,
    u: typeof __UMDBindCheck,
) {
    return (p: string) => _(c, p, d, u)
    // ((_, a, c, d) => (b => __dynamicImportTransform(a, b, c, d)))(__dynamicImportTransform, config, dynamicImport, umdBindCheck)
}
//#region Internal code
export type BareModuleRewriteSimple = 'snowpack' | 'umd' | 'unpkg' | 'pikacdn'
export type BareModuleRewriteSimpleEnum = {
    [key in BareModuleRewriteSimple]: key
}
type ModuleSpecifierTransformResult =
    | {
          type: 'rewrite'
          nextPath: string
      }
    | {
          type: 'error'
          message: string
          key: string
          code: number
      }
    | {
          type: 'noop'
      }
    | BareModuleRewriteUMD
/**
 * This function will also be included in the runtime for dynamic transform.
 * So the typescript runtime is optional.
 * @internal
 */
export function moduleSpecifierTransform(
    context: Readonly<
        {
            parseRegExp: (string: string) => RegExp | null
        } & Pick<CustomTransformationContext<any>, 'config' | 'path' | 'queryWellknownUMD' | 'queryPackageVersion'>
    >,
    opt: NormalizedBareModuleRewrite = context.config.bareModuleRewrite || { type: 'simple', enum: 'umd' },
): ModuleSpecifierTransformResult {
    enum Diag {
        TransformToUMDFailed = 392859,
        TransformToUMDFailedCustom,
    }
    const message = {
        [Diag.TransformToUMDFailed]: 'Failed to transform the path {0} to UMD import declaration.',
        [Diag.TransformToUMDFailedCustom]:
            'Failed to transform the path {0} to UMD import declaration. After applying the rule {1}, the result is an empty string.',
    }
    const noop = { type: 'noop' } as const
    if (opt.type === 'noop') return noop

    const { path, config, queryWellknownUMD, parseRegExp, queryPackageVersion } = context
    if (isBrowserCompatibleModuleSpecifier(path)) {
        if (path === '.') return noop
        if (config.appendExtensionName === false) return noop
        if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path)) return noop
        const nextPath = appendExtensionName(
            path,
            config.appendExtensionName === true ? '.js' : config.appendExtensionName ?? '.js',
        )
        return { type: 'rewrite', nextPath: nextPath }
    }
    switch (opt.type) {
        case 'simple': {
            const e = opt.enum
            switch (e) {
                case 'snowpack':
                    return { nextPath: `${config.webModulePath ?? '/web_modules/'}${path}.js`, type: 'rewrite' }
                case 'pikacdn':
                case 'unpkg': {
                    const version = queryPackageVersion(path)
                    return {
                        type: 'rewrite',
                        nextPath: (e === 'pikacdn' ? 'https://cdn.pika.dev/%1@%2' : 'https://unpkg.com/%1@%2/?module')
                            .replace('%1', path)
                            .replace('%2', version || 'latest'),
                    }
                }
                case 'umd':
                    const umdName = importPathToUMDName(path)
                    if (!umdName) return error(Diag.TransformToUMDFailed, path, '')
                    return moduleSpecifierTransform(context, { type: 'umd', target: umdName })
                default:
                    throw new Error('Unreachable case')
            }
        }
        case 'umd': {
            const nextPath = importPathToUMDName(path)
            if (!nextPath) return error(Diag.TransformToUMDFailed, path, '')
            return { type: 'umd', target: nextPath, globalObject: config.globalObject }
        }
        case 'url': {
            const [ns, _pkg] = path.split('/')
            const pkg = ns.startsWith('@') ? `${ns}/${_pkg}` : ns

            const { noVersion, withVersion } = opt
            const version = queryPackageVersion(path)
            let string: string | undefined = void 0
            if (version && withVersion) string = withVersion.replace(/\$version\$/g, version)
            if ((version && !withVersion && noVersion) || (!version && noVersion)) string = noVersion
            if (string) return { type: 'rewrite', nextPath: string.replace(/\$packageName\$/g, pkg) }
            return unreachable('url case')
        }
        case 'complex': {
            for (const [rule, ruleValue] of opt.config) {
                let regexp: RegExp | null | undefined = undefined
                if (rule.startsWith('/')) {
                    regexp = parseRegExp(rule)
                    if (!regexp) console.error('Might be an invalid regexp:', rule)
                }
                const matching = (regexp && path.match(regexp)) || rule === path
                if (!matching) continue

                if (ruleValue.type !== 'umd') return moduleSpecifierTransform(context, ruleValue)

                const nextPath = rule === path ? ruleValue.target : path.replace(regexp!, ruleValue.target)
                if (!nextPath) return error(Diag.TransformToUMDFailedCustom, path, rule)
                return {
                    type: 'umd',
                    target: nextPath,
                    globalObject: ruleValue.globalObject ?? config.globalObject,
                }
            }
            return noop
        }
        default:
            return unreachable(' opt switch')
    }
    function error(type: Diag, arg0: string, arg1: string): ModuleSpecifierTransformResult {
        return {
            type: 'error',
            message: message[type].replace('{0}', arg0).replace('{1}', arg1),
            code: type,
            key: Diag[type],
        }
    }
    function unreachable(str: string): never {
        throw new Error('Unreachable case at ' + str)
    }
    function isBrowserCompatibleModuleSpecifier(path: string) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path)
    }
    function isHTTPModuleSpecifier(path: string) {
        return path.startsWith('http://') || path.startsWith('https://')
    }
    function isLocalModuleSpecifier(path: string) {
        return path.startsWith('.') || path.startsWith('/')
    }
    function appendExtensionName(path: string, expectedExt: string) {
        if (path.endsWith(expectedExt)) return path
        return path + expectedExt
    }
    function importPathToUMDName(path: string) {
        const predefined = queryWellknownUMD(path)
        if (predefined) return predefined
        const reg = path.match(/[a-zA-Z0-9_]+/g)
        if (!reg) return null
        const x = [...reg].join(' ')
        if (x.length)
            return x
                .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
                    index == 0 ? letter.toLowerCase() : letter.toUpperCase(),
                )
                .replace(/\s+/g, '')
        return null
    }
}
//#endregion
