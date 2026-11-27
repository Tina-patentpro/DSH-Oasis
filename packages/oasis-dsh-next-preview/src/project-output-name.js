export function projectOutputFileName(task, run) {
  const version = task.runOrder.indexOf(run.runId) + 1
  const time = Date.parse(run.completedAt)
  if (version < 1 || !Number.isFinite(time)) throw new TypeError('An authoritative completed run and version are required')
  // Stable Asia/Shanghai wall-clock name, independent of the machine locale.
  const stamp = new Date(time + 8 * 3600000).toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
  const title = run.workflowId === 'patent-claims' ? '权利要求书' : '生成结果'
  const api = run.source === 'oasis-api' || run.mode === 'oasis-legacy'
  return `${title}_${stamp}_v${version}${api ? '_OIW' : ''}.md`
}
