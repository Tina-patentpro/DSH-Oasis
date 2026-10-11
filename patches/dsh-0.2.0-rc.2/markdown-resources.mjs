// Frozen 0.2.0-rc.2 inputs only. Never edits an installed application itself.
import { createHash } from 'node:crypto'

export const upstreamSha256 = '6b551f0039ae2632704aab24011fad333fa46181129623e786629358f9494523'
export const upstreamWebSha256 = 'af3ff948cf3f132edbddebea93e2f9f02233b390a94bd4c9842182300be811bb'
export const upstreamDeclarationSha256 = 'd545746637708c5481c80572ddc3f09e9ad87336022d00d9b47e0f89434fb8ba'

function transform(text, hash, replacements, label) {
  if (createHash('sha256').update(text).digest('hex') !== hash) throw Error(`DSH 0.2.0-rc.2 ${label} upstream mismatch`)
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error(`DSH 0.2.0-rc.2 ${label} anchor mismatch: ${before.slice(0, 90)}`)
    text = text.replace(before, after)
  }
  return text
}

export function patchMarkdownResources(text) {
  return transform(text, upstreamSha256, [
    ['function renderImage(url, alt, key, context) {', 'function renderImage(url, alt, key, context) {\n\tif (context.allowRemoteImages === false) return jsx("span", { className: markdownCss.imageAlt, children: alt }, key);'],
    ['function renderSettled(text, labels, fileMentions, pathImages) {', 'function renderSettled(text, labels, fileMentions, pathImages, allowRemoteImages = true) {'],
    ['streaming: false,\n\t\tlabels,\n\t\tfileMentions,\n\t\tpathImages,', 'streaming: false,\n\t\tlabels,\n\t\tfileMentions,\n\t\tpathImages,\n\t\tallowRemoteImages,'],
    ['const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions, pathImages, variant = "body" }) {', 'const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions, pathImages, variant = "body", allowRemoteImages = true }) {'],
    ['if (!streaming) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions, pathImages);', 'if (!streaming || allowRemoteImages === false) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions, pathImages, allowRemoteImages);'],
    ['\t\tpathImages\n\t]);', '\t\tpathImages,\n\t\tallowRemoteImages\n\t]);'],
    ['});\n//#endregion\n//#region lib/types/WebBlock.js', '});\nMarkdownText.resourcePolicyVersion = 1;\n//#endregion\n//#region lib/types/WebBlock.js'],
  ], 'Markdown')
}

export function patchMarkdownWebBundle(text) {
  return transform(text, upstreamWebSha256, [
    ['function P8(e,n,o,s){', 'function P8(e,n,o,s){if(s.allowRemoteImages===false)return l.jsx("span",{className:dt.imageAlt,children:n},o);'],
    ['function $b(e,n,o,s){', 'function $b(e,n,o,s,oasisAllowImages=true){'],
    ['pathImages:s,targets:u', 'pathImages:s,allowRemoteImages:oasisAllowImages,targets:u'],
    ['const z8=j.memo(function({text:n,streaming:o=!1,labels:s,fileMentions:a,pathImages:u,variant:f="body"})', 'const z8=j.memo(function({text:n,streaming:o=!1,labels:s,fileMentions:a,pathImages:u,variant:f="body",allowRemoteImages:oasisAllowImages=true})'],
    ['g=j.useMemo(()=>o?((h.current===null', 'g=j.useMemo(()=>o&&oasisAllowImages!==false?((h.current===null'],
    ['$b(n,s,a,u)),[n,o,s,a,u]);return l.jsx("div",{className:ue(dt.markdown,f==="compact"&&dt.compact),"data-markdown-variant":f==="compact"?f:void 0,children:g})});', '$b(n,s,a,u,oasisAllowImages)),[n,o,s,a,u,oasisAllowImages]);return l.jsx("div",{className:ue(dt.markdown,f==="compact"&&dt.compact),"data-markdown-variant":f==="compact"?f:void 0,children:g})});z8.resourcePolicyVersion=1;'],
  ], 'frontend')
}

export function patchMarkdownDeclaration(text) {
  return transform(text, upstreamDeclarationSha256, [
    ['    variant?: "body" | "compact";', '    variant?: "body" | "compact";\n    /** false suppresses all automatic image rendering and resolver calls. */\n    allowRemoteImages?: boolean;'],
    ['}) => import("react").JSX.Element>;', '}) => import("react").JSX.Element> & { readonly resourcePolicyVersion: 1 };'],
  ], 'Markdown declaration')
}
