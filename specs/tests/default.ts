/// {}
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2)
// Node style import
import a from 'a'
import b, { c, d } from 'b'
import * as e from 'c'
import 'd'

// relative import without ext name
import a1 from './a'
import b1, { c1, d1 } from './b'
import * as e1 from '/c'
import './d'

// browser style import
import a2 from 'http://example.com/'
import b2, { c2, d2 } from 'https://example.com'
import * as e2 from 'http://example.com/'
import 'http://example.com/'

const x = 1
export { x }
// Node style export
export { c, d } from 'b'
export * as e from 'c'

// relative import without ext name
export { c1, d1 } from './b'
export * as e1 from './c'

// browser style import
export { c2, d2 } from 'http://example.com/'
export * as e2 from 'http://example.com/'
