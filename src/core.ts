import {
    TransformationContext,
    SourceFile,
    Node,
    VisitResult,
    Expression,
    NodeArray,
    ImportDeclaration,
    ExportDeclaration,
    ImportClause,
    NamedExports,
    Statement,
    NamespaceImport,
    Identifier,
    NamedImportsOrExports,
    Modifier,
    ExportSpecifier,
    ImportSpecifier,
    SyntaxList,
    NamespaceExport,
    CallExpression,
    StringLiteral,
} from 'typescript'
/** All ConfigError should go though this class
 * so the test framework can catch it instead of fail the whole test process */
export class ConfigError extends Error {}

type ts = typeof import('typescript')
type Context<T extends Node> = {
    ts: ts
    path: string
    sourceFile: SourceFile
    config: PluginConfig
    context: TransformationContext
    node: T
}
const _with = <T extends Node>(ctx: Context<any>, node: T) => ({ ...ctx, node } as Context<T>)
/**
 * Create the Transformer
 * This file should not use any value import so the Typescript runtime is given from the environment
 */
export default function createTransformer(ts: ts) {
    // ? Can't rely on the ts.Program because don't want to create on during the test.
    return function(_program: unknown, config: PluginConfig) {
        validateConfig(config)
        return (context: TransformationContext) => {
            return (sourceFile: SourceFile) => {
                let visitedSourceFile = ts.visitEachChild(sourceFile, visitor, context)
                // ? hoistedHelper and hoistedUMDImport will be added ^ in the visitor
                const hoistedHelper = Array.from(topLevelScopedHelperMap.get(sourceFile)?.values() || []).map(x => x[1])
                const hoistedUMDImport = Array.from(hoistUMDImportDeclaration.get(sourceFile)?.values() || [])
                visitedSourceFile = ts.updateSourceFileNode(
                    visitedSourceFile,
                    Array.from(
                        new Set([
                            // ? Hoisted helper must comes first, because in case of custom dynamic import handler
                            // ? there will be a const f = () => ... declaration, it must appear at the top
                            ...hoistedHelper,
                            // ? Then UMD import should be introduces before any other statements.
                            // ? UMD import declarations might use helper defined in the hoistedHelper
                            ...hoistedUMDImport,
                            // ? original statements
                            ...visitedSourceFile.statements,
                        ]),
                    ),
                    visitedSourceFile.isDeclarationFile,
                    visitedSourceFile.referencedFiles,
                    visitedSourceFile.typeReferenceDirectives,
                    visitedSourceFile.hasNoDefaultLib,
                    visitedSourceFile.libReferenceDirectives,
                )
                return visitedSourceFile

                function visitor(node: Node): VisitResult<Node> {
                    const dynamicImportArgs = isDynamicImport(ts, node)
                    if (
                        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                        node.moduleSpecifier &&
                        ts.isStringLiteral(node.moduleSpecifier)
                    ) {
                        const path = node.moduleSpecifier.text
                        const args: Context<Node> = { config, ts, context, node, path, sourceFile }
                        return updateImportExportDeclaration(_with(args, node))
                    } else if (dynamicImportArgs) {
                        return transformDynamicImport(
                            { config, ts, context, node: node as CallExpression, sourceFile },
                            Array.from(dynamicImportArgs),
                        )
                    }
                    return ts.visitEachChild(node, visitor, context)
                }
            }
        }
    }
}
//#region Pure Helpers
function isDynamicImport(ts: ts, node: Node): NodeArray<Expression> | null {
    if (!ts.isCallExpression(node)) return null
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        return node.arguments
    }
    return null
}
function unreachable(_x: never): never {
    throw new Error('Unreachable case' + _x)
}
const parsedRegExpCache = new Map<string, RegExp | null>()
/**
 * This function will also be included in the runtime for dynamic transform.
 * So the typescript runtime is optional.
 */
