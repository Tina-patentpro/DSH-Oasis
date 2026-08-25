const traversal = new URL('/api/../settings', 'http://localhost:1234')
const unsupportedProtocol = new URL('ftp://localhost:1234')

console.log(JSON.stringify({
  normalizedTraversalPath: traversal.pathname,
  acceptedHostnameWithFtpProtocol: unsupportedProtocol.hostname,
  unsupportedProtocol: unsupportedProtocol.protocol,
}))
