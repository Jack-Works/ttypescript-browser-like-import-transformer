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
    NamespaceExport,
    CallExpression,
    StringLiteral,
    NumericLiteral,
    ArrayLiteralExpression,
    FunctionDeclaration,
    BooleanLiteral,
    Program,
    PropertyAccessExpression,
} from 'typescript'
import { PluginConfigs, ImportMapFunctionOpts } from './plugin-config'
import { NormalizedPluginConfig } from './config-parser'
type ts = typeof import('typescript')

export interface CustomTransformationContext<T extends Node> {
    ts: typeof import('typescript')
    /**
     * The current visiting path
     */
    path: string
    sourceFile: SourceFile
    config: NormalizedPluginConfig
    context: TransformationContext
    node: T
    queryWellknownUMD: (path: string) => string | undefined
    importMapResolve: (opt: ImportMapFunctionOpts) => string | null
    queryPackageVersion: (pkg: string) => string | null
    configParser: typeof import('./config-parser')
    ttsclib: typeof import('./ttsclib')
}
type Context<T extends Node> = CustomTransformationContext<T>
const _with = <T extends Node>(ctx: Context<any>, node: T) => ({ ...ctx, node } as Context<T>)
/**
 * Create the Transformer
 * This file should not use any value import so the Typescript runtime is given from the environment
 */
