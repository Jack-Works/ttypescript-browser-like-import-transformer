const map = new Map([
    ['react', 'React'],
    ['vue', 'Vue'],
    ['@material-ui/core', 'MaterialUI'],
])
export function queryWellknownUMD(packageName: string) {
    return map.get(packageName)
}
