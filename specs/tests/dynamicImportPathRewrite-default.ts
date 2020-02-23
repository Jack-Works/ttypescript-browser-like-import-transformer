// Static dynamic import
import('a')
import('./a')
import('https://example.com')

// dynamic dynamic import
const y = ''
import(y)

// invalid dynamic import (invalid currently)
import(y, 'second argument')
