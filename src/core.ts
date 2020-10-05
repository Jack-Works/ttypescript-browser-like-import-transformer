import type {
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
    BooleanLiteral,
    Program,
    PropertyAccessExpression,
    NamedImports,
    CompilerOptions,
    NodeFactory,
} from 'typescript'
import type { PluginConfigs, ImportMapFunctionOpts, RewriteRulesUMD } from './plugin-config'
import type { NormalizedPluginConfig } from './config-parser'
import type { moduleSpecifierTransform } from './ttsclib'
type ts = typeof import('typescript')
export interface CustomTransformationContext<T extends Node> {
    ts: ts
    /** The current visiting module specifier */
    path: string
    sourceFile: SourceFile
    config: NormalizedPluginConfig
    /** The original TypeScript TransformationContext */
    context: TransformationContext
    /** Current transforming Node */
    node: T
    /** Given a path, this function should return its UMD name */
    queryWellknownUMD: (path: string) => string | null
    importMapResolve: (opt: ImportMapFunctionOpts) => string | null
    queryPackageVersion: (pkg: string) => string | null
    resolveJSONImport: (path: string, parent: string) => string | null
    resolveFolderImport: (path: string, parent: string) => string | null
    getCompilerOptions: () => CompilerOptions
    treeshakeProvider?: (
        pkg: string,
        accessedImports: Set<string>,
        cfg: NonNullable<RewriteRulesUMD['treeshake']>,
        compilerOptions: CompilerOptions,
    ) => void
    configParser: typeof import('./config-parser')
    ttsclib: typeof import('./ttsclib')
}
type Context<T extends Node> = CustomTransformationContext<T>
function _with<T extends Node>(ctx: Context<any>, node: T): Context<T> {
    return { ...ctx, node }
}
/**
 * Create the Transformer
 * This file should not use any value import so the Typescript runtime is given from the environment
 */
