# F 固定审核版本引用与附件恢复独立审计（首轮）

审计日期：2026-10-27；最终只读检查时点 2026-10-27T07:33:56Z。审计者为用户指定 GPT-6.1-sol/max 独立子代理，未参与本批实现；未另开代理。

**结论：固定审核版本引用的具名无模型子集可接受；附件恢复候选发现两项新增必改 P2，暂不接受附件恢复合同收口。P1=0，P2=2，新增 Minor=0。** 原正常恢复的成功操作保留为局部证据，两项反例不抹除它们；15/15 与 40/40 绿色结果没有覆盖本报告反例。完整 F、旧 FH-A01、专业/用户接受及发布均不关闭。

本报告冻结首轮结论。实施者应另建修复返回/冻结清单和复审记录，不改写本报告或原送审返回/执行清单；下述“需修复”不是允许新增真实调用、上传、发送、费用或分发。

## 1. 范围、身份与独立核验

根目录：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh；分支 `mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`，独立实查一致。

读取根/本项目 AGENTS、本批计划、返回和执行清单、当前状态相关入口、剩余表、原补丁与测试、原始失败/取证材料及固定包原生实现。根与项目 AGENTS 的规划必读 R1 已保留；审计没有新建或修订计划。独立核算 execution.planningIntake 的 14 个现行输入和其快照，均与具名 SHA 一致；这证明其身份没有漂移，不把未全文审阅的其他项目业务计划宣称为新的业务接受。

审计只写本报告。没有启动 Desktop、浏览器或 Host，没有执行 seed/verify-reviewed-fixtures，没有打开业务库服务，没有模型/API/真实上传/发送、提交、推送、安装或分发。运行官方 Electron 仅设置 `ELECTRON_RUN_AS_NODE=1` 作为 Node 解释器；两项反例仅在进程内使用内存 store/纯本地假传输。

| 冻结对象 | SHA256 |
|---|---|
| `docs/evidence/2026-10-27-f-reviewed-reference-attachments-return.md` | `a62aaab36969436bd51ca797ca6dc0b61d49dd2e6c0463a7121d76333a9d9b9c` |
| `docs/evidence/2026-10-27-f-reviewed-reference-attachments-execution.json` | `1ee7273e1de8c65bf5cc2d2c873527b8d5c25c2f9e2239d6eb0fc1bd7619b2d1` |
| `patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs` | `d70e0b7143b68e5febea7170b5bb685ba4fd0a067237713629e367bee90bd0b3` |
| `patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint.mjs` | `b5654d19a823d414525545b95ad723491c007cfc8df650bd219dd53720dfd80e` |
| `scripts/tests/draft-checkpoint.test.mjs` | `291a01e835bdc338e18a8a238fad7fe6f63046d94ca343abc6ef1aba6b5aa5f7` |
| `scripts/tests/conversation-draft-checkpoint.test.mjs` | `8d3783ef574868e94c94a54f262e0e8b6c525857c44732124e40216913f65937` |
| `.local/f-reference-attachments-20261027/admission-R6.json` | `ef3feaf612289069a993718ad33a43187e3c989f2a4b8db45b40626caffa445f` |
| 最终旁置 `conversation/lib/client.js` | `94f825eacb0c6ee03fca8e8dd9407be9b9efa7723450553be25cc24815cc3c1d` |

独立逐成员读取字节并计算 SHA256：执行清单 **174/174** 无缺失/漂移；R6 **183/183** pin 无缺失/漂移。工具脚本从官方原 SHA `6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c` 重新在内存执行精确转换，与最终旁置 client **逐字相等**。候选包自有版本 `0.2.0-rc.2.oasis-draft.1`；未将该限定符当成基础 DSH 升级。

