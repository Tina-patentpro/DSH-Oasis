// Post-exit ownership readmission only; no App/Host or business backend is opened.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {join,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const evidence=dirname(fileURLToPath(import.meta.url))
const auth=JSON.parse(fs.readFileSync(join(evidence,'authorization.json'),'utf8'))
const root=auth.root
const {withInstalledWriter}=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const {acquireJsonRootOwnership}=await import(pathToFileURL(join(root,'control/patches/storage-json-single-owner/ownership.mjs')).href)
const result=await withInstalledWriter(root,'maintenance',async report=>{
 assert.equal(report.current,auth.bundleSHA256)
 assert.equal(report.realCallBudget,0)
 const owner=await acquireJsonRootOwnership(join(root,'data/home/storages'))
 try{return {current:report.current,writerReacquired:true,providerReacquired:true,AppOrHostStarted:false}}
 finally{owner.release()}
})
assert.equal(fs.existsSync(join(root,'startup.lock')),false)
assert.equal(fs.existsSync(join(root,'data/startup.lock')),false)
assert.equal(fs.existsSync(join(root,'data/home/storages/oasis_workbench.json')),false)
fs.writeFileSync(join(evidence,'lease-readmission.json'),JSON.stringify({...result,writerAndProviderReleased:true,businessRecordCreated:false},null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({...result,writerAndProviderReleased:true}))
