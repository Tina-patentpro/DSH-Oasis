import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const error = code => Object.assign(new Error('PDF材料准备未完成；原文件保留。'), {code})
const keys = (value, names) => value && typeof value==='object' && !Array.isArray(value)
  && Object.keys(value).length===names.length && names.every(name=>Object.hasOwn(value,name))
const validText = value => typeof value==='string' && value.isWellFormed() && !/[\0\r]/u.test(value)

// A worker declaration is checked for consistency, never accepted as proof of sandbox
// qualification. A trusted, qualified Host launcher must enforce the actual policy.
function verifyResult(raw, input) {
  try {
    const r=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))
    if(!keys(r,['body','rawSHA256','textSHA256','locations','pages','objects','decodedBytes','parser','isolation'])
      || !validText(r.body) || !r.body.trim() || r.body.length>300000 || Buffer.byteLength(r.body)>1048576
      || r.rawSHA256!==digest(input) || r.textSHA256!==digest(r.body) || r.parser!=='pypdf/6.10.0'
      || !Number.isSafeInteger(r.pages) || r.pages<1 || r.pages>100
      || !Number.isSafeInteger(r.objects) || r.objects<1 || r.objects>10000
      || !Number.isSafeInteger(r.decodedBytes) || r.decodedBytes<0 || r.decodedBytes>16777216
      || !Array.isArray(r.locations) || r.locations.length!==r.pages
      || Buffer.byteLength(JSON.stringify(r.locations))>65536) throw error()
    let offset=0
    for(const [i,p] of r.locations.entries()) {
      if(!keys(p,['locator','startUTF16','endUTF16']) || !keys(p.locator,['kind','page'])
        || p.locator.kind!=='pdf-page' || p.locator.page!==i+1 || p.startUTF16!==offset
        || !Number.isSafeInteger(p.endUTF16) || p.endUTF16<=offset || p.endUTF16>r.body.length
        || !validText(r.body.slice(offset,p.endUTF16)) || !r.body.slice(offset,p.endUTF16).trim()
        || (i<r.pages-1 && r.body[p.endUTF16]!=='\n')) throw error()
      offset=p.endUTF16+(i<r.pages-1?1:0)
    }
    if(offset!==r.body.length) throw error()
    const expected={mechanism:'seccomp-bpf-aarch64-v1',open:'EPERM',socket:'EPERM',exec:'EPERM',clone:'EPERM',
      memoryMax:268435456,memorySwapMax:0,pidsMax:1,kernelAlarmSeconds:5}
    if(!keys(r.isolation,Object.keys(expected)) || Object.entries(expected).some(([k,v])=>r.isolation[k]!==v)) throw error()
    return r
  } catch { throw error('V340_PDF_INVALID_RESULT') }
}

// Internal Host seam only: launch() is synchronous and returns {child,terminate,reclaim}.
// child is an already spawned stdio worker. terminate() must stop its full process/container
// scope; reclaim() must verify removal, including startup/import failures. No paths, argv,
// credentials or caller-provided approval enter this seam. No default/unconfined launcher.
// launch must not throw after allocating resources; return a reclaimable job for failed starts.
// Not mounted in production until the selected launcher/distribution passes U1.
export function createPdfExtractionSession({launch,now=()=>performance.now()}={}) {
  if(typeof launch!=='function' || typeof now!=='function') throw new TypeError('Trusted PDF launcher required')
  const deadline=now()+15000
  let busy=false,unreclaimed=false
  return {
    async extract(source,{signal}={}) {
      if(unreclaimed) throw error('V340_PDF_RECLAIM_FAILED')
      if(busy) throw error('V340_EXTRACTION_BUSY')
      if(signal?.aborted) throw error('V340_EXTRACTION_CANCELLED')
      if(!(source instanceof Uint8Array) || source.byteLength>1048576) throw error('V340_EXTRACTION_LIMIT')
      const input=Buffer.from(source)
      if(input.subarray(0,5).toString('ascii')!=='%PDF-') throw error('V340_PDF_INVALID_RESULT')
      const remaining=deadline-now()
      if(!Number.isFinite(remaining) || remaining<=0) throw error('V340_EXTRACTION_TIMEOUT')
      const workerDeadline=now()+Math.min(5000,remaining)
      busy=true
      try {
        return await new Promise((resolve,reject)=>{
          let job,child,timer,closeTimer,closed=false,finished=false,failure=null,termination=Promise.resolve()
          const buffers=[],counts={stdout:0,stderr:0}
          const off=()=>signal?.removeEventListener('abort',abort)
          const bounded=async action=>{
            let guard
            try { await Promise.race([Promise.resolve().then(action),new Promise((_,no)=>{
              guard=setTimeout(()=>no(error('V340_PDF_RECLAIM_FAILED')),1000)
            })]) } finally {clearTimeout(guard)}
          }
          const finish=async(code)=>{
            if(finished)return
            finished=true;clearTimeout(timer);clearTimeout(closeTimer);off()
            try {
              await bounded(()=>termination)
              await bounded(()=>job.reclaim())
            } catch {unreclaimed=true;reject(error('V340_PDF_RECLAIM_FAILED'));return}
            if(failure==='V340_PDF_RECLAIM_FAILED')unreclaimed=true
            if(failure){reject(error(failure));return}
            if(now()>workerDeadline || now()>=deadline){reject(error('V340_EXTRACTION_TIMEOUT'));return}
            if(code!==0){reject(error('V340_EXTRACTION_FAILED'));return}
            try {resolve(verifyResult(Buffer.concat(buffers),input))} catch(e){reject(e)}
          }
          const stop=code=>{
            if(finished || failure)return
            failure=code;clearTimeout(timer);off()
            termination=Promise.resolve().then(()=>job.terminate())
            // Attach immediately so a rejecting termination cannot become unhandled.
            termination.catch(()=>{})
            if(!closed) closeTimer=setTimeout(()=>{
              failure='V340_PDF_RECLAIM_FAILED';void finish(null)
            },1000)
          }
          const abort=()=>stop('V340_EXTRACTION_CANCELLED')
          try {
            job=launch()
            child=job.child
            if(typeof job.terminate!=='function' || typeof job.reclaim!=='function'
              || !child?.stdin?.end || !child?.stdout?.on || !child?.stderr?.on || !child?.once) throw error()
            child.once('close',code=>{closed=true;void finish(code)})
            child.once('error',()=>stop('V340_EXTRACTION_FAILED'))
            child.stdin.on('error',()=>stop('V340_EXTRACTION_FAILED'))
            for(const [name,limit] of [['stdout',2097152],['stderr',16384]]) {
              child[name].on('error',()=>stop('V340_EXTRACTION_FAILED'))
              child[name].on('data',chunk=>{
                if(finished || failure)return
                const length=Buffer.byteLength(chunk)
                if(counts[name]+length>limit){stop('V340_EXTRACTION_LIMIT');return}
                counts[name]+=length
                if(name==='stdout')buffers.push(Buffer.from(chunk))
              })
            }
            timer=setTimeout(()=>stop('V340_EXTRACTION_TIMEOUT'),Math.min(5000,remaining))
            signal?.addEventListener('abort',abort,{once:true})
            if(signal?.aborted)abort()
            if(!failure)child.stdin.end(input)
          } catch {
            if(job && typeof job.terminate==='function' && typeof job.reclaim==='function')stop('V340_EXTRACTION_FAILED')
            else {unreclaimed=true;finished=true;clearTimeout(timer);off();reject(error('V340_EXTRACTION_UNAVAILABLE'))}
          }
        })
      } finally {busy=false}
    },
  }
}