独立比较 R5/R6 pin：差异恰为 `launch-R5.mjs`、`launch-R6.mjs` 及 `.local/.../probe/lib/client.js`，全部产品文件相同。初始 baseline 的 3542 个既有文件无缺失，只有已声明的他人 `AGENTS.md` 规划条款变化；本批保留的 M06 源码、主锁/活跃 lib、R47 client及其他既有文件没有新增漂移。九组实际启动/退出 JSON 与 execution 的 PID、时点、退出信息逐项相符，均 code=0/signal=null；R1—R3 的装配/恢复失败仍保留为失败证据，退出0不使其转为成功。审计时 57563 无监听（`lsof` 退出1/无输出），startup.lock 不存在。

## 2. 必改 P2：恢复文件的明确重试要求可被 Workspace 切换绕过

编号 **F-DR-A01**。

位置：`patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint.mjs:14-19` 创建与普通附件相同的 `{kind:"file",id,file}`，仅把 fileUploads 置为 error。最终 client 的 `rebindDraftFiles`（3662—3665）会对每个 file 无条件 `beginFileUpload`；同一最终文件的 18366—18379 是实际 `selectWorkspace → openWorkspace → rebindDraftFiles` 接线。

因此，恢复后的通用文件只要经原生 Workspace 选择器携带到另一个会话，就绕过“明确重新上传”并启动原生文件上传流程。它不是单纯理论调用：该方法具有实际产品调用方。审计没有在 GUI 上触发它，也没有实发上传；下面在**最终精确产品 class**、实际 Cordis/Store 与纯本地假传输中复现。

