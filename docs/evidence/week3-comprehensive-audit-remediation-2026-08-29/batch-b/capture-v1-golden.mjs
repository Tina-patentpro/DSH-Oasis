import { createHash } from 'node:crypto'

import {
  canonicalJson,
  createCanonicalInputSnapshot,
  runLocalMock,
} from '../../../../packages/oasis-professional-service/src/local-mock-runner.js'
import { createMaterialReference } from '../../../../packages/oasis-professional-service/test/workbench-fixtures.mjs'

const capturedAt = '2026-08-26T03:04:05.000Z'

function digest(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

const cases = [
  {
    name: 'technical-v1',
    workflowId: 'technical-rd',
    formValues: {
      objective: '降低装置能耗',
      currentState: '已有方案依赖固定阈值。',
      constraints: ['不得改变现有设备接口'],
      evidenceStatus: 'partial',
      expectedDeliverable: '验证计划与交付清单',
    },
  },
  {
    name: 'patent-v1',
    workflowId: 'cn-invention-patent',
    formValues: {
      technicalDisclosure: '传感器采集状态并根据状态调整控制参数。',
      inventiveConcept: '根据状态置信度选择差异化控制策略。',
      knownPriorArt: '已知方案采用固定参数。',
      terms: ['状态置信度', '控制参数'],
      unconfirmedFacts: [],
      desiredScope: '覆盖方法、装置和存储介质。',
    },
  },
]

const output = cases.map(({ name, workflowId, formValues }) => {
  const inputSnapshot = createCanonicalInputSnapshot({
    workflowId,
    workflowVersion: '1',
    formValues,
    inputRefs: [createMaterialReference()],
    capturedAt,
  })
  const result = runLocalMock({ workflowId, workflowVersion: '1', inputSnapshot })
  return {
    name,
    inputSha256: inputSnapshot.sha256,
    resultCanonicalSha256: digest(result),
    artifactSha256: result.artifact.sha256,
  }
})

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
