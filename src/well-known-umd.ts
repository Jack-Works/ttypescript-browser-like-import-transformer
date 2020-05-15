const map = new Map([
    ['react', 'React'],
    ['react-dom', 'ReactDOM'],
    ['vue', 'Vue'],
    ['@material-ui/core', 'MaterialUI'],
])
export function queryWellknownUMD(packageName: string) {
    return map.get(packageName) ?? null
}
