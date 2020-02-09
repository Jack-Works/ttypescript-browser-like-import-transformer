const __customImportHelper_1 = x => Promise
    .reject(x);
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
__customImportHelper_1(x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"x => Promise.reject(x)\"}}"), __dynamicImportNative, __UMDBindCheck));
__dynamicImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
function __dynamicImportTransform(config, _path, dynamicImport, UMDBindCheck) {
    if (typeof _path !== "string")
        _path = String(_path);
    const path = _path;
    const result = moduleSpecifierTransform({
        config, path, queryWellknownUMD: () => void 0, parseRegExp: () => {
            console.warn("RegExp rule is not supported in runtime yet");
            return null;
        },
    });
    const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`;
    switch (result.type) {
        case "noop": return dynamicImport(path);
        case "error":
            console.error(header, result.reason, `raw specifier:`, path);
            return dynamicImport(path);
        case "rewrite": return dynamicImport(result.nextPath);
        case "umd": {
            const _ = (v) => { var _a; return UMDBindCheck(v, [], path, `${(_a = result.globalObject) !== null && _a !== void 0 ? _a : "globalThis"}.${result.target}`, false); };
            if (config.globalObject === "globalThis" || config.globalObject === undefined)
                return Promise.resolve(globalThis[result.target]).then(_);
            if (config.globalObject === "window")
                return Promise.resolve(window[result.target]).then(_);
            return Promise.reject(header + "Unreachable transform case");
        }
        default: unreachable(result);
    }
    function unreachable(_x) {
        throw new Error("Unreachable case" + _x);
    }
    function moduleSpecifierTransform(context, opt = context.config.
        bareModuleRewrite) {
        var _a, _b, _c, _d;
        let BareModuleRewriteSimpleEnumLocal;
        (function (BareModuleRewriteSimpleEnumLocal) {
            BareModuleRewriteSimpleEnumLocal["snowpack"] = "snowpack";
            BareModuleRewriteSimpleEnumLocal["umd"] = "umd";
            BareModuleRewriteSimpleEnumLocal["unpkg"] = "unpkg";
            BareModuleRewriteSimpleEnumLocal["pikacdn"] = "pikacdn";
        })(BareModuleRewriteSimpleEnumLocal || (BareModuleRewriteSimpleEnumLocal = {}));
        const BareModuleRewriteSimple = BareModuleRewriteSimpleEnumLocal;
        if (opt === false)
            return { type: "noop" };
        const { path, config, queryWellknownUMD } = context;
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (path === ".")
                return { type: "noop" };
            if (config.appendExtensionName === false)
                return { type: "noop" };
            if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path))
                return { type: "noop" };
            const nextPath = appendExtensionName(path, config.appendExtensionName === true ? ".js" : (_a = config.appendExtensionName) !== null && _a !== void 0 ? _a : ".js");
            return { type: "rewrite", nextPath: nextPath };
        }
        switch (opt) {
            case BareModuleRewriteSimple.snowpack:
            case BareModuleRewriteSimple.pikacdn:
            case BareModuleRewriteSimple.unpkg: {
                const table = {
                    [BareModuleRewriteSimple.pikacdn]: "https://cdn.pika.dev/%1", [BareModuleRewriteSimple.unpkg]: "https://unpkg.com/%1@latest/?module", [BareModuleRewriteSimple.snowpack]: `${(_b = config.webModulePath) !== null && _b !== void 0 ? _b : "/web_modules/"}%1.js`,
                };
                return { nextPath: table[opt].replace("%1", path), type: "rewrite" };
            }
            case BareModuleRewriteSimple.umd:
            case undefined: {
                const nextPath = importPathToUMDName(path);
                if (!nextPath) {
                    const err = `The transformer doesn't know how to transform this module specifier. Please specify the transform rule in the config.`;
                    return { type: "error", reason: err };
                }
                return { type: "umd", target: nextPath, globalObject: config.globalObject };
            }
            default: {
                const rules = opt;
                for (const rule in rules) {
                    const ruleValue = rules[rule];
                    let regexp = undefined;
                    if (rule.startsWith("/")) {
                        regexp = context.parseRegExp(rule);
                        if (!regexp)
                            console.error("Might be an invalid regexp:", rule);
                    }
                    if (regexp && path.match(regexp)) {
                        if (ruleValue === false)
                            return { type: "noop" };
                        if (typeof ruleValue === "string")
                            return moduleSpecifierTransform(context, ruleValue);
                        const nextPath = path.replace(regexp, ruleValue.target);
                        if (!nextPath)
                            return {
                                type: "error", reason: "The transform result is an empty string. Skipped.",
                            };
                        return {
                            type: "umd", target: nextPath, globalObject: (_c = ruleValue.globalObject) !== null && _c !== void 0 ? _c : config.globalObject,
                        };
                    }
                    else if (rule === path) {
                        if (ruleValue === false)
                            return { type: "noop" };
                        if (typeof ruleValue === "string")
                            return moduleSpecifierTransform(context, ruleValue);
                        return {
                            type: "umd", target: ruleValue.target, globalObject: (_d = ruleValue.globalObject) !== null && _d !== void 0 ? _d : config.globalObject,
                        };
                    }
                }
            }
        }
        return { type: "noop" };
        function isBrowserCompatibleModuleSpecifier(path) {
            return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path);
        }
        function isHTTPModuleSpecifier(path) {
            return path.startsWith("http://") || path.startsWith("https://");
        }
        function isLocalModuleSpecifier(path) {
            return path.startsWith(".") || path.startsWith("/");
        }
        function appendExtensionName(path, expectedExt) {
            if (path.endsWith(expectedExt))
                return path;
            return path + expectedExt;
        }
        function importPathToUMDName(path) {
            const predefined = queryWellknownUMD(path);
            if (predefined)
                return predefined;
            const reg = path.match(/[a-zA-Z0-9_]+/g);
            if (!reg)
                return null;
            const x = [...reg].join(" ");
            if (x.length)
                return x.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index == 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, "");
            return null;
        }
    }
}
function __dynamicImportNative(path) {
    return import(path);
}
function __UMDBindCheck(mod, bindings, path, mappedName, hasESModuleInterop) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`;
    const umdInvalid = `${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`;
    if (mod === undefined) {
        mod = {};
        if (bindings.length === 0) {
            console.warn(umdInvalid);
        }
    }
    if (typeof mod !== "object" || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof mod}`);
    }
    if (hasESModuleInterop && bindings.toString() === "default" && mod.default === undefined) {
        throw new SyntaxError(umdInvalid);
    }
    for (const i of bindings) {
        if (!Object.hasOwnProperty.call(mod, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return mod;
}
function __customDynamicImportHelper(_, c, d, u) {
    return (p) => _(c, p, d, u);
}
function __dynamicImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
