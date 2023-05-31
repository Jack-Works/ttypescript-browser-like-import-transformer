// CompilerOptions: {"module":"ESNext"}
// PluginConfig: {}
import data from "blob:http://example.com/hash.js";
import mod from "data:text/javascript,export default 0.js";
import("blob:http://example.com/hash.js");
import("data:text/javascript,export default 0.js");
console.log(data, mod);
