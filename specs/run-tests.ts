import { statSync, readdirSync, stat, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { spawnSync, execSync } from 'child_process'

const dir = join(__dirname, './tests/')
const inlineConfigReg = /\/\/\/(.+)\n/
const refFileReg = /\/\/@ (.+)/
const snapshotDir = join(dir, '../__snapshot__/')

if (isMainThread) {
    for (const testFile of readdirSync(dir)) {
        // statSync(test).isDirectory() ? runFolder(test) : runSingleFile(test)
        const worker = new Worker(__filename, {
            workerData: { path: join(dir, testFile), filename: testFile } as WorkerParam,
        })
        // worker.on('message', resolve)
        worker.on('error', e => {
            throw e
        })
        worker.on('exit', code => {
            if (code !== 0) throw new Error(`Worker stopped with exit code ${code}`)
        })
    }
} else {
    worker()
}
async function worker() {
    const ts = await import('typescript')
    const transformer = await import('../src/node')
    const sharedCompilerOptions = require('./tsconfig.json')
    const script: WorkerParam = workerData
    if (statSync(script.path).isFile()) {
        const file = readFileSync(script.path, 'utf-8')
        const inlineConfig = file.match(inlineConfigReg)
        const refFile = file.match(refFileReg)
        const source = refFile
            ? readFileSync(script.path.replace(script.filename, refFile[1]), 'utf-8').replace(inlineConfigReg, '')
            : file.replace(inlineConfigReg, '')
        const result = ts.transpileModule(source, {
            compilerOptions: { ...sharedCompilerOptions.compilerOptions },
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
        writeFileSync(
            join(snapshotDir, script.filename.replace(/tsx$/g, 'jsx').replace(/ts$/, 'js')),
            result.outputText,
        )
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
