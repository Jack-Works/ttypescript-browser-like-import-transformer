/**
 * In this file there some host helper functions that must run in node
 */
import creatTransform from './core'
import * as ts from 'typescript'
import * as ttsclib from './ttsclib'
import * as configParser from './config-parser'
import { queryWellknownUMD } from './well-known-umd'
import { readFileSync } from 'fs'
import { join, relative, posix } from 'path'
import { _ImportMapFunctionOpts } from './plugin-config'
export default creatTransform({ ts, queryWellknownUMD, ttsclib, importMapResolve, queryPackageVersion, configParser })

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
function importMapResolve(opt: _ImportMapFunctionOpts): string | null {
    const { config, currentWorkingDirectory: cwd, moduleSpecifier, sourceFilePath, rootDir } = opt
    if (config.importMap === undefined) return null
    if (config.importMap.type === 'function') return config.importMap.function(opt)
    let lib: _jsenv_import_map
    try {
        lib = require('@jsenv/import-map')
    } catch (e) {
        throw new Error('You need to install @jsenv/import-map as dependencies to resolve import map')
    }

    // TODO: help wanted, it seems there is no API to know the path of tsconfig.
    const tsconfigPath = cwd
    // ? e.g. ./src/ equals to tsconfig.rootPath
    const rootPath = rootDir
    const importMapPath = join(tsconfigPath, config.importMap.mapPath)
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
