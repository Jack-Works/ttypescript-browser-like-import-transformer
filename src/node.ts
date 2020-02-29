/**
 * In this file there some host helper functions that must run in node
 */
import creatTransform from './core'
import * as ts from 'typescript'
import * as ttsclib from './ttsclib'
import * as configParser from './config-parser'
import { queryWellknownUMD } from './well-known-umd'
import { readFileSync, writeFileSync } from 'fs'
import { join, relative, posix } from 'path'
import { ImportMapFunctionOpts, BareModuleRewriteUMD } from './plugin-config'
export default creatTransform({
    ts,
    queryWellknownUMD,
    ttsclib,
    importMapResolve,
    queryPackageVersion,
    configParser,
    treeshakeProvider,
})

const treeshakeMap = new Map<
    /** Output file */ string,
    Map</** Dependency path */ string, /** Used import/exports */ Set<string>>
>()
function treeshakeProvider(
    dependency: string,
    accessImports: Set<string>,
    config: NonNullable<BareModuleRewriteUMD['treeshake']>,
    opts: ts.CompilerOptions,
) {
    const tsconfigPath = opts.configFilePath as string
    const targetFilePath = join(tsconfigPath, '../', config.out)
    if (!treeshakeMap.has(targetFilePath)) treeshakeMap.set(targetFilePath, new Map())
    const fileMap = treeshakeMap.get(targetFilePath)!
    if (!fileMap.has(dependency)) fileMap.set(dependency, new Set())
    const usedImports = fileMap.get(dependency)!

    accessImports.forEach(x => usedImports.add(x))

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
                .filter(x => x !== '!')
                .map<[string, string]>(x => {
                    const uniq = uniqueName()
                    return [x, uniq]
                })
            if (binds.length === 0) continue
            file += `import { ${binds.map(x => x.join(' as ')).join(', ')} } from ${path}` + end
            file += `_.set(${path}, { ${binds.map(x => x.join(': ')).join(', ')} })` + end
        }
        file += `export default (${createGetter.toString()})()` + end
        writeFileSync(targetFilePath, file)

        // The following code is run in runtime. Don't use it.
        const _: Map<string, object> = new Map()
        function createGetter() {
            return new Proxy(_, {
                get(target, key: string) {
                    return target.get(key)
                },
            })
        }
    }
}

function queryPackageVersion(path: string) {
    const [a, b] = path.split('/')
    // ? this may not work for node 13 package exports
    const c = (a.startsWith('@') ? `${a}/${b}` : a) + '/package.json'
    try {
        if (path === '@magic-works/ttypescript-browser-like-import-transformer')
            return require('../package.json').version
        return JSON.parse(readFileSync(require.resolve(c), 'utf-8')).version
    } catch {}
    return null
}

/**
 * @experimental I don't know if it is working correctly...
 */
function importMapResolve(opt: ImportMapFunctionOpts): string | null {
    const { config, moduleSpecifier, sourceFilePath, rootDir, tsconfigPath } = opt
    if (config.importMap === undefined) return null
    if (config.importMap.type === 'function') return config.importMap.function(opt)
    let lib: _jsenv_import_map
    try {
        lib = require('@jsenv/import-map')
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
