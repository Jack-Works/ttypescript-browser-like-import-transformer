const x = __bindCheck(globalThis.React, ["default"], "react", "globalThis.React").default;
const { useState } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
const React = __bindCheck(globalThis.React, [], "react", "globalThis.React");
const React_1 = __bindCheck(globalThis.React, [], "react", "globalThis.React");
export { React_1 as React };
const { useState_1 } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
export { useState_1 as useState };
console.log(x, useState, React);
function __bindCheck(value, name, path, mappedName) {
    const head = `The requested module '${path}' (mapped as ${mappedName})`;
    if (value === undefined) {
        value = {};
        if (name.length === 0)
            console.warn(`${head} doesn't provides a valid export object. This is likely to be a mistake. Did you forget to set ${mappedName}?`);
    }
    if (typeof value !== "object" || value === null) {
        throw new SyntaxError(`${head} provides an invalid export object. The provided record is type of ${typeof value}`);
    }
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`${head} does not provide an export named '${i}'`);
    }
    return value;
}
