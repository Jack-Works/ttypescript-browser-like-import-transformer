import * as file from './file.json'
import file2 from './file.json'
import { json as b } from './file.json'
console.log('ns import', file)
console.log('default import', file2)
console.log('named import', b)
import('./file.json').then((x) => console.log('Deterministic dynamic import', x))
import(`./file${''}.json`).then((x) => console.log('Nondeterministic dynamic import', x))
