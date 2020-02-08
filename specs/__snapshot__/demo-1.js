const x = __bindCheck(globalThis.React, ["default"], "react", "globalThis.React").default;
const { useState } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
const React = globalThis.React;
const React_1 = globalThis.React;
export { React_1 as React };
const { useState_1 } = __bindCheck(globalThis.React, ["useState"], "react", "globalThis.React");
export { useState_1 as useState };
console.log(x, useState, React);
function __bindCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.
            call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
