const SUPPORTED_WORK_TYPES = Object.freeze([
  'technical-rd',
  'cn-invention-patent',
])

export function createPluginStatus() {
  return Object.freeze({
    schemaVersion: '1.0.0',
    plugin: 'oasis-professional-service',
    phase: 'week-2',
    capabilityLevel: 'durable-workbench-state',
    localFirst: true,
    externalSystems: 'existing-stable-services',
    supportedWorkTypes: SUPPORTED_WORK_TYPES,
  })
}