export default function createTransformer(
    core: Pick<
        Context<any>,
        'queryWellknownUMD' | 'ttsclib' | 'queryPackageVersion' | 'importMapResolve' | 'configParser' | 'ts'
    >,
) {
    const { ts, configParser, importMapResolve } = core
    // ? Can't rely on the ts.Program because don't want to create on during the test.
    return function(_program: Pick<Program, 'getCurrentDirectory'>, configRaw: PluginConfigs) {
        return (context: TransformationContext) => {
            configParser.validateConfig(configRaw, context.getCompilerOptions())
            const config = configParser.normalizePluginConfig(configRaw)
            return (sourceFile: SourceFile) => {
                const ttsclib = {
                    ...core.ttsclib,
                    moduleSpecifierTransform: new Proxy(core.ttsclib.moduleSpecifierTransform, {
                        get(t, k) {
                            if (k === 'toString') return () => core.ttsclib.moduleSpecifierTransform.toString()
                            // @ts-ignore
                            return t[k]
                        },
                        apply(t, _, [ctx, opt]: Parameters<typeof import('./ttsclib').moduleSpecifierTransform>) {
                            if (!configRaw.importMap) return core.ttsclib.moduleSpecifierTransform(ctx, opt)
                            const comp = context.getCompilerOptions()
                            const result = importMapResolve({
                                config: configRaw,
                                sourceFilePath: sourceFile.fileName,
                                moduleSpecifier: ctx.path,
                                rootDir: comp.rootDir!,
                                tsconfigPath: (comp.configFilePath as string) || _program.getCurrentDirectory(),
                                // project: comp.project as string,
                            })
                            if (result) return { type: 'rewrite', nextPath: result }
                            return core.ttsclib.moduleSpecifierTransform(ctx, opt)
                        },
                    }),
                }

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
                    const shared = { config, configRaw, ts, context, node, sourceFile, ...core, ttsclib } as const
                    if (
                        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                        node.moduleSpecifier &&
                        ts.isStringLiteral(node.moduleSpecifier)
                    ) {
                        const path = node.moduleSpecifier.text
                        const args: Context<Node> = { ...shared, path }
                        return updateImportExportDeclaration(_with(args, node))
                    } else if (dynamicImportArgs) {
                        return transformDynamicImport(
                            { ...shared, node: node as CallExpression },
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
    const literal = parseJS(this, s, 'expression', this.isRegularExpressionLiteral)
    if (literal.type !== 'ok') return null
    try {
        return eval(literal.value.text)
    } catch {
        return null
    }
}
const runtimeMessageHeader = '@magic-works/ttypescript-browser-like-import-transformer: '
function createThrowStatement(ts: ts, type: 'TypeError' | 'SyntaxError', message: string): Statement {
    return ts.createThrow(
        ts.createNew(ts.createIdentifier(type), void 0, [ts.createLiteral(runtimeMessageHeader + message)]),
    )
}
function createThrowExpression(...[ts, type, message]: Parameters<typeof createThrowStatement>): Expression {
    return ts.createCall(
        ts.createParen(
            ts.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.createBlock([createThrowStatement(ts, type, message)], true),
            ),
        ),
        undefined,
        [],
    )
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
            return [createThrowStatement(ts, 'SyntaxError', rewriteStrategy.message)]
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
            const { umdImportPath } = rewriteStrategy
            const umdImport = umdImportPath
                ? [ts.createImportDeclaration(void 0, void 0, void 0, ts.createLiteral(umdImportPath))]
                : []
            // ? if it have no clause, it must be an ImportDeclaration
            if (!clause) {
                if (umdImportPath) return umdImport
                const text = `import "${
                    (node.moduleSpecifier as StringLiteral).text
                }" is eliminated because it expected to have no side effects in UMD transform.`
                return [ts.createExpressionStatement(ts.createLiteral(text))]
            }
            const { statements } = importOrExportClauseToUMD(nextPath, _with(context, clause), globalObject)
            writeSourceFileMeta(sourceFile, hoistUMDImportDeclaration, new Set<Statement>(), _ => {
                statements.forEach(x => _.add(x))
            })
            return [...umdImport, ...statements]
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
    const { node, ts, path, context, ttsclib } = ctx
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
                        const id = ts.createFileLevelUniqueName(x.name.text)
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
        const ghostBinding = ts.createFileLevelUniqueName(node.name.text)
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
            const [, createESModuleInteropCall] = createTopLevelScopedHelper(ctx, ttsclib.__esModuleInterop, [])
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
                        createCheckedUMDAccess(
                            x => x,
                            ...elements.map(x => ts.createLiteral(x.propertyName?.text ?? x.name.text)),
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        )
    }
    function createCheckedUMDAccess(wrapper: (x: Expression) => Expression, ...names: StringLiteral[]) {
        const [, createUMDBindCheck] = createTopLevelScopedHelper(ctx, ttsclib.__UMDBindCheck, [])
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
    globalObject: NormalizedPluginConfig['globalObject'],
    ctx: Pick<Context<any>, 'context' | 'sourceFile' | 'ts'>,
): [Expression, string] {
    const { ts, sourceFile } = ctx
    const globalIdentifier = ts.createIdentifier(globalObject === undefined ? 'globalThis' : globalObject)
    const umdAccess = ts.createPropertyAccess(globalIdentifier, umdName)
    const isSyntaxError =
        parseJS(
            ts,
            `${globalObject}.${umdName}`,
            'expression',
            function(node): node is CallExpression | PropertyAccessExpression {
                return ts.isCallExpression(node) || ts.isPropertyAccessExpression(node)
            },
            sourceFile.fileName,
        ).type === 'syntax error'
    if (isSyntaxError)
        return [
            createThrowExpression(ts, 'SyntaxError', 'Invalid source text after transform: ' + umdName),
            globalIdentifier.text,
        ]
    return [umdAccess, globalIdentifier.text]
}
const moreThan1ArgumentDynamicImportErrorMessage =
    runtimeMessageHeader +
    "Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched."
function transformDynamicImport(ctx: Omit<Context<CallExpression>, 'path'>, args: Expression[]): Expression[] {
    const { ts, config, node, sourceFile, ttsclib, configParser } = ctx
    const [first, ...rest] = args
    if (ts.isStringLiteralLike(first)) {
        const rewriteStrategy = ttsclib.moduleSpecifierTransform({
            ...ctx,
            path: first.text,
            parseRegExp: parseRegExp.bind(ts),
        })
        switch (rewriteStrategy.type) {
            case 'error':
                const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args), [])
                return [ts.createCall(id, void 0, [ts.createLiteral(rewriteStrategy.message), ...args])]
            case 'noop':
                return [node]
            case 'rewrite': {
                return [createDynamicImport(ts.createLiteral(rewriteStrategy.nextPath), ...rest)]
            }
            case 'umd': {
                if (rest.length !== 0) {
                    const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args), [])
                    return [
                        ts.createCall(id, void 0, [
                            ts.createLiteral(moreThan1ArgumentDynamicImportErrorMessage),
                            ...args,
                        ]),
                    ]
                }
                const { globalObject, umdImportPath } = rewriteStrategy
                const warning =
                    runtimeMessageHeader +
                    "umdImportPath doesn't work for dynamic import. You must load it by yourself. Found config: " +
                    umdImportPath
                const warningCall = ts.createCall(ts.createIdentifier('console.warn'), void 0, [
                    ts.createLiteral(warning),
                ])
                const [umdAccess] = getUMDExpressionForModule(rewriteStrategy.target, globalObject, ctx)
                const param = [umdAccess]
                if (umdImportPath) param.push(warningCall)
                return [ts.createCall(ts.createIdentifier('Promise.resolve'), undefined, param)]
            }
            default: {
                throw new Error('Unreachable case')
            }
        }
    } else {
        if (rest.length !== 0) {
            const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args), [])
            return [ts.createCall(id, void 0, [ts.createLiteral(moreThan1ArgumentDynamicImportErrorMessage), ...args])]
        }
        const opt = config.dynamicImportPathRewrite
        if (opt === false) return [node]
        const source = ttsclib.moduleSpecifierTransform.toString()
        const moduleSpecifierTransform_ = parseJS(ts, source, 'statement', ts.isFunctionDeclaration)
        if (moduleSpecifierTransform_.type !== 'ok') {
            debugger
            throw new Error('Invalid state' + source)
        }
        const [dynamicImportTransformIdentifier, createDynamicImportTransform] = createTopLevelScopedHelper(
            ctx,
            ttsclib.__dynamicImportTransform,
            [moduleSpecifierTransform_.value],
        )
        const stringifiedConfig = ts.createCall(ts.createIdentifier('JSON.parse'), void 0, [
            ts.createLiteral(JSON.stringify(config)),
        ])
        const [dynamicImportNative] = createTopLevelScopedHelper(ctx, dynamicImportNativeString, [])
        const [umdBindCheck] = createTopLevelScopedHelper(ctx, ttsclib.__UMDBindCheck, [])
        const [moduleSpecifierTransform] = createTopLevelScopedHelper(ctx, ttsclib.moduleSpecifierTransform, [])
        const helperArgs = [stringifiedConfig, dynamicImportNative, umdBindCheck, moduleSpecifierTransform] as const
        if (opt === 'auto' || opt === undefined) {
            /**
             * __dynamicImportTransform(path, config, dynamicImportNative, __UMDBindCheck, moduleSpecifierTransform)
             */
            return [createDynamicImportTransform(first, ...helperArgs)]
        }
        const f = parseJS(ts, opt.function, 'expression', ts.isArrowFunction, sourceFile.fileName)
        if (f.type !== 'ok')
            throw new configParser.ConfigError(
                'Unable to parse the function. It must be an ArrowFunction. Get: ' + opt.function,
            )
        const customFunction =
            topLevelScopedHelperMap.get(sourceFile)?.get('__customImportHelper')?.[0] ||
            ts.createFileLevelUniqueName('__customImportHelper')
        if (!topLevelScopedHelperMap.get(sourceFile)?.has('__customImportHelper')) {
            const decl = ts.createVariableStatement(
                undefined,
                ts.createVariableDeclarationList(
                    [ts.createVariableDeclaration(customFunction, undefined, f.value)],
                    ts.NodeFlags.Const,
                ),
            )
            writeSourceFileMeta(sourceFile, topLevelScopedHelperMap, new Map<string, [Identifier, Statement]>(), x => {
                x.set('__customImportHelper', [customFunction, decl])
            })
        }
        const [, createCustomImportHelper] = createTopLevelScopedHelper(ctx, ttsclib.__customDynamicImportHelper, [])
        /**
         * __customImportHelper(
         *     path,
         *     __customDynamicImportHelper(__dynamicImportTransform, config, dynamicImportNative, __UMDBindCheck)
         * )
         */
        return [
            ts.createCall(customFunction, undefined, [
                first,
                createCustomImportHelper(dynamicImportTransformIdentifier, ...helperArgs),
            ]),
        ]
    }

    function createDynamicImport(...args: Expression[]) {
        return ts.createCall(ts.createToken(ts.SyntaxKind.ImportKeyword) as any, void 0, args)
    }
}
//#endregion
//#region ts helper
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

