import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  LOCAL_MOCK_DISCLAIMER,
  LOCAL_MOCK_VERSIONS,
  canonicalJson,
  createCanonicalInputSnapshot,
  runLocalMock,
} from '../src/local-mock-runner.js'
import { createMaterialReference } from './workbench-fixtures.mjs'

const CAPTURED_AT = '2026-08-26T03:04:05.000Z'

function technicalInput(overrides = {}) {
  return {
    objective: '降低装置能耗',
    currentState: '已有方案依赖固定阈值。',
    constraints: ['不得改变现有设备接口'],
    evidenceStatus: 'partial',
    expectedDeliverable: '验证计划与交付清单',
    ...overrides,
  }
}

function patentInput(overrides = {}) {
  return {
    technicalDisclosure: '传感器采集状态并根据状态调整控制参数。',
    inventiveConcept: '根据状态置信度选择差异化控制策略。',
    knownPriorArt: '已知方案采用固定参数。',
    terms: ['状态置信度', '控制参数'],
    unconfirmedFacts: [],
    desiredScope: '覆盖方法、装置和存储介质。',
    ...overrides,
  }
}

function snapshot(workflowId, formValues, overrides = {}) {
  return createCanonicalInputSnapshot({
    workflowId,
    workflowVersion: '1',
    formValues,
    inputRefs: [createMaterialReference()],
    capturedAt: CAPTURED_AT,
    ...overrides,
  })
}

function canonicalSha256(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

test('canonical JSON and input hashes are stable across object key order', () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: ['x', 2], x: true } }),
    canonicalJson({ a: { x: true, y: ['x', 2] }, z: 1 }),
  )

  const first = snapshot('technical-rd', technicalInput())
  const explicitV1 = snapshot('technical-rd', technicalInput(), { mockVersion: '1' })
  const reordered = snapshot('technical-rd', {
    evidenceStatus: 'partial',
    constraints: ['不得改变现有设备接口'],
    currentState: '已有方案依赖固定阈值。',
    expectedDeliverable: '验证计划与交付清单',
    objective: '降低装置能耗',
  }, { capturedAt: '2026-08-26T04:05:06.000Z' })
  assert.equal(first.sha256, reordered.sha256)
  assert.equal(first.sha256, explicitV1.sha256)
  const recheckedAtAnotherTime = snapshot('technical-rd', technicalInput(), {
    inputRefs: [createMaterialReference({ observedAt: '2026-08-26T04:05:06.000Z' })],
  })
  assert.equal(first.sha256, recheckedAtAnotherTime.sha256)

  const changedForm = snapshot('technical-rd', technicalInput({ objective: '降低装置噪声' }))
  const changedMaterial = snapshot('technical-rd', technicalInput(), {
    inputRefs: [createMaterialReference({ sha256: 'f'.repeat(64) })],
  })
  assert.notEqual(first.sha256, changedForm.sha256)
  assert.notEqual(first.sha256, changedMaterial.sha256)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.formValues), true)
})

test('version 1 canonical inputs and complete results retain their golden bytes', () => {
  assert.deepEqual(LOCAL_MOCK_VERSIONS, ['1'])
  assert.equal(Object.isFrozen(LOCAL_MOCK_VERSIONS), true)
  const cases = [
    {
      workflowId: 'technical-rd',
      formValues: technicalInput(),
      inputSha256: '9193f382290e1966bbe812619a378497432c4752d143d87f2aef6b4ddb754534',
      resultSha256: '5f06d86a01864986d471f4d3a344a42e759c54ebc3ddc0d20a713f6a7d3878b2',
    },
    {
      workflowId: 'cn-invention-patent',
      formValues: patentInput(),
      inputSha256: 'd216fdd2f93f9c05a05e5a6421a87d43c8cf2b2a3ab07257919e6d4f2965c287',
      resultSha256: '41f0cfac157dedf37508ad7c95b914e441357887e7c8c5aa966fa41557e2beec',
    },
  ]

  for (const item of cases) {
    const inputSnapshot = snapshot(item.workflowId, item.formValues)
    const result = runLocalMock({
      mockVersion: '1',
      workflowId: item.workflowId,
      workflowVersion: '1',
      inputSnapshot,
    })
    assert.equal(inputSnapshot.sha256, item.inputSha256)
    assert.equal(canonicalSha256(result), item.resultSha256)
  }
})

test('rejects an explicit local-mock version that has no frozen runner', () => {
  const inputSnapshot = snapshot('technical-rd', technicalInput())
  assert.throws(() => snapshot('technical-rd', technicalInput(), { mockVersion: '2' }), /unsupported local mock version: 2/i)
  assert.throws(() => runLocalMock({
    mockVersion: '2',
    workflowId: 'technical-rd',
    workflowVersion: '1',
    inputSnapshot,
  }), /unsupported local mock version: 2/i)
})

