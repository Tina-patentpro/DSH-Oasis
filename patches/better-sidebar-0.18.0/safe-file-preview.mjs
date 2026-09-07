function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw Error('Sidebar 0.18.0 safe preview upstream mismatch: ' + before.slice(0, 65))
  return text.replace(before, after)
}

// Keep this generic capability in Sidebar; no Oasis task or artifact semantics.
export function patchSidebarSafePreview(file, text) {
  const compiled = file === 'lib/client.js'
  let replacements
  if (compiled || file === 'src/client/service.ts') {
    replacements = compiled ? [
      ['"openFile",', '"openFile",\n\t\t\t"safeFilePreview",'],
      ['const openFile = (scope, path, title) => {', 'const openFile = (scope, path, title, options) => {'],
      ['id: `editor:${path}`', 'id: `${options?.safePreview === true ? "editor-safe" : "editor"}:${path}`,\n\t\t\t\t\t...(options?.safePreview === true ? { meta: { safePreview: true } } : {})'],
      ['const matchFileViewer = (path, head) => {', 'const matchFileViewer = (path, head, options) => {\n\t\t\t\tif (options?.safePreview === true) {\n\t\t\t\t\tconst id = /\\.(md|markdown)$/i.test(path) ? "markdown" : "code";\n\t\t\t\t\tconst viewer = viewers.get(id);\n\t\t\t\t\treturn isViewerEnabled(id) && viewer?.fetchStrategy === "fsRead" ? viewer : void 0;\n\t\t\t\t}'],
      ['dedupeKey: (tab) => tab.path,', 'dedupeKey: (tab) => JSON.stringify([tab.path, tab.meta?.safePreview === true]),'],
      ['const isDir = metaOf(tab).dir === true;', 'const isDir = metaOf(tab).dir === true;\n\t\t\tconst safePreview = metaOf(tab).safePreview === true;'],
      ['?.matchFileViewer(path, head)', '?.matchFileViewer(path, head, { safePreview })'],
      ['?.matchFileViewer(path),', '?.matchFileViewer(path, void 0, { safePreview }),'],
      ['\t\t\t\treloadSeq\n', '\t\t\t\treloadSeq,\n\t\t\t\tsafePreview\n'],
      ['viewerId: load.viewer.id,', 'viewerId: load.viewer.id,\n\t\t\t\t\t\t\t\tsafePreview,'],
    ] : [
      ["  'openFile',", "  'openFile',\n  'safeFilePreview',"],
      ['  viewerId: string', '  viewerId: string\n  /** Opt-in inert Markdown/text preview; no remote images or raw HTML. */\n  safePreview?: boolean'],
      ['matchFileViewer(path: string, head?: Uint8Array): FileViewerDescriptor | undefined', 'matchFileViewer(path: string, head?: Uint8Array, options?: { safePreview?: boolean }): FileViewerDescriptor | undefined'],
      ['openFile(scope: SessionScope, path: string, title?: string): void', 'openFile(scope: SessionScope, path: string, title?: string, options?: { safePreview?: boolean }): void'],
      ['const matchFileViewer = (path: string, head?: Uint8Array): FileViewerDescriptor | undefined => {', 'const matchFileViewer = (path: string, head?: Uint8Array, options?: { safePreview?: boolean }): FileViewerDescriptor | undefined => {\n    if (options?.safePreview === true) {\n      const id = /\\.(md|markdown)$/i.test(path) ? "markdown" : "code"\n      const viewer = viewers.get(id)\n      return isViewerEnabled(id) && viewer?.fetchStrategy === "fsRead" ? viewer : undefined\n    }'],
      ['const openFile = (scope: SessionScope, path: string, title?: string): void => {', 'const openFile = (scope: SessionScope, path: string, title?: string, options?: { safePreview?: boolean }): void => {'],
      ['id: `editor:${path}` }, scope)', 'id: `${options?.safePreview === true ? "editor-safe" : "editor"}:${path}`, ...(options?.safePreview === true ? { meta: { safePreview: true } } : {}) }, scope)'],
    ]
  } else if (file === 'src/client/builtins/tabs.tsx') {
    replacements = [['dedupeKey: (tab) => tab.path,', 'dedupeKey: (tab) => JSON.stringify([tab.path, (tab.meta as { safePreview?: boolean } | undefined)?.safePreview === true]),']]
  } else if (file === 'src/client/EditorHost.tsx') {
    replacements = [
      ['const isDir = metaOf(tab).dir === true', 'const isDir = metaOf(tab).dir === true\n  const safePreview = metaOf(tab).safePreview === true'],
      ['?.matchFileViewer(path, head)', '?.matchFileViewer(path, head, { safePreview })'],
      ['?.matchFileViewer(path),', '?.matchFileViewer(path, undefined, { safePreview }),'],
      ['isDir, reloadSeq])', 'isDir, reloadSeq, safePreview])'],
      ['viewerId: load.viewer.id,', 'viewerId: load.viewer.id,\n            safePreview,'],
    ]
  } else if (file === 'lib/client-editor.js') {
    replacements = [
      ['const html = viewerId === "html";', 'const safePreview = props.safePreview === true;\n\t\tconst html = viewerId === "html" && !safePreview;'],
      ['const previewText = markdown ?', 'const previewText = markdown && !safePreview ?'],
      ['htmlInfo !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownDocument, {', 'safePreview ? (_deepseek_ai_dsh_client_ui_primitives.MarkdownText.resourcePolicyVersion === 1 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { ...markdownTextProps(previewMdText, codeLabels), allowRemoteImages: false }) : (0, react_jsx_runtime.jsx)("pre", { style: { whiteSpace: "pre-wrap" }, children: previewMdText })) : htmlInfo !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownDocument, {'],
    ]
  } else if (file === 'src/client/TextEditor.tsx') {
    replacements = [
      ["const html = viewerId === 'html'", "const safePreview = props.safePreview === true\n  const html = viewerId === 'html' && !safePreview"],
      ['const previewText = markdown\n', 'const previewText = markdown && !safePreview\n'],
      ['{htmlInfo !== null\n            ? <MarkdownDocument', '{safePreview\n            ? ((MarkdownText as typeof MarkdownText & { resourcePolicyVersion?: number }).resourcePolicyVersion === 1\n              ? <MarkdownText {...markdownTextProps(previewMdText, codeLabels)} {...{ allowRemoteImages: false }} />\n              : <pre style={{ whiteSpace: "pre-wrap" }}>{previewMdText}</pre>)\n            : htmlInfo !== null\n            ? <MarkdownDocument'],
    ]
  } else throw Error('Unsupported Sidebar patch file: ' + file)
  for (const [before, after] of replacements) text = replaceOnce(text, before, after)
  return text
}