const topLevelScopedHelperMap = new WeakMap<
    SourceFile,
    Map<string | ((...args: any) => void), [Identifier, Statement]>
>()
function createTopLevelScopedHelper<F extends string | ((...args: any[]) => any)>(
    context: Pick<Context<any>, 'ts' | 'sourceFile' | 'config' | 'ttsclib' | 'queryPackageVersion'>,
    helper: F | string,
    additionDeclarations: FunctionDeclaration[],
): readonly [Identifier, (...args: CastArray<LevelUpArgs<Parameters<CastFunction<F>>>>) => Expression] {
    const { config, ts, sourceFile, ttsclib, queryPackageVersion } = context
    const result = topLevelScopedHelperMap.get(sourceFile)?.get(helper)
    if (result) return [result[0], (...args: any) => ts.createCall(result[0], void 0, args)] as const
    const parseResult = parseJS(ts, helper.toString(), 'statement', ts.isFunctionDeclaration)
    if (parseResult.type !== 'ok') throw new Error('helper must be a function declaration, found ' + parseResult.error)
    const parsedFunction = parseResult.value
    const fnName = parsedFunction.name!.text
    const uniqueName = ts.createFileLevelUniqueName(fnName)
    const returnValue = [uniqueName, (...args: any) => ts.createCall(uniqueName, void 0, args)] as const
    // ? if the function name is in the ttsclib, return a import declaration
    if (fnName in ttsclib && config.importHelpers !== 'inline') {
        const helperURL =
            'https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@$version$/es/ttsclib.min.js'
        const url = config.importHelpers === 'auto' ? helperURL : config.importHelpers ?? helperURL
        // ? import { __helperName as uniqueName } from 'url'
        const importDeclaration = ts.createImportDeclaration(
            void 0,
            void 0,
            ts.createImportClause(
                void 0,
                ts.createNamedImports([ts.createImportSpecifier(uniqueName, ts.createIdentifier(fnName))]),
            ),
            ts.createLiteral(
                url.replace(
                    '$version$',
                    queryPackageVersion('@magic-works/ttypescript-browser-like-import-transformer') || 'latest',
                ),
            ),
        )
        writeSourceFileMeta(sourceFile, topLevelScopedHelperMap, new Map(), x =>
            x.set(helper, [uniqueName, importDeclaration]),
        )
        return returnValue
    }
    const f = ts.updateFunctionDeclaration(
        parsedFunction,
        void 0,
        parsedFunction.modifiers,
        parsedFunction.asteriskToken,
        uniqueName,
        void 0,
        parsedFunction.parameters,
        void 0,
        parsedFunction.body
            ? ts.updateBlock(parsedFunction.body, [...parsedFunction.body.statements, ...additionDeclarations])
            : parsedFunction.body,
    )
    ts.setEmitFlags(f, ts.EmitFlags.NoComments)
    ts.setEmitFlags(f, ts.EmitFlags.NoNestedComments)
    writeSourceFileMeta(sourceFile, topLevelScopedHelperMap, new Map(), x => x.set(helper, [uniqueName, f]))
    return returnValue
}

