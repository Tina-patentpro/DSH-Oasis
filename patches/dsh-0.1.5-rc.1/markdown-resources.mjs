// Candidate-only patch preparation; application files are not modified here.
import { createHash } from 'node:crypto'

export const upstreamSha256 = 'b66c9f456ed2fdd942622ccfea14f8151091047618c00ad7d629e4c442eabe46'

export function patchMarkdownWebBundle(text) {
  if (createHash('sha256').update(text).digest('hex') !== 'e8719e727fee91f681ee1d885c6d204f2309c8a3bee9742825ce526ebe06ef73') throw Error('DSH 0.1.5-rc.1 frontend upstream mismatch')
  const replacements = [
    ['const c=jg(t,s.pathImages);', 'const c=s.allowRemoteImages===false?void 0:jg(t,s.pathImages);'],
    ['function Ng(t,r,i,s){', 'function Ng(t,r,i,s,oasisAllowImages=true){'],
    ['pathImages:s,targets:u', 'pathImages:s,allowRemoteImages:oasisAllowImages,targets:u'],
    ['const w5=I.memo(function({text:r,streaming:i=!1,labels:s,fileMentions:c,pathImages:u})', 'const w5=I.memo(function({text:r,streaming:i=!1,labels:s,fileMentions:c,pathImages:u,allowRemoteImages:oasisAllowImages=true})'],
    ['m=I.useMemo(()=>i?((h.current===null', 'm=I.useMemo(()=>i&&oasisAllowImages!==false?((h.current===null'],
    ['Ng(r,s,c,u)),[r,i,s,c,u]);return a.jsx("div",{className:a1.markdown,children:m})});', 'Ng(r,s,c,u,oasisAllowImages)),[r,i,s,c,u,oasisAllowImages]);return a.jsx("div",{className:a1.markdown,children:m})});w5.resourcePolicyVersion=1;'],
  ]
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error('DSH 0.1.5-rc.1 frontend patch anchor mismatch')
    text = text.replace(before, after)
  }
  return text
}

export function patchMarkdownResources(text) {
  if (createHash('sha256').update(text).digest('hex') !== upstreamSha256) throw Error('DSH 0.1.5-rc.1 Markdown upstream mismatch')
  const replacements = [
    ['const imageSrc = imageSource(url, context.pathImages);', 'const imageSrc = context.allowRemoteImages === false ? void 0 : imageSource(url, context.pathImages);'],
    ['function renderSettled(text, labels, fileMentions, pathImages) {', 'function renderSettled(text, labels, fileMentions, pathImages, allowRemoteImages = true) {'],
    ['streaming: false,\n\t\tlabels,\n\t\tfileMentions,\n\t\tpathImages,', 'streaming: false,\n\t\tlabels,\n\t\tfileMentions,\n\t\tpathImages,\n\t\tallowRemoteImages,'],
    ['const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions, pathImages }) {', 'const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions, pathImages, allowRemoteImages = true }) {'],
    ['if (!streaming) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions, pathImages);', 'if (!streaming || allowRemoteImages === false) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions, pathImages, allowRemoteImages);'],
    ['\t\tpathImages\n\t]);', '\t\tpathImages,\n\t\tallowRemoteImages\n\t]);'],
    ['});\n//#endregion\n//#region lib/types/WebBlock.js', '});\nMarkdownText.resourcePolicyVersion = 1;\n//#endregion\n//#region lib/types/WebBlock.js'],
  ]
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error('DSH 0.1.5-rc.1 Markdown patch anchor mismatch')
    text = text.replace(before, after)
  }
  return text
}
