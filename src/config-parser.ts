import type {
    PluginConfigs,
    RewriteRulesSimple,
    RewriteRulesUMD,
    RewriteRulesURL,
    RewriteRulesObject,
} from './plugin-config.js'
import type { CompilerOptions } from 'typescript'

/** All ConfigError should go though this class
 * so the test framework can catch it instead of fail the whole test process */
export class ConfigError extends Error {}
export function validateConfig(config: PluginConfigs, options: CompilerOptions) {
    type('appendExtensionName', ['string', 'boolean'])
    type('appendExtensionNameForRemote', ['boolean'])
    type('extName', ['string', 'boolean'])
    type('extNameRemote', ['boolean'])
    type('bareModuleRewrite', ['boolean', 'string', 'object'])
    type('rules', ['boolean', 'string', 'object'])
    type('dynamicImportPathRewrite', ['boolean', 'string', 'object'])
    type('globalObject', ['string'])
    type('importHelpers', ['string'])
    type('jsonImport', ['string', 'boolean'])
    type('importMap', ['object'])

    if (config.importMap && !options.rootDir) throw new ConfigError('When using importMap, rootDir must be set')

    length('globalObject')
    length('importHelpers')

    enumCheck('dynamicImportPathRewrite', ['auto'])
    const enums = Object.keys(RewriteRulesSimpleEnumLocal) as RewriteRulesSimple[]
    enumCheck('bareModuleRewrite', enums as any)
    enumCheck('rules', enums as any)
    enumCheck('jsonImport', ['data', 'inline'])

    falseOnly('bareModuleRewrite')
    falseOnly('rules')
    falseOnly('dynamicImportPathRewrite')
    trueOnly('jsonImport')

    const _x = typeof config
    function type(name: keyof PluginConfigs, _: typeof _x[], v: any = config[name], noUndefined = false) {
        if (!noUndefined) _ = _.concat('undefined')
        if (!_.includes(typeof v)) throw new ConfigError(`type of ${name} in the tsconfig is not correct`)
        if (_.includes('object') && typeof v === null) throw new ConfigError(`${name} can't be null!`)
    }
    function length(name: keyof PluginConfigs, v: any = config[name]) {
        if (typeof v === 'string' && v.length === 0) throw new ConfigError(name + ' cannot be an empty string')
    }
    function enumCheck<T extends keyof PluginConfigs>(name: T, enums: PluginConfigs[T][], v: any = config[name]) {
        if (typeof v === 'string' && !enums.includes(v as any))
            throw new ConfigError(`When ${name} is a string, it must be the enum ${enums}, but found ${v}`)
    }
    function falseOnly(name: keyof PluginConfigs, v: any = config[name]) {
        if (v === true) throw new ConfigError(`When ${name} is a boolean, it must be false`)
    }
    function trueOnly(name: keyof PluginConfigs, v: any = config[name]) {
        if (v === false) throw new ConfigError(`When ${name} is a boolean, it must be true`)
    }
}

function normalizedRewriteRules(
    conf: RewriteRulesObject | Record<string, RewriteRulesObject>,
    top = true,
): NormalizedRewriteRules {
    if (conf === undefined) return { type: 'simple', enum: 'umd' }
    if (conf === false) return { type: 'noop' }

    const enums = Object.keys(RewriteRulesSimpleEnumLocal) as RewriteRulesSimple[]
    if (typeof conf === 'string') {
        if (enums.includes(conf)) return { enum: conf, type: 'simple' }
        throw new ConfigError('Unknown enums in rules')
    }

    if ('type' in conf) {
        const opt = conf as RewriteRulesUMD | RewriteRulesURL
        if (opt.type === 'url') {
            if (opt.noVersion === opt.withVersion && opt.noVersion === undefined) {
                throw new ConfigError('At least set one of noVersion or withVersion')
            }
            return opt
        }
        if (opt.type === 'umd') {
            if (top === true)
                throw new ConfigError('There is no meaning to use UMD detailed settings at top level of rules')
            return opt
        }
        throw new ConfigError('Unknown tagged union in rules')
    } else {
        if (top === false) throw new ConfigError("NormalizedRewriteRules can't be recursive in rules")
        const kv: Record<string, NormalizedRewriteRules> = {}
        for (const [k, v] of Object.entries(conf)) {
            Reflect.set(kv, k, normalizedRewriteRules(v, false))
        }
        return { type: 'complex', config: kv }
    }
}
export function normalizePluginConfig(config: PluginConfigs): NormalizedPluginConfig {
    const conf = config.rules ?? config.bareModuleRewrite
    if (conf !== undefined)
        return {
            ...config,
            rules: normalizedRewriteRules(conf),
        }
    return { ...config, rules: undefined }
}

enum RewriteRulesSimpleEnumLocal {
    umd = 'umd',
    unpkg = 'unpkg',
    /** @see https://skypack.dev/ */
    skypack = 'skypack',
    /** @see https://jspm.org/jspm-dev-release */
    jspm = 'jspm',
    jsdelivr = 'jsdelivr',
    'esm.run' = 'esm.run',
}
const RewriteRulesSimple: RewriteRulesSimpleEnum = RewriteRulesSimpleEnumLocal
type RewriteRulesSimpleEnum = {
    [key in RewriteRulesSimple]: key
}
export interface NormalizedPluginConfig extends Omit<PluginConfigs, 'bareModuleRewrite' | 'rules'> {
    rules?: NormalizedRewriteRules
}
export type NormalizedRewriteRules =
    | RewriteRulesURL
    | RewriteRulesUMD
    | { type: 'noop' }
    | { type: 'simple'; enum: RewriteRulesSimple }
    // Can not use a Map here. Because the result will be stringified.
    | { type: 'complex'; config: Record<string, NormalizedRewriteRules> }
