/**
 * This file is used by ttypescript-browser-like-import-transformer.
 *
 * This file should have no import declarations after compile
 * and expected to run in any ES2020 compatible environment (with console.warn).
 */

import type { BareModuleRewriteUMD } from './plugin-config'
import type { CustomTransformationContext } from './core'
import type { NormalizedPluginConfig, NormalizedBareModuleRewrite } from './config-parser'

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
    const modType = typeof mod
    if ((modType !== 'object' && modType !== 'function') || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${modType}`)
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
    _path: unknown,
    config: NormalizedPluginConfig,
    dynamicImport: (path: string) => Promise<unknown>,
    UMDBindCheck: typeof __UMDBindCheck,
    _moduleSpecifierTransform: typeof moduleSpecifierTransform,
): Promise<unknown> {
    if (typeof _path !== 'string') _path = String(_path)
    const path = _path as string
    const result = _moduleSpecifierTransform({
        config,
        path,
        queryWellknownUMD: () => void 0,
        parseRegExp: () => (console.warn('RegExp rule is not supported in runtime yet'), null),
        queryPackageVersion: () => null,
        getCompilerOptions: () => ({}),
        accessingImports: new Set('*'),
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
    m: typeof moduleSpecifierTransform,
) {
    return (p: string) => _(p, c, d, u, m)
}
//#region Internal code
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
 * @internal
 */
export function moduleSpecifierTransform(
    context: Readonly<
        {
            parseRegExp: (string: string) => RegExp | null
            accessingImports: Set<string>
        } & Pick<
            CustomTransformationContext<any>,
            'config' | 'path' | 'queryWellknownUMD' | 'queryPackageVersion' | 'treeshakeProvider' | 'getCompilerOptions'
        >
    >,
    opt?: NormalizedBareModuleRewrite,
): ModuleSpecifierTransformResult {
    const { queryWellknownUMD } = context
    const packageNameRegExp = /\$packageName\$/g
    const versionRegExp = /\$version\$/g
    const umdNameRegExp = /\$umdName\$/g
    const subpathRegExp = /\$subpath\$/g
    const enum Diag {
        TransformToUMDFailed = 392859,
        TransformToUMDFailedCustom,
        QueryPackageVersionFailed,
    }
    const message = {
        [Diag.TransformToUMDFailed]: 'Failed to transform the path {0} to UMD import declaration.',
        [Diag.QueryPackageVersionFailed]: 'Failed to query the package version of import {0}.',
        [Diag.TransformToUMDFailedCustom]:
            'Failed to transform the path {0} to UMD import declaration. After applying the rule {1}, the result is an empty string.',
    }
    const noop = { type: 'noop' } as const
    return self(context, opt)
    /** Can't use the name moduleSpecifierTransform to do recursive, the name might be changed in the inline mode */
    function self(
        ...[context, opt = context.config.bareModuleRewrite || { type: 'simple', enum: 'umd' }]: Parameters<
            typeof moduleSpecifierTransform
        >
    ): ModuleSpecifierTransformResult {
        const { path, config, parseRegExp, queryPackageVersion } = context
        if (opt.type === 'noop') return noop

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
        const { sub, nspkg } = resolveNS(path)
        switch (opt.type) {
            case 'simple': {
                const e = opt.enum
                switch (e) {
                    case 'snowpack':
                        const nextPath = appendExtensionName(
                            path,
                            config.appendExtensionName === true ? '.js' : config.appendExtensionName ?? '.js',
                        )
                        return { nextPath: `${config.webModulePath ?? '/web_modules/'}${nextPath}`, type: 'rewrite' }
                    case 'pikacdn':
                    case 'unpkg': {
                        const a = 'https://cdn.pika.dev/$packageName$@$version$$subpath$'
                        const b = 'https://cdn.pika.dev/$packageName$$subpath$'
                        const c = 'https://unpkg.com/$packageName$@$version$$subpath$?module'
                        const d = 'https://unpkg.com/$packageName$$subpath$?module'
                        const isPika = e === 'pikacdn'
                        return self(context, { type: 'url', noVersion: isPika ? b : d, withVersion: isPika ? a : c })
                    }
                    case 'umd':
                        const target = importPathToUMDName(path)
                        const { globalObject } = config
                        if (!target) return error(Diag.TransformToUMDFailed, path, '')
                        // TODO: Collect some common CDN path maybe?
                        const nextOpt: BareModuleRewriteUMD = {
                            type: 'umd',
                            target,
                            globalObject,
                            umdImportPath: void 0,
                        }
                        return self(context, nextOpt)
                    default:
                        return unreachable('simple type')
                }
            }
            case 'umd': {
                const [{ globalObject }, { umdImportPath }] = [config, opt]
                if (opt.treeshake && context.treeshakeProvider) {
                    context.treeshakeProvider(
                        path,
                        context.accessingImports,
                        opt.treeshake,
                        context.getCompilerOptions(),
                    )
                    return { type: 'umd', target: path, globalObject: opt.target, umdImportPath }
                } else {
                    if (opt.treeshake) console.error('Tree shaking is not available at runtime.')
                    const target = importPathToUMDName(path)
                    if (!target) return error(Diag.TransformToUMDFailed, path, '')
                    return { type: 'umd', target, globalObject, umdImportPath }
                }
            }
            case 'url': {
                const { noVersion, withVersion } = opt
                const version = queryPackageVersion(path)
                let string: string | undefined = void 0
                if (version && withVersion) string = withVersion.replace(versionRegExp, version)
                if ((version && !withVersion && noVersion) || (!version && noVersion)) string = noVersion
                if (string)
                    return {
                        type: 'rewrite',
                        nextPath: string
                            .replace(packageNameRegExp, nspkg)
                            .replace(subpathRegExp, sub === undefined ? '' : '/' + sub),
                    }
                return unreachable('url case')
            }
            case 'complex': {
                for (const [rule, ruleValue] of Object.entries(opt.config)) {
                    let regexp: RegExp | null | undefined = undefined
                    if (rule.startsWith('/')) {
                        regexp = parseRegExp(rule)
                        if (!regexp) console.error('Might be an invalid regexp:', rule)
                    }
                    const matching = (regexp && path.match(regexp)) || rule === path
                    if (!matching) continue

                    if (ruleValue.type !== 'umd') return self(context, ruleValue)
                    if (ruleValue.type === 'umd' && ruleValue.treeshake) return self(context, ruleValue)

                    const target = rule === path ? ruleValue.target : path.replace(regexp!, ruleValue.target)
                    if (!target) return error(Diag.TransformToUMDFailedCustom, path, rule)

                    const umdName = importPathToUMDName(path)
                    const version = queryPackageVersion(path)
                    const { globalObject = config.globalObject, umdImportPath } = ruleValue
                    if (!umdName && (target.match(umdNameRegExp) || umdImportPath?.match(umdNameRegExp)))
                        return error(Diag.TransformToUMDFailed, path, rule)
                    if (!version && (target.match(versionRegExp) || umdImportPath?.match(versionRegExp)))
                        return error(Diag.QueryPackageVersionFailed, path, rule)
                    const [nextTarget, nextUMDImportPath] = [target, umdImportPath || ''].map((x) =>
                        x
                            .replace(packageNameRegExp, path)
                            .replace(umdNameRegExp, umdName!)
                            .replace(versionRegExp, version!),
                    )
                    return { type: 'umd', target: nextTarget, globalObject, umdImportPath: nextUMDImportPath }
                }
                return noop
            }
            default:
                return unreachable(' opt switch')
        }
    }
    function error(type: Diag, arg0: string, arg1: string): ModuleSpecifierTransformResult {
        return {
            type: 'error',
            message: message[type].replace('{0}', arg0).replace('{1}', arg1),
            code: type,
            // was Diag[type]
            key: type.toString(),
        }
    }
    function unreachable(str: string): never {
        throw new Error('Unreachable case at ' + str)
    }
    function isBrowserCompatibleModuleSpecifier(path: string) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path) || isDataOrBlobModuleSpecifier(path)
    }
    function isHTTPModuleSpecifier(path: string) {
        return path.startsWith('http://') || path.startsWith('https://')
    }
    function isLocalModuleSpecifier(path: string) {
        return path.startsWith('.') || path.startsWith('/')
    }
    function isDataOrBlobModuleSpecifier(path: string) {
        return path.startsWith('blob:') || path.startsWith('data:')
    }
    function appendExtensionName(path: string, expectedExt: string) {
        if (path.endsWith(expectedExt)) return path
        return path + expectedExt
    }
    /** Parse '@namespace/package/folder' into ns, pkg, sub */
    function resolveNS(path: string): { ns?: string; pkg: string; sub?: string; nspkg: string } {
        const [a, b, ...c] = path.split('/')
        if (b === undefined) return { nspkg: a, pkg: a }
        if (a.startsWith('@')) return { ns: a, pkg: b, sub: c.join('/'), nspkg: a + '/' + b }
        return { pkg: a, sub: [b, ...c].join('/'), nspkg: a }
    }
    function importPathToUMDName(path: string) {
        const predefined = queryWellknownUMD(path)
        if (predefined) return predefined
        const { pkg, sub } = resolveNS(path)
        const pkgVar = toCase(pkg)
        const subVar = sub?.split('/').reduce((prev, curr) => {
            if (prev === null) return null
            const cased = toCase(curr)
            if (!cased) return null
            return [prev, cased].join('.')
        }, '' as string | null)
        if (!pkgVar) return null
        if (sub?.length) return subVar ? pkgVar + subVar : null
        return pkgVar
    }
    function toCase(s: string) {
        const reg = s.match(/[a-zA-Z0-9_]+/g)
        if (!reg) return null
        const x = [...reg].join(' ')
        if (!x.length) return null
        return x
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
                index == 0 ? letter.toLowerCase() : letter.toUpperCase(),
            )
            .replace(/\s+/g, '')
    }
}
//#endregion
