import { createHash } from 'node:crypto'

const hashes = {
  'lib/client.js': '8df8206765abf49a625949631156414bf6964fe56f1266f2b8dc2c9f0e9a0241',
  'lib/client-registry.js': 'ffcabe439d5478ba4e082d3b4fbd2d9a33ceb13856a5e9a05a12c2d7d44e7f6b',
  'lib/client-editor.js': 'ff3530f00c15b048b0a9c609e8b9c237f427bf880c8f8b230b325246a9cee397',
  'src/client/service.ts': '9467b4ac4317b2b9f12f1c0b709520c362a7847639b43d3bebef2b66395332ec',
  'src/client/resource-address.ts': 'd90c0765203ffec197c44e23c543a2ddb46361b956336fcf1cde97648729631b',
  'src/client/native/index.ts': 'f83c47192d841cf667746a7270fc6c9ab4e0704eba2ec30322a3677ef9a5e264',
  'src/client/native/tab-adapter.tsx': 'c92c87f48d1c5fad92169c5b1433fcac5374193beb1ae5f61131021a5b141c7f',
  'src/client/builtins/tabs.tsx': '451c769c886444899444fc198baa19a78d886c0531143228759d23e0c042909d',
  'src/client/EditorHost.tsx': '83b9f2a37d5ebae07907348c3cc9c23cb9f1c85e7cf7e0daed9ede3267c20fc9',
  'src/client/TextEditor.tsx': '78d4ec24877f96540f0b2aed2f7f8ff6aff047173bb4b42f73107f03922b370f',
  'lib/types/client/service.d.ts': '041a73667aa0c1c7885f5da37bd66cceb5b870d450101b6800aa8047f033b974',
}
export const upstreamHashes = Object.freeze(hashes)

function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw Error('Sidebar 0.19.1 safe preview anchor mismatch: ' + before.slice(0, 90))
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
  if (!hashes[file] || createHash('sha256').update(text).digest('hex') !== hashes[file]) throw Error('Sidebar 0.19.1 upstream mismatch: ' + file)
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
    ['sessionIdOf: fileSessionIdOf\n\t\t\t\t\t} : {});', 'sessionIdOf: fileSessionIdOf\n\t\t\t\t\t} : {});' + safeRegistration],
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
      ['isEditor ? { paramsOf: fileParamsOf, sessionIdOf: fileSessionIdOf } : {},\n      )', 'isEditor ? { paramsOf: fileParamsOf, sessionIdOf: fileSessionIdOf } : {},\n      )' + safeRegistration],
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
  return text
}
