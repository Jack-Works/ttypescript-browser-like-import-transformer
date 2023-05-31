/// { rules: { "/@material-ui\\/(.+)/": {type: "umd", target: "MaterialUI.$1"}, "lodash": "umd", "jquery": "pikacdn", "lodash-es": "unpkg", "/.+/": "unpkg" } }

import x from '@material-ui/core'
import i from '@material-ui/icons'
import y from 'lodash'
import z from 'lodash-es'
import w from 'other'
console.log(x, y, z, w, i)
