/// { bareModuleRewrite: {"/.+/": {umdImportPath: 'https://unpkg.com/$packageName$', type:'umd', target: '$umdName$'}} }

import 'react1'
import React from 'react2'
import('react3')
console.log(React)
