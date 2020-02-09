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
    NumericLiteral,
    ArrayLiteralExpression,
    FunctionDeclaration,
    BooleanLiteral,
} from 'typescript'
import { BareModuleRewriteSimpleEnum, BareModuleRewriteSimple } from './ttsclib'
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
    queryWellknownUMD: (path: string) => string | undefined
    ttsclib: typeof import('./ttsclib')
}
const _with = <T extends Node>(ctx: Context<any>, node: T) => ({ ...ctx, node } as Context<T>)
/**
 * Create the Transformer
 * This file should not use any value import so the Typescript runtime is given from the environment
 */
export default function createTransformer(ts: ts, core: Pick<Context<any>, 'queryWellknownUMD' | 'ttsclib'>) {
    // ? Can't rely on the ts.Program because don't want to create on during the test.
    return function(_program: unknown, config: PluginConfig) {
        validateConfig(config)
        return (context: TransformationContext) => {
            return (sourceFile: SourceFile) => {
                let visitedSourceFile = ts.visitEachChild(sourceFile, visitor, context)
                // ? hoistedHelper and hoistedUMDImport will be added ^ in the visitor
                const hoistedHelper = Array.from(topLevelScopedHelperMap.get(sourceFile)?.values() || []).map(x => x[1])
                const languageHoistableDeclarations = hoistedHelper.filter(ts.isFunctionDeclaration)
                const languageNotHoistableDeclarations = hoistedHelper.filter(x => !ts.isFunctionDeclaration(x))
                const hoistedUMDImport = Array.from(hoistUMDImportDeclaration.get(sourceFile)?.values() || [])
                visitedSourceFile = ts.updateSourceFileNode(
                    visitedSourceFile,
                    Array.from(
                        new Set([
                            // ? Some helper must be hoisted manually,
                            // ? like const f = () => ...declaration
                            ...languageNotHoistableDeclarations,
                            // ? Then UMD import should be introduces before any other statements.
                            // ? UMD import declarations might use helper defined in the hoistedHelper
                            ...hoistedUMDImport,
                            // ? original statements
                            ...visitedSourceFile.statements,
                            // ? The function declaration helper can comes at last.
                            ...languageHoistableDeclarations,
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
                        const args: Context<Node> = { config, ts, context, node, path, sourceFile, ...core }
                        return updateImportExportDeclaration(_with(args, node))
                    } else if (dynamicImportArgs) {
                        return transformDynamicImport(
                            { config, ts, context, node: node as CallExpression, sourceFile, ...core },
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
function parseRegExp(this: ts, s: string) {
    const literal = parseJS(this, s, this.isRegularExpressionLiteral)
    if (!literal) return null
    try {
        return eval(literal.text)
    } catch {
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
    context: Context<ImportDeclaration | ExportDeclaration>,
    opt = context.config.bareModuleRewrite,
): Statement[] {
    const { node, sourceFile, ts, ttsclib } = context
    const rewriteStrategy = ttsclib.moduleSpecifierTransform({ ...context, parseRegExp: parseRegExp.bind(ts) }, opt)
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
                }" is eliminated because it expected to have no side effects in UMD transform.`
                return [ts.createExpressionStatement(ts.createLiteral(text))]
            }
            const { statements } = importOrExportClauseToUMD(nextPath, _with(context, clause), globalObject)
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
    const { node, ts, path, sourceFile, context, ttsclib } = ctx
    const [, createUMDBindCheck] = createTopLevelScopedHelper(ts, sourceFile, ttsclib.__UMDBindCheck, [])
    const [umdAccess, globalIdentifier] = getUMDExpressionForModule(umdName, globalObject, ctx)
    const ids: Identifier[] = []
    const statements: Statement[] = []
    const compilerOptions = context.getCompilerOptions()
    const esModuleInterop = compilerOptions.esModuleInterop || compilerOptions.allowSyntheticDefaultImports
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
        // ? const namedImport = __importBindingCheck(value, [], path, mappedName)
        // ? If the UMD binding is undefined, this will give a warning but success (with an empty module).
        return getAssignment(
            namedImport.name,
            createCheckedUMDAccess(x => x),
        )
    }
    function getDefaultImport(defaultImport: Identifier) {
        let umdAccess: Expression
        if (esModuleInterop) {
            const [, createESModuleInteropCall] = createTopLevelScopedHelper(
                ts,
                sourceFile,
                ttsclib.__esModuleInterop,
                [],
            )
            umdAccess = createCheckedUMDAccess(createESModuleInteropCall, ts.createLiteral('default'))
        } else {
            umdAccess = createCheckedUMDAccess(x => x, ts.createLiteral('default'))
        }
        // ? const defaultImportIdentifier = __importBindingCheck(value, name, path, mappedName)
        return getAssignment(defaultImport, ts.createPropertyAccess(umdAccess, 'default'))
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
        // ? const { a: b, c: d } = __importBindingCheck(value, name, path, mappedName)
        return ts.createVariableStatement(
            modifiers,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        ts.createObjectBindingPattern(
                            elements.map(x => ts.createBindingElement(undefined, x.propertyName, x.name, undefined)),
                        ),
                        undefined,
                        createCheckedUMDAccess(x => x, ...elements.map(x => ts.createLiteral(x.name.text))),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        )
    }
    function createCheckedUMDAccess(wrapper: (x: Expression) => Expression, ...names: StringLiteral[]) {
        const [, createUMDBindCheck] = createTopLevelScopedHelper(ts, sourceFile, ttsclib.__UMDBindCheck, [])
        return createUMDBindCheck(
            wrapper(umdAccess),
            ts.createArrayLiteral(names),
            ts.createLiteral(path),
            ts.createLiteral(globalIdentifier + '.' + umdName),
            ts.createLiteral(!!esModuleInterop),
        )
    }
}
/**
 * Return a ts.Expression for the given UMD name and config.
 * the second return is the globalObject identifier
 */
function getUMDExpressionForModule(
    umdName: string,
    globalObject: PluginConfig['globalObject'],
    ctx: Pick<Context<any>, 'context' | 'sourceFile' | 'ts'>,
): [Expression, string] {
    const { ts } = ctx
    const globalIdentifier = ts.createIdentifier(globalObject === undefined ? 'globalThis' : globalObject)
    const umdAccess = ts.createPropertyAccess(globalIdentifier, umdName)
    return [umdAccess, globalIdentifier.text]
}
function transformDynamicImport(ctx: Omit<Context<CallExpression>, 'path'>, args: Expression[]): Expression[] {
    const { ts, config, node, sourceFile, ttsclib } = ctx
    const [first, ...rest] = args
    if (ts.isStringLiteralLike(first)) {
        const rewriteStrategy = ttsclib.moduleSpecifierTransform({
            ...ctx,
            path: first.text,
            parseRegExp: parseRegExp.bind(ts),
        })
        switch (rewriteStrategy.type) {
            case 'error':
                const [id] = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args), [])
                return [ts.createCall(id, void 0, [ts.createLiteral(rewriteStrategy.reason), ...args])]
            case 'noop':
                return [node]
            case 'rewrite': {
                return [createDynamicImport(ts.createLiteral(rewriteStrategy.nextPath), ...rest)]
            }
            case 'umd': {
                if (rest.length !== 0) {
                    const [id] = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args), [])
                    return [
                        ts.createCall(id, void 0, [
                            ts.createLiteral(
                                "Transform rule found, but this dynamic import has more than 1 argument, don't know how to transform that.",
                            ),
                            ...args,
                        ]),
                    ]
                }
                const [umdAccess] = getUMDExpressionForModule(rewriteStrategy.target, rewriteStrategy.globalObject, ctx)
                return [ts.createCall(ts.createIdentifier('Promise.resolve'), undefined, [umdAccess])]
            }
            default: {
                throw new Error('Unreachable case')
            }
        }
    } else {
        if (rest.length !== 0) {
            const [id] = createTopLevelScopedHelper(ts, sourceFile, dynamicImportFailedHelper(args), [])
            return [
                ts.createCall(id, void 0, [
                    ts.createLiteral("This dynamic import has more than 1 arguments and don't know how to transform"),
                    ...args,
                ]),
            ]
        }
        const opt = config.dynamicImportPathRewrite
        if (opt === false) return [node]
        const [dynamicImportTransformIdentifier, createDynamicImportTransform] = createTopLevelScopedHelper(
            ts,
            sourceFile,
            ttsclib.__dynamicImportTransform,
            [parseJS(ts, ttsclib.moduleSpecifierTransform.toString(), ts.isFunctionDeclaration)!],
        )
        const stringifiedConfig = ts.createCall(ts.createIdentifier('JSON.parse'), void 0, [
            ts.createLiteral(JSON.stringify(config)),
        ])
        const [dynamicImportNative] = createTopLevelScopedHelper(ts, sourceFile, dynamicImportNativeString, [])
        const [umdBindCheck] = createTopLevelScopedHelper(ts, sourceFile, ttsclib.__UMDBindCheck, [])
        if (opt === 'auto' || opt === undefined) {
            /**
             * __dynamicImportTransform(config, path, dynamicImportNative, __UMDBindCheck)
             */
            return [createDynamicImportTransform(stringifiedConfig, first, dynamicImportNative, umdBindCheck)]
        }
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
        const [__customImportHelper, createCustomImportHelper] = createTopLevelScopedHelper(
            ts,
            sourceFile,
            ttsclib.__customDynamicImportHelper,
            [],
        )
        /**
         * __customImportHelper(
         *     path,
         *     __customDynamicImportHelper(__dynamicImportTransform, config, dynamicImportNative, __UMDBindCheck)
         * )
         */
        return [
            ts.createCall(customFunction, undefined, [
                first,
                createCustomImportHelper(
                    dynamicImportTransformIdentifier,
                    stringifiedConfig,
                    dynamicImportNative,
                    umdBindCheck,
                ),
            ]),
        ]
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

export type BareModuleRewriteUMD = {
    type: 'umd'
    target: string
    globalObject?: string
}
//#endregion
//#region ts helper
const topLevelScopedHelperMap = new WeakMap<
    SourceFile,
    Map<string | ((...args: any) => void), [Identifier, Statement]>
>()
type LevelUp<T> = T extends string
    ? StringLiteral
    : T extends number
    ? NumericLiteral
    : T extends any[]
    ? ArrayLiteralExpression
    : T extends boolean
    ? BooleanLiteral
    : Expression
type LevelUpArgs<T extends any[]> = {
    [key in keyof T]: LevelUp<T[key]>
}
type CastArray<T> = T extends any[] ? T : never
type CastFunction<T> = T extends (...a: any[]) => any ? T : (...a: never[]) => any
function createTopLevelScopedHelper<F extends string | ((...args: any[]) => any)>(
    ts: ts,
    sf: SourceFile,
    helper: F | string,
    additionDeclarations: FunctionDeclaration[],
): readonly [Identifier, (...args: CastArray<LevelUpArgs<Parameters<CastFunction<F>>>>) => Expression] {
    const result = topLevelScopedHelperMap.get(sf)?.get(helper)
    if (result) return [result[0], (...args: any) => ts.createCall(result[0], void 0, args)] as const
    const _f = parseJS(ts, helper.toString(), ts.isFunctionDeclaration)
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
        _f.body ? ts.updateBlock(_f.body, [..._f.body.statements, ...additionDeclarations]) : _f.body,
    )
    ts.setEmitFlags(f, ts.EmitFlags.NoComments)
    ts.setEmitFlags(f, ts.EmitFlags.NoNestedComments)
    writeSourceFileMeta(sf, topLevelScopedHelperMap, new Map(), x => x.set(helper, [uniqueName, f]))
    return [uniqueName, (...args: any) => ts.createCall(uniqueName, void 0, args)] as const
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
const dynamicImportFailedHelper = (args: Expression[]) => `function __dynamicImport${args.length}Ary(reason, ...args) {
    console.warn(reason, ...args)
    return import(${args.map((_, i) => `args[${i}]`).join(', ')});
};`
/**
 * Don't move this to ttsclib because it is a ES2020 syntax.
 */
const dynamicImportNativeString = `function __dynamicImportNative(path) {
    return import(path);
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
    const enums = Object.keys(BareModuleRewriteSimpleEnumLocal) as BareModuleRewriteSimple[]
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
enum BareModuleRewriteSimpleEnumLocal {
    snowpack = 'snowpack',
    umd = 'umd',
    unpkg = 'unpkg',
    pikacdn = 'pikacdn',
}
const BareModuleRewriteSimple: BareModuleRewriteSimpleEnum = BareModuleRewriteSimpleEnumLocal
