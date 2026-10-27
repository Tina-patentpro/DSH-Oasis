import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const {prepareLegacyDraftRecovery}=await import('../legacy-draft-recovery.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function fixture(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'f-legacy-')));mkdirSync(join(root,'workspace-a'));mkdirSync(join(root,'target'))
 const workspace={unit:{name:'workspace',version:2},tables:{workspaces:{A:{path:join(root,'workspace-a'),sessionIds:['session-A']},B:{path:join(root,'target'),sessionIds:['session-B']}}}}
 const paths={workspace:join(root,'workspace.json'),evidence:join(root,'evidence.ax.txt'),file:join(root,'workspace-a','public.md')}
 writeFileSync(paths.workspace,JSON.stringify(workspace));writeFileSync(paths.evidence,'21 row (selected) 新会话\n41 文本输入区 (settable) Description: 原生草稿, Value: PUBLIC_UNSENT\n33 container public.md\n')
 writeFileSync(paths.file,'PUBLIC_FILE_BYTES')
 const spec={schemaVersion:1,sourceRoot:root,workspaceId:'A',sessionId:'session-A',sourceWorkspacePath:join(root,'workspace-a'),expectedDraft:'PUBLIC_UNSENT',workspace:{path:paths.workspace,sha256:hash(readFileSync(paths.workspace))},evidence:[{path:paths.evidence,sha256:hash(readFileSync(paths.evidence))}],target:{workspaceId:'A',sessionId:'session-A',workspacePath:join(root,'target')},attachments:[{name:'public.md',path:paths.file,bytes:17,sha256:hash('PUBLIC_FILE_BYTES'),mediaType:'text/markdown'}]}
 return{root,paths,spec,workspace,update(){writeFileSync(paths.workspace,JSON.stringify(workspace));spec.workspace.sha256=hash(readFileSync(paths.workspace))},close(){rmSync(root,{recursive:true,force:true})}}
}
test('a recovery package reads exact public bytes and keeps source and target files unchanged',()=>{
 const f=fixture();try{const before=readFileSync(f.paths.workspace);const result=prepareLegacyDraftRecovery(f.spec)
 assert.equal(result.workspaceId,'A');assert.equal(result.sessionId,'session-A');assert.equal(result.draft,'PUBLIC_UNSENT');assert.equal(Buffer.from(result.attachments[0].base64,'base64').toString(),'PUBLIC_FILE_BYTES')
 assert.equal(result.attachments[0].lastModified,0);assert.equal(result.receiptPolicy,'discard-and-require-explicit-retry');assert.deepEqual(readFileSync(f.paths.workspace),before);assert.deepEqual(readFileSync(f.paths.file),Buffer.from('PUBLIC_FILE_BYTES'))
 }finally{f.close()}
})
test('same-hash bytes in another workspace do not grant recovery ownership',()=>{
 const f=fixture();try{f.spec.workspaceId='B';assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/ownership/)}finally{f.close()}
})
test('missing or multiply-owned Session is refused before any recovery package is returned',()=>{
 const f=fixture();try{f.workspace.tables.workspaces.A.sessionIds=[];f.update();assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/ownership/)
 f.workspace.tables.workspaces.A.sessionIds=['session-A'];f.workspace.tables.workspaces.B.sessionIds.push('session-A');f.update();assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/ownership/)
 }finally{f.close()}
})
test('changed byte identity or historical evidence is refused',()=>{
 const f=fixture();try{writeFileSync(f.paths.file,'CHANGED_FILE');assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/identity/)
 writeFileSync(f.paths.file,'PUBLIC_FILE_BYTES');writeFileSync(f.paths.evidence,'CHANGED_EVIDENCE');assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/identity/)
 }finally{f.close()}
})
test('a file link or changed target identity cannot migrate foreign bytes',()=>{
 const f=fixture();try{f.spec.target.sessionId='session-B';assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/target/)
 f.spec.target.sessionId='session-A';mkdirSync(join(f.root,'workspace-a','linked'));symlinkSync(f.paths.file,join(f.root,'workspace-a','linked','public.md'));f.spec.attachments[0].path=join(f.root,'workspace-a','linked','public.md');assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/link|workspace/)
 }finally{f.close()}
})
test('historical evidence must contain the actual unsent draft and each selected filename',()=>{
 const f=fixture();try{f.spec.expectedDraft='INVENTED';assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/evidence/)
 f.spec.expectedDraft='PUBLIC_UNSENT';f.spec.attachments[0].name='unobserved.md';assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/evidence|name/)
 }finally{f.close()}
})
test('named orphan storage bytes need an exact owning original, not only the same basename',()=>{
 const f=fixture();try{const item=f.spec.attachments[0],folder=join(f.root,'home/attachments/v1/files',item.sha256.slice(0,2),item.sha256);mkdirSync(folder,{recursive:true});item.originalPath=item.path;item.path=join(folder,'public.md');writeFileSync(item.path,'PUBLIC_FILE_BYTES')
 const result=prepareLegacyDraftRecovery(f.spec);assert.equal(Buffer.from(result.attachments[0].base64,'base64').toString(),'PUBLIC_FILE_BYTES')
 writeFileSync(item.originalPath,'DIFFERENT');assert.throws(()=>prepareLegacyDraftRecovery(f.spec),/identity/)
 }finally{f.close()}
})