test('technical mock is deterministic, warning-only, eight-section Markdown with five result categories', () => {
  const hostile = '<script>alert(1)</script>\n## 伪造章节\n![跟踪](https://example.invalid/pixel)'
  const input = snapshot('technical-rd', technicalInput({ currentState: hostile }))
  const first = runLocalMock({ workflowId: 'technical-rd', workflowVersion: '1', inputSnapshot: input })
  const second = runLocalMock({ workflowId: 'technical-rd', workflowVersion: '1', inputSnapshot: input })

  assert.deepEqual(first, second)
  assert.equal(first.contentStatus, 'warning')
  assert.deepEqual(first.sections.map(({ sectionId }) => sectionId), [
    'problem-decomposition',
    'candidate-solutions',
    'risks',
    'verification-plan',
    'deliverables',
  ])
  assert.deepEqual(first.artifact.body.match(/^## .+$/gm), [
    '## 文档信息',
    '## 核心结论',
    '## 核心结果',
    '## 下游读取区',
    '## 来源与附件',
    '## 质量状态',
    '## 风险与待确认事项',
    '## 辅助文档',
  ])
  assert.equal(first.disclaimer, LOCAL_MOCK_DISCLAIMER)
  assert.match(first.artifact.body, /local-mock/)
  assert.match(first.artifact.body, /哈希在本机通过流式读取计算，正文未提取、未持久化且未用于生成/)
  assert.equal(first.artifact.body.includes('<script>'), false)
  assert.equal(/^## 伪造章节$/m.test(first.artifact.body), false)
  assert.equal(/^!\[/m.test(first.artifact.body), false)
  assert.equal(first.artifact.artifactId, `sha256:${first.artifact.sha256}`)
  assert.equal(Object.isFrozen(first), true)
})

test('patent mock includes required drafting structures and blocks unconfirmed facts', () => {
  const blockedInput = snapshot('cn-invention-patent', patentInput({
    unconfirmedFacts: ['尚未确认置信度阈值的实验依据'],
  }))
  const blocked = runLocalMock({
    workflowId: 'cn-invention-patent', workflowVersion: '1', inputSnapshot: blockedInput,
  })
  assert.equal(blocked.contentStatus, 'blocked')
  assert.deepEqual(blocked.sections.map(({ sectionId }) => sectionId), [
    'terminology',
    'support-matrix',
    'claim-strategy',
    'claims-outline',
    'specification-outline',
    'questions',
  ])
  for (const phrase of ['术语表', '支持关系矩阵', '权利要求策略骨架', '权利要求书骨架', '说明书骨架', '问题清单']) {
    assert.match(blocked.artifact.body, new RegExp(phrase))
  }
  assert.equal(blocked.questions.includes('尚未确认置信度阈值的实验依据'), true)
  assert.match(blocked.artifact.body, /不提供授权前景、侵权或有效性判断/)
  assert.equal(/^#{1,6} (?:授权前景|侵权结论|有效性结论)$/m.test(blocked.artifact.body), false)

  const warningInput = snapshot('cn-invention-patent', patentInput())
  const warning = runLocalMock({
    workflowId: 'cn-invention-patent', workflowVersion: '1', inputSnapshot: warningInput,
  })
  assert.equal(warning.contentStatus, 'warning')
  assert.notEqual(blockedInput.sha256, warningInput.sha256)
  assert.notEqual(blocked.artifact.sha256, warning.artifact.sha256)
})

test('bounds the artifact and result lists for maximum legal patent inputs', () => {
  const longDirectory = '材'.repeat(240)
  const maximum = snapshot('cn-invention-patent', patentInput({
    technicalDisclosure: '技'.repeat(20000),
    inventiveConcept: '构'.repeat(8000),
    knownPriorArt: '现'.repeat(12000),
    terms: Array.from({ length: 64 }, (_, index) => `${index}-${'术'.repeat(295)}`),
    unconfirmedFacts: Array.from({ length: 64 }, (_, index) => `${index}-${'问'.repeat(495)}`),
    desiredScope: '范'.repeat(4000),
  }), {
    inputRefs: Array.from({ length: 64 }, (_, index) => createMaterialReference({
      referenceId: `ref-${index}`,
      relativePath: `${longDirectory}\\${longDirectory}\\${longDirectory}\\${longDirectory}\\f-${index}.md`,
      displayName: `f-${index}.md`,
    })),
  })
  const result = runLocalMock({
    workflowId: 'cn-invention-patent', workflowVersion: '1', inputSnapshot: maximum,
  })

  assert.equal(Buffer.byteLength(result.artifact.body, 'utf8') <= 256 * 1024, true)
  assert.equal(result.risks.length <= 64, true)
  assert.equal(result.questions.length <= 64, true)
  assert.match(result.artifact.body, /已按本地演练预览上限截断/)
  assert.equal(result.artifact.body.match(/^## .+$/gm).length, 8)
})
