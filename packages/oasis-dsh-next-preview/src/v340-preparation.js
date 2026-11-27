import { z } from 'zod'
import { getV340Catalog, getV340Node } from './v340-catalog.js'
import { prepareV340Inputs } from './v340-document.js'
import { WorkspaceMaterialError } from './workspace-materials.js'

const identity = z.string().min(1).max(256).refine(v => v.trim() === v)
const boundedRecord = value => z.record(z.string().max(128), value).refine(v => Object.keys(v).length <= 32)
export const v340PrepareCommandSchema = z.object({ workspaceId: identity,
  nodeId: z.enum(getV340Catalog().nodes.map(n => n.nodeId)), confirmed: z.literal(true),
  textInputs: boundedRecord(z.string().max(300000)).default({}),
  filePaths: boundedRecord(z.string().min(1).max(1024)).default({}),
  configuration: boundedRecord(z.json()).default({}),
}).strict()
const materialPolicy = { acceptedExtensions: ['.md','.txt'], maxFileBytes: 1024 * 1024, contentReadMode: 'metadata-only' }
const fail = () => { throw new WorkspaceMaterialError('V340_PREPARATION_FAILED', 'V3.4.0材料准备未完成；请核对所选项目、单项输入和UTF-8文本文件。') }

// This entry only reads explicit project files. No model/API, task mutation, discovery or writeback.
export function createV340PreparationService({ materialManager } = {}) {
  return {
    getV340Catalog,
    async prepareV340(command) {
      try {
        const { workspaceId,nodeId,textInputs,filePaths,configuration } = v340PrepareCommandSchema.parse(command)
        const node = getV340Node(nodeId), values = {}
        const channels = [
          [textInputs, field => !field.id.endsWith('_file') && field.channel !== '配置'],
          [filePaths, field => field.id.endsWith('_file')],
          [configuration, field => field.channel === '配置'],
        ]
        for (const [entries, accepts] of channels) for (const [key, value] of Object.entries(entries)) {
          const field = node.inputs.find(input => input.id === key)
          if (!field || !accepts(field) || Object.hasOwn(values,key)) fail()
          values[key] = value
        }
        let total = 0
        for (const [key, relativePath] of Object.entries(filePaths)) {
          if (!materialManager?.inspect || !materialManager?.readForUpload) fail()
          const { observedAt, ...reference } = await materialManager.inspect(workspaceId,relativePath,materialPolicy)
          const read = await materialManager.readForUpload(workspaceId,{ kind:'project-file',...reference },materialPolicy)
          total += read.bytes.length
          if (total > 2 * 1024 * 1024) fail()
          const body = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(read.bytes)
          values[key] = { filename:read.fileName,body,sha256:read.sha256 }
        }
        return { evidenceKind:'input-preparation',dispatchEnabled:false,businessVersion:'V3.4.0',
          nodeId,workspaceId,sources:node.sources,prepared:prepareV340Inputs(nodeId,values) }
      } catch { fail() }
    },
  }
}
