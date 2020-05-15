import data from 'blob:http://example.com/hash'
import mod from 'data:text/javascript,export default 0'
import('blob:http://example.com/hash')
import('data:text/javascript,export default 0')
console.log(data, mod)
