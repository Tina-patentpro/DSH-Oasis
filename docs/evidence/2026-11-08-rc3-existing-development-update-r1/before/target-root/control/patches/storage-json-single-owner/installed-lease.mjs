/** Admission for the bundled provider. Cooperative process ownership, not an OS security boundary. */
import fs from 'node:fs'
import {join,resolve,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID,createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
const ownPath=fileURLToPath(import.meta.url)
export const installedGateSHA256=()=>createHash('sha256').update(fs.readFileSync(ownPath)).digest('hex')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const failure=(code,message)=>Object.assign(Error(message),{code})
export function canonicalDirectory(root){
 if(typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root||fs.realpathSync(root)!==root||!fs.lstatSync(root).isDirectory())throw Error('canonical installation root required')
 return root
}
export function assertInstalledPath(root,path,{directory=true,deep=false,missing=false}={}){
 canonicalDirectory(root)
 const rel=relative(root,path)
 if(!isAbsolute(path)||rel==='..'||rel.startsWith('..'+sep)||resolve(path)!==path)throw Error('installation path outside root')
 let current=root
 for(const part of rel.split(sep).filter(Boolean)){
  current=join(current,part);let st
  try{st=fs.lstatSync(current)}catch(e){if(e.code==='ENOENT'&&missing)return path;throw e}
  if(st.isSymbolicLink())throw Error('installation path link refused')
  if(current!==path&&!st.isDirectory())throw Error('installation path parent is not directory')
 }
 const st=fs.lstatSync(path)
 if(directory?!st.isDirectory():!st.isFile()||st.nlink!==1)throw Error('installation path type/identity refused')
 if(deep){for(const name of fs.readdirSync(path)){
  const child=join(path,name),s=fs.lstatSync(child)
  if(s.isSymbolicLink()||!s.isDirectory()&&(!s.isFile()||s.nlink!==1))throw Error('installation data descendant link/type refused')
  if(s.isDirectory())assertInstalledPath(root,child,{deep:true})
 }}
 return path
}
export function assertInstalledDataRoots(root){
 for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b'])assertInstalledPath(root,join(root,'data',name),{missing:true})
 for(const name of ['storages','sessions','attachments'])assertInstalledPath(root,join(root,'data/home',name),{missing:true,deep:true})
}
function startTime(pid){
 if(!Number.isSafeInteger(pid)||pid<=0)throw Error('invalid installed lease owner')
 const value=execFileSync('/bin/ps',['-p',String(pid),'-o','lstart='],{env:{PATH:'/usr/bin:/bin',LC_ALL:'C'},encoding:'utf8',timeout:3000}).trim()
 if(!value)throw Error('installed lease owner ended')
 return value
}
function lockFile(path,record){
 const fd=fs.openSync(path,'wx',0o600),identity=fs.fstatSync(fd)
 try{fs.writeFileSync(fd,JSON.stringify(record)+'\n')}catch(error){fs.closeSync(fd);fs.unlinkSync(path);throw error}
 let held=true
 return()=>{
  if(!held)return;held=false;fs.closeSync(fd)
  try{const now=fs.lstatSync(path);if(!now.isSymbolicLink()&&now.dev===identity.dev&&now.ino===identity.ino&&read(path).nonce===record.nonce)fs.unlinkSync(path)}catch{/* foreign/replaced ownership is never removed */}
 }
}
export function acquireInstalledLease(root,role){
 canonicalDirectory(root)
 if(!['desktop','sdk','recovery','maintenance'].includes(role))throw Error('explicit installed writer role required')
 assertInstalledPath(root,join(root,'data'))
 const statePath=join(root,'installation.json')
 const current=fs.existsSync(statePath)?read(assertInstalledPath(root,statePath,{directory:false})).current:null
 const record={schemaVersion:1,root,dataRoot:join(root,'data'),role,pid:process.pid,startTime:startTime(process.pid),nonce:randomUUID(),current,gateSHA256:installedGateSHA256()}
 let outer,inner
 try{outer=lockFile(join(root,'startup.lock'),record);inner=lockFile(join(root,'data/startup.lock'),record)}
 catch(error){outer?.();if(error.code==='EEXIST')throw failure('F_INSTALL_BUSY','installation busy or stale ownership; no writer entered');throw error}
 return Object.freeze({dataRoot:record.dataRoot,env:Object.freeze({DSH_OASIS_INSTALL_ROOT:root,DSH_OASIS_WRITER_NONCE:record.nonce}),release(){inner();outer()}})
}
export function assertInstalledLease(storageRoot,env=process.env){
 const root=env.DSH_OASIS_INSTALL_ROOT,nonce=env.DSH_OASIS_WRITER_NONCE
 if(!root||!nonce)throw Error('installed writer lease required before opening storage')
 canonicalDirectory(root)
 if(storageRoot!==join(root,'data/home/storages'))throw Error('installed lease storage root mismatch')
 const state=read(assertInstalledPath(root,join(root,'installation.json'),{directory:false}))
 const outer=read(assertInstalledPath(root,join(root,'startup.lock'),{directory:false})),inner=read(assertInstalledPath(root,join(root,'data/startup.lock'),{directory:false}))
 if(state.schemaVersion!==1||state.mode!=='OASIS_F_INSTALLED'||state.root!==root||state.gateSHA256!==installedGateSHA256()
  ||outer.schemaVersion!==1||outer.root!==root||outer.dataRoot!==join(root,'data')||outer.nonce!==nonce
  ||outer.current!==state.current||!outer.current||outer.gateSHA256!==state.gateSHA256||JSON.stringify(inner)!==JSON.stringify(outer)
  ||startTime(outer.pid)!==outer.startTime)throw Error('installed lease identity/owner mismatch')
 assertInstalledPath(root,storageRoot,{missing:true,deep:true})
 return Object.freeze({root,current:state.current,role:outer.role})
}
