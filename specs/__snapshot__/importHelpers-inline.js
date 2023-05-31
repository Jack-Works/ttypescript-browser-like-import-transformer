// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {"importHelpers":"inline","dynamicImportPathRewrite":{"type":"custom","function":"(x, y) => y(x)"}}
const _a = (x, y) => y(x);
_a(x, __customDynamicImportHelper_1(__dynamicImportTransform_1, JSON.parse("{\"after\":true,\"importHelpers\":\"inline\",\"dynamicImportPathRewrite\":{\"type\":\"custom\",\"function\":\"(x, y) => y(x)\"}}"), __dynamicImportNative_1, _import_1, moduleSpecifierTransform_1));
function __dynamicImportTransform_1(_path, config, dynamicImport, UMDBindCheck, _moduleSpecifierTransform) {
    if (typeof _path !== "string")
        _path = String(_path);
    const path = _path;
    const nullResult = () => null;
    const result = _moduleSpecifierTransform({
        config,
        path,
        queryWellknownUMD: nullResult,
        parseRegExp: nullResult,
        queryPackageVersion: nullResult,
        resolveJSONImport: nullResult,
        resolveFolderImport: nullResult,
        getCompilerOptions: () => ({}),
        accessingImports: new Set("*"),
        currentFile: null,
        runtime: true,
    });
    const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`;
    switch (result.type) {
        case "noop": return dynamicImport(path);
        case "error":
            console.error(header, result.message, `raw specifier:`, path);
            return dynamicImport(path);
        case "rewrite": return dynamicImport(result.nextPath);
        case "umd": {
            const { globalObject } = config;
            const _ = (v) => { var _a; return UMDBindCheck(v, [], path, `${(_a = result.globalObject) !== null && _a !== void 0 ? _a : "globalThis"}.${result.target}`, false); };
            if (globalObject === "globalThis" || globalObject === undefined)
                return Promise.resolve(globalThis[result.target]).then(_);
            if (globalObject === "window")
                return Promise.resolve(window[result.target]).then(_);
            return Promise.reject(header + "Unreachable transform case");
        }
        case "json": return dynamicImport("", result.path);
        default: return unreachable(result);
    }
    function unreachable(_x) {
        throw new Error("Unreachable case" + _x);
    }
}
function __dynamicImportNative_1(path) {
    return import(path);
}
function _import_1(mod, bindings, path, mapped, ESModuleInterop) {
    const head = `The requested module${path ? "" : ` '${path}' (mapped as ${mapped})`}`;
    const umdInvalid = `${head} doesn't provides a valid export object.${mapped ? ` This is likely to be a mistake. Did you forget to set ${mapped}?` : ""}`;
    if (mod === undefined) {
        mod = {};
        if (!bindings.length)
            console.warn(umdInvalid);
    }
    const type = typeof mod;
    if ((type !== "object" && type !== "function") || mod === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${type}`);
    }
    if (ESModuleInterop && bindings.toString() === "default" && mod.default === undefined) {
        throw new SyntaxError(umdInvalid);
    }
    for (const i of bindings) {
        if (!Object.hasOwnProperty.call(mod, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return mod;
}
function moduleSpecifierTransform_1(context, opt) {
    const { queryWellknownUMD } = context;
    const packageNameRegExp = /\$packageName\$/g;
    const versionRegExp = /\$version\$/g;
    const umdNameRegExp = /\$umdName\$/g;
    const subpathRegExp = /\$subpath\$/g;
    const message = {
        [392859]: "Failed to transform the path \"{0}\" to UMD import declaration.",
        [392861]: "Failed to query the package version of import \"{0}\".",
        [392860]: "Failed to transform the path \"{0}\" to UMD import declaration. After applying the rule \"{1}\", the result is an empty string.",
        [392862]: "Invalid path \"{0}\".{1}",
    };
    const noop = { type: "noop" };
    return self(context, opt);
    function self(...[context, opt = context.config.rules || { type: "simple", enum: "umd" }]) {
        const { path, config, parseRegExp, queryPackageVersion, currentFile, accessingImports, getCompilerOptions, resolveFolderImport, resolveJSONImport, runtime, treeshakeProvider, } = context;
        const { jsonImport, folderImport, extName, appendExtensionName, extNameRemote, appendExtensionNameForRemote, globalObject, } = config;
        const conf = extName !== null && extName !== void 0 ? extName : appendExtensionName;
        const expectedExtension = conf === true ? ".js" : conf !== null && conf !== void 0 ? conf : ".js";
        if (opt.type === "noop")
            return noop;
        if (path === ".") {
            if (folderImport)
                return ToRewrite(appendExt("./index", expectedExtension));
            else
                return ToError(392862, ".", " Please write \"./index\" instead.");
        }
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (conf === false)
                return noop;
            const remote = extNameRemote !== null && extNameRemote !== void 0 ? extNameRemote : appendExtensionNameForRemote;
            if (jsonImport && path.endsWith(".json")) {
                const nondeterministicJSONImport = ToJSON(null, path);
                if (runtime)
                    return nondeterministicJSONImport;
                if (!currentFile)
                    return unreachable("", null);
                if (isHTTPModuleSpecifier(path))
                    return nondeterministicJSONImport;
                try {
                    const json = resolveJSONImport(path, currentFile);
                    switch (jsonImport) {
                        case "data": return ToRewrite(`data:text/javascript,export default JSON.parse(${JSON.stringify(json)})`);
                        case "inline":
                        case true: return ToJSON(json, path);
                        default: return unreachable("json", jsonImport);
                    }
                }
                catch (e) {
                    return nondeterministicJSONImport;
                }
            }
            if (remote !== true && isHTTPModuleSpecifier(path))
                return noop;
            if (endsWithExt(path, expectedExtension))
                return noop;
            if (folderImport && currentFile) {
                const result = resolveFolderImport(path, currentFile);
                if (result)
                    return ToRewrite(appendExt(result, expectedExtension));
            }
            return ToRewrite(appendExt(path, expectedExtension));
        }
        const { sub, nspkg } = resolveNS(path);
        switch (opt.type) {
            case "simple": {
                const e = opt.enum;
                switch (e) {
                    case "esm.run":
                    case "jsdelivr":
                    case "skypack":
                    case "jspm":
                    case "unpkg": {
                        function getURL(domain) {
                            return {
                                noVersion: `https://${domain}/$packageName$$subpath$`,
                                withVersion: `https://${domain}/$packageName$@$version$$subpath$`,
                            };
                        }
                        const URLs = {
                            jspm: getURL("jspm.dev"),
                            "esm.run": getURL("esm.run"),
                            skypack: getURL("cdn.skypack.dev"),
                            unpkg: getURL("unpkg.com"),
                            jsdelivr: getURL("cdn.jsdelivr.net"),
                        };
                        URLs.unpkg.noVersion += "?module";
                        URLs.unpkg.withVersion += "?module";
                        return self(context, {
                            type: "url",
                            ...URLs[e],
                        });
                    }
                    case "umd":
                        const target = importPathToUMDName(path);
                        if (!target)
                            return ToError(392859, path, "");
                        const nextOpt = {
                            type: "umd",
                            target,
                            globalObject,
                            umdImportPath: undefined,
                        };
                        return self(context, nextOpt);
                    default: return unreachable("simple type", e);
                }
            }
            case "umd": {
                const { umdImportPath, treeshake, target } = opt;
                if (treeshake && treeshakeProvider) {
                    treeshakeProvider(path, accessingImports, treeshake, getCompilerOptions());
                    return ToUMD({ target: path, globalObject: target, umdImportPath });
                }
                else {
                    if (treeshake)
                        console.error("Tree shaking is not available at runtime.");
                    const target = importPathToUMDName(path);
                    if (!target)
                        return ToError(392859, path, "");
                    return ToUMD({ target, globalObject, umdImportPath });
                }
            }
            case "url": {
                const { noVersion, withVersion } = opt;
                const version = queryPackageVersion(path);
                let string = undefined;
                if (version && withVersion)
                    string = withVersion.replace(versionRegExp, version);
                if ((version && !withVersion && noVersion) || (!version && noVersion))
                    string = noVersion;
                if (string)
                    return ToRewrite(string.replace(packageNameRegExp, nspkg).replace(subpathRegExp, sub === undefined ? "" : "/" + sub));
                return unreachable("url case", null);
            }
            case "complex": {
                for (const [rule, ruleValue] of Object.entries(opt.config)) {
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
                        return self(context, ruleValue);
                    if (ruleValue.type === "umd" && ruleValue.treeshake)
                        return self(context, ruleValue);
                    const target = rule === path ? ruleValue.target : path.replace(regexp, ruleValue.target);
                    if (!target)
                        return ToError(392860, path, rule);
                    const umdName = importPathToUMDName(path);
                    const version = queryPackageVersion(path);
                    const { globalObject = config.globalObject, umdImportPath } = ruleValue;
                    if (!umdName && (target.match(umdNameRegExp) || (umdImportPath === null || umdImportPath === void 0 ? void 0 : umdImportPath.match(umdNameRegExp))))
                        return ToError(392859, path, rule);
                    if (!version && (target.match(versionRegExp) || (umdImportPath === null || umdImportPath === void 0 ? void 0 : umdImportPath.match(versionRegExp))))
                        return ToError(392861, path, rule);
                    const [nextTarget, nextUMDImportPath] = [target, umdImportPath || ""].map((x) => x.replace(packageNameRegExp, path).replace(umdNameRegExp, umdName).replace(versionRegExp, version));
                    return ToUMD({ target: nextTarget, globalObject, umdImportPath: nextUMDImportPath });
                }
                return noop;
            }
            default: return unreachable("opt switch", opt);
        }
    }
    function ToUMD(rest) {
        return { type: "umd", ...rest };
    }
    function ToRewrite(nextPath) {
        return { type: "rewrite", nextPath };
    }
    function ToJSON(json, path) {
        return { type: "json", json, path };
    }
    function ToError(type, arg0, arg1) {
        return {
            type: "error",
            message: message[type].replace("{0}", arg0).replace("{1}", arg1),
            code: type,
            key: type.toString(),
        };
    }
    function unreachable(str, val) {
        console.error(val);
        throw new Error("Unreachable case at " + str);
    }
    function isBrowserCompatibleModuleSpecifier(path) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path) || isDataOrBlobModuleSpecifier(path);
    }
    function isHTTPModuleSpecifier(path) {
        return path.startsWith("http://") || path.startsWith("https://");
    }
    function isLocalModuleSpecifier(path) {
        return path.startsWith(".") || path.startsWith("/");
    }
    function isDataOrBlobModuleSpecifier(path) {
        return path.startsWith("blob:") || path.startsWith("data:");
    }
    function endsWithExt(path, expectedExt) {
        if (expectedExt === false)
            return true;
        if (path.endsWith(expectedExt))
            return true;
        return false;
    }
    function appendExt(path, expectedExt) {
        if (endsWithExt(path, expectedExt))
            return path;
        return path + expectedExt;
    }
    function resolveNS(path) {
        const [a, b, ...c] = path.split("/");
        if (b === undefined)
            return { nspkg: a, pkg: a };
        if (a.startsWith("@"))
            return { ns: a, pkg: b, sub: c.join("/"), nspkg: a + "/" + b };
        return { pkg: a, sub: [b, ...c].join("/"), nspkg: a };
    }
    function importPathToUMDName(path) {
        const predefined = queryWellknownUMD(path);
        if (predefined)
            return predefined;
        const { pkg, sub } = resolveNS(path);
        const pkgVar = toCase(pkg);
        const subVar = sub === null || sub === void 0 ? void 0 : sub.split("/").reduce((prev, curr) => {
            if (prev === null)
                return null;
            const cased = toCase(curr);
            if (!cased)
                return null;
            return [prev, cased].join(".");
        }, "");
        if (!pkgVar)
            return null;
        if (sub === null || sub === void 0 ? void 0 : sub.length)
            return subVar ? pkgVar + subVar : null;
        return pkgVar;
    }
    function toCase(s) {
        const reg = s.match(/[a-zA-Z0-9_]+/g);
        if (!reg)
            return null;
        const x = [...reg].join(" ");
        if (!x.length)
            return null;
        return x.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index == 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, "");
    }
}
function __customDynamicImportHelper_1(_, c, d, u, m) {
    return (p) => _(p, c, d, u, m);
}
