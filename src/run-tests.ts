import { statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMainThread, workerData, Worker } from 'node:worker_threads'
import { execSync } from 'node:child_process'
import { ConfigError } from './config-parser.js'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'

const dir = new URL('../specs/tests/', import.meta.url)
// "/// {}"
const pluginConfigRegExp = /\/\/\/(.+)\n/
// "//@ filename.ts"
const referenceFileRegExp = /\/\/@ (.+)/
// "//! {}"
const compilerOptionsRegExp = /\/\/! (.+)/
const snapshotDir = new URL('../specs/__snapshot__/', import.meta.url)
const filter = process.argv[2]

if (isMainThread) {
    for (const testFile of readdirSync(dir)) {
        if (filter !== undefined && !testFile.toLowerCase().match(filter)) continue
        if (filter) {
            worker({ path: fileURLToPath(new URL(testFile, dir)), filename: testFile }).catch((x) => {
                debugger
                console.error(x)
                process.exit(1)
            })
        } else {
            const worker = new Worker(new URL(import.meta.url), {
                workerData: { path: fileURLToPath(new URL(testFile, dir)), filename: testFile } as WorkerParam,
            })
            worker.on('error', (e) => {
                console.error(e)
                process.exit(1)
            })
            worker.on('exit', (code) => {
                if (code !== 0) throw new Error(`Worker stopped with exit code ${code}`)
            })
        }
    }
} else {
    worker().catch((e) => {
        throw e
    })
}
async function worker(script: WorkerParam = workerData) {
    const ts = (await import('typescript')).default
    const transformer = await import('./node.js')
    const sharedCompilerOptions = JSON.parse(readFileSync(new URL('../specs/tsconfig.json', import.meta.url), 'utf-8'))
    if (statSync(script.path).isFile()) {
        let outputText = ''
        try {
            const file = readFileSync(script.path, 'utf-8')
            const inlineConfig = file.match(pluginConfigRegExp) || ['', '{}']
            function tryEval(x: string) {
                try {
                    return eval(`(${x})`)
                } catch (e) {
                    console.error('Syntax error string:', x)
                }
            }
            const referencedFile = file.match(referenceFileRegExp)
            const additionalCompilerOptions = file.match(compilerOptionsRegExp) || ['', '{}']
            const source = (
                referencedFile ? readFileSync(script.path.replace(script.filename, referencedFile[1]), 'utf-8') : file
            )
                .replace(compilerOptionsRegExp, '')
                .replace(pluginConfigRegExp, '')
            const compilerOptions = {
                ...sharedCompilerOptions.compilerOptions,
                ...tryEval(additionalCompilerOptions[1]),
            }
            const pluginConfig = tryEval(inlineConfig[1])
            const result = ts.transpileModule(source, {
                compilerOptions: compilerOptions,
                transformers: {
                    after: [
                        transformer.default(
                            { getCurrentDirectory: cwd },
                            {
                                after: true,
                                ...pluginConfig,
                            },
                        ),
                    ],
                },
            })
            delete compilerOptions.target
            delete compilerOptions.moduleResolution
            outputText = `// CompilerOptions: ${JSON.stringify(compilerOptions)}
// PluginConfig: ${JSON.stringify(pluginConfig)}
${result.outputText}`
            const diags = ts.formatDiagnostics(result.diagnostics || [], {
                getCanonicalFileName: () => script.path,
                getCurrentDirectory: () => '/tmp/',
                getNewLine: () => '\n',
            })
            if (result.diagnostics?.length) outputText += '/* Diagnostics:' + diags + '*/'
        } catch (e) {
            if (e instanceof ConfigError) outputText = '// ' + e.message
            else throw e
        }
        writeFileSync(new URL(script.filename.replace(/tsx$/g, 'jsx').replace(/ts$/, 'js'), snapshotDir), outputText)
    } else {
        const cmd = `yarn ttsc --target ESNext --module ESNext -p ${join(
            script.path,
            'tsconfig.json',
        )} --outDir ${fileURLToPath(new URL(script.filename, snapshotDir))}`
        try {
            execSync(cmd)
        } catch (e) {}
    }
}
interface WorkerParam {
    path: string
    filename: string
}
