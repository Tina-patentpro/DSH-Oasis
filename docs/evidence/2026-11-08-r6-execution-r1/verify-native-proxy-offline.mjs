import fs from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const root=join(process.cwd(),'.dsh-test/m06-native-business-recovery-20261108-r1')
const release=JSON.parse(fs.readFileSync(join(root,'installation.json'))).current
const app=join(root,'releases',release,'App/DSH Desktop.app/Contents/Resources/app')
const {b:buildDesktopProxyOverlay,x:desktopProxyEnvLookup}=await import(pathToFileURL(join(app,'lib/profile-channel-admission-Vachj3M0.js')))
const proxy=await import(pathToFileURL(join(app,'node_modules/@deepseek-ai/dsh-http-proxy/lib/index.js')))
const results=[]
for(const [name,noProxy]of [['before','localhost,127.0.0.1,::1'],['after','localhost,127.0.0.1,::1,api.deepseek.com']]){
 const snapshot={get:key=>key==='NO_PROXY'?{value:noProxy}:undefined}
 const overlay=buildDesktopProxyOverlay({env:snapshot,probe:{http:'http://127.0.0.1:9',https:'http://127.0.0.1:9'}})
 const releasePolicy=await proxy.installProxyFromEnvironment(desktopProxyEnvLookup(snapshot,overlay.overlay),()=>{})
 try{
  const provider=proxy.proxyRouteFor(new URL('https://api.deepseek.com/anthropic/v1/messages'))
  const unrelated=proxy.proxyRouteFor(new URL('https://example.invalid/'))
  assert.equal(provider.proxied,name==='before')
  assert.equal(unrelated.proxied,true)
  results.push({name,overlay:overlay.overlay,providerProxied:provider.proxied,unrelatedProxied:unrelated.proxied})
 }finally{await releasePolicy()}
}
const result={status:'FIXED_VENDOR_PROXY_ROUTE_OFFLINE_PASS',release,results,networkRequests:0,credentialsRead:0,AppStarted:false,originalRunStillUnknown:true}
fs.writeFileSync(new URL('./native-proxy-offline-proof.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
