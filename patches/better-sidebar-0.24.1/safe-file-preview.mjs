import { createHash } from 'node:crypto'

const hashes = {
  "lib/client.js": "657812e84edd91684b8e85b728f119ce0b0e0f5318ad96714f9c528d1b75b41e",
  "lib/client-registry.js": "b6e768eba790101d95e921bf075d7bd83eb46b25060cf3a540b082affa1b1e0a",
  "lib/client-editor.js": "39537bd5d6124075d549e26995ea15542590cf1820ddad28932735153ebe2407",
  "src/client/service.ts": "b045b92e4eb98b6f753d1caa6ab3202fcbdbc32fbf632026e61ed5ed68975a6a",
  "src/client/resource-address.ts": "d90c0765203ffec197c44e23c543a2ddb46361b956336fcf1cde97648729631b",
  "src/client/native/index.ts": "51c187b63e5ad2561ab9552294cb29cd03c5c01d8baf63c1f7773bbf9d23643e",
  "src/client/native/tab-adapter.tsx": "d717300aab440d0216e534e6e6bb3b72f32698dc06ee0c9a9106679c6f8a4585",
  "src/client/builtins/tabs.tsx": "b62cd7bcb7d4a7f1a7bdd20a0894322929a8ddb5ea74be763f1beaa669a909d4",
  "src/client/EditorHost.tsx": "d298ca5de11753fd115c44b9572caa09012b523c9903456bdcaeb08c0d7ab4f4",
  "src/client/TextEditor.tsx": "045eba4d0febb42bb35706a160d350c9a6d239f10a4f1be11b384aff1e3e5f4a",
  "lib/types/client/service.d.ts": "807ef86eedb27a9413517958d7e94d74cf38cee0fb24ccba4243859da3cb4257"
}
export const upstreamHashes = Object.freeze(hashes)

function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw Error('Sidebar 0.24.1 safe preview anchor mismatch: ' + before.slice(0, 90))
  return text.replace(before, after)
}

const addressHelpers = `
const SAFE_FILE_PREFIX = 'dsh-resource://better-sidebar-safe-file/';
function parseSafeFileAddress(address) {
  if (!address.startsWith(SAFE_FILE_PREFIX) || /[?#]/.test(address)) return undefined;
  const parsed = parseFileAddress(FILE_ADDRESS_PREFIX + address.slice(SAFE_FILE_PREFIX.length));
  return parsed?.scope === 'session' && parsed.sessionId !== '' && parsed.path !== '' && !parsed.path.includes('\\0') ? parsed : undefined;
}
function toSafeFileAddress(address, sessionId) {
  if (!address.startsWith(FILE_ADDRESS_PREFIX)) throw Error('Invalid safe file address');
  const safe = SAFE_FILE_PREFIX + address.slice(FILE_ADDRESS_PREFIX.length);
  const parsed = parseSafeFileAddress(safe);
  if (!parsed || parsed.sessionId !== sessionId) throw Error('Invalid safe file session address');
  return safe;
}
function safeNativeTab(tab, address) {
  const parsed = parseSafeFileAddress(address);
  if (!parsed) return tab;
  const meta = tab.meta !== null && typeof tab.meta === 'object' && !Array.isArray(tab.meta) ? tab.meta : {};
  return { ...tab, path: parsed.path, meta: { ...meta, safePreview: true, dir: false } };
}
`

const safeRegistration = `
if (isEditor) {
  const safeId = 'dsh-better-sidebar:editor-safe';
  slots.push(tabs.register({
    id: safeId, kind: 'better-sidebar-safe-editor', priority: 'extension',
    patterns: ['dsh-resource://better-sidebar-safe-file/**'],
    canOpen: address => parseSafeFileAddress(address) !== undefined,
    title: address => parseSafeFileAddress(address)?.path.split('/').at(-1) ?? titleOf(descriptor),
  }));
  slots.push(...registerSlots(safeId, { ctx, store, service, records, descriptorId: descriptor.id }, {
    paramsOf: info => { const address = parseSafeFileAddress(info.tab.contentId); return address ? { path: address.path } : undefined; },
    sessionIdOf: info => parseSafeFileAddress(info.tab.contentId)?.sessionId,
  }));
}
`

