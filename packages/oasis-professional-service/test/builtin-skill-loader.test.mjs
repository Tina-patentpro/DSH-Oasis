import assert from 'node:assert/strict'
import test from 'node:test'
import { writeFile, readFile, rename, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { loadBuiltinSkill } from '../src/builtin-skill-loader.js'
import { publicSkillFixture, PUBLIC_MARKERS, digest } from './builtin-skill-fixture.mjs'

function safeError(error) {
  assert.equal(error.code, 'BUILTIN_SKILL_UNAVAILABLE')
  assert.equal(error.message, '内置 Skill 资源不可用；未开始生成。')
  assert.equal(error.cause, undefined)
  return true
}

test('loads exactly ordered declared resources and freezes the instruction plus body-free provenance', async () => {
  const f = await publicSkillFixture()
  const loaded = await loadBuiltinSkill(f.options)
  let previous = -1
  for (const marker of PUBLIC_MARKERS) {
    const offset = loaded.instruction.body.indexOf(marker)
    assert.ok(offset > previous); previous = offset
  }
  assert.equal(loaded.instruction.version, f.manifest.skillVersion)
  assert.equal(loaded.provenance.manifestSha256, f.options.manifestSha256)
  assert.equal(loaded.provenance.assemblySha256, digest(loaded.instruction.body))
  assert.equal(loaded.provenance.resources.length, 4)
  for (const marker of PUBLIC_MARKERS) assert.ok(!JSON.stringify(loaded.provenance).includes(marker))
  assert.ok(!JSON.stringify(loaded.provenance).includes(f.root))
  assert.throws(() => { loaded.instruction.body = 'changed' }, TypeError)
  assert.throws(() => { loaded.provenance.resources[0].sha256 = 'changed' }, TypeError)
  await writeFile(join(f.root, 'SKILL.md'), 'changed after load')
  assert.ok(loaded.instruction.body.includes(PUBLIC_MARKERS[0]))
  await assert.rejects(loadBuiltinSkill(f.options), safeError)
})

test('requires independently pinned manifest, Skill identity and all execution contracts', async () => {
  const f = await publicSkillFixture()
  for (const overrides of [{ manifestSha256: '0'.repeat(64) }, { manifestSha256: undefined }, { root: '.' }]) {
    await assert.rejects(loadBuiltinSkill({ ...f.options, ...overrides }), safeError)
  }
  for (const key of ['skillId', 'skillVersion', 'inputSchemaVersion', 'outputSchemaVersion', 'executionContractVersion']) {
    await assert.rejects(loadBuiltinSkill({ ...f.options, expected: { ...f.options.expected, [key]: 'wrong' } }), safeError)
  }
  f.manifest.inputSchemaVersion = 'claims-disclosure-2'
  await assert.rejects(loadBuiltinSkill(await f.pin()), safeError)
})

test('rejects missing and changed resources, unsafe paths, wrong order, extra files and fields in manifest', async () => {
  const cases = [
    f => { f.manifest.resources[0].path = '../SKILL.md' },
    f => { f.manifest.resources[0].path = 'C:/secret.md' },
    f => { f.manifest.resources[0].path = 'SKILL.md:secret' },
    f => { f.manifest.resources[1].path = 'references/../SKILL.md' },
    f => { f.manifest.resources.reverse() },
    f => { f.manifest.resources[0].role = 'script' },
    f => { f.manifest.resources.push({ path: 'scripts/run.js', role: 'script', sha256: '0'.repeat(64) }) },
    f => { f.manifest.command = 'run something' },
    f => { f.manifest.resources[0].url = 'https://example.invalid/private' },
  ]
  for (const mutate of cases) {
    const f = await publicSkillFixture(); mutate(f)
    await assert.rejects(loadBuiltinSkill(await f.pin()), safeError)
  }
  const f = await publicSkillFixture()
  await rename(join(f.root, 'references/drafting-rules.md'), join(f.root, 'references/moved.md'))
  await assert.rejects(loadBuiltinSkill(f.options), safeError)
})

test('never follows markdown links or executes undeclared scripts', async () => {
  const f = await publicSkillFixture()
  await writeFile(join(f.root, 'unlisted.js'), 'throw new Error("MUST_NOT_EXECUTE")')
  await f.change('references/drafting-rules.md', PUBLIC_MARKERS[1] + '\n[not a load instruction](../unlisted.js)')
  const loaded = await loadBuiltinSkill(await f.pin())
  assert.ok(!loaded.instruction.body.includes('MUST_NOT_EXECUTE'))
  assert.equal(loaded.provenance.resources.length, 4)
})

test('validates frontmatter subset, body text and UTF-8 without leaking parse exceptions', async () => {
  for (const body of [
    '---\nname: wrong\ndescription: "public"\n---\nbody',
    '---\nname: oasis-patent-claims\ndescription: ""\n---\nbody',
    '---\nname: oasis-patent-claims\ndescription: "public"\nextra: execute\n---\nbody',
    '---\nname: oasis-patent-claims\ndescription: "public"\n---\n  ',
    Buffer.from([0xff, 0xfe, 0xff]),
  ]) {
    const f = await publicSkillFixture(); await f.change('SKILL.md', body)
    await assert.rejects(loadBuiltinSkill(await f.pin()), safeError)
  }
  const f = await publicSkillFixture()
  const text = await readFile(join(f.root, 'SKILL.md'), 'utf8')
  await f.change('SKILL.md', text.replaceAll('\n', '\r\n'))
  assert.ok((await loadBuiltinSkill(await f.pin())).instruction.body.includes(PUBLIC_MARKERS[0]))
})

test('bounds manifest, individual resources, total bytes and assembled model text', async () => {
  const f = await publicSkillFixture()
  await f.change('references/drafting-rules.md', 'x'.repeat(65537))
  await assert.rejects(loadBuiltinSkill(await f.pin()), safeError)
  const g = await publicSkillFixture()
  for (const resource of g.manifest.resources.slice(1)) await g.change(resource.path, '中'.repeat(15000))
  await assert.rejects(loadBuiltinSkill(await g.pin()), safeError)
  const h = await publicSkillFixture()
  for (const resource of h.manifest.resources.slice(1)) await h.change(resource.path, 'x'.repeat(23000))
  await assert.rejects(loadBuiltinSkill(await h.pin()), safeError)
  const bytes = ' '.repeat(16385)
  await writeFile(join(h.root, 'manifest.json'), bytes)
  await assert.rejects(loadBuiltinSkill({ ...h.options, manifestSha256: digest(bytes) }), safeError)
})

test('rejects junction resource directory and root rather than following another installation', async () => {
  const f = await publicSkillFixture()
  const real = join(f.root, 'references-real')
  await rename(join(f.root, 'references'), real)
  await symlink(real, join(f.root, 'references'), process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(loadBuiltinSkill(f.options), safeError)
  const alias = f.root + '-alias'
  await symlink(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(loadBuiltinSkill({ ...f.options, root: alias }), safeError)
})
