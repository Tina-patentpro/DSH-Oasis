import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {mkdtempSync,realpathSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import * as recovery from '../src/m06-native-business-recovery.js'
import * as host from '../src/index.js'
const hash=x=>createHash('sha256').update(x).digest('hex')
test('recovery loader requires actual installed lease, trusted policy and paired source guards',async t=>{
 assert.equal(typeof recovery.loadNativeBusinessRecoveryScope,'function')
 const root=realpathSync(mkdtempSync(join(tmpdir(),'oiw-recovery-install-'))),id='a'.repeat(64),release=join(root,'releases',id)
 t.after(()=>fs.rm(root,{recursive:true,force:true}))
 const names=['src/index.js','src/workbench-rpc.js','src/workbench-connection.js','src/m06-native-business-recovery.js','src/v340-runtime-contract.js','lib/client.js']
 const guards={}
 for(const f of names){const p=join(release,'components/c3',f);await fs.mkdir(resolve(p,'..'),{recursive:true});await fs.writeFile(p,'guarded '+f);guards[f]=hash(readFileSync(p))}
 for(const name of ['data/home/storages','data/workspace-a','data/workspace-b','control/patches/storage-json-single-owner'])await fs.mkdir(join(root,name),{recursive:true})
 const gate=join(root,'control/patches/storage-json-single-owner/installed-lease.mjs');await fs.copyFile(resolve('../../patches/storage-json-single-owner/installed-lease.mjs'),gate)
 const gateHash=hash(readFileSync(gate))
 await fs.writeFile(join(root,'installation.json'),JSON.stringify({schemaVersion:1,mode:'OASIS_F_INSTALLED',root,current:id,gateSHA256:gateHash,controlFiles:{'patches/storage-json-single-owner/installed-lease.mjs':gateHash}}))
 const scope={schemaVersion:1,policy:'m06-native-business-recovery-v1',root,workspaceId:'test-authority',workspacePath:join(root,'data/workspace-a'),taskId:'task',runId:'run',inputSha256:'b'.repeat(64)}
 const policy={schemaVersion:1,policy:scope.policy,archiveSHA256:'c'.repeat(64),budget:{model:0,api:0,upload:0,payment:0},guardedFiles:guards,scope}
 const template=join(release,'profile-template.json');await fs.writeFile(template,JSON.stringify({components:{'oasis-professional-service':'components/c3'},nativeBusinessRecovery:policy}))
 const api=await import(pathToFileURL(gate).href),lease=api.acquireInstalledLease(root,'sdk');t.after(()=>lease.release())
 const env={...lease.env,OASIS_NATIVE_BUSINESS_RECOVERY:'1'},moduleFile=join(release,'components/c3/src/m06-native-business-recovery.js')
 assert.deepEqual(await recovery.loadNativeBusinessRecoveryScope({env,moduleFile}),scope)
 await assert.rejects(recovery.loadNativeBusinessRecoveryScope({env:{...env,OASIS_NATIVE_ZERO_GENERATION:'1'},moduleFile}))
 await assert.rejects(recovery.loadNativeBusinessRecoveryScope({env:{...env,DSH_OASIS_WRITER_NONCE:'wrong'},moduleFile}))
 await fs.writeFile(join(release,'components/c3/src/workbench-rpc.js'),'changed')
 await assert.rejects(recovery.loadNativeBusinessRecoveryScope({env,moduleFile}))
})
test('dedicated recovery Host entry fails closed without installation and never probes model or credentials',async()=>{
 assert.equal(typeof host.applyM06NativeBusinessRecovery,'function')
 let touches=0;const ctx=new Proxy({},{get(){touches++;throw Error('should validate installation first')}})
 const before=process.env.OASIS_NATIVE_BUSINESS_RECOVERY
 process.env.OASIS_NATIVE_BUSINESS_RECOVERY='1'
 try{await assert.rejects(host.applyM06NativeBusinessRecovery(ctx,{}));assert.equal(touches,0)}
 finally{if(before===undefined)delete process.env.OASIS_NATIVE_BUSINESS_RECOVERY;else process.env.OASIS_NATIVE_BUSINESS_RECOVERY=before}
})
test('package consumers can resolve the dedicated recovery entry without credential injection',async()=>{
 const entry=await import('oasis-professional-service/m06-native-business-recovery')
 assert.equal(entry.apply,host.applyM06NativeBusinessRecovery)
 assert.ok(!entry.inject.includes('credentials'));assert.ok(!entry.inject.includes('llm'))
})
