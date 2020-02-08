import { statSync, readdirSync, stat, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { spawnSync, execSync } from 'child_process'

const dir = join(__dirname, './tests/')
// "/// {}"
const pluginConfigRegExp = /\/\/\/(.+)\n/
// "//@ filename.ts"
const referenceFileRegExp = /\/\/@ (.+)/
// "//! {}"
const compilerOptionsRegExp = /\/\/! (.+)/
const snapshotDir = join(dir, '../__snapshot__/')

if (isMainThread) {
    for (const testFile of readdirSync(dir)) {
        // statSync(test).isDirectory() ? runFolder(test) : runSingleFile(test)
        // worker({ path: join(dir, testFile), filename: testFile })
        const worker = new Worker(__filename, {
            workerData: { path: join(dir, testFile), filename: testFile } as WorkerParam,
        })
        worker.on('error', e => {
            throw e
        })
        worker.on('exit', code => {
            if (code !== 0) throw new Error(`Worker stopped with exit code ${code}`)
        })
        // // worker.on('message', resolve)
    }
} else {
    worker()
}
async function worker(script: WorkerParam = workerData) {
    const ts = await import('typescript')
    const transformer = await import('../src/node')
    const sharedCompilerOptions = require('./tsconfig.json')
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
                                ...eval('(' + inlineConfig[1] + ')'),
                            },
                        ),
                    ],
                },
            })
            outputText = result.outputText
        } catch (e) {
            outputText = '// ' + e.message
        }
        writeFileSync(join(snapshotDir, script.filename.replace(/tsx$/g, 'jsx').replace(/ts$/, 'js')), outputText)
    } else {
        const cmd = `yarn ttsc --target ESNext --module ESNext -p ${join(script.path, 'tsconfig.json')} --outDir ${join(
            snapshotDir,
            script.filename,
        )}`
        try {
            execSync(cmd)
        } catch (e) {
            console.warn(e)
        }
    }
}
interface WorkerParam {
    path: string
    filename: string
}
