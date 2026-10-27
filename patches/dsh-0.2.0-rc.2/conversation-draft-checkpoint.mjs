import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const conversationUpstreamSha256 = '6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c'
export function patchConversationDraftCheckpoint(text) {
  if (createHash('sha256').update(text).digest('hex') !== conversationUpstreamSha256) throw Error('Fixed conversation upstream mismatch')
  const helper = readFileSync(new URL('./draft-checkpoint.mjs', import.meta.url), 'utf8').replace(/^export /gm, '')
  const replacements = [
    ['var exports = module.exports;', `var exports = module.exports;\nconst nativeDraftCheckpoint = (() => {\n${helper}\nreturn {bindResidentDraftCheckpoint};\n})();`],
    ['draftAttachments = /* @__PURE__ */ new Map();', 'draftAttachments = /* @__PURE__ */ new Map();\n restoredCheckpointFiles = new Set();'],
    ['this.draftAttachments.clear();', 'this.draftAttachments.clear();\n this.restoredCheckpointFiles.clear();'],
    ['this.draftAttachments.delete(id);', 'this.draftAttachments.delete(id);\n this.restoredCheckpointFiles.delete(id);'],
    ['if (attachment?.kind === "file") this.beginFileUpload(sessionId, attachment);', `if (attachment?.kind === "file") {
        if (this.restoredCheckpointFiles.has(id)) {
          const operation = this.fileUploadOperations.get(id);
          this.fileUploadOperations.delete(id);
          operation?.controller.abort();
          this.fileUploads.update(draft => { draft[id] = {status: "error", message: "恢复附件已切换会话；请明确重新上传后再发送。"}; });
        } else this.beginFileUpload(sessionId, attachment);
      }`],
    ['resolveDraftAttachments(ids) {', `restoreCheckpointAttachments(records) {
        const created = [];
        try {
          for (const record of records) {
            const file = new File([record.file], record.file.name, {type: record.file.type, lastModified: record.file.lastModified});
            const attachment = record.kind === "image" ? browserDraftAttachment(file) : {kind: "file", id: randomUUID(), file};
            this.draftAttachments.set(attachment.id, attachment);
            created.push(attachment.id);
            if (attachment.kind === "image") probeDimensions(attachment);
            else {
              this.restoredCheckpointFiles.add(attachment.id);
              this.fileUploads.update(draft => { draft[attachment.id] = {status: "error", message: "附件字节已恢复，旧上传回执已失效；请明确重新上传后再发送。"}; });
            }
          }
          return created;
        } catch (error) { for (const id of created) this.releaseDraftAttachment(id); throw error; }
      }
      resolveDraftAttachments(ids) {`],
    ['bindMirror(write) {', `restoreCheckpoint(draft, occurrences, ids, expectedRev) {
        if (this.disposed || this.rev !== expectedRev || this.snapshot.phase !== "plain") return false;
        this.draftEditor.restoreDraft(draft, occurrences);
        this.draftEditor.clearHistory();
        this.attachmentIds = ids;
        this.publish();
        return true;
      }
      bindMirror(write) {`],
    ['actions, renderSlot, bindDraftMirror, openView, useInspectCall }) {', 'actions, renderSlot, bindDraftMirror, bindDraftCheckpoint, openView, useInspectCall }) {'],
    ['const unmirror = bindDraftMirror(actions.setDraft);', 'const unmirror = bindDraftMirror(actions.setDraft);\n bindDraftCheckpoint();'],
    ['bindDraftMirror: (write) => inputHub.shell(sessionId).bindMirror(write),', `bindDraftMirror: (write) => inputHub.shell(sessionId).bindMirror(write),
      bindDraftCheckpoint: () => nativeDraftCheckpoint.bindResidentDraftCheckpoint(sessions.binding(sessionId), inputHub.shell(sessionId), concreteConversation(ctx), ctx.get("workspaces")),`],
  ]
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error('Conversation checkpoint anchor mismatch: ' + before)
    text = text.replace(before, after)
  }
  return text
}
