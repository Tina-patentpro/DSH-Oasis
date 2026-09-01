import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  computeOasisRemoteInputSha256,
  computeOasisRemoteResponseSha256,
  createEmptyWorkbenchRecord,
  migrateWorkbenchRecordV2ToV3,
  parseWorkbenchEditableDraft,
  parseWorkbenchRecord,
  parseStoredWorkbenchRecord,
} from '../src/workbench-domain.js'
import { createStoredV2Record, NOW, recordToEditableDraft } from './workbench-fixtures.mjs'

function createRemoteExecution(inputSha) {
  return {
    executionId: 'execution-a',
    requestKey: 'remote-request-a',
    status: 'completed',
    inputSha,
    serviceSnapshot: {
      apiId: 132,
      apiEndpoint: '权利要求书生成-3.3-Fast-X',
      apiProcess: '输入内容整理,权利要求撰写',
      schemaHash: 'b'.repeat(64),
    },
    folderSnapshot: { folderId: 8, folderName: '测试项目' },
    priceSnapshot: { price: 3, balance: 20 },
    materialSnapshots: [],
    uploadedFiles: [],
    safeError: null,
    createdAt: NOW,
    updatedAt: NOW,
    submittedAt: NOW,
    completedAt: NOW,
  }
}

function addCompletedRemoteRun(record) {
  const task = record.tasks['task-a']
  const providerSnapshot = {
    apiBaseOrigin: 'https://oasis-staging.example',
    apiId: 132,
    apiEndpoint: '权利要求书生成-3.3-Fast-X',
    apiProcess: '输入内容整理,权利要求撰写',
    folderId: 8,
    price: 3,
  }
  const formValues = { User_input: '生成权利要求书' }
  const inputRefs = []
  const inputSha = computeOasisRemoteInputSha256({ providerSnapshot, formValues, inputRefs })
  const answerText = '权利要求书草稿'
  const fileUrls = ['https://files-staging.example/result.docx']
  const responseSha = computeOasisRemoteResponseSha256({ answerText, fileUrls })
  const body = '# 绿洲专业服务结果\n\n权利要求书草稿\n'
  const artifactSha = createHash('sha256').update(body, 'utf8').digest('hex')
  task.remoteExecutionOrder.push('execution-a')
  task.remoteExecutions['execution-a'] = createRemoteExecution(inputSha)
  task.runOrder.push('remote-run-a')
  task.runs['remote-run-a'] = {
    runId: 'remote-run-a',
    requestKey: 'remote-request-a',
    mode: 'oasis-legacy',
    status: 'completed',
    executionId: 'execution-a',
    providerSnapshot,
    inputSnapshot: { formValues, inputRefs, sha256: inputSha, capturedAt: NOW },
    result: {
      answerText,
      fileUrls,
      fileStatus: 'undownloaded-unverified',
      responseSha,
      artifact: {
        artifactId: `sha256:${artifactSha}`,
        suggestedFileName: 'oasis-result.md',
        mediaType: 'text/markdown',
        body,
        sha256: artifactSha,
      },
    },
    review: { status: 'not-reviewed', note: '', updatedAt: NOW },
    writebacks: [],
    createdAt: NOW,
    completedAt: NOW,
  }
  task.activeRunId = 'remote-run-a'
  return record
}

test('migrates stored v2 records to detached frozen v3 ledgers without inventing remote evidence', () => {
  const source = createStoredV2Record()
  const migrated = migrateWorkbenchRecordV2ToV3(source)
  assert.equal(migrated.schemaVersion, 3)
  assert.equal(migrated.tasks['task-a'].professionalDraft, null)
  assert.deepEqual(migrated.tasks['task-a'].remoteExecutionOrder, [])
  assert.deepEqual(migrated.tasks['task-a'].remoteExecutions, {})
  assert.deepEqual(source, createStoredV2Record(), 'migration must not mutate v2 input')
  assert.equal(Object.isFrozen(migrated.tasks['task-a']), true)
  assert.equal(parseStoredWorkbenchRecord('workspace-a', source).schemaVersion, 3)
})

