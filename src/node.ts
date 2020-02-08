import creatTransform from './core'
import * as ts from 'typescript'
import { queryWellknownUMD } from './well-known-umd'
export default creatTransform(ts, queryWellknownUMD)