在项目根目录执行（只读代码、仅进程内对象，无文件/网络写入）：

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --input-type=module - <<'JS'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
const root=process.cwd()
const sdk=createRequire(root+'/.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/Resources/app/package.json')
const cordis=await import(pathToFileURL(sdk.resolve('@deepseek-ai/cordis')))
const store=await import(pathToFileURL(root+'/.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/store/lib/index.js'))
const text=readFileSync('.local/f-reference-attachments-20261027/conversation/lib/client.js','utf8')
const start=text.indexOf('//#region lib/types/client/service.js'),end=text.indexOf('//#endregion',start)
const Controller=runInNewContext(text.slice(start,end)+'\nConversationController',{
 _deepseek_ai_cordis:cordis,_deepseek_ai_dsh_client_store:store,
 randomUUID,URL,File,Blob,AbortController,setTimeout,clearTimeout,
})
const ctx=new cordis.Context(),calls=[]
ctx.provide('fileUpload',{async upload(session,file){
 calls.push({session,name:file.name,body:await file.text()})
 return{ok:true,value:{receiptId:'AUDIT_LOCAL_FAKE_RECEIPT',file:{attachmentId:'AUDIT_FAKE',name:file.name,bytes:file.size}}}
}})
const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
try{
 const [id]=service.restoreCheckpointAttachments([{kind:'file',file:new File(['AUDIT_PUBLIC_BYTES'],'audit-public.md',{type:'text/markdown'})}])
 const before={calls:calls.length,status:service.fileUploads.getSnapshot()[id].status}
 service.rebindDraftFiles('audit-other-workspace-session',[id])
 for(let i=0;i<20&&service.fileUploads.getSnapshot()[id].status==='uploading';i++)await new Promise(setImmediate)
 const after={calls,status:service.fileUploads.getSnapshot()[id].status}
 assert.equal(before.calls,0);assert.equal(before.status,'error')
 assert.equal(calls.length,1);assert.equal(after.status,'ready')
 console.log(JSON.stringify({before,after,externalRequests:0,retryFileUploadCalls:0}))
}finally{await ctx.fiber.dispose()}
JS
```

新鲜结果：退出 **0**；before=`{"calls":0,"status":"error"}`；after 的 calls 含 `audit-other-workspace-session / audit-public.md / AUDIT_PUBLIC_BYTES` 一条，status=`ready`。未调用 `retryFileUpload`。`externalRequests=0` 指本审计假传输没有网络请求，不把它宣称成实际互联网外泄；缺陷是恢复候选允许原生上传入口自动执行，违反本批不自动重传合同。

修复验收要求：恢复文件在所有实际可达的原生携带/切换路径上保持需人工重试，只有明确重试才创建新传输/receipt；保留正常新文件的既有语义。现有测试仅验证 restore 不上传与 retry 会上传，没有覆盖 rebind 路径。

## 3. 必改 P2：UUID 故障保留有效旧 fence，删除的图片会恢复

编号 **F-DR-A02**。

位置：`patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs:69-83`。`crypto.randomUUID()` 在 `fences.set` 之前执行；它抛错时仅将**本次绑定的内存** conflicted 置 true 并显示“重启恢复已暂停”。此前已提交的 generation/fence 仍然相等。重开后 93—108 行会把该旧记录视为有效；如果文字未改、只移除附件，原生文字镜像与旧 saved.draft 相同，冲突守卫不会阻止旧图片复活。

这属于本批已明确测试并声称处理的 random generation 故障，不是“全部存储不可写”排除项：下例 fences/store 全部可正常读写，只有 UUID 抛错。

在项目根目录执行（仅进程内 store，不读写 Profile/证据/业务库）：

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --input-type=module - <<'JS'
import assert from 'node:assert/strict'
import {bindDraftCheckpoint} from './patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs'
const key=JSON.stringify(['w','s'])
const records=new Map([[key,{schemaVersion:1,workspaceId:'w',sessionId:'s',generation:'old-valid-generation',
 draft:'PUBLIC_UNSENT_TEXT',occurrences:[],attachments:[{kind:'image',file:new File(['PUBLIC_IMAGE_BYTES'],'public.png',{type:'image/png'})}]}]])
const markers=new Map([[key,'old-valid-generation']]),notices=[]
const store={async get(k){return records.get(k)},async put(k,v){records.set(k,v)}}
const fences={get:k=>markers.get(k),set:(k,v)=>markers.set(k,v)}
function live(){
 const subscribers=new Set()
 let input={draft:'PUBLIC_UNSENT_TEXT',draftRev:0,phase:'plain',occurrences:[],attachmentIds:[]},restores=0
 const shell={state:{getSnapshot:()=>input,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn)}},
  notify(level,message){notices.push(message)},
  restoreCheckpoint(draft,occurrences,ids,rev){
   if(input.draftRev!==rev)return false
   restores++;input={...input,draft,occurrences,attachmentIds:ids,draftRev:rev+1}
   for(const fn of subscribers)fn();return true
  }}
 const conversation={restoreCheckpointAttachments(values){return values.map((a,i)=>'restored-'+i)},
  resolveDraftAttachments(ids){return ids.map(()=>records.get(key).attachments[0])},releaseDraftAttachment(){}}
 const handle=bindDraftCheckpoint({sessionId:'s',workspaceId:'w',shell,conversation,currentWorkspace:()=> 'w',store,fences})
 return{handle,get:()=>input,restores:()=>restores,
  remove(){input={...input,attachmentIds:[],draftRev:input.draftRev+1};for(const fn of subscribers)fn()}}
}
const one=live();await one.handle.ready;assert.equal(one.get().attachmentIds.length,1)
const original=crypto.randomUUID;crypto.randomUUID=()=>{throw Error('AUDIT_RANDOM_UNAVAILABLE')}
try{one.remove();await one.handle.flush()}finally{crypto.randomUUID=original}
assert.equal(one.get().attachmentIds.length,0);one.handle.dispose()
const two=live();await two.handle.ready;assert.equal(two.get().attachmentIds.length,1)
console.log(JSON.stringify({afterRemovalAttachments:0,oldFenceStillValid:markers.get(key)===records.get(key).generation,
 notices,afterColdBindAttachments:two.get().attachmentIds.length,restores:two.restores(),diskWrites:0}))
two.handle.dispose()
JS
```

新鲜结果：退出 **0**；`afterRemovalAttachments=0`，`oldFenceStillValid=true`，notice 为“草稿附件变更未能保存；请保留原材料，重启恢复已暂停。”，但 `afterColdBindAttachments=1/restores=1`。第二次 bind 模拟同一正常文字镜像的新会话生命周期，未宣称已经实测该故障下 Desktop 重启。

