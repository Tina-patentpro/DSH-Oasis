// Temporary acceptance fixture only. No routes, body/header reads or transport changes.
import {subscribe,unsubscribe} from 'node:diagnostics_channel'
export function observeRecoveryUploads({port,write}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('explicit listening port required')
 if(typeof write!=='function')throw Error('evidence writer required')
 let requests=0,binaryUploadStarts=0,closed=false
 const record=(kind,extra={})=>write({kind,atUTC:new Date().toISOString(),requests,binaryUploadStarts,...extra})
 const observe=({request,server})=>{
  if(closed||server.address()?.port!==port)return
  // Query strings may carry identifiers. Never include them or arbitrary paths in evidence.
  const binary=request.method==='POST'&&new URL(request.url??'/','http://localhost').pathname==='/api/session/uploadFileBinary'
  requests++;if(binary)binaryUploadStarts++
  record('request',{binary,method:request.method})
 }
 subscribe('http.server.request.start',observe)
 record('subscribed')
 return()=>{if(closed)return;closed=true;unsubscribe('http.server.request.start',observe);record('disposed')}
}
