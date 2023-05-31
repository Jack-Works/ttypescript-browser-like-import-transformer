/**
 * This file is used by ttypescript-browser-like-import-transformer.
 *
 * This file should have no import declarations after compile
 * and expected to run in any ES2020 compatible environment (with console.warn).
 */

import type { RewriteRulesUMD, RewriteRulesURL } from './plugin-config'
import type { CustomTransformationContext } from './core'
import type { NormalizedPluginConfig, NormalizedRewriteRules } from './config-parser'

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
 * @param mapped The mapped name
 * @param ESModuleInterop Does this module need __esModuleInterop
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
 * _import(globalThis.path, false, [], 'path', 'globalThis.path')
 * _import(globalThis.path2, false, ['x'], 'path2', 'globalThis.path2')
 * // Eliminated in UMD import
 * _import(globalThis.path4, false, ['default'], 'path4', 'globalThis.path3')
 * ```
 */
export function _import(mod: unknown, bindings: string[], path: string, mapped: string, ESModuleInterop: boolean) {
    const head = `The requested module${path ? '' : ` '${path}' (mapped as ${mapped})`}`
    const umdInvalid = `${head} doesn't provides a valid export object.${
        mapped ? ` This is likely to be a mistake. Did you forget to set ${mapped}?` : ''
    }`
    if (mod === undefined) {
        mod = {}
        if (!bindings.length) console.warn(umdInvalid)
    }
    const type = typeof mod
    if ((type !== 'object' && type !== 'function') || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${type}`)
    }
    if (ESModuleInterop && bindings.toString() === 'default' && (mod as any).default === undefined) {
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
    dynamicImport: (path: string, jsonPath?: string) => Promise<unknown>,
    UMDBindCheck: typeof _import,
    _moduleSpecifierTransform: typeof moduleSpecifierTransform,
): Promise<unknown> {
    if (typeof _path !== 'string') _path = String(_path)
    const path = _path as string
    const nullResult = () => null
    const result = _moduleSpecifierTransform({
        config,
        path,
        queryWellknownUMD: nullResult,
        parseRegExp: nullResult,
        queryPackageVersion: nullResult,
        resolveJSONImport: nullResult,
        resolveFolderImport: nullResult,
        getCompilerOptions: () => ({}),
        accessingImports: new Set('*'),
        currentFile: null,
        runtime: true,
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
            const { globalObject } = config
            // ? treat it as ns import
            const _ = (v: unknown) =>
                UMDBindCheck(v, [], path, `${result.globalObject ?? 'globalThis'}.${result.target}`, false)
            if (globalObject === 'globalThis' || globalObject === undefined)
                return Promise.resolve((globalThis as any)[result.target]).then(_)
            if (globalObject === 'window') return Promise.resolve((window as any)[result.target]).then(_)
            return Promise.reject(header + 'Unreachable transform case')
        }
        case 'json':
            return dynamicImport('', result.path)
        default:
            return unreachable(result)
    }
    function unreachable(_x: never): never {
        throw new Error('Unreachable case' + _x)
    }
}

export function __customDynamicImportHelper(
    _: typeof __dynamicImportTransform,
    c: NormalizedPluginConfig,
    d: (x: string) => Promise<unknown>,
    u: typeof _import,
    m: typeof moduleSpecifierTransform,
) {
    return (p: string) => _(p, c, d, u, m)
}
type ToJSON = {
    type: 'json'
    json: string | null
    path: string
}

type ToRewrite = {
    type: 'rewrite'
    nextPath: string
}
type DiagObj = {
    message: string
    key: string
    code: number
}
type ToError = {
    type: 'error'
} & DiagObj

type ToNoOP = {
    type: 'noop'
}

//#region Internal code
type ModuleSpecifierTransformResult = ToJSON | ToRewrite | ToError | ToNoOP | RewriteRulesUMD
/**
 * This function will also be included in the runtime for dynamic transform.
 * @internal
 */
