import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const providerModulePath = resolve(
  process.env.APPDATA ?? '',
  'npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js',
)
const skillPath = resolve('.dsh/skills/dsh-plugin-development/SKILL.md')

test('the installed DSH filesystem provider discovers the project skill', async () => {
  assert.equal(existsSync(providerModulePath), true, 'installed DSH skill provider must exist')

  const { FileSystemSkillProvider } = await import(pathToFileURL(providerModulePath).href)
  const controller = new AbortController()
  const warnings = []
  const provider = new FileSystemSkillProvider(
    {
      get() {
        return undefined
      },
      logger: {
        warn(message) {
          warnings.push(String(message))
        },
      },
    },
    {
      invalidate() {},
      signal: controller.signal,
    },
    {
      includeDefaultRoots: true,
      dshHome: resolve('.dsh-test/discovery-home'),
      agentsHome: resolve('.dsh-test/discovery-agents'),
      watch: false,
    },
  )

  try {
    const observed = await provider.list({ cwd: process.cwd() })
    const candidates = Array.isArray(observed) ? observed : observed.candidates
    const candidate = candidates.find((item) => item.name === 'dsh-plugin-development')

    assert.ok(candidate, 'DSH must discover dsh-plugin-development')
    assert.equal(candidate.source, 'project-dsh')
    assert.equal(resolve(candidate.path), skillPath)

    const loaded = await provider.get(candidate, { signal: controller.signal })
    assert.equal(loaded?.name, 'dsh-plugin-development')
    assert.match(loaded?.content ?? '', /先确认当前安装版本和真实接口，再写代码/)
    assert.deepEqual(warnings, [])
  } finally {
    controller.abort()
    await provider.dispose()
  }
})
