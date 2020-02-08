/// { dynamicImportPathRewrite: { type: "custom", function: "async (path, defaultImpl) => { return await defaultImpl(path) }" } }

import('react' + x)
