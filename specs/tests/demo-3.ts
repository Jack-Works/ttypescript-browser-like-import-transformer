/// { dynamicImportPathRewrite: { type: "custom", function: "(path, defaultImpl) => defaultImpl(path).then(mod => new Proxy(mod, {}))" } }

import('react' + x)