export default function createTransformer(
    io: Pick<
        Context<any>,
        | 'ts'
        | 'ttsclib'
        | 'configParser'
        | 'queryWellknownUMD'
        | 'queryPackageVersion'
        | 'importMapResolve'
        | 'treeshakeProvider'
        | 'resolveJSONImport'
        | 'resolveFolderImport'
    >,
) {
    const { ts, configParser, importMapResolve } = io
    // ? Don't rely on the ts.Program because don't want to create on during the test.
    return function (_program: Partial<Pick<Program, 'getCurrentDirectory'>>, configRaw: PluginConfigs) {
        return (context: TransformationContext) => {
            configParser.validateConfig(configRaw, context.getCompilerOptions())
            const config = configParser.normalizePluginConfig(configRaw)
            return (sourceFile: SourceFile) => {
                const ttsclib = {
                    ...io.ttsclib,
                    moduleSpecifierTransform: new Proxy(io.ttsclib.moduleSpecifierTransform, {
                        get(t, k) {
                            if (k === 'toString') return () => io.ttsclib.moduleSpecifierTransform.toString()
                            // @ts-ignore
                            return t[k]
                        },
                        apply(t, _, [ctx, opt]: Parameters<typeof import('./ttsclib').moduleSpecifierTransform>) {
                            if (!configRaw.importMap) return t(ctx, opt)
                            const comp = context.getCompilerOptions()
                            const result = importMapResolve({
                                config: configRaw,
                                sourceFilePath: sourceFile.fileName,
                                moduleSpecifier: ctx.path,
                                rootDir: comp.rootDir!,
                                tsconfigPath: (comp.configFilePath as string) || _program.getCurrentDirectory?.()!,
                            })
                            if (result) return { type: 'rewrite', nextPath: result }
                            return t(ctx, opt)
                        },
                    }),
                }

                let visitedSourceFile = ts.visitEachChild(sourceFile, visitor, context)
                // ? hoistedHelper and hoistedUMDImport will be added ^ in the visitor
                const hoistedHelper = Array.from(topLevelScopedHelperMap.get(sourceFile)?.values() || []).map(
                    (x) => x[1],
                )
                const ttscHelper = ttsclibImportMap.get(sourceFile)
                if (ttscHelper) hoistedHelper.push(ttscHelper[0])
                function isLanguageHoistable(node: Statement): boolean {
                    if (ts.isFunctionDeclaration(node)) return true
                    if (ts.isImportDeclaration(node)) return true
                    return false
                }
                const languageHoistableDeclarations = hoistedHelper.filter(isLanguageHoistable)
                const languageNotHoistableDeclarations = hoistedHelper.filter((x) => !isLanguageHoistable(x))
                const hoistedUMDImport = Array.from(hoistUMDImportDeclaration.get(sourceFile)?.values() || [])
                visitedSourceFile = context.factory.updateSourceFile(
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
                // ? In incremental compiling, this Map might cause duplicated statements, WeakMap doesn't help
                hoistUMDImportDeclaration.delete(sourceFile)
                topLevelScopedHelperMap.delete(sourceFile)
                ttsclibImportMap.delete(sourceFile)
                return visitedSourceFile

                function visitor(node: Node): VisitResult<Node> {
                    const dynamicImportArgs = isDynamicImport(ts, node)
                    const shared = {
                        config,
                        configRaw,
                        context,
                        node,
                        sourceFile,
                        ...io,
                        ttsclib,
                        getCompilerOptions: () => context.getCompilerOptions(),
                    } as const
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
    const literal = parseJS(this, s, ParseHint.Expression, this.isRegularExpressionLiteral)
    if (literal.type !== ParseResult.OK) return null
    try {
        return eval(literal.value.text)
    } catch {
        return null
    }
}
/**
 * Special return value:
 * '*' means a namespace import
 * '!' means a import with no import clause
 */
function getImportedItems(ts: ts, node: ImportDeclaration | ExportDeclaration): Set<string> {
    const result = new Set<string>()
    if (ts.isImportDeclaration(node)) {
        if (!node.importClause) return new Set('!')

        const clause = node.importClause
        if (clause.name) result.add('default')
        if (clause.namedBindings) {
            const b = clause.namedBindings
            if (ts.isNamespaceImport(b)) result.add('*')
            else if (ts.isNamedImports(b)) {
                b.elements.forEach((x) => result.add((x.propertyName || x.name).text))
            }
        }
    } else {
        if (!node.exportClause) return new Set('*')
        const clause = node.exportClause
        if (ts.isNamedExports(clause)) {
            clause.elements.forEach((x) => result.add((x.propertyName || x.name).text))
        }
        if (ts.isNamespaceExport(clause)) result.add('*')
    }
    return result
}
const runtimeMessageHeader = '@magic-works/ttypescript-browser-like-import-transformer: '
function createThrowStatement(factory: NodeFactory, type: 'TypeError' | 'SyntaxError', message: string): Statement {
    return factory.createThrowStatement(
        factory.createNewExpression(factory.createIdentifier(type), void 0, [
            factory.createStringLiteral(runtimeMessageHeader + message),
        ]),
    )
}
function createThrowExpression(...[factory, ...args]: Parameters<typeof createThrowStatement>): Expression {
    return factory.createImmediatelyInvokedArrowFunction([createThrowStatement(factory, ...args)])
}
function createTypedCallExpressionFactory<F>(callee: (factory: NodeFactory) => Expression) {
    return (factory: NodeFactory, ...args: CastArray<LevelUpArgs<Parameters<CastFunction<F>>>>) => {
        return factory.createCallExpression(callee(factory), void 0, args)
    }
}
const createJSONParse = createTypedCallExpressionFactory<typeof JSON.parse>((fac) =>
    fac.createPropertyAccessExpression(fac.createIdentifier('JSON'), 'parse'),
)
const createPromiseResolve = createTypedCallExpressionFactory<typeof Promise.resolve>((fac) =>
    fac.createPropertyAccessExpression(fac.createIdentifier('Promise'), 'resolve'),
)
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
const hoistUMDImportDeclaration = new Map<SourceFile, Set<Statement>>()
function updateImportExportDeclaration(
    ctx: Context<ImportDeclaration | ExportDeclaration>,
    opt = ctx.config.rules,
): Statement[] {
    const { node, sourceFile, ts, ttsclib, context } = ctx
    const { factory } = context
    const rewriteStrategy = ttsclib.moduleSpecifierTransform(
        {
            ...ctx,
            parseRegExp: parseRegExp.bind(ts),
            accessingImports: getImportedItems(ts, node),
            currentFile: sourceFile.fileName,
            runtime: false,
        },
        opt,
    )
    switch (rewriteStrategy.type) {
        case 'error':
            return [createThrowStatement(factory, 'SyntaxError', rewriteStrategy.message)]
        case 'noop':
            return [node]
        case 'rewrite': {
            const nextPath = factory.createStringLiteral(rewriteStrategy.nextPath)
            if (ts.isImportDeclaration(node))
                return [
                    factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, nextPath),
                ]
            else
                return [
                    factory.updateExportDeclaration(
                        node,
                        node.decorators,
                        node.modifiers,
                        node.isTypeOnly,
                        node.exportClause,
                        nextPath,
                    ),
                ]
        }
        case 'umd':
            return umd(rewriteStrategy)
        case 'json':
            const { json } = rewriteStrategy
            // If the JSON doesn't exist fallback, do not rewrite it
            if (!json) return [node]
            const t: ExprTarget = {
                type: 'umd',
                target: createJSONParse(factory, factory.createStringLiteral(json)),
            }
            return umd(t, true)
        default:
            return unreachable(rewriteStrategy)
    }

    type ExprTarget = Omit<RewriteRulesUMD, 'target'> & {
        target: string | Expression
    }

    function umd(rewriteStrategy: ExprTarget, noImportCheck = false) {
        const nextPath = rewriteStrategy.target
        const globalObject = rewriteStrategy.globalObject
        const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause
        const { umdImportPath } = rewriteStrategy
        const umdImport = umdImportPath
            ? [factory.createImportDeclaration(void 0, void 0, void 0, factory.createStringLiteral(umdImportPath))]
            : []
        // ? if it have no clause, it must be an ImportDeclaration
        if (!clause) {
            if (umdImportPath) return umdImport
            const text = `import "${
                (node.moduleSpecifier as StringLiteral).text
            }" is eliminated because it expected to have no side effects in UMD transform.`
            return [factory.createExpressionStatement(factory.createStringLiteral(text))]
        }
        const { statements } = importOrExportClauseToUMD(nextPath, _with(ctx, clause), globalObject, noImportCheck)
        writeSourceFileMeta(sourceFile, hoistUMDImportDeclaration, new Set<Statement>(), (_) => {
            statements.forEach((x) => _.add(x))
        })
        return [...umdImport, ...statements]
    }
}
/**
 * import a from 'b' => const a = globalThis.b.default
 * import { a, b, c } from 'd' => const { a, b, c } = globalThis.b
 * import * as a from 'b' => const a = globalThis.b
 *
 * export { a, b, c } from 'd' => (a magic import statement); export const a = (magic binding)
 * export * as b from 'd' => (a magic import statement); export const a = (magic binding)
 * @param noImportCheck Disable _import
 *
 */
function importOrExportClauseToUMD(
    umdName: string | Expression,
    ctx: Context<ImportClause | NamespaceExport | NamedExports>,
    globalObject = ctx.config.globalObject,
    noImportCheck = false,
): { variableNames: Identifier[]; statements: Statement[] } {
    const { node, ts, path, context, ttsclib } = ctx
    const { factory } = context
    const {
        config: { umdCheckCompact },
    } = ctx
    const [umdExpression, globalIdentifier] = getUMDExpressionForModule(umdName, globalObject, ctx)
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
            namedImport.elements.forEach((v) => ids.push(v.name))
            statements.push(transformNamedImportExport(namedImport))
        }
        return { variableNames: ids, statements: statements }
    } else if (ts.isNamedExports(node)) {
        const ghostBindings = new Map<ExportSpecifier, Identifier>()
        const ghostImportDeclaration = factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports(
                    node.elements.map<ImportSpecifier>((x) => {
                        return factory.createImportSpecifier(
                            x.propertyName || factory.createIdentifier(x.name.text),
                            factory.createTempVariable((id) => ghostBindings.set(x, id)),
                        )
                    }),
                ),
            ),
            factory.createStringLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(_with(ctx, ghostImportDeclaration))
        const exportDeclaration = factory.createExportDeclaration(
            undefined,
            void 0,
            false,
            factory.createNamedExports(
                Array.from(ghostBindings).map(([key, value]) => factory.createExportSpecifier(value, key.name)),
            ),
            void 0,
        )
        statements.push(...updatedGhost)
        statements.push(exportDeclaration)
        return { statements, variableNames: ids }
    } else if (ts.isNamespaceExport(node)) {
        const ghostBinding = factory.createTempVariable(() => {})
        const ghostImportDeclaration = factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(false, undefined, factory.createNamespaceImport(ghostBinding)),
            factory.createStringLiteral(path),
        )
        const updatedGhost = updateImportExportDeclaration(_with(ctx, ghostImportDeclaration))
        const exportDeclaration = factory.createExportDeclaration(
            void 0,
            void 0,
            false,
            factory.createNamedExports([factory.createExportSpecifier(ghostBinding, node.name.text)]),
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
            createCheckedUMDAccess((x) => x),
        )
    }
    function getDefaultImport(defaultImport: Identifier) {
        let umdAccess: Expression
        if (esModuleInterop) {
            const [, createESModuleInteropCall] = createTopLevelScopedHelper(ctx, ttsclib.__esModuleInterop)
            umdAccess = createCheckedUMDAccess(createESModuleInteropCall, factory.createStringLiteral('default'))
        } else {
            umdAccess = createCheckedUMDAccess((x) => x, factory.createStringLiteral('default'))
        }
        // ? const defaultImportIdentifier = __importBindingCheck(value, name, path, mappedName)
        return getAssignment(defaultImport, factory.createPropertyAccessExpression(umdAccess, 'default'))
    }
    /** const _id_ = _target_ */
    function getAssignment(id: Identifier, target: Expression) {
        return factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(id, undefined, undefined, target)],
                ts.NodeFlags.Const,
            ),
        )
    }
    function transformNamedImportExport(namedImport: NamedImportsOrExports, modifiers: Modifier[] = []) {
        const elements: Array<ImportSpecifier | ExportSpecifier> = []
        namedImport.elements.forEach((y: typeof elements[0]) => elements.push(y))
        // ? const { a: b, c: d } = _import(value, name, path, mappedName)
        return factory.createVariableStatement(
            modifiers,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createObjectBindingPattern(
                            elements.map((x) =>
                                factory.createBindingElement(undefined, x.propertyName, x.name, undefined),
                            ),
                        ),
                        undefined,
                        undefined,
                        createCheckedUMDAccess(
                            (x) => x,
                            ...elements.map((x) => factory.createStringLiteral(x.propertyName?.text ?? x.name.text)),
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        )
    }
    function createCheckedUMDAccess(wrapper: (x: Expression) => Expression, ...names: StringLiteral[]) {
        if (noImportCheck) return wrapper(umdExpression)
        const [, createImportCheck] = createTopLevelScopedHelper(ctx, ttsclib._import)
        return createImportCheck(
            wrapper(umdExpression),
            factory.createArrayLiteralExpression(names),
            umdCheckCompact ? factory.createStringLiteral('') : factory.createStringLiteral(path),
            umdCheckCompact
                ? factory.createStringLiteral('')
                : factory.createStringLiteral(globalIdentifier + '.' + umdName),
            !!esModuleInterop ? factory.createTrue() : factory.createFalse(),
        )
    }
}
/**
 * Return a ts.Expression for the given UMD name and config.
 * the second return is the globalObject identifier
 */
