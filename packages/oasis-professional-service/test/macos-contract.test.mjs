import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {writebackPrepareResponseSchema} from '../src/workbench-contract.js';
import {isUnifiedFixtureEnvironment,isNativeOfflineEnvironment} from '../src/unified-fixture-environment.js';
const manifest=(target,file)=>({confirmationToken:'synthetic',manifest:{schemaVersion:1,workspaceId:'a',taskId:'task',runId:'run',artifactId:'artifact',relativeDirectory:'.',absoluteTarget:target,expiresAt:'2026-10-11T12:00:00.000Z',files:[
 {relativePath:'产物.md',absolutePath:file,sha256:'a'.repeat(64),mediaType:'text/markdown',sizeBytes:1},
 {relativePath:'receipt.json',absolutePath:target+'/receipt.json',sha256:'b'.repeat(64),mediaType:'application/json',sizeBytes:1}
]}});
test('POSIX Unicode/space absolute writeback paths cross the RPC contract unchanged',()=>{
 const data=manifest('/private/tmp/项目 A','/private/tmp/项目 A/产物.md');
 assert.deepEqual(writebackPrepareResponseSchema.parse(data),data);
});
test('POSIX contract rejects traversal, sibling prefixes, mixed separators and case-mismatched directories',()=>{
 for(const path of ['/private/tmp/项目 A/../secret.md','/private/tmp/项目 AB/产物.md','/private/tmp/项目 A\\secret.md','/private/tmp/项目 a/产物.md','https://example.invalid/file','relative.md']) {
  assert.equal(writebackPrepareResponseSchema.safeParse(manifest('/private/tmp/项目 A',path)).success,false,path);
 }
});
test('legacy normalized Windows writeback manifest remains accepted',()=>{
 const data=manifest('D:\\Project','D:\\Project\\产物.md');data.manifest.files[1].absolutePath='D:\\Project\\receipt.json';
 assert.equal(writebackPrepareResponseSchema.safeParse(data).success,true);
});
test('Mac synthetic admission requires exactly its canonical isolated Home and explicit flag',{skip:process.platform!=='darwin'},()=>{
 const home=fileURLToPath(new URL('../../../.dsh-test/mac-dev/home',import.meta.url));
 assert.equal(isUnifiedFixtureEnvironment({DSH_HOME:home,OASIS_UNIFIED_FIXTURE:'1'}),true);
 assert.equal(isUnifiedFixtureEnvironment({DSH_HOME:home}),false);
 assert.equal(isUnifiedFixtureEnvironment({DSH_HOME:home+'/../home',OASIS_UNIFIED_FIXTURE:'1'}),false);
 assert.equal(isUnifiedFixtureEnvironment({DSH_HOME:home+'-other',OASIS_UNIFIED_FIXTURE:'1'}),false);
 assert.equal(isNativeOfflineEnvironment({DSH_HOME:home,OASIS_NATIVE_OFFLINE:'1'}),true);
});
