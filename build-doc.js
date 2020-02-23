const { execSync } = require('child_process')
const { readFileSync, writeFileSync } = require('fs')

try {
    execSync('yarn api-extractor run')
} catch (e) {
    console.log(e)
}
const file = require('./temp/config.api.json')
function touch(o = file) {
    switch (typeof o) {
        case 'boolean':
        case 'number':
            return o
        case 'string':
            o = o.replace(/\@magic-works\/ttypescript-browser-like-import-transformer/g, 'config')
            o = o.replace(
                /\!out\((.+)\)/g,
                (_, file) => `

\`\`\`js
${readFileSync('./specs/__snapshot__/' + file, 'utf-8').replace(/\n$/, '')}
\`\`\``,
            )
            o = o.replace(
                /\!src\((.+)\)/g,
                (_, file) => `

\`\`\`js
${readFileSync('./specs/tests/' + file, 'utf-8').replace(/\n$/, '')}
\`\`\``,
            )
            return o
        case 'object':
            if (o === null) return o
            if (Array.isArray(o)) return o.map(touch)
            return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, touch(v)]))
        default:
            throw 'Unreachable case'
    }
}
writeFileSync('./temp/config.api.json', JSON.stringify(touch(file)))
execSync('yarn api-documenter markdown --input temp --output-folder docs')
