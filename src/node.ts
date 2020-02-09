import creatTransform from './core'
import * as ts from 'typescript'
import * as ttsclib from './ttsclib'
import { queryWellknownUMD } from './well-known-umd'
import { readFileSync } from 'fs'
import { join } from 'path'
export default creatTransform(ts, {
    queryWellknownUMD,
    ttsclib,
    version: JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')).version,
})
