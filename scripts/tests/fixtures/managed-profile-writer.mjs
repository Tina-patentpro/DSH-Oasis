import {withManagedWriter} from '../../f-profile-lifecycle.mjs'
await withManagedWriter(process.argv[2],'sdk',async()=>{
 process.send({acquired:true})
 await new Promise(resolve=>process.once('message',()=>resolve()))
})
process.disconnect()