修复验收要求：在 fence 存储可写时，UUID 失败也不能让旧 checkpoint 继续有效；删除/清空后重新绑定不得恢复旧附件。存储本身不可写的排除边界应继续诚实保留。现有第11项故障测试只断言不抛异常和有提示，未检查 fence 失效及再次恢复。

## 4. 新鲜独立测试和装配检查

下列命令均在项目根目录由审计者重跑，退出 **0**，没有 skip。无整包 verify、构建、真实来源或运行验收的扩张结论。

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --version
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --version
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap packages/oasis-professional-service/test/v340-native-handoff.test.mjs packages/oasis-professional-service/test/conversation-draft-bridge.test.mjs packages/oasis-professional-service/test/native-composer-input.test.mjs
tools/node-v24.21.0-darwin-arm64/bin/node .local/f-reference-attachments-20261027/launch-R6.mjs --check
```

结果：工具 Node **24.21.0 / 15通过、0失败、0跳过**；官方 Electron 内置 Node **24.18.1 / 15通过、0失败、0跳过**；既有引用合同 **40通过、0失败、0跳过**。最后 R6 `--check` 输出 `NO_MODEL_PREFLIGHT_ONLY/pinnedFiles=183/modelAndAccountAdaptersDisabled=true/originalAdmissionUnchanged=true/realCallBudget=0`。未用 `--start`。

测试证明精确包的转换可解析、拒绝输入漂移/重复补丁、普通成功恢复、晚到/异项目/销毁保护、generation 不匹配拒绝、配额失败提示、32MiB/16件边界和显式本地假传输重试等局部合同。它们没有证明 F-DR-A01/A02 已满足；两项反例以不修改任何测试/源码的独立脚本得到。

原失败日志也已读取：初始8项缺能力 RED；random 故障修正夹具后11pass/1fail；首次 schemastery 离线解析失败和缺锁失败均保留，后续精确 link/固定 pnpm/冻结锁物化日志存在。后补原生 class 特征测试没有被记作全部先 RED。

## 5. 可接受的固定审核版本引用子集

普通/长稿均为公开合成 executor 写入隔离库；共2次 synthetic dispatch，不是模型或专业 API 产物。独立审阅 seed/verify 脚本和原输出，实际 SDK/业务服务对两稿各6种 workspace/task/run/version/hash/revision 变造拒绝，合计12次；脚本执行前后业务记录逐字不变断言成立。审计依要求未重跑会写出新 proof 的脚本。

独立重算冻结投影全文长度/UTF8/SHA，并与实际公开 `useInput` AX 摘要及保存原件比较：

| 对象 | 原生投影字符/UTF8字节 | 原生投影 SHA256 | 正文 SHA256 |
|---|---|---|---|
| 普通 | 6797 / 8161 | `a9cd61a86507b7bf3dda507bb7bfbbcaaabfb8e84e15c6d67cca4161ccc6ef58` | `6905220170ebf0e9a8c2d1acfac2c0c4dc47008d6b3b19e97c6b75619fec7432` |
| 长稿 | 126692 / 127894 | `1ea283cfda8194abe88ab5c2667af0bf596f79696509538974ea24bf38cc85e2` | `a35c47e9c259a8e5f6e18f2420b572f00b639a5276d630d17526a2db54c4c19b` |

原始 `.local/f-reference-attachments-20261027/fixed-ordinary-R5-delivered.ax.txt`、`fixed-ordinary-R5-after-restart.ax.txt`、`fixed-long-R6-before-report.ax.txt`、`fixed-long-R6-after.ax.txt:263` 提供对应完整哈希摘要；R6 before/after 的正文截图、输入及同配对正常启动/退出记录共同支持长稿正常重启保持。审计实际查看了 `attachments-R4-after.png`、`fixed-ordinary-R5-before.png` 和 `fixed-long-R6-after.png`；不是只读作者完成声明。

普通稿实际工作台显示合成验收/已审核，原生已有草稿时引用按钮禁用；只准备草稿，未发送。普通稿保存原件7884字节/正文 SHA 一致。后续只改本批当前文件，`fixed-current-file-warning-R5.ax.txt` 明确显示“文件内容已变化，原审核结论不适用于当前文件”；只读 SDK 记录当前 SHA `34d9c4825909ab3137c7231ed2da08c2bdd014464d332ae0c2b5834c02217251`，固定投影仍是原 SHA。该子集符合固定审核版本与当前文件分开处理的合同。

150000/150001 仅获40项既有实现合同中的精确边界验证；**实际 Desktop 长稿是126692字符**。不把合成测试的审核按钮当作专业/用户接受，不声称模型实际读到正文、完整申请文件或费用运行通过。

## 6. 附件成功证据、失败保全与其限度

官方 `package-overlay-Ca250500.js:97` 确实采用“Profile版本严格高于安装版本才选Profile”；R3公开探针 `patch=false`、WorkspaceAPI/binding/owner正常，印证同版本候选未选中，而不是引用已修复。R2显式入口也不能覆盖这个失败。R4自有补丁版本被选择，公开 `patch=true`，不能将R1—R3重签成功。

R4图片及两个结构化引用正常重启的截图/AX可信；B已有会话空、返回A保持也有原AX。R5首次载入能观察原图片和引用；临时观察组件的 useInput 输出含 source/ref/offset/length/clipboardText，不把纯文字 `@路径` 冒充结构化芯片。7858字节PNG与本补丁 IDB Blob SHA `0785a2c47d273ca87674eebd924a53b52664d5e919729126fd59b3211e38690b` 对应，原件及取证副本均冻结。

浏览器 `public-blob.md / text/markdown / lastModified12345 / 26字节`，SHA `9e6504737138b546d2f9ff79ca4507e0021652a1e534d90a0f35fba4da69e4ec` 的完整 R6 `F BLOB PROOF` 输出及观察组件源码，支持“真实浏览器 IndexedDB＋实际原生 Controller，无旧receipt、直接恢复零上传”这一特征。它使用独立 Cordis Context/新建测试键，不是旧真实上传附件迁移、Desktop整条Blob重传验收或旧私有store读取。该直接恢复特征通过与 A01 的另一条后续上传路径缺陷可以同时成立。

R5实际清空/移除后，在正常成功保存路径后续没有复活；不能以此覆盖 A02 的 UUID 故障反例。恢复引用和图片的成功局部仍保留，但附件候选须修复两项 P2 才能接受当前所述恢复合同。

## 7. 继续保留的未验证范围

- 旧孤立 File/occurrence/Session/receipt 没有历史归属元数据，FH-A01 保持历史失败；不按名称/hash猜配、删除或静默迁移。
- 未提交事务即崩溃、全部存储不可写/配额、强杀、多Renderer、跨平台/跨版本、文件清理的完整恢复不受本报告接受。A02 不是用这些排除项回避的同一问题。
- 超150000投影的固定文件引用、原生模型/API UNKNOWN、实际模型正文读取、真实Blob重新上传、专业/用户接受、普通默认入口及分发强制装配仍缺。
- 原有协作式JSON后端要求所有写入者使用同配对组件，旧无保护Host可绕过；本批没有把它升格为全局保证。
- 完整F、U1/D1、新版API无损映射、G→H→阶段6及签名发行/升级恢复的顺序和原门继续有效。

无新增产品 UI/业务规则/Agent框架的源码证据成立：公开 `conversation.input.right` 列表槽观察组件仅在 `.local`，业务源码/主锁/活跃lib未变。适配器禁用、代理和零预算不能被表述为OS全网审计；本审计没有实发网络请求。

首轮交接：**引用无模型子集接受；附件恢复需 F-DR-A01、F-DR-A02 两项定向修复与独立复审。** 本报告不修改原冻结返回的待审状态，准确状态由新报告及既有当前入口接续。
