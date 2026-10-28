import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {join,dirname,relative} from 'node:path'
import {tmpdir} from 'node:os'
const api=await import('../f-installed-bundle.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
function source(t){
 assert.equal(typeof api.projectRuntimeComponent,'function','fixed runtime component projection must exist')
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'f-bundle-project-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 const from=join(root,'source'),to=join(root,'payload/components/business'),app=join(root,'fixed-app'),destApp=join(root,'payload/App/DSH Desktop.app');fs.mkdirSync(join(from,'src'),{recursive:true});fs.mkdirSync(join(root,'payload'),{recursive:true});fs.mkdirSync(app)
 fs.writeFileSync(join(from,'package.json'),JSON.stringify({name:'oasis-professional-service',version:'0.0.1',private:true,type:'module',main:'src/index.js',files:['src','lib','cordis.patch.yml'],devDependencies:{fixed:'link:'+app+'/node_modules/fixed'}}))
 fs.writeFileSync(join(from,'src/index.js'),'export const publicFixture=true\n');fs.writeFileSync(join(from,'pnpm-lock.yaml'),'PUBLIC old materialization')
 return{root,from,to,app,destApp,relocations:[[from,to],[app,destApp]]}
}
test('runtime projection excludes old daily-App dependency links and preserves original bytes',t=>{
 const h=source(t),outside=join(h.root,'dailyApp');fs.mkdirSync(outside);fs.writeFileSync(join(outside,'public.txt'),'PUBLIC not approved dependency')
 fs.symlinkSync(outside,join(h.from,'node_modules'));const before=fs.readFileSync(join(h.from,'package.json'))
 api.projectRuntimeComponent({source:h.from,target:h.to,relocations:h.relocations})
 assert.deepEqual(fs.readFileSync(join(h.from,'package.json')),before);assert.equal(fs.readlinkSync(join(h.from,'node_modules')),outside)
 assert.equal(fs.existsSync(join(h.to,'node_modules')),false);assert.equal(fs.existsSync(join(h.to,'pnpm-lock.yaml')),false)
 assert.equal(fs.readFileSync(join(h.to,'src/index.js'),'utf8'),'export const publicFixture=true\n')
 const pkg=JSON.parse(fs.readFileSync(join(h.to,'package.json'),'utf8'));assert.equal(pkg.devDependencies.fixed,'link:'+relative(h.to,h.destApp)+'/node_modules/fixed')
})
test('runtime projection refuses unbound local dependencies and external resource links before creating output',t=>{
 const h=source(t),pkg=JSON.parse(fs.readFileSync(join(h.from,'package.json'),'utf8'));pkg.devDependencies.fixed='file:/unbound-public';fs.writeFileSync(join(h.from,'package.json'),JSON.stringify(pkg))
 assert.throws(()=>api.projectRuntimeComponent({source:h.from,target:h.to,relocations:h.relocations}),/unbound|dependency/);assert.equal(fs.existsSync(h.to),false)
 delete pkg.devDependencies;fs.writeFileSync(join(h.from,'package.json'),JSON.stringify(pkg));fs.symlinkSync(h.app,join(h.from,'src/external'))
 assert.throws(()=>api.projectRuntimeComponent({source:h.from,target:h.to,relocations:h.relocations}),/link/);assert.equal(fs.existsSync(h.to),false)
})
test('bundle builder requires an explicit reviewed source2 release and never selects latest by name',async t=>{
 const h=source(t);assert.equal(typeof api.buildFInstallationBundle,'function')
 await assert.rejects(()=>api.buildFInstallationBundle({managedRoot:h.from,out:join(h.root,'unselected')}),/explicit|release/)
 assert.equal(fs.existsSync(join(h.root,'unselected')),false)
})
test('installed Sidebar binds its explicit payload entry without duplicating Desktop-owned conversation',()=>{
 assert.equal(typeof api.bindInstalledClientEntries,'function')
 const old=[{id:'ui-conversation',name:'@OASIS_RELEASE_ROOT@/components/c6/lib/index.js'},{id:'desktop-shell',config:{port:57583}}]
 const before=structuredClone(old),out=api.bindInstalledClientEntries(old,{'dsh-better-sidebar':'components/c2','@deepseek-ai/dsh-client-ui-conversation':'components/c6'})
 assert.deepEqual(old,before)
 for(const [id,name,index]of [['better-sidebar','dsh-better-sidebar',2]]){
  assert.deepEqual(out.find(x=>x.id===id),{id,name,disabled:true})
  assert.equal(out.flatMap(x=>x.insert??[]).find(x=>x.id==='oasis-installed-'+id)?.name,'@OASIS_RELEASE_ROOT@/components/c'+index+'/lib/index.js')
 }
 assert.deepEqual(out.find(x=>x.id==='ui-conversation'),{id:'ui-conversation',name:'@deepseek-ai/dsh-client-ui-conversation'})
 assert.equal(out.flatMap(x=>x.insert??[]).filter(x=>/conversation/.test(x.id)).length,0)
})
