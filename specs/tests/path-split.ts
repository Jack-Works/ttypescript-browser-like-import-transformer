/// { rules: { "/@material-ui\\/(.+)/": {type: "umd", target: "MaterialUI.$1"}, "lodash": "umd", "jquery": "skypack", "/lodash-es/": "unpkg", "/.+/": "unpkg" } }

import a from '@material-ui/core'
import x from '@material-ui/core/abc'
import y from 'lodash/fp'
import z from 'lodash-es'
import 'lodash-es/oaoao'
import p from '@jsenv/import-map/src'
import w from '@jsenv/import-map'
console.log(a, x, y, z, w, p)
