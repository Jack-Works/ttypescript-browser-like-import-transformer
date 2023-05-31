import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

execSync('yarn api-extractor run')
const file = JSON.parse(readFileSync('./temp/config.api.json', 'utf-8'))
function touch(o = file) {
    switch (typeof o) {
        case 'boolean':
        case 'number':
            return o
        case 'string':
            o = o.replace(/\@magic-works\/ttypescript-browser-like-import-transformer/g, 'config')
            o = replace(o, /\!out\((.+?)\)/g, (file) => readFileSync('./specs/__snapshot__/' + file, 'utf-8'))
            o = replace(o, /\!src\((.+?)\)/g, (file) => readFileSync('./specs/tests/' + file, 'utf-8'))
            return o
        case 'object':
            if (o === null) return o
            if (Array.isArray(o)) return o.map(touch)
            return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, touch(v)]))
        default:
            throw 'Unreachable case'
    }
}
/**
 * @param {string} str
 * @param {RegExp} regex
 * @param {(file: any) => string } getFile
 */
function replace(str, regex, getFile) {
    const backquote = '```'
    return str.replace(regex, (_, file) => {
        const src = getFile(file)
        debugger
        return `

Filename: \`${file}\`
${backquote}${file.replace(/^.+\./, '')}
${src
    .replace(/[\s\r\n]+$/, '')
    .replace('../../../cjs/node.js', '@magic-works/ttypescript-browser-like-import-transformer')}
${backquote}
`
            .split('\n')
            .map((x, i) => (i === 0 ? x : ' * ' + x))
            .join('\n')
    })
}
writeFileSync('./temp/config.api.json', JSON.stringify(touch(file)))
execSync('yarn api-documenter markdown --input temp --output-folder docs')
