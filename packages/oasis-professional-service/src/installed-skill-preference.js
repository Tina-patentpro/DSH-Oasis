import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { localSkillPreferenceSchema } from './local-skill-preference-contract.js'

const spec = defineDomain({
  name: 'oasis_skill_preferences',
  version: 1,
  tables: { preferences: domainTable(localSkillPreferenceSchema) },
})

export async function openInstalledSkillPreference(storageDomain, namespace, defaultSuite) {
  const domain = await storageDomain.open(spec)
  try {
    const table = domain.table('preferences')
    let current = localSkillPreferenceSchema.parse(table.get(namespace) ?? { suite: defaultSuite })
    let writes = Promise.resolve()
    let closed = false
    return {
      get: () => current,
      set(value) {
        if (closed) throw Error('Skill preferences are closed')
        const next = localSkillPreferenceSchema.parse(value)
        const write = writes.then(async () => {
          await table.put(namespace, next)
          current = next
          return next
        })
        writes = write.catch(() => {})
        return write
      },
      async close() {
        closed = true
        await writes
        await domain.close()
      },
    }
  } catch (error) {
    await domain.close()
    throw error
  }
}
