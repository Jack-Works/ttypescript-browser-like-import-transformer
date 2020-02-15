/// { bareModuleRewrite: {"/.+/": {umdImportPath: 'https://unpkg.com/$packageName$', type:'umd', target: '$umdName$'}} }

import 'react1'
import React from 'react2'
import { a as b } from 'react4'
import('react3')
console.log(React, b)