function moduleSpecifierTransform(
    ctx: Pick<Context<any>, 'config' | 'path'> & { ts?: ts },
    opt = ctx.config.bareModuleRewrite,
): { type: 'rewrite'; nextPath: string } | { type: 'error'; reason: string } | { type: 'noop' } | BareModuleRewriteUMD {
    if (opt === false) return { type: 'noop' }
    const { path, config, ts } = ctx
    if (isBrowserCompatibleModuleSpecifier(path)) {
        if (config.appendExtensionName === false) return { type: 'noop' }
        if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path)) return { type: 'noop' }
        const nextPath = appendExtensionName(
            path,
            config.appendExtensionName === true ? '.js' : config.appendExtensionName ?? '.js',
        )
        return { type: 'rewrite', nextPath: nextPath }
    }
    switch (opt) {
        case BareModuleRewriteSimple.snowpack:
        case BareModuleRewriteSimple.pikacdn:
        case BareModuleRewriteSimple.unpkg: {
            const table = {
                [BareModuleRewriteSimple.pikacdn]: 'https://cdn.pika.dev/%1',
                [BareModuleRewriteSimple.unpkg]: 'https://unpkg.com/%1?module',
                [BareModuleRewriteSimple.snowpack]: `${config.webModulePath ?? '/web_modules/'}%1.js`,
            }
            return { nextPath: table[opt].replace('%1', path), type: 'rewrite' }
        }
        case BareModuleRewriteSimple.umd:
        // ? the default
        case undefined: {
            const nextPath = importPathToUMDName(path)
            if (!nextPath) {
                const err = `The transformer doesn't know how to transform this module specifier. Please specify the transform rule in the config.`
                return { type: 'error', reason: err }
            }
            return { type: 'umd', target: nextPath, globalObject: config.globalObject }
        }
        default: {
            const rules: Record<string, BareModuleRewriteObject> = opt
            for (const rule in rules) {
                const ruleValue = rules[rule]
                if (ts) {
                    if (!parsedRegExpCache.has(rule)) {
                        const literal = parseJS(ts, rule, ts.isRegularExpressionLiteral)
                        if (literal) {
                            // it's safe
                            const next = eval(literal.text)
                            parsedRegExpCache.set(rule, next)
                        }
                    }
                } else if (rule.startsWith('/')) {
                    console.warn('RegExp rule is not supported in runtime due to the risk of eval')
                }
                const regexp = parsedRegExpCache.get(rule)
                if (regexp && path.match(regexp)) {
                    if (ruleValue === false) return { type: 'noop' }
                    if (typeof ruleValue === 'string') return moduleSpecifierTransform(ctx, ruleValue)
                    const nextPath = path.replace(regexp, ruleValue.target)
                    if (!nextPath)
                        return {
                            type: 'error',
                            reason: 'The transform result is an empty string. Skipped.',
                        }
                    return {
                        type: 'umd',
                        target: nextPath,
                        globalObject: ruleValue.globalObject ?? config.globalObject,
                    }
                } else if (rule === path) {
                    if (ruleValue === false) return { type: 'noop' }
                    if (typeof ruleValue === 'string') return moduleSpecifierTransform(ctx, ruleValue)
                    return {
                        type: 'umd',
                        target: ruleValue.target,
                        globalObject: ruleValue.globalObject ?? config.globalObject,
                    }
                }
            }
        }
    }
    return { type: 'noop' }
    function isBrowserCompatibleModuleSpecifier(path: string) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path)
    }
    function isHTTPModuleSpecifier(path: string) {
        return path.startsWith('http://') || path.startsWith('https://')
    }
    function isLocalModuleSpecifier(path: string) {
        return path.startsWith('.') || path.startsWith('/')
    }
    function appendExtensionName(path: string, expectedExt: string) {
        if (path.endsWith(expectedExt)) return path
        return path + expectedExt
    }
    function importPathToUMDName(path: string) {
        const reg = path.match(/[a-zA-Z0-9_]+/g)
        if (!reg) return null
        const x = [...reg].join(' ')
        if (x.length)
            return x
                .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
                    index == 0 ? letter.toLowerCase() : letter.toUpperCase(),
                )
                .replace(/\s+/g, '')
        return null
    }
}
//#endregion
//#region Transformers
/**
 * A set of UMD ImportDeclaration
 * e.g.:
 * Before:
 *      import a from 'a'
 * After:
 *      const a = globalThis.a
 *
 * ES Import is hoisted to the top of the file so these declarations should do also.
 */