export function patchSidebarSafePreview(file, text) {
  if (!hashes[file] || createHash('sha256').update(text).digest('hex') !== hashes[file]) throw Error('Sidebar 0.24.1 upstream mismatch: ' + file)
  if (file.startsWith('src/') || file.endsWith('.d.ts')) return patchSource(file, text)
  if (file === 'lib/client-editor.js') {
    const changes = [
      ['const html = viewerId === "html";', 'const safePreview = props.safePreview === true;\nconst html = viewerId === "html" && !safePreview;'],
      ['const previewText = markdown ?', 'const previewText = markdown && !safePreview ?'],
      ['() => markdown && mode === "preview" ? splitMermaidBlocks', '() => markdown && !safePreview && mode === "preview" ? splitMermaidBlocks'],
      ['() => markdown && mode === "preview" ? analyzeMarkdownHtml', '() => markdown && !safePreview && mode === "preview" ? analyzeMarkdownHtml'],
      ['htmlInfo !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownDocument, {', 'safePreview ? (_deepseek_ai_dsh_client_ui_primitives.MarkdownText.resourcePolicyVersion === 1 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { ...markdownTextProps(previewMdText, codeLabels), streaming: false, allowRemoteImages: false }) : (0, react_jsx_runtime.jsx)("pre", { style: { whiteSpace: "pre-wrap" }, children: previewMdText })) : htmlInfo !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownDocument, {'],
    ]
    for (const [before, after] of changes) text = replaceOnce(text, before, after)
    const dep = '\t\t\tmarkdown,\n\t\t\tmode,\n\t\t\tpreviewMdText\n'
    if (text.split(dep).length !== 3) throw Error('Sidebar editor memo mismatch')
    return text.replaceAll(dep, '\t\t\tmarkdown,\n\t\t\tsafePreview,\n\t\t\tmode,\n\t\t\tpreviewMdText\n')
  }
  const replacements = [
    ['const FILE_ADDRESS_PREFIX = "dsh-resource://file/";', 'const FILE_ADDRESS_PREFIX = "dsh-resource://file/";' + addressHelpers],
    ['"openFile",', '"openFile",\n\t\t\t"safeFilePreview",'],
    ['const openFile = (scope, path, title) => {', 'const openFile = (scope, path, title, options) => {'],
    ['id: `editor:${path}`', 'id: `${options?.safePreview === true ? "editor-safe" : "editor"}:${path}`,\n\t\t\t\t\t...(options?.safePreview === true ? { meta: { safePreview: true } } : {})'],
    ['address: surface.fileAddress(targetSessionId, scope?.cwd, seed.path),', 'address: synthetic.meta?.safePreview === true ? toSafeFileAddress(surface.fileAddress(targetSessionId, scope?.cwd, seed.path), targetSessionId) : surface.fileAddress(targetSessionId, scope?.cwd, seed.path),'],
    ['const matchFileViewer = (path, head) => {', 'const matchFileViewer = (path, head, options) => {\nif (options?.safePreview === true) {\nconst id = /\\.(md|markdown)$/i.test(path) ? "markdown" : "code";\nconst viewer = viewers.get(id);\nreturn isViewerEnabled(id) && viewer?.fetchStrategy === "fsRead" ? viewer : undefined;\n}'],
    ['sessionIdOf: fileSessionIdOf\n\t\t\t\t\t\t} : {});', 'sessionIdOf: fileSessionIdOf\n\t\t\t\t\t\t} : {});' + safeRegistration],
    ['dedupeKey: (tab) => tab.path,', 'dedupeKey: (tab) => JSON.stringify([tab.path, tab.meta?.safePreview === true]),'],
    ['const isDir = metaOf(tab).dir === true;', 'const isDir = metaOf(tab).dir === true;\nconst safePreview = metaOf(tab).safePreview === true;'],
    ['?.matchFileViewer(path, head)', '?.matchFileViewer(path, head, { safePreview })'],
    ['?.matchFileViewer(path),', '?.matchFileViewer(path, void 0, { safePreview }),'],
    ['\t\t\t\treloadSeq\n', '\t\t\t\treloadSeq,\n\t\t\t\tsafePreview\n'],
    ['viewerId: load.viewer.id,', 'viewerId: load.viewer.id,\n\t\t\t\t\t\t\t\tsafePreview,'],
  ]
  for (const name of ['openFile', 'openFileNewTab', 'openFileSide']) {
    replacements.push([`const ${name} = (absolute) => {`, `const ${name} = (absolute) => {\nif (safePreview) { ctx.get("betterSidebar")?.openFile(scope, absolute, undefined, { safePreview: true }); return; }`])
  }
  for (const [before, after] of replacements) text = replaceOnce(text, before, after)
  text = repairRegistrationRollback(text, false)
  // Both live and orphaned native bodies must preserve address-derived safety.
  const start = text.indexOf('//#region src/client/native/tab-adapter.tsx')
  const end = text.indexOf('//#endregion', start)
  let body = text.slice(start, end)
  if (body.split('tab: view.tab,').length !== 3) throw Error('Sidebar native body mismatch')
  body = body.replaceAll('tab: view.tab,', 'tab: safeNativeTab(view.tab, nativeTab.contentId),')
  return text.slice(0, start) + body + text.slice(end)
}

