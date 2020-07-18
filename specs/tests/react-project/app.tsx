// @ts-ignore
import React, { useState } from 'react'
import { Comp } from './comp'

export function App() {
    const [s, sS] = useState('')
    return (
        <h1>
            Hello, world {s}
            <Comp />
        </h1>
    )
}