const hoistUMDImportDeclaration = new WeakMap<SourceFile, Set<Statement>>()
function updateImportExportDeclaration(
    ctx: Context<ImportDeclaration | ExportDeclaration>,
    opt = ctx.config.bareModuleRewrite,
): Statement[] {
    const { node, sourceFile, ts } = ctx
    const rewriteStrategy = moduleSpecifierTransform(ctx, opt)
    switch (rewriteStrategy.type) {
        case 'error':
            return [ts.createExpressionStatement(ts.createLiteral(rewriteStrategy.reason)), node]
        case 'noop':
            return [node]
        case 'rewrite': {
            const nextPath = ts.createLiteral(rewriteStrategy.nextPath)
            if (ts.isImportDeclaration(node))
                return [ts.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, nextPath)]
            else
                return [
                    ts.updateExportDeclaration(
                        node,
                        node.decorators,
                        node.modifiers,
                        node.exportClause,
                        nextPath,
                        node.isTypeOnly,
                    ),
                ]
        }
        case 'umd': {
            const nextPath = rewriteStrategy.target
            const globalObject = rewriteStrategy.globalObject
            const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
            // ? if it have no clause, it must be an ImportDeclaration
            if (!clause) {
                const text = `import "${
                    (node.moduleSpecifier as StringLiteral).text
                }" is eliminated because it expected to have no side effects.`
                return [ts.createExpressionStatement(ts.createLiteral(text))]
            }
            const { statements } = importOrExportClauseToUMD(nextPath, _with(ctx, clause), globalObject)
            writeSourceFileMeta(sourceFile, hoistUMDImportDeclaration, new Set<Statement>(), _ => {
                statements.forEach(x => _.add(x))
            })
            return statements
        }
        default:
            return unreachable(rewriteStrategy)
    }
}
/**
 * import a from 'b' => const a = globalThis.b.default
 * import { a, b, c } from 'd' => const { a, b, c } = globalThis.b
 * import * as a from 'b' => const a = globalThis.b
 *
 * export { a, b, c } from 'd' => (a magic import statement); export const a = (magic binding)
 * export * as b from 'd' => (a magic import statement); export const a = (magic binding)
 */