export function moduleSpecifierTransform(
    context: Readonly<
        {
            parseRegExp: (string: string) => RegExp | null
            accessingImports: Set<string>
            currentFile: string | null
            runtime: boolean
        } & Pick<
            CustomTransformationContext<any>,
            | 'config'
            | 'path'
            | 'queryWellknownUMD'
            | 'queryPackageVersion'
            | 'treeshakeProvider'
            | 'getCompilerOptions'
            | 'resolveJSONImport'
            | 'resolveFolderImport'
        >
    >,
    opt?: NormalizedRewriteRules,
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
        InvalidPath,
    }
    const message = {
        [Diag.TransformToUMDFailed]: 'Failed to transform the path "{0}" to UMD import declaration.',
        [Diag.QueryPackageVersionFailed]: 'Failed to query the package version of import "{0}".',
        [Diag.TransformToUMDFailedCustom]:
            'Failed to transform the path "{0}" to UMD import declaration. After applying the rule "{1}", the result is an empty string.',
        [Diag.InvalidPath]: 'Invalid path "{0}".{1}',
    }
    const noop: ToNoOP = { type: 'noop' }
    return self(context, opt)
    /** Can't use the name moduleSpecifierTransform to do recursive, the name might be changed in the inline mode */
    function self(
        ...[context, opt = context.config.rules || { type: 'simple', enum: 'umd' }]: Parameters<
            typeof moduleSpecifierTransform
        >
    ): ModuleSpecifierTransformResult {
        const {
            path,
            config,
            parseRegExp,
            queryPackageVersion,
            currentFile,
            accessingImports,
            getCompilerOptions,
            resolveFolderImport,
            resolveJSONImport,
            runtime,
            treeshakeProvider,
        } = context
        const {
            jsonImport,
            folderImport,
            extName,
            appendExtensionName,
            extNameRemote,
            appendExtensionNameForRemote,
            globalObject,
        } = config
        const conf = extName ?? appendExtensionName
        const expectedExtension = conf === true ? '.js' : conf ?? '.js'

        if (opt.type === 'noop') return noop
        if (path === '.') {
            // special case fast pass
            if (folderImport) return ToRewrite(appendExt('./index', expectedExtension))
            else return ToError(Diag.InvalidPath, '.', ' Please write "./index" instead.')
        }
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (conf === false) return noop
            const remote = extNameRemote ?? appendExtensionNameForRemote
            if (jsonImport && path.endsWith('.json')) {
                const nondeterministicJSONImport = ToJSON(null, path)
                if (runtime) return nondeterministicJSONImport
                if (!currentFile) return unreachable('', null!)
                if (isHTTPModuleSpecifier(path)) return nondeterministicJSONImport
                try {
                    const json = resolveJSONImport(path, currentFile)
                    switch (jsonImport) {
                        case 'data':
                            return ToRewrite(`data:text/javascript,export default JSON.parse(${JSON.stringify(json)})`)
                        case 'inline':
                        case true:
                            return ToJSON(json, path)
                        default:
                            return unreachable('json', jsonImport)
                    }
                } catch (e) {
                    return nondeterministicJSONImport
                }
            }
            if (remote !== true && isHTTPModuleSpecifier(path)) return noop
            if (endsWithExt(path, expectedExtension)) return noop
            if (folderImport && currentFile) {
                const result = resolveFolderImport(path, currentFile)
                if (result) return ToRewrite(appendExt(result, expectedExtension))
            }
            return ToRewrite(appendExt(path, expectedExtension))
        }
        const { sub, nspkg } = resolveNS(path)
        switch (opt.type) {
            case 'simple': {
                const e = opt.enum
                switch (e) {
                    case 'esm.run':
                    case 'jsdelivr':
                    case 'pikacdn':
                    case 'skypack':
                    case 'jspm':
                    case 'unpkg': {
                        function getURL(domain: string): Omit<RewriteRulesURL, 'type'> {
                            return {
                                noVersion: `https://${domain}/$packageName$$subpath$`,
                                withVersion: `https://${domain}/$packageName$@$version$$subpath$`,
                            }
                        }
                        const URLs: Record<typeof e, Omit<RewriteRulesURL, 'type'>> = {
                            jspm: getURL('jspm.dev'),
                            'esm.run': getURL('esm.run'),
                            pikacdn: getURL('cdn.skypack.dev'),
                            skypack: getURL('cdn.skypack.dev'),
                            unpkg: getURL('unpkg.com'),
                            jsdelivr: getURL('cdn.jsdelivr.net'),
                        }
                        URLs.unpkg.noVersion += '?module'
                        URLs.unpkg.withVersion += '?module'
                        return self(context, {
                            type: 'url',
                            ...URLs[e]!,
                        })
                    }
                    case 'umd':
                        const target = importPathToUMDName(path)
                        if (!target) return ToError(Diag.TransformToUMDFailed, path, '')
                        const nextOpt: RewriteRulesUMD = {
                            type: 'umd',
                            target,
                            globalObject,
                            umdImportPath: undefined,
                        }
                        return self(context, nextOpt)
                    default:
                        return unreachable('simple type', e)
                }
            }
            case 'umd': {
                const { umdImportPath, treeshake, target } = opt
                if (treeshake && treeshakeProvider) {
                    treeshakeProvider(path, accessingImports, treeshake, getCompilerOptions())
                    return ToUMD({ target: path, globalObject: target, umdImportPath })
                } else {
                    if (treeshake) console.error('Tree shaking is not available at runtime.')
                    const target = importPathToUMDName(path)
                    if (!target) return ToError(Diag.TransformToUMDFailed, path, '')
                    return ToUMD({ target, globalObject, umdImportPath })
                }
            }
            case 'url': {
                const { noVersion, withVersion } = opt
                const version = queryPackageVersion(path)
                let string: string | undefined = undefined
                if (version && withVersion) string = withVersion.replace(versionRegExp, version)
                if ((version && !withVersion && noVersion) || (!version && noVersion)) string = noVersion
                if (string)
                    return ToRewrite(
                        string
                            .replace(packageNameRegExp, nspkg)
                            .replace(subpathRegExp, sub === undefined ? '' : '/' + sub),
                    )
                return unreachable('url case', null!)
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
                    if (!target) return ToError(Diag.TransformToUMDFailedCustom, path, rule)

                    const umdName = importPathToUMDName(path)
                    const version = queryPackageVersion(path)
                    const { globalObject = config.globalObject, umdImportPath } = ruleValue
                    if (!umdName && (target.match(umdNameRegExp) || umdImportPath?.match(umdNameRegExp)))
                        return ToError(Diag.TransformToUMDFailed, path, rule)
                    if (!version && (target.match(versionRegExp) || umdImportPath?.match(versionRegExp)))
                        return ToError(Diag.QueryPackageVersionFailed, path, rule)
                    const [nextTarget, nextUMDImportPath] = [target, umdImportPath || ''].map((x) =>
                        x
                            .replace(packageNameRegExp, path)
                            .replace(umdNameRegExp, umdName!)
                            .replace(versionRegExp, version!),
                    )
                    return ToUMD({ target: nextTarget, globalObject, umdImportPath: nextUMDImportPath })
                }
                return noop
            }
            default:
                return unreachable('opt switch', opt)
        }
    }
    function ToUMD(rest: Omit<RewriteRulesUMD, 'type'>): RewriteRulesUMD {
        return { type: 'umd', ...rest }
    }
    function ToRewrite(nextPath: string): ToRewrite {
        return { type: 'rewrite', nextPath }
    }
    function ToJSON(json: ToJSON['json'], path: ToJSON['path']): ToJSON {
        return { type: 'json', json, path }
    }
    function ToError(type: Diag, arg0: string, arg1: string): ToError {
        return {
            type: 'error',
            message: message[type].replace('{0}', arg0).replace('{1}', arg1),
            code: type,
            // was Diag[type]
            key: type.toString(),
        }
    }
    function unreachable(str: string, val: never): never {
        console.error(val)
        throw new Error('Unreachable case at ' + str)
    }
    function isBrowserCompatibleModuleSpecifier(path: string) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path) || isDataOrBlobModuleSpecifier(path)
    }
    // copy pasted to core, remember to sync them.
    function isHTTPModuleSpecifier(path: string) {
        return path.startsWith('http://') || path.startsWith('https://')
    }
    function isLocalModuleSpecifier(path: string) {
        return path.startsWith('.') || path.startsWith('/')
    }
    function isDataOrBlobModuleSpecifier(path: string) {
        return path.startsWith('blob:') || path.startsWith('data:')
    }
    function endsWithExt(path: string, expectedExt: string | false) {
        if (expectedExt === false) return true
        if (path.endsWith(expectedExt)) return true
        return false
    }
    function appendExt(path: string, expectedExt: string | false) {
        if (endsWithExt(path, expectedExt)) return path
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
