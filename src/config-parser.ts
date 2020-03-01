import {
    PluginConfigs,
    BareModuleRewriteSimple,
    BareModuleRewriteUMD,
    BareModuleRewriteURL,
    BareModuleRewriteObject,
} from './plugin-config'
import { CompilerOptions } from 'typescript'

/** All ConfigError should go though this class
 * so the test framework can catch it instead of fail the whole test process */
export class ConfigError extends Error {}
export function validateConfig(config: PluginConfigs, options: CompilerOptions) {
    type('appendExtensionName', ['string', 'boolean'])
    type('appendExtensionNameForRemote', ['boolean'])
    type('bareModuleRewrite', ['boolean', 'string', 'object'])
    type('dynamicImportPathRewrite', ['boolean', 'string', 'object'])
    type('globalObject', ['string'])
    type('webModulePath', ['string'])
    type('importHelpers', ['string'])
    type('importMap', ['object'])

    if (config.importMap && !options.rootDir) throw new ConfigError('When using importMap, rootDir must be set')

    length('globalObject')
    length('webModulePath')
    length('importHelpers')

    enumCheck('dynamicImportPathRewrite', ['auto'])
    const enums = Object.keys(BareModuleRewriteSimpleEnumLocal) as BareModuleRewriteSimple[]
    enumCheck('bareModuleRewrite', enums as any)

    falseOnly('bareModuleRewrite')
    falseOnly('dynamicImportPathRewrite')

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
        if (typeof v === 'boolean' && v === true) throw new ConfigError(`When ${name} is a boolean, it must be false`)
    }
}

function normalizedBareModuleRewrite(
    conf: BareModuleRewriteObject | Record<string, BareModuleRewriteObject>,
    top = true,
): NormalizedBareModuleRewrite {
    if (conf === undefined) return { type: 'simple', enum: 'umd' }
    if (conf === false) return { type: 'noop' }

    const enums = Object.keys(BareModuleRewriteSimpleEnumLocal) as BareModuleRewriteSimple[]
    if (typeof conf === 'string') {
        if (enums.includes(conf)) return { enum: conf, type: 'simple' }
        throw new ConfigError('Unknown enums in bareModuleRewrite')
    }

    if ('type' in conf) {
        const opt = conf as BareModuleRewriteUMD | BareModuleRewriteURL
        if (opt.type === 'url') {
            if (opt.noVersion === opt.withVersion && opt.noVersion === undefined) {
                throw new ConfigError('At least set one of noVersion or withVersion')
            }
            return opt
        }
        if (opt.type === 'umd') {
            if (top === true)
                throw new ConfigError(
                    'There is no meaning to use UMD detailed settings at top level of bareModuleRewrite',
                )
            return opt
        }
        throw new ConfigError('Unknown tagged union in bareModuleRewrite')
    } else {
        if (top === false) throw new ConfigError("NormalizedBareModuleRewrite can't be recursive in bareModuleRewrite")
        const kv: Record<string, NormalizedBareModuleRewrite> = {}
        for (const [k, v] of Object.entries(conf)) {
            Reflect.set(kv, k, normalizedBareModuleRewrite(v, false))
        }
        return { type: 'complex', config: kv }
    }
}
export function normalizePluginConfig(config: PluginConfigs): NormalizedPluginConfig {
    if (config.bareModuleRewrite !== undefined)
        return {
            ...config,
            bareModuleRewrite: normalizedBareModuleRewrite(config.bareModuleRewrite),
        }
    return { ...config, bareModuleRewrite: undefined }
}

enum BareModuleRewriteSimpleEnumLocal {
    snowpack = 'snowpack',
    umd = 'umd',
    unpkg = 'unpkg',
    pikacdn = 'pikacdn',
}
const BareModuleRewriteSimple: BareModuleRewriteSimpleEnum = BareModuleRewriteSimpleEnumLocal
type BareModuleRewriteSimpleEnum = {
    [key in BareModuleRewriteSimple]: key
}
export interface NormalizedPluginConfig extends Omit<PluginConfigs, 'bareModuleRewrite'> {
    bareModuleRewrite?: NormalizedBareModuleRewrite
}
export type NormalizedBareModuleRewrite =
    | BareModuleRewriteURL
    | BareModuleRewriteUMD
    | { type: 'noop' }
    | { type: 'simple'; enum: BareModuleRewriteSimple }
    // Can not use a Map here. Because the result will be stringified.
    | { type: 'complex'; config: Record<string, NormalizedBareModuleRewrite> }
