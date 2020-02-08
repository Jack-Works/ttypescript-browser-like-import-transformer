import {
    Program,
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
    ArrowFunction,
    FunctionExpression,
    StringLiteral,
} from 'typescript'

/**
 * * 1. local module specifier rewrite (add .js)
 * * 2. bare module specifier rewrite
 *      * i. match by regexp and replace
 *      * ii. rewrite to umd import / export
 * * 3. default bare module specifier handling
 *      * i. snowpack
 *      * ii. umd
 *      * iii. unpkg / pika cdn
 * * a. default import
 * * b. namespace import
 * * c. namespace export
 * * d. named imports
 * * e. named export
 * * f. dynamic import rewrite
 *
 * Config support:
 * * appendExtensionName
 * * appendExtensionNameForRemote
 * * bareModuleRewrite
 * * dynamicImportPathRewrite
 * * globalObject
 * * webModulePath
 */
type ts = typeof import('typescript')
type Ctx<T extends Node> = {
    ts: ts
    path: string
    sourceFile: SourceFile
    config: PluginConfig
    context: TransformationContext
    node: T
}
const ctx_ = <T extends Node>(ctx: Ctx<any>, node: T) => ({ ...ctx, node } as Ctx<T>)
export default function createTransformer(ts: ts) {
    return function(_program: unknown, config: PluginConfig) {
        return (context: TransformationContext) => {
            return (sourceFile: SourceFile) => {
                let sf = ts.visitEachChild(sourceFile, visitor, context)
                const hoistedHelper = Array.from(topLevelScopedHelperMap.get(sourceFile)?.values() || []).map(x => x[1])
                const hoistedUMDImport = Array.from(hoistUMDImportDeclaration.get(sourceFile)?.values() || [])
                sf = ts.updateSourceFileNode(
                    sf,
                    [
                        ...hoistedHelper,
                        ...hoistedUMDImport,
                        ...sf.statements.filter(x => !hoistedUMDImport.includes(x)),
                    ],
                    sf.isDeclarationFile,
                    sf.referencedFiles,
                    sf.typeReferenceDirectives,
                    sf.hasNoDefaultLib,
                    sf.libReferenceDirectives,
                )
                return sf
            }

            function visitor(node: Node): VisitResult<Node> {
                const dynamicImportArgs = isDynamicImport(ts, node)
                const sourceFile = node.getSourceFile()
                if (
                    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                    node.moduleSpecifier &&
                    ts.isStringLiteral(node.moduleSpecifier)
                ) {
                    const path = node.moduleSpecifier.text
                    const args: Ctx<Node> = { config, ts, context, node, path, sourceFile }
                    return updateImportExportDeclaration(ctx_(args, node))
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
//#region Pure Helpers
/**
 * Local module specifier:
 * ./file
 * ../foo/bar
 * /static/file
 * https://my-cdn.com/files/x
 */
function isBrowserCompatibleModuleSpecifier(path: string) {
    return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path)
}
function isHTTPModuleSpecifier(path: string) {
    return path.startsWith('http://') || path.startsWith('https://')
}
function isLocalModuleSpecifier(path: string) {
    return path.startsWith('.') || path.startsWith('/')
}

/**
 * Is the node a `import(...)` call?
 */
function isDynamicImport(ts: typeof import('typescript'), node: Node): NodeArray<Expression> | null {
    if (!ts.isCallExpression(node)) return null
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        return node.arguments
    }
    return null
}
function appendExtname(path: string, expectedExt: string) {
    if (path.endsWith(expectedExt)) return path
    return path + expectedExt
}
function __umdNameTransform(path: string) {
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
//#endregion
//#region Transformers
const hoistUMDImportDeclaration = new WeakMap<SourceFile, Set<Statement>>()
function updateImportExportDeclaration(
    ctx: Ctx<ImportDeclaration | ExportDeclaration>,
    opt = ctx.config.bareModuleRewrite,
): Statement[] {
    const { node, sourceFile, ts } = ctx
    const rewriteStrategy = moduleSpecifierTransform(ctx, opt)
    switch (rewriteStrategy.type) {
        case 'error':
            return [ts.createExpressionStatement(ts.createStringLiteral(rewriteStrategy.reason)), node]
        case 'noop':
            return [node]
        case 'rewrite': {
            const nextPath = ts.createStringLiteral(rewriteStrategy.nextPath)
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
            if (!clause)
                return [
                    ts.createExpressionStatement(
                        ts.createLiteral(
                            `// import "${
                                (node.moduleSpecifier as StringLiteral).text
                            }" is eliminated in UMD mode (Expected target: ${globalObject ??
                                'globalThis'}.${nextPath})`,
                        ),
                    ),
                ]
            const { statements } = importOrExportClauseToUMD(nextPath, ctx_(ctx, clause), globalObject)
            statements.forEach(x =>
                writeSourceFileMeta(sourceFile, hoistUMDImportDeclaration, new Set<Statement>(), _ => _.add(x)),
            )
            return statements
        }
        default: {
            throw new Error('Unreachable case')
        }
    }
}
const parsedRegExpCache = new Map<string, RegExp | null>()
function moduleSpecifierTransform(
    ctx: Pick<Ctx<any>, 'config' | 'path'> & { ts?: ts },
    opt = ctx.config.bareModuleRewrite,
): { type: 'rewrite'; nextPath: string } | { type: 'error'; reason: string } | { type: 'noop' } | BareModuleRewriteUMD {
    if (opt === false) return { type: 'noop' }
    const { path, config, ts } = ctx
    if (isBrowserCompatibleModuleSpecifier(path)) {
        if (config.appendExtensionName === false) return { type: 'noop' }
        if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path)) return { type: 'noop' }
        const nextPath = appendExtname(
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
        case undefined: {
            const nextPath = __umdNameTransform(path)
            if (!nextPath) {
                return {
                    type: 'error',
                    reason:
                        'Transformer error: Can not transform this module to UMD, please specify it in the config. Module name: ' +
                        path,
                }
            }
            return { type: 'umd', target: nextPath, globalObject: config.globalObject }
        }
        default: {
            const rules: Record<string, BareModuleRewriteSimple | BareModuleRewriteUMD> = opt
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
                    if (typeof ruleValue === 'string') return moduleSpecifierTransform(ctx, ruleValue)
                    const nextPath = path.replace(regexp, ruleValue.target)
                    if (!nextPath)
                        return {
                            type: 'error',
                            reason: 'Cannot transform this.',
                        }
                    return {
                        type: 'umd',
                        target: nextPath,
                        globalObject: ruleValue.globalObject ?? config.globalObject,
                    }
                } else if (rule === path) {
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
    ctx: Ctx<ImportClause | NamespaceExport | NamedExports>,
    globalObject = ctx.config.globalObject,
): { variableNames: Identifier[]; statements: Statement[] } {
    const { node, ts, path } = ctx
    const umdAccess = getUMDAccess(umdName, globalObject, ctx)
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
            ts.createStringLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(ctx_(ctx, ghostImportDeclaration))
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
    } else if (ts.isNamespaceExport(node)) {
        const ghostBinding = ts.createUniqueName(node.name.text)
        const ghostImportDeclaration = ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(undefined, ts.createNamespaceImport(ghostBinding)),
            ts.createStringLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(ctx_(ctx, ghostImportDeclaration))
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
function getDefaultCall(ts: ts, sourceFile: SourceFile, e: Expression) {
    const id = createTopLevelScopedHelper(ts, sourceFile, importDefaultHelper)
    return ts.createCall(id, undefined, [e])
}
function getUMDAccess(
    umdName: string,
    globalObject: string | undefined | false,
    ctx: Pick<Ctx<any>, 'context' | 'sourceFile' | 'ts'>,
    noWrapHelper: boolean = false,
) {
    const { context, sourceFile, ts } = ctx
    const compilerOptions = context.getCompilerOptions()
    const wrapHelper =
        (noWrapHelper === false && compilerOptions.esModuleInterop) || compilerOptions.allowSyntheticDefaultImports
    const umdAccess = (wrapHelper ? (e: Expression) => getDefaultCall(ts, sourceFile, e) : <T>(x: T) => x)(
        globalObject === false
            ? ts.createIdentifier(umdName)
            : ts.createPropertyAccess(
                  ts.createIdentifier(globalObject === undefined ? 'globalThis' : globalObject),
                  umdName,
              ),
    )
    return umdAccess
}
function createDynImport(ts: ts, args: Expression[]) {
    return ts.createCall(ts.createToken(ts.SyntaxKind.ImportKeyword) as any, void 0, args)
}
function transformDynamicImport(ctx: Omit<Ctx<CallExpression>, 'path'>, args: Expression[]): Expression[] {
    const { ts, config, node, sourceFile } = ctx
    const [first, ...rest] = args
    if (ts.isStringLiteralLike(first)) {
        const rewriteStrategy = moduleSpecifierTransform({ ...ctx, path: first.text })
        switch (rewriteStrategy.type) {
            case 'error':
                const id = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args))
                return [ts.createCall(id, void 0, [ts.createStringLiteral(rewriteStrategy.reason), ...args])]
            case 'noop':
                return [node]
            case 'rewrite': {
                return [createDynImport(ts, [ts.createStringLiteral(rewriteStrategy.nextPath), ...rest])]
            }
            case 'umd': {
                if (rest.length !== 0) {
                    const id = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args))
                    return [
                        ts.createCall(id, void 0, [
                            ts.createStringLiteral(
                                "Transform rule found, but this dynamic import has more than 1 argument, don't know how to transform that.",
                            ),
                            ...args,
                        ]),
                    ]
                }
                const umdAccess = getUMDAccess(rewriteStrategy.target, rewriteStrategy.globalObject, ctx, true)
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
                    ts.createStringLiteral(
                        "This dynamic import has more than 1 arguments and don't know how to transform",
                    ),
                    ...args,
                ]),
            ]
        }
        const opt = config.dynamicImportPathRewrite
        if (opt === false) return [node]
        const builtinHelper = createTopLevelScopedHelper(ts, sourceFile, dynamicImportHelper(config))
        if (opt === 'auto' || opt === undefined) return [ts.createCall(builtinHelper, void 0, args)]
        const f = parseJS(ts, opt.function, ts.isArrowFunction)
        if (!f) throw new Error('Unable to parse the function. It must be an ArrowFunction')
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
}
//#endregion
//#region Types
export interface PluginConfig {
    /** Path to transformer or transformer module name */
    transform?: string
    /** The optional name of the exported transform plugin in the transform module. */
    import?: string
    /** Plugin entry point format type, default is program */
    type?: 'program' | 'config' | 'checker' | 'raw' | 'compilerOptions'
    /** Should transformer applied after all ones */
    after?: boolean
    /** Should transformer applied for d.ts files, supports from TS2.9 */
    afterDeclarations?: boolean
    /** Add '.js' extension for local module specifier, default to '.js' */
    appendExtensionName?: string | boolean
    /** Also append extension to http:// or https://?, default to false */
    appendExtensionNameForRemote?: boolean
    /**
     * false: disable the transform
     *
     * BareModuleRewriteSimple.snowpack: if you are using snowpack (https://github.com/pikapkg/snowpack)
     *
     * BareModuleRewriteSimple.umd: make your `import a from 'b'` to `const a = globalThis.b`
     *
     * BareModuleRewriteSimple.unpkg: try to transform imports path to https://unpkg.com/package@latest/index.js?module
     *
     * BareModuleRewriteSimple.pikacdn: try to transform import path to https://cdn.pika.dev/package
     *
     * Record<string, BareModuleRewriteSimple | BareModuleRewriteUMD>: string can be a string or a RegExp to match import path.
     *
     * @example
     * {
     *    "my-pkg": "umd", // to globalThis.myPkg
     *    "my-pkg2": "pikacdn", // to https://cdn.pika.dev/my-pkg2
     *    "my-pkg3": "unpkg", // to https://unpkg.com/my-pkg3
     *    "/my-pkg-(.+)/": { type: 'umd', target: 'getMyPkg("$1")' }, // for "my-pkg-12" to globalThis.getMyPkg("12")
     * }
     *
     * @default 'umd'
     */
    bareModuleRewrite?: false | BareModuleRewriteSimple | Record<string, BareModuleRewriteSimple | BareModuleRewriteUMD>
    /**
     * Rewrite dynamic import
     *
     * false: Do not rewrite
     * 'auto': try to optimise automatically
     * DynamicImportPathRewrite:
     * using a custom function to handle the import path (path: string, builtinImpl: (path) => Promise<any>): Promise<any>
     */
    dynamicImportPathRewrite?: false | 'auto' | DynamicImportPathRewriteCustom
    /** Used in UMD. For what object will store the UMD variables? Default to "globalThis" */
    globalObject?: string
    /** Used in snowpack. web_modules module path, default "/web_modules/" */
    webModulePath?: string
}
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

const importDefaultHelper = `function __importDefault(mod) {
     return (mod && mod.__esModule) ? mod : { "default": mod };
};`
const dynamicImportFailedHelper = (
    args: Expression[],
) => `function __dynamicImportTransformFailedHelper(reason, ...args) {
    console.warn(reason, ...args)
    return import(${args.map((_, i) => `args[${i}]`).join(', ')});
};`
const dynamicImportHelper = (config: PluginConfig) => `function __dynamicImportHelper(path) {
    const BareModuleRewriteSimple = ${JSON.stringify(BareModuleRewriteSimple)}
    const parsedRegExpCache = new Map()
    const config = ${JSON.stringify(config)}
    function _(path) { return import(path); }
    const __ = __runtimeTransform(path, _);
    if (__ === null) return _(path);
    return __;
    function parseJS(...a) { return null }
    ${function __runtimeTransform(path: string, dyn: (path: string) => Promise<any>) {
        const result = moduleSpecifierTransform({ config, path })
        switch (result.type) {
            case 'error':
                return null
            case 'noop':
                return null
            case 'rewrite':
                return dyn(result.nextPath)
            case 'umd':
                if (config.globalObject === 'globalThis' || config.globalObject === undefined)
                    return Promise.resolve((globalThis as any)[result.target])
                if (config.globalObject === 'window') return Promise.resolve((window as any)[result.target])
                return Promise.reject('Unreachable transform case')
            default:
                return Promise.reject('Unreachable transform case')
        }
    }.toString()}
    ${isBrowserCompatibleModuleSpecifier.toString()}
    ${appendExtname.toString()}
    ${moduleSpecifierTransform.toString()}
    ${isHTTPModuleSpecifier.toString()}
    ${isLocalModuleSpecifier.toString()}
    ${__umdNameTransform.toString()}
};`
