// One-off evidence for 4A, not a production adapter or an Agent/Host test.
// Uses only a public, non-secret marker and in-memory fixture records.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const packages = new URL('.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', root);
globalThis.fetch = () => { throw new Error('4A forbids fetch'); };
const { renderPrompt } = await import(new URL('dsh-system-prompt/lib/index.js', packages));
const { canonicalHeader } = await import(new URL('dsh-session/lib/index.js', packages));
const { sessionLogZipEntries } = await import(new URL('dsh-session-log-export/lib/index.js', packages));
const { snapshotSubagentDescriptor } = await import(new URL('dsh-subagent/lib/types/descriptor.js', packages));
const canary = 'OASIS_STAGE4A_PUBLIC_CANARY_NOT_A_PRIVATE_SKILL';

// Real functions; the assembly and event below are fixtures, not an Agent run.
const system = renderPrompt({
  sections: [{ name: 'deployment:persona', order: 0, text: canary }],
  variables: {}, tools: [],
});
const header = canonicalHeader({ config: { provider: 'offline-fixture', model: 'not-called' }, system });
assert.equal(header.system, canary);
const descriptor = snapshotSubagentDescriptor({ mode: 'one-shot', provider: 'spawn', persona: canary });
assert.equal(Object.hasOwn(descriptor, 'persona'), false);

const rawChild = {
  filename: 'child.jsonl',
  content: JSON.stringify({ type: 'request/header', data: { header, reason: 'initial' } }) + '\n',
};
const rawParent = { filename: 'parent.jsonl', content: '{}\n' };
const readIds = [];
const deps = {
  sessionQuery: { async traceSession(id) {
    assert.equal(id, 'parent');
    return { descendants: [{ session: { header: { id: 'child' } }, descendants: [] }] };
  } },
  sessionPersistence: { async readRaw(id) {
    readIds.push(id);
    assert.equal(id, 'child');
    return rawChild;
  } },
  attachments: { async readImage() { throw new Error('No attachments allowed'); } },
};
const collect = async (raw, id, descendants) => {
  const entries = [];
  for await (const entry of sessionLogZipEntries(deps, raw, id, descendants)) entries.push(entry);
  return entries;
};
const direct = await collect(rawChild, 'child', false);
assert.equal(direct[0].content, rawChild.content);
assert.ok(direct[0].content.includes(canary));
const parentOnly = await collect(rawParent, 'parent', false);
assert.equal(parentOnly.length, 1);
assert.ok(!parentOnly[0].content.includes(canary));
const nested = await collect(rawParent, 'parent', true);
assert.equal(nested[1].path, 'subagents/child/child.jsonl');
assert.equal(nested[1].content, rawChild.content);
assert.ok(nested[1].content.includes(canary));
assert.deepEqual(readIds, ['child']);

const sourceFiles = [
  'dsh-subagent-spawn-in-process/lib/index.js',
  'dsh-subagent-in-process-driver/lib/index.js',
  'dsh-subagent/lib/types/child-agent.js',
  'dsh-subagent/lib/types/descriptor.js',
  'dsh-system-prompt/lib/index.js',
  'dsh-agent-loop/lib/index.js',
  'dsh-session/lib/index.js',
  'dsh-session-persistence-jsonl/lib/index.js',
  'dsh-session-log-export/lib/index.js',
  'dsh-session-log-export/lib/client.js',
  'dsh-web-app/cordis.patch.yml',
];
const fingerprints = [];
for (const file of sourceFiles) {
  const bytes = await readFile(new URL(file, packages));
  const name = file.split('/')[0];
  const pkg = JSON.parse(await readFile(new URL(`${name}/package.json`, packages), 'utf8'));
  fingerprints.push({ file, version: pkg.version, sha256: createHash('sha256').update(bytes).digest('hex') });
}
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  proof: 'LOCAL_PURE_FUNCTION_CONTRACT_WITH_FIXTURE_RECORDS_NOT_HOST_RUNTIME',
  marker: canary,
  observations: {
    renderedPersonaPreservedInCanonicalHeader: true,
    oneShotDescriptorOmitsPersona: true,
    directChildExportPreservesMarker: true,
    parentOnlyExportOmitsChild: true,
    includeDescendantsExportPreservesMarker: true,
  },
  confidentialityGatePassed: false,
  actualChildRun: false,
  actualDesktopUiChecked: false,
  realModelOrApiCalled: false,
  fingerprints,
}, null, 2));