function importOrExportClauseToUMD(
    umdName: string,
    ctx: Context<ImportClause | NamespaceExport | NamedExports>,
    globalObject = ctx.config.globalObject,
): { variableNames: Identifier[]; statements: Statement[] } {
    const { node, ts, path } = ctx
    const umdAccess = getUMDExpressionForModule(umdName, globalObject, ctx, false)
    const umdAccessDefault = ts.createPropertyAccess(umdAccess, 'default')
    const ids: Identifier[] = []
    const statements: Statement[] = []
    if (ts.isImportClause(node)) {
        const defaultImport = node.name
        const nsImport = node.namedBindings && ts.isNamespaceImport(node.namedBindings) ? node.namedBindings : undefined
        const namedImport = node.namedBindings && ts.isNamedImports(node.namedBindings) ? node.namedBindings : undefined
        if (defaultImport) {
            ids.push(defaultImport)
            statements.push(getDefaultImport(defaultImport))
        }
        if (nsImport) {
            ids.push(nsImport.name)
            statements.push(getNamespaceImport(nsImport))
        }
        if (namedImport) {
            namedImport.elements.forEach(v => ids.push(v.name))
            statements.push(transformNamedImportExport(namedImport))
        }
        return { variableNames: ids, statements: statements }
    } else if (ts.isNamedExports(node)) {
        const ghostBindings = new Map<ExportSpecifier, Identifier>()
        const ghostImportDeclaration = ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(
                undefined,
                ts.createNamedImports(
                    node.elements.map<ImportSpecifier>(x => {
                        const id = ts.createUniqueName(x.name.text)
                        ghostBindings.set(x, id)
                        return ts.createImportSpecifier(x.propertyName, id)
                    }),
                ),
            ),
            ts.createLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(_with(ctx, ghostImportDeclaration))
        const exportDeclaration = ts.createExportDeclaration(
            void 0,
            void 0,
            ts.createNamedExports(
                Array.from(ghostBindings).map(([key, value]) => ts.createExportSpecifier(value, key.name)),
            ),
            void 0,
            void 0,
        )
        statements.push(...updatedGhost)
        statements.push(exportDeclaration)
        return { statements, variableNames: ids }
        // New function since ts 3.8
    } else if (ts.isNamespaceExport?.(node)) {
        const ghostBinding = ts.createUniqueName(node.name.text)
        const ghostImportDeclaration = ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(undefined, ts.createNamespaceImport(ghostBinding)),
            ts.createLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(_with(ctx, ghostImportDeclaration))
        const exportDeclaration = ts.createExportDeclaration(
            void 0,
            void 0,
            ts.createNamedExports([ts.createExportSpecifier(ghostBinding, node.name.text)]),
            void 0,
            void 0,
        )
        statements.push(...updatedGhost)
        statements.push(exportDeclaration)
        return { statements, variableNames: ids }
    }
    return { variableNames: ids, statements: statements }
    function getNamespaceImport(namedImport: NamespaceImport) {
        return getAssignment(namedImport.name, umdAccess)
    }
    function getDefaultImport(defaultImport: Identifier) {
        return getAssignment(defaultImport, umdAccessDefault)
    }
    /** const _id_ = _target_ */
    function getAssignment(id: Identifier, target: Expression) {
        return ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList([ts.createVariableDeclaration(id, undefined, target)], ts.NodeFlags.Const),
        )
    }
    function transformNamedImportExport(namedImport: NamedImportsOrExports, modifiers: Modifier[] = []) {
        const elements: Array<ImportSpecifier | ExportSpecifier> = []
        namedImport.elements.forEach((y: typeof elements[0]) => elements.push(y))
        return ts.createVariableStatement(
            modifiers,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        ts.createObjectBindingPattern(
                            elements.map(x => ts.createBindingElement(undefined, x.propertyName, x.name, undefined)),
                        ),
                        undefined,
                        umdAccess,
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        )
    }
}
/**
 * Return a ts.Expression for the given UMD name and config.
 */