function getUMDExpressionForModule(
    umdName: string | Expression,
    globalObject: NormalizedPluginConfig['globalObject'],
    ctx: Pick<Context<any>, 'context' | 'sourceFile' | 'ts' | 'config'>,
): [Expression, string] {
    const {
        ts,
        sourceFile,
        config: { safeAccess = true },
        context: { factory },
    } = ctx
    const globalIdentifier = factory.createIdentifier(globalObject === undefined ? 'globalThis' : globalObject)
    const umdAccess =
        typeof umdName === 'string'
            ? safeAccess
                ? factory.createElementAccessExpression(globalIdentifier, factory.createStringLiteral(umdName))
                : factory.createPropertyAccessExpression(globalIdentifier, umdName)
            : umdName
    const isSyntaxError = safeAccess
        ? false
        : parseJS(
              ts,
              `${globalObject}.${umdName}`,
              ParseHint.Expression,
              function (node): node is CallExpression | PropertyAccessExpression {
                  return ts.isCallExpression(node) || ts.isPropertyAccessExpression(node)
              },
              sourceFile.fileName,
          ).type === ParseResult.SyntaxError
    if (isSyntaxError)
        return [
            createThrowExpression(factory, 'SyntaxError', 'Invalid source text after transform: ' + umdName),
            globalIdentifier.text,
        ]
    return [umdAccess, globalIdentifier.text]
}
const moreThan1ArgumentDynamicImportErrorMessage =
    runtimeMessageHeader +
    "Transform rule for this dependencies found, but this dynamic import has more than 1 argument, transformer don't know how to transform that and keep it untouched."
