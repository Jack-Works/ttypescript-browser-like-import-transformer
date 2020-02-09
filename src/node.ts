import creatTransform from './core'
import * as ts from 'typescript'
import { queryWellknownUMD } from './well-known-umd'
import * as ttsclib from './ttsclib'
export default creatTransform(ts, {
    queryWellknownUMD,
    ttsclib,
})
