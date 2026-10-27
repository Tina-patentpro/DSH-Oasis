import { acquireJsonRootOwnership } from './ownership.mjs'

export const name = 'storage-json-single-owner'
export const inject = ['storage']

// Exported composition boundary: the backend still implements the fixed public KV contract.
export async function createSingleOwnerJsonBackend(root, JsonStorageBackend) {
  const ownership = await acquireJsonRootOwnership(root)
  let backend
  try { backend = new JsonStorageBackend(ownership.root) }
  catch (error) { ownership.release(); throw error }
  let closing
  return Object.freeze({
    kv: Object.freeze({ open: descriptor => backend.kv.open(descriptor) }),
    close() {
      return closing ??= (async () => {
        // A rejected drain retains ownership: another Host must not race unresolved writes.
        await backend.close()
        ownership.release()
      })()
    },
  })
}

export async function apply(ctx, config) {
  const [{ JsonStorageBackend }, { storageBackendServiceKey }] = await Promise.all([
    import('@deepseek-ai/dsh-storage-json'), import('@deepseek-ai/dsh-storage'),
  ])
  const backend = await createSingleOwnerJsonBackend(config.root, JsonStorageBackend)
  let unregister
  try {
    ctx.effect(() => {
      unregister = ctx.storage.backend.register('json', backend)
      return async () => { unregister(); await backend.close() }
    })
    ctx.provide(storageBackendServiceKey('json'), backend)
  } catch (error) {
    unregister?.()
    await backend.close()
    throw error
  }
}