function getUMDExpressionForModule(
    umdName: string,
    globalObject: PluginConfig['globalObject'],
    ctx: Pick<Context<any>, 'context' | 'sourceFile' | 'ts'>,
    noWrapHelper: boolean,
) {
    const { context, sourceFile, ts } = ctx
    const compilerOptions = context.getCompilerOptions()
    const wrapHelper =
        noWrapHelper === false && (compilerOptions.esModuleInterop || compilerOptions.allowSyntheticDefaultImports)
    const umdAccess = (wrapHelper ? getDefaultCall : <T>(x: T) => x)(
        ts.createPropertyAccess(ts.createIdentifier(globalObject === undefined ? 'globalThis' : globalObject), umdName),
    )
    return umdAccess
    function getDefaultCall(e: Expression) {
        const id = createTopLevelScopedHelper(ts, sourceFile, importDefaultHelper)
        return ts.createCall(id, undefined, [e])
    }
}
function transformDynamicImport(ctx: Omit<Context<CallExpression>, 'path'>, args: Expression[]): Expression[] {
    const { ts, config, node, sourceFile } = ctx
    const [first, ...rest] = args
    if (ts.isStringLiteralLike(first)) {
        const rewriteStrategy = moduleSpecifierTransform({ ...ctx, path: first.text })
        switch (rewriteStrategy.type) {
            case 'error':
                const id = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args))
                return [ts.createCall(id, void 0, [ts.createLiteral(rewriteStrategy.reason), ...args])]
            case 'noop':
                return [node]
            case 'rewrite': {
                return [createDynamicImport(ts.createLiteral(rewriteStrategy.nextPath), ...rest)]
            }
            case 'umd': {
                if (rest.length !== 0) {
                    const id = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args))
                    return [
                        ts.createCall(id, void 0, [
                            ts.createLiteral(
                                "Transform rule found, but this dynamic import has more than 1 argument, don't know how to transform that.",
                            ),
                            ...args,
                        ]),
                    ]
                }
                const umdAccess = getUMDExpressionForModule(
                    rewriteStrategy.target,
                    rewriteStrategy.globalObject,
                    ctx,
                    true,
                )
                return [ts.createCall(ts.createIdentifier('Promise.resolve'), undefined, [umdAccess])]
            }
            default: {
                throw new Error('Unreachable case')
            }
        }
    } else {
        if (rest.length !== 0) {
            const id = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args))
            return [
                ts.createCall(id, void 0, [
                    ts.createLiteral("This dynamic import has more than 1 arguments and don't know how to transform"),
                    ...args,
                ]),
            ]
        }
        const opt = config.dynamicImportPathRewrite
        if (opt === false) return [node]
        const builtinHelper = createTopLevelScopedHelper(ts, sourceFile, dynamicImportHelper(config))
        if (opt === 'auto' || opt === undefined) return [ts.createCall(builtinHelper, void 0, args)]
        const f = parseJS(ts, opt.function, ts.isArrowFunction)
        if (!f) throw new ConfigError('Unable to parse the function. It must be an ArrowFunction. Get: ' + opt.function)
        const customFunction =
            topLevelScopedHelperMap.get(sourceFile)?.get('__customImportHelper')?.[0] ||
            ts.createUniqueName('__customImportHelper')
        if (!topLevelScopedHelperMap.get(sourceFile)?.has('__customImportHelper')) {
            const decl = ts.createVariableStatement(
                undefined,
                ts.createVariableDeclarationList(
                    [ts.createVariableDeclaration(customFunction, undefined, f)],
                    ts.NodeFlags.Const,
                ),
            )
            writeSourceFileMeta(sourceFile, topLevelScopedHelperMap, new Map<string, [Identifier, Statement]>(), x => {
                x.set('__customImportHelper', [customFunction, decl])
            })
        }
        return [ts.createCall(customFunction, undefined, [first, builtinHelper])]
    }

    function createDynamicImport(...args: Expression[]) {
        return ts.createCall(ts.createToken(ts.SyntaxKind.ImportKeyword) as any, void 0, args)
    }
}