test('creates v3 workspaces and keeps remote execution ledgers outside editable drafts', () => {
  const empty = createEmptyWorkbenchRecord('workspace-a')
  assert.equal(empty.schemaVersion, 3)

  const migrated = migrateWorkbenchRecordV2ToV3(createStoredV2Record())
  const draft = recordToEditableDraft(migrated)
  draft.tasks['task-a'].professionalDraft = {
    selectedApiEndpoint: '权利要求书生成-3.3-Fast-X',
    selectedApiId: 132,
    schemaHash: 'b'.repeat(64),
    formValues: { User_input: '生成权利要求书' },
    folderId: 8,
    updatedAt: NOW,
  }
  assert.doesNotThrow(() => parseWorkbenchEditableDraft(draft))
  draft.tasks['task-a'].remoteExecutions = {}
  assert.throws(() => parseWorkbenchEditableDraft(draft), /unrecognized|extra/i)
})

test('accepts completed Oasis runs only after Host execution completion and hash verification', () => {
  const current = addCompletedRemoteRun(structuredClone(migrateWorkbenchRecordV2ToV3(createStoredV2Record())))
  assert.doesNotThrow(() => parseWorkbenchRecord('workspace-a', current))

  const tampered = structuredClone(current)
  tampered.tasks['task-a'].runs['remote-run-a'].result.answerText = '篡改'
  assert.throws(() => parseWorkbenchRecord('workspace-a', tampered), /response integrity/i)

  const pendingInRuns = structuredClone(current)
  pendingInRuns.tasks['task-a'].runs['remote-run-a'].status = 'submitting'
  assert.throws(() => parseWorkbenchRecord('workspace-a', pendingInRuns), /completed|invalid/i)

  const nonOriginProvider = structuredClone(current)
  const nonOriginRun = nonOriginProvider.tasks['task-a'].runs['remote-run-a']
  nonOriginRun.providerSnapshot.apiBaseOrigin = 'https://oasis-staging.example/api'
  nonOriginRun.inputSnapshot.sha256 = computeOasisRemoteInputSha256({
    providerSnapshot: nonOriginRun.providerSnapshot,
    formValues: nonOriginRun.inputSnapshot.formValues,
    inputRefs: nonOriginRun.inputSnapshot.inputRefs,
  })
  nonOriginProvider.tasks['task-a'].remoteExecutions['execution-a'].inputSha = nonOriginRun.inputSnapshot.sha256
  assert.throws(() => parseWorkbenchRecord('workspace-a', nonOriginProvider), /origin/i)
})

test('does not persist a completed remote execution without its completed run snapshot', () => {
  const current = structuredClone(migrateWorkbenchRecordV2ToV3(createStoredV2Record()))
  current.tasks['task-a'].remoteExecutionOrder = ['execution-a']
  current.tasks['task-a'].remoteExecutions['execution-a'] = createRemoteExecution('a'.repeat(64))
  assert.throws(() => parseWorkbenchRecord('workspace-a', current), /completed.*run|run.*completed/i)
})

test('allows one Host-owned in-flight remote execution but rejects concurrent in-flight ledgers', () => {
  const current = structuredClone(migrateWorkbenchRecordV2ToV3(createStoredV2Record()))
  const task = current.tasks['task-a']
  const first = createRemoteExecution('a'.repeat(64))
  first.status = 'uploading'
  first.submittedAt = null
  first.completedAt = null
  task.remoteExecutionOrder = ['execution-a', 'execution-b']
  task.remoteExecutions = {
    'execution-a': first,
    'execution-b': { ...structuredClone(first), executionId: 'execution-b', requestKey: 'remote-request-b' },
  }
  assert.throws(() => parseWorkbenchRecord('workspace-a', current), /in-flight|concurrent/i)
})
