import { acquireJsonRootOwnership } from '../../../patches/storage-json-single-owner/ownership.mjs'
try {
  const owner = await acquireJsonRootOwnership(process.argv[2])
  process.send({ acquired: true })
  process.on('message', async message => { if (message === 'release') { await owner.release(); process.disconnect() } })
} catch (error) {
  process.send({ acquired: false, code: error.code, message: error.message }, () => process.disconnect())
}
