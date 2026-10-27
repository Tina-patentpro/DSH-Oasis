// Desktop 2.0.17 -> DSH 0.2.0-rc.2's existing, shell-owned File path capability.
// Load synchronously before the DSH module entry; no business or storage owner.
;(function installDesktopHostFilePaths(scope) {
  if ('__DSH_HOST_PATHS__' in scope || scope.dshDesktop?.protocolVersion !== 1) return
  const native = scope.__DSH_DESKTOP_FILE_PATH__
  if (typeof native?.getPathForFile !== 'function') return
  Object.defineProperty(scope, '__DSH_HOST_PATHS__', {
    value: Object.freeze({
      pathFor(file) { return native.getPathForFile(file) },
    }),
    writable: false,
    configurable: false,
  })
})(globalThis)