function patchSource(file, text) {
  let changes = []
  if (file === 'src/client/resource-address.ts') {
    const typed = addressHelpers
      .replace('function parseSafeFileAddress(address)', 'export function parseSafeFileAddress(address: string)')
      .replace('function toSafeFileAddress(address, sessionId)', 'export function toSafeFileAddress(address: string, sessionId: string)')
      .replace('function safeNativeTab(tab, address)', 'export function safeNativeTab(tab: SidebarTab, address: string): SidebarTab')
    return "import type { SidebarTab } from './state.ts'\n" + text + typed
  } else if (file === 'src/client/service.ts' || file === 'lib/types/client/service.d.ts') {
    changes = [
      ['viewerId: string', 'viewerId: string\n  /** Opt-in inert Markdown/text; no remote resources or raw HTML. */\n  safePreview?: boolean'],
      ['matchFileViewer(path: string, head?: Uint8Array)', 'matchFileViewer(path: string, head?: Uint8Array, options?: { safePreview?: boolean })'],
      ['openFile(scope: SessionScope, path: string, title?: string)', 'openFile(scope: SessionScope, path: string, title?: string, options?: { safePreview?: boolean })'],
    ]
    if (file.endsWith('.d.ts')) {
      // Declaration members have semicolons; keep viewerId's terminator.
      changes[0] = ['viewerId: string;', 'viewerId: string;\n    safePreview?: boolean;']
      changes.push(['"openFile", "targetedOpen"', '"openFile", "safeFilePreview", "targetedOpen"'])
    } else {
      text = "import { toSafeFileAddress } from './resource-address.ts'\n" + text
      changes.push(
        ["  'openFile',", "  'openFile',\n  'safeFilePreview',"],
        ['const openFile = (scope: SessionScope, path: string, title?: string): void => {', 'const openFile = (scope: SessionScope, path: string, title?: string, options?: { safePreview?: boolean }): void => {'],
        ['id: `editor:${path}` }, scope)', 'id: `${options?.safePreview === true ? "editor-safe" : "editor"}:${path}`, ...(options?.safePreview === true ? { meta: { safePreview: true } } : {}) }, scope)'],
        ['address: surface.fileAddress(targetSessionId, scope?.cwd, seed.path),', 'address: (synthetic.meta as { safePreview?: boolean } | undefined)?.safePreview === true ? toSafeFileAddress(surface.fileAddress(targetSessionId, scope?.cwd, seed.path), targetSessionId) : surface.fileAddress(targetSessionId, scope?.cwd, seed.path),'],
        ['const matchFileViewer = (path: string, head?: Uint8Array): FileViewerDescriptor | undefined => {', 'const matchFileViewer = (path: string, head?: Uint8Array, options?: { safePreview?: boolean }): FileViewerDescriptor | undefined => {\n    if (options?.safePreview === true) {\n      const id = /\\.(md|markdown)$/i.test(path) ? "markdown" : "code"\n      const viewer = viewers.get(id)\n      return isViewerEnabled(id) && viewer?.fetchStrategy === "fsRead" ? viewer : undefined\n    }'],
      )
    }
  } else if (file === 'src/client/native/index.ts') {
    changes = [
      ["import { parseFileAddress }", "import { parseFileAddress, parseSafeFileAddress }"],
      ['isEditor ? { paramsOf: fileParamsOf, sessionIdOf: fileSessionIdOf } : {},\n        )', 'isEditor ? { paramsOf: fileParamsOf, sessionIdOf: fileSessionIdOf } : {},\n        )' + safeRegistration],
    ]
  } else if (file === 'src/client/native/tab-adapter.tsx') {
    text = "import { safeNativeTab } from '../resource-address.ts'\n" + text
    if (text.split('tab: view.tab,').length !== 3) throw Error('Sidebar source body mismatch')
    return text.replaceAll('tab: view.tab,', 'tab: safeNativeTab(view.tab, nativeTab.contentId),')
  } else if (file === 'src/client/builtins/tabs.tsx') {
    changes = [['dedupeKey: (tab) => tab.path,', 'dedupeKey: (tab) => JSON.stringify([tab.path, (tab.meta as { safePreview?: boolean } | undefined)?.safePreview === true]),']]
  } else if (file === 'src/client/EditorHost.tsx') {
    changes = [
      ['const isDir = metaOf(tab).dir === true', 'const isDir = metaOf(tab).dir === true\n  const safePreview = metaOf(tab).safePreview === true'],
      ['?.matchFileViewer(path, head)', '?.matchFileViewer(path, head, { safePreview })'],
      ['?.matchFileViewer(path),', '?.matchFileViewer(path, undefined, { safePreview }),'],
      ['isDir, reloadSeq])', 'isDir, reloadSeq, safePreview])'],
      ['viewerId: load.viewer.id,', 'viewerId: load.viewer.id,\n            safePreview,'],
    ]
    for (const name of ['openFile', 'openFileNewTab', 'openFileSide']) {
      changes.push([`const ${name} = (absolute: string): void => {`, `const ${name} = (absolute: string): void => {\n    if (safePreview) { ctx.get('betterSidebar')?.openFile(scope, absolute, undefined, { safePreview: true }); return }`])
    }
  } else if (file === 'src/client/TextEditor.tsx') {
    changes = [
      ["const html = viewerId === 'html'", "const safePreview = props.safePreview === true\n  const html = viewerId === 'html' && !safePreview"],
      ['const previewText = markdown\n', 'const previewText = markdown && !safePreview\n'],
      ["markdown && mode === 'preview' ? splitMermaidBlocks", "markdown && !safePreview && mode === 'preview' ? splitMermaidBlocks"],
      ["markdown && mode === 'preview' ? analyzeMarkdownHtml", "markdown && !safePreview && mode === 'preview' ? analyzeMarkdownHtml"],
      ['{htmlInfo !== null\n            ? <MarkdownDocument', '{safePreview\n            ? ((MarkdownText as typeof MarkdownText & { resourcePolicyVersion?: number }).resourcePolicyVersion === 1\n              ? <MarkdownText {...markdownTextProps(previewMdText, codeLabels)} streaming={false} {...{ allowRemoteImages: false }} />\n              : <pre style={{ whiteSpace: "pre-wrap" }}>{previewMdText}</pre>)\n            : htmlInfo !== null\n            ? <MarkdownDocument'],
    ]
    if (text.split('[markdown, mode, previewMdText]').length !== 3) throw Error('Sidebar source memo mismatch')
    text = text.replaceAll('[markdown, mode, previewMdText]', '[markdown, safePreview, mode, previewMdText]')
  } else throw Error('Unsupported Sidebar source patch: ' + file)
  for (const [before, after] of changes) text = replaceOnce(text, before, after)
  if (file === 'src/client/native/index.ts') text = repairRegistrationRollback(text, true)
  return text
}

function repairRegistrationRollback(text, typed) {
  const start = text.indexOf(typed ? 'const registerDescriptor = ' : 'const registerDescriptor = ')
  const end = text.indexOf('const registerFilesKind = ', start)
  if (start < 0 || end < start) throw Error('Sidebar 0.24.1 descriptor boundary mismatch')
  let body = text.slice(start, end)
  body = replaceOnce(body, typed ? 'let slots: Array<() => void>' : 'let slots;', typed ? 'let slots: Array<() => void> = []' : 'let slots = [];')
  const before = typed ? '} catch (error) {\n        disposeSafely(disposeType,' : '} catch (error) {\n\t\t\t\t\t\tdisposeSafely(disposeType,'
  body = replaceOnce(body, before, '} catch (error) {\nfor (const dispose of slots.reverse()) disposeSafely(dispose, "native safe file partial registration");\ndisposeSafely(disposeType,')
  return text.slice(0, start) + body + text.slice(end)
}
