import { statSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { isMainThread, workerData, Worker } from 'worker_threads'
import { execSync } from 'child_process'
import { ConfigError } from './core.js'

const dir = join(__dirname, '../specs/tests/')
// "/// {}"
const pluginConfigRegExp = /\/\/\/(.+)\n/
// "//@ filename.ts"
const referenceFileRegExp = /\/\/@ (.+)/
// "//! {}"
const compilerOptionsRegExp = /\/\/! (.+)/
const snapshotDir = join(__dirname, '../specs/__snapshot__/')

if (isMainThread) {
    for (const testFile of readdirSync(dir)) {
        // worker({ path: join(dir, testFile), filename: testFile }).catch(x => {
        //     console.error(x)
        //     process.exit(1)
        // })
        const worker = new Worker(__filename, {
            workerData: { path: join(dir, testFile), filename: testFile } as WorkerParam,
        })
        worker.on('error', e => {
            console.error(e)
            process.exit(1)
        })
        worker.on('exit', code => {
            if (code !== 0) throw new Error(`Worker stopped with exit code ${code}`)
        })
        // // worker.on('message', resolve)
    }
} else {
    worker().catch(e => {
        throw e
    })
}
async function worker(script: WorkerParam = workerData) {
    const ts = await import('typescript')
    const transformer = await import('./node.js')
    const sharedCompilerOptions = require('../specs/tsconfig.json')
    if (statSync(script.path).isFile()) {
        let outputText = ''
        try {
            const file = readFileSync(script.path, 'utf-8')
            const inlineConfig = file.match(pluginConfigRegExp)
            const referencedFile = file.match(referenceFileRegExp)
            const additionalCompilerOptions = file.match(compilerOptionsRegExp) || ['', '{}']
            const source = (referencedFile
                ? readFileSync(script.path.replace(script.filename, referencedFile[1]), 'utf-8')
                : file
            )
                .replace(compilerOptionsRegExp, '')
                .replace(pluginConfigRegExp, '')
            const result = ts.transpileModule(source, {
                compilerOptions: {
                    ...sharedCompilerOptions.compilerOptions,
                    ...eval('(' + additionalCompilerOptions[1] + ')'),
                },
                transformers: {
                    after: [
                        transformer.default(
                            {},
                            {
                                after: true,
                                ...eval('(' + inlineConfig![1] + ')'),
                            },
                        ),
                    ],
                },
            })
            outputText = result.outputText
        } catch (e) {
            if (e instanceof ConfigError) outputText = '// ' + e.message
            else throw e
        }
        writeFileSync(join(snapshotDir, script.filename.replace(/tsx$/g, 'jsx').replace(/ts$/, 'js')), outputText)
    } else {
        const cmd = `yarn ttsc --target ESNext --module ESNext -p ${join(script.path, 'tsconfig.json')} --outDir ${join(
            snapshotDir,
            script.filename,
        )}`
        try {
            execSync(cmd)
        } catch (e) {}
    }
}
interface WorkerParam {
    path: string
    filename: string
}
