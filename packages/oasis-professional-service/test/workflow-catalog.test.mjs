import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getWorkflowCatalog,
  getWorkflowDefinition,
  validateWorkflowForm,
} from '../src/workflow-catalog.js'

test('publishes two deeply frozen versioned local-mock workflows', () => {
  const catalog = getWorkflowCatalog()
  assert.equal(catalog.schemaVersion, 1)
  assert.deepEqual(catalog.workflows.map(({ workflowId, workflowVersion, workType }) => ({
    workflowId, workflowVersion, workType,
  })), [
    { workflowId: 'technical-rd', workflowVersion: '1', workType: 'technical-rd' },
    { workflowId: 'cn-invention-patent', workflowVersion: '1', workType: 'cn-invention-patent' },
  ])
  assert.equal(catalog.workflows.every((workflow) => workflow.executionMode === 'local-mock'), true)
  assert.equal(catalog.workflows.every((workflow) => workflow.materialPolicy.contentReadMode === 'metadata-only'), true)
  assert.deepEqual(catalog.workflows.map(({ outputSections }) => outputSections), [
    ['problem-decomposition', 'candidate-solutions', 'risks', 'verification-plan', 'deliverables'],
    ['terminology', 'support-matrix', 'claim-strategy', 'claims-outline', 'specification-outline', 'questions'],
  ])
  assert.equal(Object.isFrozen(catalog), true)
  assert.equal(Object.isFrozen(catalog.workflows), true)
  assert.equal(Object.isFrozen(catalog.workflows[0].form.fields), true)
})

test('filters by work type without mutating or sharing a writable result', () => {
  const technical = getWorkflowCatalog('technical-rd')
  assert.equal(technical.workflows.length, 1)
  assert.equal(technical.workflows[0].workflowId, 'technical-rd')
  assert.throws(() => technical.workflows.push({}), TypeError)
  assert.equal(getWorkflowCatalog().workflows.length, 2)
})

test('uses only the bounded form DSL and unique field identifiers', () => {
  const allowedControls = new Set(['short-text', 'long-text', 'string-list', 'select'])
  for (const workflow of getWorkflowCatalog().workflows) {
    const ids = workflow.form.fields.map((field) => field.fieldId)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(workflow.form.fields.every((field) => allowedControls.has(field.control)), true)
    for (const field of workflow.form.fields) {
      if (field.control === 'short-text' || field.control === 'long-text') {
        assert.equal(Number.isInteger(field.maxChars), true)
      } else if (field.control === 'string-list') {
        assert.equal(Number.isInteger(field.maxItems), true)
        assert.equal(Number.isInteger(field.itemMaxChars), true)
      } else if (field.control === 'select') {
        assert.equal(field.options.length > 0, true)
      }
    }
  }
})

test('validates technical R&D forms with exact fields and boundary budgets', () => {
  const valid = {
    objective: '降低泵站能耗',
    currentState: '现有控制采用固定频率。',
    constraints: ['不得更换主泵', '停机窗口两小时'],
    evidenceStatus: 'partial',
    expectedDeliverable: '候选方案和验证计划',
  }
  assert.deepEqual(validateWorkflowForm('technical-rd', '1', valid), valid)
  const requiredOnly = {
    objective: valid.objective,
    currentState: valid.currentState,
    evidenceStatus: valid.evidenceStatus,
  }
  assert.deepEqual(validateWorkflowForm('technical-rd', '1', requiredOnly), requiredOnly)
  assert.throws(() => validateWorkflowForm('technical-rd', '1', { ...valid, objective: '   ' }), /objective/i)
  assert.throws(() => validateWorkflowForm('technical-rd', '1', { ...valid, evidenceStatus: 'guessed' }), /evidenceStatus/i)
  assert.throws(() => validateWorkflowForm('technical-rd', '1', { ...valid, extra: true }), /unrecognized|extra/i)
  assert.throws(() => validateWorkflowForm('technical-rd', '1', {
    ...valid, constraints: Array.from({ length: 33 }, () => '约束'),
  }), /constraints/i)
})

test('validates patent forms and rejects unsupported versions or unknown workflows', () => {
  const valid = {
    technicalDisclosure: '一种泵站控制方法，包括采集压力并调整频率。',
    inventiveConcept: '根据压力变化率选择控制区间。',
    knownPriorArt: '',
    terms: ['压力变化率', '控制区间'],
    unconfirmedFacts: [],
    desiredScope: '方法与系统',
  }
  assert.deepEqual(validateWorkflowForm('cn-invention-patent', '1', valid), valid)
  const requiredOnly = {
    technicalDisclosure: valid.technicalDisclosure,
    inventiveConcept: valid.inventiveConcept,
  }
  assert.deepEqual(validateWorkflowForm('cn-invention-patent', '1', requiredOnly), requiredOnly)
  assert.throws(() => validateWorkflowForm('cn-invention-patent', '1', {
    ...valid, technicalDisclosure: '',
  }), /technicalDisclosure/i)
  assert.throws(() => getWorkflowDefinition('cn-invention-patent', '2'), /version|not found/i)
  assert.throws(() => getWorkflowDefinition('unknown', '1'), /workflow|not found/i)
})

test('does not expose Dify, billing, credentials, prices, URLs, or remote service fields', () => {
  const serialized = JSON.stringify(getWorkflowCatalog())
  for (const forbidden of [
    'dify', 'billing', 'unit_price', 'service_fee', 'currency', 'auth', 'token', 'apiKey', 'http://', 'https://',
  ]) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden)
  }
})
