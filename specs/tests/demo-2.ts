/// { bareModuleRewrite: { react: "umd", "lodash-es": "pikacdn", "async-call-rpc": "unpkg", "std:fs": false,"isarray": "snowpack", "/^@material-ui\\/(.+)/g": { type: "umd", target: "MaterialUI.$1", globalObject: "window" }, "/(.+)/g": "snowpack" } }
//! { esModuleInterop: true }
import React from 'react'
import lodash from 'lodash-es'
import * as AsyncCall from 'async-call-rpc'
import fs from 'std:fs'
import isarray from 'isarray'
import * as MUI from '@material-ui/core'
import * as MUILab from '@material-ui/labs'
import 'other-polyfill'

console.log(React, lodash, AsyncCall, fs, isarray, MUI, MUILab)
