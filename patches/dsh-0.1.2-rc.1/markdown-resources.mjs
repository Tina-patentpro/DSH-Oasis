// Backward-compatible opt-in policy on the existing native Markdown renderer.
export function patchMarkdownResources(text) {
  const replacements = [
    ['renderImage(node.url, node.alt ?? "", key)', 'renderImage(node.url, node.alt ?? "", key, context.allowRemoteImages)'],
    ['renderImage(definition.url, node.alt ?? "", key)', 'renderImage(definition.url, node.alt ?? "", key, context.allowRemoteImages)'],
    ['function renderImage(url, alt, key) {', 'function renderImage(url, alt, key, allowRemoteImages = true) {'],
    ['const imageSrc = remoteImageUrl(sanitizeUrl(normalizeUri(url)));', 'const imageSrc = allowRemoteImages === false ? void 0 : remoteImageUrl(sanitizeUrl(normalizeUri(url)));'],
    ['function renderSettled(text, labels, fileMentions) {', 'function renderSettled(text, labels, fileMentions, allowRemoteImages = true) {'],
    ['streaming: false,\n\t\tlabels,', 'streaming: false,\n\t\tallowRemoteImages,\n\t\tlabels,'],
    ['const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions }) {', 'const MarkdownText = memo(function MarkdownText({ text, streaming = false, labels, fileMentions, allowRemoteImages = true }) {'],
    ['if (!streaming) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions);', 'if (!streaming || allowRemoteImages === false) {\n\t\t\tstreamRef.current = null;\n\t\t\treturn renderSettled(text, labels, fileMentions, allowRemoteImages);'],
    ['\t\tfileMentions\n\t]);', '\t\tfileMentions,\n\t\tallowRemoteImages\n\t]);'],
    ['});\n//#endregion\n//#region lib/types/WebBlock.js', '});\nMarkdownText.resourcePolicyVersion = 1;\n//#endregion\n//#region lib/types/WebBlock.js'],
    ['* images render directly.', '* images render directly unless allowRemoteImages is false. Safe mode uses\n* settled parsing for each update so cached streaming blocks cannot retain images.'],
  ]
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error('DSH rc.1 Markdown upstream mismatch')
    text = text.replace(before, after)
  }
  return text
}

// rc.1 Web ships an embedded copy of the same component in its fixed Vite entry.
// Updating only the npm component does not change the browser's registered export.
export function patchMarkdownWebBundle(text) {
  const replacements = [
    ['tc(n.url,n.alt??"",i)', 'tc(n.url,n.alt??"",i,o.allowRemoteImages)'],
    ['tc(l.url,n.alt??"",i)', 'tc(l.url,n.alt??"",i,o.allowRemoteImages)'],
    ['function tc(n,i,o){const l=yp(Ku(Wl(n)));', 'function tc(n,i,o,oasisAllowImages=true){const l=oasisAllowImages===false?void 0:yp(Ku(Wl(n)));'],
    ['function Mp(n,i,o){', 'function Mp(n,i,o,oasisAllowImages=true){'],
    ['const c={streaming:!1,labels:i,fileMentions:o,targets:u,', 'const c={streaming:!1,allowRemoteImages:oasisAllowImages,labels:i,fileMentions:o,targets:u,'],
    ['const ic=P.memo(function({text:i,streaming:o=!1,labels:l,fileMentions:u})', 'const ic=P.memo(function({text:i,streaming:o=!1,labels:l,fileMentions:u,allowRemoteImages:oasisAllowImages=true})'],
    ['m=P.useMemo(()=>o?((c.current===null', 'm=P.useMemo(()=>o&&oasisAllowImages!==false?((c.current===null'],
    ['Mp(i,l,u)),[i,o,l,u]);return d.jsx("div",{className:w1.markdown,children:m})});', 'Mp(i,l,u,oasisAllowImages)),[i,o,l,u,oasisAllowImages]);return d.jsx("div",{className:w1.markdown,children:m})});ic.resourcePolicyVersion=1;'],
  ]
  for (const [before, after] of replacements) {
    if (text.split(before).length !== 2) throw Error('DSH rc.1 web Markdown upstream mismatch')
    text = text.replace(before, after)
  }
  return text
}