function transformDynamicImport(ctx: Omit<Context<CallExpression>, 'path'>, args: Expression[]): Expression[] {
    const { ts, config, node, sourceFile, ttsclib, configParser } = ctx
    const { factory } = ctx.context
    const [first, ...rest] = args
    if (ts.isStringLiteralLike(first)) {
        const rewriteStrategy = ttsclib.moduleSpecifierTransform({
            ...ctx,
            path: first.text,
            parseRegExp: parseRegExp.bind(ts),
            accessingImports: new Set('*'),
            currentFile: sourceFile.fileName,
            runtime: false,
        })
        switch (rewriteStrategy.type) {
            case 'error':
                const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args))
                return [
                    factory.createCallExpression(id, void 0, [
                        factory.createStringLiteral(rewriteStrategy.message),
                        ...args,
                    ]),
                ]
            case 'noop':
                return [node]
            case 'rewrite': {
                return [createDynamicImport(factory.createStringLiteral(rewriteStrategy.nextPath), ...rest)]
            }
            case 'umd': {
                if (rest.length !== 0) {
                    const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args))
                    return [
                        factory.createCallExpression(id, void 0, [
                            factory.createStringLiteral(moreThan1ArgumentDynamicImportErrorMessage),
                            ...args,
                        ]),
                    ]
                }
                const { globalObject, umdImportPath } = rewriteStrategy
                const warning =
                    runtimeMessageHeader +
                    "umdImportPath doesn't work for dynamic import. You must load it by yourself. Found config: " +
                    umdImportPath
                const warningCall = factory.createCallExpression(factory.createIdentifier('console.warn'), void 0, [
                    factory.createStringLiteral(warning),
                ])
                const [umdAccess] = getUMDExpressionForModule(rewriteStrategy.target, globalObject, ctx)
                const expr = createPromiseResolve(factory, umdAccess)
                if (umdImportPath) return [factory.createComma(warningCall, expr)]
                return [expr]
            }
            case 'json': {
                const val = rewriteStrategy.json
                if (val)
                    return [createPromiseResolve(factory, createJSONParse(factory, factory.createStringLiteral(val)))]
                return [createNondeterministicDynamicImport()]
            }
            default: {
                return unreachable(rewriteStrategy)
            }
        }
    } else {
        if (rest.length !== 0) {
            const [id] = createTopLevelScopedHelper(ctx, dynamicImportFailedHelper(args))
            return [
                factory.createCallExpression(id, void 0, [
                    factory.createStringLiteral(moreThan1ArgumentDynamicImportErrorMessage),
                    ...args,
                ]),
            ]
        }
        return [createNondeterministicDynamicImport()]
    }

    function createNondeterministicDynamicImport(): Expression {
        const opt = config.dynamicImportPathRewrite
        if (opt === false) return node
        const source = ttsclib.moduleSpecifierTransform.toString()
        const moduleSpecifierTransform_ = parseJS(ts, source, ParseHint.Statement, ts.isFunctionDeclaration)
        if (moduleSpecifierTransform_.type !== ParseResult.OK) {
            debugger
            throw new Error('Invalid state' + source)
        }
        const [dynamicImportTransformIdentifier, createDynamicImportTransform] = createTopLevelScopedHelper(
            ctx,
            ttsclib.__dynamicImportTransform,
        )
        const stringifiedConfig = createJSONParse(factory, factory.createStringLiteral(JSON.stringify(config)))
        const [dynamicImportNative] = createTopLevelScopedHelper(
            ctx,
            config.jsonImport ? dynamicImportNativeWithJSONString : dynamicImportNativeString,
        )
        const [importCheck] = createTopLevelScopedHelper(ctx, ttsclib._import)
        const [moduleSpecifierTransform] = createTopLevelScopedHelper(ctx, ttsclib.moduleSpecifierTransform)
        const helperArgs = [stringifiedConfig, dynamicImportNative, importCheck, moduleSpecifierTransform] as const
        if (opt === 'auto' || opt === undefined) {
            /**
             * __dynamicImportTransform(path, config, dynamicImportNative, _import, moduleSpecifierTransform)
             */
            return createDynamicImportTransform(first, ...helperArgs)
        }
        const f = parseJS(ts, opt.function, ParseHint.Expression, ts.isArrowFunction, sourceFile.fileName)
        if (f.type !== ParseResult.OK)
            throw new configParser.ConfigError(
                'Unable to parse the function. It must be an ArrowFunction. Get: ' + opt.function,
            )
        const customFunction =
            topLevelScopedHelperMap.get(sourceFile)?.get('__customImportHelper')?.[0] ||
            factory.createTempVariable(() => {})
        if (!topLevelScopedHelperMap.get(sourceFile)?.has('__customImportHelper')) {
            const decl = factory.createVariableStatement(
                undefined,
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(customFunction, undefined, undefined, f.value)],
                    ts.NodeFlags.Const,
                ),
            )
            writeSourceFileMeta(
                sourceFile,
                topLevelScopedHelperMap,
                new Map<string, [Identifier, Statement]>(),
                (x) => {
                    x.set('__customImportHelper', [customFunction, decl])
                },
            )
        }
        const [, createCustomImportHelper] = createTopLevelScopedHelper(ctx, ttsclib.__customDynamicImportHelper)
        /**
         * __customImportHelper(
         *     path,
         *     __customDynamicImportHelper(__dynamicImportTransform, config, dynamicImportNative, _import)
         * )
         */
        return factory.createCallExpression(customFunction, undefined, [
            first,
            createCustomImportHelper(dynamicImportTransformIdentifier, ...helperArgs),
        ])
    }

    function createDynamicImport(...args: Expression[]) {
        return factory.createCallExpression(factory.createToken(ts.SyntaxKind.ImportKeyword) as any, void 0, args)
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

const topLevelScopedHelperMap = new Map<SourceFile, Map<string | ((...args: any) => void), [Identifier, Statement]>>()
const ttsclibImportMap = new Map<SourceFile, [ImportDeclaration, Set<Identifier>]>()
function createTopLevelScopedHelper<F extends string | ((...args: any[]) => any)>(
    context: Pick<Context<any>, 'ts' | 'sourceFile' | 'config' | 'ttsclib' | 'queryPackageVersion' | 'context'>,
    helper: F | string,
): readonly [Identifier, (...args: CastArray<LevelUpArgs<Parameters<CastFunction<F>>>>) => Expression] {
    const { config, ts, sourceFile, ttsclib, queryPackageVersion } = context
    const { factory } = context.context
    const result = topLevelScopedHelperMap.get(sourceFile)?.get(helper)
    if (result) return [result[0], (...args: any) => factory.createCallExpression(result[0], void 0, args)] as const
    const parseResult = parseJS(ts, helper.toString(), ParseHint.Statement, ts.isFunctionDeclaration)
    if (parseResult.type !== ParseResult.OK)
        throw new Error('helper must be a function declaration, found ' + parseResult.error)
    const parsedFunction = parseResult.value
    const fnName = parsedFunction.name!.text
    const uniqueName = factory.createUniqueName(fnName)
    const returnValue = [uniqueName, (...args: any) => factory.createCallExpression(uniqueName, void 0, args)] as const
    // ? if the function name is in the ttsclib, return a import declaration
    const { importHelpers = 'auto' } = config
    if (fnName in ttsclib && importHelpers !== 'inline') {
        const cdn =
            'https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@$version$/es/ttsclib.min.js'
        const node = `@magic-works/ttypescript-browser-like-import-transformer/cjs/ttsclib.js`
        let url
        if (importHelpers === 'auto' || importHelpers === 'cdn') url = cdn
        else if (importHelpers === 'node') url = node
        else url = importHelpers
        let [importDec, idSet] = ttsclibImportMap.get(sourceFile) || [
            factory.createImportDeclaration(
                void 0,
                void 0,
                factory.createImportClause(false, void 0, factory.createNamedImports([])),
                factory.createStringLiteral(
                    url.replace(
                        '$version$',
                        queryPackageVersion('@magic-works/ttypescript-browser-like-import-transformer') || 'latest',
                    ),
                ),
            ),
            new Set([]),
        ]
        // ? import { __helperName as uniqueName } from 'url'
        const importBind = factory.createImportSpecifier(factory.createIdentifier(fnName), uniqueName)
        const importClause = importDec.importClause!
        const importBindings = importClause.namedBindings! as NamedImports
        if (importBindings.elements.find((x) => x.name.text === fnName)) {
            const uniqueName = [...idSet.values()].find((x) => x.text === fnName)!
            return [uniqueName, (...args: any) => factory.createCallExpression(uniqueName, void 0, args)] as const
        }
        importDec = factory.updateImportDeclaration(
            importDec,
            void 0,
            void 0,
            factory.updateImportClause(
                importClause,
                false,
                undefined,
                factory.updateNamedImports(importBindings, [...importBindings.elements, importBind]),
            ),
            importDec.moduleSpecifier,
        )
        idSet.add(uniqueName)
        ttsclibImportMap.set(sourceFile, [importDec, idSet])
        return returnValue
    }
    const f = factory.updateFunctionDeclaration(
        parsedFunction,
        void 0,
        parsedFunction.modifiers,
        parsedFunction.asteriskToken,
        uniqueName,
        void 0,
        parsedFunction.parameters,
        void 0,
        parsedFunction.body,
    )
    ts.setEmitFlags(f, ts.EmitFlags.NoComments)
    ts.setEmitFlags(f, ts.EmitFlags.NoNestedComments)
    writeSourceFileMeta(sourceFile, topLevelScopedHelperMap, new Map(), (x) => x.set(helper, [uniqueName, f]))
    return returnValue
}

const enum ParseResult {
    OK,
    SyntaxError,
}
const enum ParseHint {
    Expression,
    Statement,
}
function parseJS<T extends Node = Node>(
    ts: ts,
    source: string,
    kind: ParseHint,
    typeGuard: (node: Node) => node is T = (_node): _node is T => true,
    fileName: string = '_internal_.js',
): { type: ParseResult.SyntaxError; error: string } | { type: ParseResult.OK; value: T } {
    // force parse in JS mode
    fileName += '.js'
    const diagnostics = ts.transpileModule(source, { reportDiagnostics: true, fileName }).diagnostics || []
    if (diagnostics.length > 0) {
        return {
            type: ParseResult.SyntaxError,
            error: ts.formatDiagnostics(diagnostics, {
                getCanonicalFileName: () => '',
                getCurrentDirectory: () => '/tmp',
                getNewLine: () => '\n',
            }),
        }
    }
    const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, false, ts.ScriptKind.JS)
    if (sf.statements.filter((x) => !ts.isEmptyStatement(x)).length !== 1)
        return { type: ParseResult.SyntaxError, error: 'Unexpected statement count ' + sf.statements.length }
    const [firstStatement] = sf.statements
    if (kind === ParseHint.Expression) {
        if (ts.isExpressionStatement(firstStatement) && typeGuard(firstStatement.expression))
            return { type: ParseResult.OK, value: firstStatement.expression }
    } else if (typeGuard(firstStatement)) {
        return { type: ParseResult.OK, value: firstStatement }
    }
    return { type: ParseResult.SyntaxError, error: 'Unexpected SyntaxKind: ' + ts.SyntaxKind[firstStatement.kind] }
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
function dynamicImportWithJSONHelper(json: string, meta: any) {
    const url = new URL(json, meta.url).toString()
    return fetch(url)
        .then((x) =>
            x.ok ? x.text() : Promise.reject(new TypeError(`Failed to fetch dynamically imported module: ${url}`)),
        )
        .then(JSON.parse)
}
const dynamicImportNativeWithJSONString = `function __dynamicImportNative(path, json) {
    if (json) return ${dynamicImportWithJSONHelper.name}(json, import.meta)
    return import(path);
    ${dynamicImportWithJSONHelper.toString()}
};`
