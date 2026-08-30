const SUPPORTED_WORK_TYPES = Object.freeze([
  'technical-rd',
  'cn-invention-patent',
])

export function createPluginStatus() {
  return Object.freeze({
    schemaVersion: '1.0.0',
    plugin: 'oasis-professional-service',
    phase: 'week-3',
    capabilityLevel: 'local-professional-loop',
    localFirst: true,
    externalSystems: 'not-invoked',
    supportedWorkTypes: SUPPORTED_WORK_TYPES,
  })
}