//#endregion
// When generating JSON schema, don't forget to add a
// "$ref": "#/definitions/PluginConfig",
// at top level
//#region Types
/** #TopLevel */
export interface PluginConfig {
    /**
     * Add '.js' extension for local module specifier
     * @default .js
     */
    appendExtensionName?: string | boolean
    /**
     * Also append extension to http:// or https://
     * @default false
     */
    appendExtensionNameForRemote?: boolean
    /**
     * @description
     * `false`: disable the transform
     * `BareModuleRewriteSimple.snowpack`: if you are using snowpack (https://github.com/pikapkg/snowpack)
     * `BareModuleRewriteSimple.umd`: make your `import a from 'b'` to `const a = globalThis.b`
     * `BareModuleRewriteSimple.unpkg`: try to transform imports path to https://unpkg.com/package@latest/index.js?module
     * `BareModuleRewriteSimple.pikacdn`: try to transform import path to https://cdn.pika.dev/package
     * `Record<string, BareModuleRewriteObject>`: string can be a string or a RegExp to match import path.
     * @example
     * {
     *    "my-pkg": "umd", // to globalThis.myPkg
     *    "my-pkg2": "pikacdn", // to https://cdn.pika.dev/my-pkg2
     *    "my-pkg3": "unpkg", // to https://unpkg.com/my-pkg3
     *    "/my-pkg-(.+)/": { type: 'umd', target: 'getMyPkg("$1")' }, // for "my-pkg-12" to globalThis.getMyPkg("12")
     * }
     * @default umd
     */
    bareModuleRewrite?: false | BareModuleRewriteSimple | { [key: string]: BareModuleRewriteObject }
    /**
     * Rewrite dynamic import
     * @description
     * `false`: Do not rewrite
     * `'auto'`: try to optimise automatically
     * `DynamicImportPathRewrite`: using a custom function to handle the import path (path: string, builtinImpl: (path) => Promise<any>): Promise<any>
     * @default auto
     */
    dynamicImportPathRewrite?: false | 'auto' | DynamicImportPathRewriteCustom
    /**
     * Used in UMD.
     * For what object will store the UMD variables
     * @default globalThis
     */
    globalObject?: string
    /**
     * Used in snowpack. web_modules module path
     * @default /web_modules/
     */
    webModulePath?: string
}
export type BareModuleRewriteObject = false | BareModuleRewriteSimple | BareModuleRewriteUMD
export interface DynamicImportPathRewriteCustom {
    type: 'custom'
    /** e.g: "(path => path + '.js')" */
    function: string
}
export enum BareModuleRewriteSimple {
    /** See: https://github.com/pikapkg/snowpack */
    snowpack = 'snowpack',
    umd = 'umd',
    unpkg = 'unpkg',
    pikacdn = 'pikacdn',
}
export interface BareModuleRewriteUMD {
    type: 'umd'
    target: string
    globalObject?: string
}
//#endregion
//#region ts helper
const topLevelScopedHelperMap = new WeakMap<SourceFile, Map<string, [Identifier, Statement]>>()
function createTopLevelScopedHelper(ts: ts, sf: SourceFile, helper: string) {
    const result = topLevelScopedHelperMap.get(sf)?.get(helper)
    if (result) return result[0]
    const _f = parseJS(ts, helper, ts.isFunctionDeclaration)
    if (!_f) throw new Error('helper must be a function declaration')
    const uniqueName = ts.createFileLevelUniqueName(_f.name!.text)
    const f = ts.updateFunctionDeclaration(
        _f,
        void 0,
        void 0,
        _f.asteriskToken,
        ts.createFileLevelUniqueName(_f.name!.text),
        void 0,
        _f.parameters,
        void 0,
        _f.body,
    )
    ts.setEmitFlags(f, ts.EmitFlags.NoComments)
    writeSourceFileMeta(sf, topLevelScopedHelperMap, new Map(), x => x.set(helper, [uniqueName, f]))
    return uniqueName
}

function parseJS<T extends Node = Node>(
    ts: ts,
    x: string,
    guard: (x: Node) => x is T = (_x): _x is T => true,
): T | null {
    const sf = ts.createSourceFile('_internal_.js', x, ts.ScriptTarget.ESNext, false, ts.ScriptKind.JS)
    let _: Node = sf.getChildAt(0) as SyntaxList
    _ = _.getChildAt(0)
    if (guard(_)) return _
    if (ts.isExpressionStatement(_) && guard(_.expression)) return _.expression
    return null
}

function writeSourceFileMeta<T, E extends T, Q>(
    sf: SourceFile,
    map: WeakMap<SourceFile, T>,
    empty: E,
    val: (x: T) => Q,
): Q {
    if (!map.has(sf)) map.set(sf, empty)
    return val(map.get(sf)!)
}
//#endregion

const importDefaultHelper = `function __ttsc_importDefault(mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
};`
const dynamicImportFailedHelper = (args: Expression[]) => `function __dynamicImportTransformFailedHelper${
    args.length
}(reason, ...args) {
    console.warn(reason, ...args)
    return import(${args.map((_, i) => `args[${i}]`).join(', ')});
};`
/**
 * This function will run in the browser if there is any "import(x)" expressions
 */
