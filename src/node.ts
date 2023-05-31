/**
 * In this file there some host helper functions that must run in node
 */
import * as ts from 'typescript'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, posix, isAbsolute } from 'node:path'
import createTransform from './core.js'
import * as runtime from './runtime.js'
import * as configParser from './config-parser.js'
import { queryWellknownUMD } from './well-known-umd.js'
// @ts-ignore
import __filename from '#filename'
import type { ImportMapFunctionOpts, RewriteRulesUMD } from './plugin-config.js'
import { createRequire } from 'node:module'

const __require = createRequire(__filename)
export default createTransform({
    ts: (ts as any).default || ts,
    queryWellknownUMD,
    runtime,
    importMapResolve,
    queryPackageVersion,
    configParser,
    treeshakeProvider,
    resolveJSONImport(path, parent) {
        return readFileSync(join(parent, '../', path), 'utf-8')
    },
    resolveFolderImport(path, parent) {
        const absolute = join(parent, '../', path)
        let indexed = posix.join(path, './index')
        if (!indexed.startsWith('.')) indexed = './' + indexed
        const candidates = guessExtension(absolute, path).concat(guessExtension(join(absolute, './index'), indexed))
        function guessExtension(x: string, orig: string) {
            return ['.tsx', '.ts', '.mjs', '.cjs', '.jsx', '.js'].map((y) => [x + y, orig] as const)
        }
        return candidates.find(([a]) => existsSync(a))?.[1] ?? null
    },
})

const treeshakeMap = new Map<
    /** Output file */ string,
    Map</** Dependency path */ string, /** Used import/exports */ Set<string>>
>()
function treeshakeProvider(
    dependency: string,
    accessImports: Set<string>,
    config: NonNullable<RewriteRulesUMD['treeshake']>,
    opts: ts.CompilerOptions,
) {
    const tsconfigPath = opts.configFilePath as string
    const targetFilePath = join(tsconfigPath, '../', config.out)
    if (!treeshakeMap.has(targetFilePath)) treeshakeMap.set(targetFilePath, new Map())
    const fileMap = treeshakeMap.get(targetFilePath)!
    if (!fileMap.has(dependency)) fileMap.set(dependency, new Set())
    const usedImports = fileMap.get(dependency)!

    accessImports.forEach((x) => usedImports.add(x))

    {
        const end = ';\n'
        let count = 0
        function uniqueName() {
            count++
            return '_' + count
        }
        let file = `const _ = new Map()` + end
        for (const [importPath, bindings] of fileMap) {
            const path = JSON.stringify(importPath)
            if (bindings.has('*')) {
                const uniq = uniqueName()
                file += `import * as ${uniq} from ${path}` + end
                file += `_.set(${path}, ${uniq})` + end
                continue
            }
            if (bindings.has('!')) file += `import ${path}` + end
            const binds = Array.from(bindings)
                .filter((x) => x !== '!')
                .map<[string, string]>((x) => {
                    const uniq = uniqueName()
                    return [x, uniq]
                })
            if (binds.length === 0) continue
            file += `import { ${binds.map((x) => x.join(' as ')).join(', ')} } from ${path}` + end
            file += `_.set(${path}, createESModuleInterop({ ${binds.map((x) => x.join(': ')).join(', ')} }))` + end
        }
        file += `export default (${createExport.toString()})()` + end
        file += createESModuleInterop.toString() + end
        writeFileSync(targetFilePath, file)

        // The following code is run in runtime. Don't use it.
        const _: Map<string, object> = new Map()
        function createExport() {
            return new Proxy(_, {
                get(target, key: string) {
                    return target.get(key)
                },
            })
        }
        function createESModuleInterop(x: any) {
            if (typeof x !== 'object' || x === null) return { default: x, __esModule: true }
            return new Proxy(x, {
                get(target, key) {
                    const v = target[key]
                    if (v) return v
                    if (key === '__esModule') return true
                    return undefined
                },
            })
        }
    }
}

function queryPackageVersion(path: string, parent: string | undefined | null) {
    const [a, b] = path.split('/')
    // ? this may not work for node 13 package exports
    const c = (a.startsWith('@') ? `${a}/${b}` : a) + '/package.json'
    try {
        if (path === '@magic-works/ttypescript-browser-like-import-transformer') {
            return __require('../package.json').version
        } else {
            const this_require = parent && isAbsolute(parent) ? createRequire(parent) : __require
            return JSON.parse(readFileSync(this_require.resolve(c), 'utf-8')).version
        }
    } catch {}
    return null
}

/**
 * @experimental I don't know if it is working correctly...
 */
function importMapResolve(opt: ImportMapFunctionOpts): string | null {
    const { config, moduleSpecifier, sourceFilePath, rootDir, tsconfigPath } = opt
    if (opt.moduleSpecifier.startsWith('.') || opt.moduleSpecifier.startsWith('/')) return null
    if (config.importMap === undefined) return null
    if (config.importMap.type === 'function') return config.importMap.function(opt)
    let lib: _jsenv_import_map
    try {
        lib = __require('@jsenv/import-map')
    } catch (e) {
        throw new Error('You need to install @jsenv/import-map as dependencies to resolve import map')
    }

    // ? e.g. ./src/ equals to tsconfig.rootPath
    const rootPath = rootDir
    const importMapPath = join(tsconfigPath, '../', config.importMap.mapPath)
    // ? e.g. From /home/demo/project/src/index.ts => /index.ts
    const sourceFileRelatedToRootPath = relative(rootPath, sourceFilePath).replace(/\\/g, '/')
    // TODO: what to do if sourceFileRelatedToRootPath starts with .. ?
    const domain = 'https://example.com'
    // ? e.g. https://example.com/web_modules/
    const imaginaryImportMapPath = domain + config.importMap.simulateRuntimeImportMapPosition
    // ? e.g /dist/ => https://example.com/dist/
    const imaginarySourceRoot = domain + config.importMap.simulateRuntimeSourceRoot || ''
    // ? e.g. https://example.com/dist/index.ts
    const imaginarySourceFilePath = posix.join(imaginarySourceRoot, sourceFileRelatedToRootPath)

    let map: object = config.importMap.mapObject!
    if (!map) map = JSON.parse(readFileSync(importMapPath, 'utf-8'))

    map = lib.normalizeImportMap(map, imaginaryImportMapPath)
    // console.log({ rootPath, imaginarySourceRoot, importMapPath, imaginaryImportMapPath, sourceFileRelatedToRootPath, imaginarySourceFilePath, map, moduleSpecifier })
    try {
        let resolved = lib.resolveImport({
            specifier: moduleSpecifier,
            importer: imaginarySourceFilePath,
            importMap: map,
        })
        // ? e.g. ../../web_modules/x.js
        // const resolvedPathRelatedToModule = posix.relative(imaginarySourceFilePath, resolved)
        // console.log({ resolvedPathRelatedToModule, resolved })
        return resolved.replace(/^https:\/\/example.com/, '')
    } catch (e) {
        // console.log(e)
        // throw new Error()
        return null
    }
}

type _jsenv_import_map = {
    composeTwoImportMaps: (mapA: object, mapB: object) => object
    normalizeImportMap: (map: object, baseURL: string) => object
    resolveImport: (opts: { specifier: string; importer: string; importMap: object }) => string
}
