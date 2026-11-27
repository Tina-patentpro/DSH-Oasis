import {withInstalledLaunchSpec} from './.dsh-test/m06-p4-unknown-update-20261106-r1/control/scripts/f-installed-runtime.mjs';
import {acquireJsonRootOwnership} from './.dsh-test/m06-p4-unknown-update-20261106-r1/control/patches/storage-json-single-owner/ownership.mjs';
import {resolve,join} from 'node:path';
const root=resolve('.dsh-test/m06-p4-unknown-update-20261106-r1');
await withInstalledLaunchSpec(root,async s=>{const owner=await acquireJsonRootOwnership(join(s.dataRoot,'home/storages'));try{console.log(JSON.stringify({installedWriterReacquired:true,providerOwnershipReacquired:true,nativeZeroGeneration:s.nativeZeroGeneration,realCallBudget:s.realCallBudget,current:s.current}))}finally{owner.release()}});
