const __customImportHelper = (x, y) => y(x);
__customImportHelper(x, __customDynamicImportHelper(__dynamicImportTransform, JSON.parse("{\"after\":true,\"importHelpers\":\"inline\",\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(x, y) => y(x)\"}}"), __dynamicImportNative, __UMDBindCheck));
function __dynamicImportTransform(config, _path, dynamicImport, UMDBindCheck) {
    if (typeof _path !== "string")
        _path = String(_path);
    const path = _path;
    const result = moduleSpecifierTransform({
        config, path, queryWellknownUMD: () => void 0, parseRegExp: () => (console.warn("RegExp rule is not supported in runtime yet"), null), queryPackageVersion: () => null,
    });
    const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`;
    switch (result.type) {
        case "noop": return dynamicImport(path);
        case "error":
            console.error(header, result.message, `raw specifier:`, path);
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
    function moduleSpecifierTransform(context, opt = context.config.bareModuleRewrite || { type: "simple", enum: "umd" }) {
        var _a, _b;
        const packageNameRegExp = /\$packageName\$/g;
        const versionRegExp = /\$version\$/g;
        const umdNameRegExp = /\$umdName\$/g;
        let Diag;
        (function (Diag) {
            Diag[Diag["TransformToUMDFailed"] = 392859] = "TransformToUMDFailed";
            Diag[Diag["TransformToUMDFailedCustom"] = 392860] = "TransformToUMDFailedCustom";
            Diag[Diag["QueryPackageVersionFailed"] = 392861] = "QueryPackageVersionFailed";
        })(Diag || (Diag = {}));
        const message = {
            [Diag.TransformToUMDFailed]: "Failed to transform the path {0} to UMD import declaration.", [Diag.QueryPackageVersionFailed]: "Failed to query the package version of import {0}.", [Diag.TransformToUMDFailedCustom]: "Failed to transform the path {0} to UMD import declaration. After applying the rule {1}, the result is an empty string.",
        };
        const noop = { type: "noop" };
        if (opt.type === "noop")
            return noop;
        const { path, config, queryWellknownUMD, parseRegExp, queryPackageVersion } = context;
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (path === ".")
                return noop;
            if (config.appendExtensionName === false)
                return noop;
            if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path))
                return noop;
            const nextPath = appendExtensionName(path, config.appendExtensionName === true ? ".js" : (_a = config.appendExtensionName) !== null && _a !== void 0 ? _a : ".js");
            return { type: "rewrite", nextPath: nextPath };
        }
        switch (opt.type) {
            case "simple": {
                const e = opt.enum;
                switch (e) {
                    case "snowpack": return { nextPath: `${(_b = config.webModulePath) !== null && _b !== void 0 ? _b : "/web_modules/"}${path}.js`, type: "rewrite" };
                    case "pikacdn":
                    case "unpkg": {
                        const version = queryPackageVersion(path);
                        return {
                            type: "rewrite", nextPath: (e === "pikacdn" ? "https://cdn.pika.dev/%1@%2" : "https://unpkg.com/%1@%2/?module").replace("%1", path).replace("%2", version || "latest"),
                        };
                    }
                    case "umd":
                        const target = importPathToUMDName(path);
                        const { globalObject } = config;
                        if (!target)
                            return error(Diag.TransformToUMDFailed, path, "");
                        const nextOpt = { type: "umd", target, globalObject, umdImportPath: void 0 };
                        return moduleSpecifierTransform(context, nextOpt);
                    default: return unreachable("simple type");
                }
            }
            case "umd": {
                const target = importPathToUMDName(path);
                if (!target)
                    return error(Diag.TransformToUMDFailed, path, "");
                const [{ globalObject }, { umdImportPath }] = [config, opt];
                return { type: "umd", target, globalObject, umdImportPath };
            }
            case "url": {
                const [ns, _pkg] = path.split("/");
                const pkg = ns.startsWith("@") ? `${ns}/${_pkg}` : ns;
                const { noVersion, withVersion } = opt;
                const version = queryPackageVersion(path);
                let string = void 0;
                if (version && withVersion)
                    string = withVersion.replace(versionRegExp, version);
                if ((version && !withVersion && noVersion) || (!version && noVersion))
                    string = noVersion;
                if (string)
                    return { type: "rewrite", nextPath: string.replace(packageNameRegExp, pkg) };
                return unreachable("url case");
            }
            case "complex": {
                for (const [rule, ruleValue] of opt.config) {
                    let regexp = undefined;
                    if (rule.startsWith("/")) {
                        regexp = parseRegExp(rule);
                        if (!regexp)
                            console.error("Might be an invalid regexp:", rule);
                    }
                    const matching = (regexp && path.match(regexp)) || rule === path;
                    if (!matching)
                        continue;
                    if (ruleValue.type !== "umd")
                        return moduleSpecifierTransform(context, ruleValue);
                    const target = rule === path ? ruleValue.target : path.replace(regexp, ruleValue.target);
                    if (!target)
                        return error(Diag.TransformToUMDFailedCustom, path, rule);
                    const umdName = importPathToUMDName(path);
                    const version = queryPackageVersion(path);
                    const { globalObject = config.globalObject, umdImportPath } = ruleValue;
                    if (!umdName && (target.match(umdNameRegExp) || (umdImportPath === null || umdImportPath === void 0 ? void 0 : umdImportPath.match(umdNameRegExp))))
                        return error(Diag.TransformToUMDFailed, path, rule);
                    if (!version && (target.match(versionRegExp) || (umdImportPath === null || umdImportPath === void 0 ? void 0 : umdImportPath.match(versionRegExp))))
                        return error(Diag.QueryPackageVersionFailed, path, rule);
                    const [nextTarget, nextUMDImportPath] = [target, umdImportPath || ""].map(x => x.replace(packageNameRegExp, path).replace(umdNameRegExp, umdName).replace(versionRegExp, version));
                    return { type: "umd", target: nextTarget, globalObject, umdImportPath: nextUMDImportPath };
                }
                return noop;
            }
            default: return unreachable(" opt switch");
        }
        function error(type, arg0, arg1) {
            return {
                type: "error", message: message[type].replace("{0}", arg0).replace("{1}", arg1), code: type, key: Diag[type],
            };
        }
        function unreachable(str) {
            debugger;
            throw new Error("Unreachable case at " + str);
        }
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
