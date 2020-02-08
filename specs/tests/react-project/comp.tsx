import React, { useState } from 'react'

export function Comp() {
    const [s, sS] = useState('')
    return <h1>Hello, world {s}</h1>
}