function parseJS<T extends Node = Node>(
    ts: ts,
    source: string,
    kind: 'expression' | 'statement',
    typeGuard: (node: Node) => node is T = (_node): _node is T => true,
    fileName: string = '_internal_.js',
): { type: 'syntax error'; error: string } | { type: 'ok'; value: T } {
    // force parse in JS mode
    fileName += '.js'
    const diagnostics = ts.transpileModule(source, { reportDiagnostics: true, fileName }).diagnostics || []
    if (diagnostics.length > 0) {
        return {
            type: 'syntax error',
            error: ts.formatDiagnostics(diagnostics, {
                getCanonicalFileName: () => '',
                getCurrentDirectory: () => '/tmp',
                getNewLine: () => '\n',
            }),
        }
    }
    const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, false, ts.ScriptKind.JS)
    if (sf.statements.filter(x => !ts.isEmptyStatement(x)).length !== 1)
        return { type: 'syntax error', error: 'Unexpected statement count ' + sf.statements.length }
    const [firstStatement] = sf.statements
    if (kind === 'expression') {
        if (ts.isExpressionStatement(firstStatement) && typeGuard(firstStatement.expression))
            return { type: 'ok', value: firstStatement.expression }
    } else if (typeGuard(firstStatement)) {
        return { type: 'ok', value: firstStatement }
    }
    return { type: 'syntax error', error: 'Unexpected SyntaxKind: ' + ts.SyntaxKind[firstStatement.kind] }
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
