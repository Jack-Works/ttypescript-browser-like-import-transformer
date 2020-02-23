const { execSync } = require('child_process')
const { readFileSync, writeFileSync } = require('fs')

execSync('yarn api-extractor run')
const file = require('./temp/config.api.json')
function touch(o = file) {
    switch (typeof o) {
        case 'boolean':
        case 'number':
            return o
        case 'string':
            o = o.replace(/\@magic-works\/ttypescript-browser-like-import-transformer/g, 'config')
            o = replace(o, /\!out\((.+?)\)/g, file => readFileSync('./specs/__snapshot__/' + file, 'utf-8'))
            o = replace(o, /\!src\((.+?)\)/g, file => readFileSync('./specs/tests/' + file, 'utf-8'))
            return o
        case 'object':
            if (o === null) return o
            if (Array.isArray(o)) return o.map(touch)
            return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, touch(v)]))
        default:
            throw 'Unreachable case'
    }
}
function replace(str, regex, getFile) {
    return str.replace(regex, (_, file) =>
        `

\`\`\`${file.replace(/^.+\./, '')}
${getFile(file).replace(/\n+$/, '')}
\`\`\`
`
            .split('\n')
            .map((x, i) => (i === 0 ? x : ' * ' + x))
            .join('\n'),
    )
}
writeFileSync('./temp/config.api.json', JSON.stringify(touch(file)))
execSync('yarn api-documenter markdown --input temp --output-folder docs')