function runtimeTransform(
    config: PluginConfig,
    path: string,
    dynamicImport: (path: string) => Promise<any>,
): Promise<any> | null {
    const result = moduleSpecifierTransform({ config, path })
    const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`
    switch (result.type) {
        case 'error':
            console.error(header, result.reason, `raw specifier:`, path)
            return null
        case 'rewrite':
            return dynamicImport(result.nextPath)
        case 'umd':
            if (config.globalObject === 'globalThis' || config.globalObject === undefined)
                return Promise.resolve((globalThis as any)[result.target])
            if (config.globalObject === 'window') return Promise.resolve((window as any)[result.target])
            return Promise.reject(header + 'Unreachable transform case')
        default:
            return Promise.reject(header + 'Unreachable transform case')
    }
}
const dynamicImportHelper = (config: PluginConfig) => `function __dynamicImportHelper(path) {
    const BareModuleRewriteSimple = ${JSON.stringify(BareModuleRewriteSimple)}
    const parsedRegExpCache = new Map()
    const config = ${JSON.stringify(config)}
    function dynamicImport(path) { return import(path); }
    const result = ${runtimeTransform.name}(config, path, dynamicImport);
    if (result === null) return dynamicImport(path);
    return result;
    function parseJS(...a) { return null }
    ${runtimeTransform.toString()}
    ${moduleSpecifierTransform.toString()}
};`
function validateConfig(config: PluginConfig) {
    type('appendExtensionName', ['string', 'boolean'])
    type('appendExtensionNameForRemote', ['boolean'])
    type('bareModuleRewrite', ['boolean', 'string', 'object'])
    type('dynamicImportPathRewrite', ['boolean', 'string', 'object'])
    type('globalObject', ['string'])
    type('webModulePath', ['string'])

    length('globalObject')
    length('webModulePath')

    enumCheck('dynamicImportPathRewrite', ['auto'])
    const enums = Object.keys(BareModuleRewriteSimple) as BareModuleRewriteSimple[]
    enumCheck('bareModuleRewrite', enums)

    falseOnly('bareModuleRewrite')
    falseOnly('dynamicImportPathRewrite')

    {
        const b = config.bareModuleRewrite
        if (typeof b === 'object') Object.entries(b).forEach(validateBareModuleRewrite)
    }

    function validateBareModuleRewrite([k, v]: [string, BareModuleRewriteObject]) {
        type(k as any, ['boolean', 'string', 'object'], v)
        falseOnly(k as any, v)
        enumCheck(k as any, enums, v)
        if (typeof v === 'object') {
            switch (v.type) {
                case 'umd':
                    type('globalObject', ['string'], v.globalObject)
                    length('globalObject', v.globalObject)
                    type(('target' as keyof typeof v) as any, ['string'], v.target, true)
                    break
                default:
                    throw new ConfigError('Unknown tagged union ' + v.type + ' at ' + k)
            }
        }
    }

    const _x = typeof config
    function type(name: keyof PluginConfig, _: typeof _x[], v: any = config[name], noUndefined = false) {
        if (!noUndefined) _ = _.concat('undefined')
        if (!_.includes(typeof v)) throw new ConfigError(`type of ${name} in the tsconfig is not correct`)
        if (_.includes('object') && typeof v === null) throw new ConfigError(`${name} can't be null!`)
    }
    function length(name: keyof PluginConfig, v: any = config[name]) {
        if (typeof v === 'string' && v.length === 0) throw new ConfigError(name + ' cannot be an empty string')
    }
    function enumCheck<T extends keyof PluginConfig>(name: T, enums: PluginConfig[T][], v: any = config[name]) {
        if (typeof v === 'string' && !enums.includes(v as any))
            throw new ConfigError(`When ${name} is a string, it must be the enum ${enums}, but found ${v}`)
    }
    function falseOnly(name: keyof PluginConfig, v: any = config[name]) {
        if (typeof v === 'boolean' && v === true) throw new ConfigError(`When ${name} is a boolean, it must be false`)
    }
}
