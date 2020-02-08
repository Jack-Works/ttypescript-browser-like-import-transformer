/// {bareModuleRewrite: "umd"}

import x from 'react'
import { useState } from 'react'
import * as React from 'react'
/* TypeScript 3.8 supported */
export * as React from 'react'
export { useState } from 'react'

console.log(x, useState, React)