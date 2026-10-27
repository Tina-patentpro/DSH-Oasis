# F 固定审核引用与附件恢复：首轮 P2 修复独立复审

日期：2026-10-27，Asia/Shanghai。最终只读检查时点：2026-10-27T07:57:19Z。复审者为同一用户指定 GPT-6.1-sol/max 独立子代理；没有参与修复、没有另开代理。

**结论：F-DR-A01、F-DR-A02 在具名 R7 无模型开发候选范围内关闭；本次未发现新增必改 P1/P2 或 Minor（均为0）。接受固定审核引用、新 checkpoint 正常恢复及下述分层证据的限定子集。完整 F、旧孤立附件 FH-A01、真实通用文件传输/模型交付、专业/用户接受及发行继续未关闭。**

首轮缺陷、原返回、原执行清单和首轮独立审计保持原字节；本报告仅接续修复结果，不把首轮失败改成通过。双存储同时无法更新仍存在明确未保存限制，不在本报告中声称消除。

## 1. 冻结身份与复审方式

根目录：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh；HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`，分支沿用 `mac/continuity-v2`。独立复核实际 HEAD、根/本项目 AGENTS全文及规划必读R1；本次不制定或修订计划。

| 对象 | SHA256 |
|---|---|
| 新修复返回 `2026-10-27-f-reviewed-reference-attachments-repair-return.md` | `a507ef387f1a129c59be0ec13a897d9c535ffdf7d28b02aee5813412251f0212` |
| 新修复执行清单 `2026-10-27-f-reviewed-reference-attachments-repair-execution.json` | `c5a9babc7952ae38b6bd1d120b789a83ddc0ae9f5ea65f59758cfa4d712f831f` |
| 首轮独立审计 `2026-10-27-f-reviewed-reference-attachments-independent-audit.md` | `9de851783ddfdae17f7e0cebb491390a6f5751f82879c127e1632ce3841a4985` |
| `patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs` | `11eb0016a2fe5242a9d5156e82ff2d09ade95f28d832b4e3670b8456d3e5f6f2` |
| `patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint.mjs` | `1e48f56f9b976c4e726ce13c75edec8a91c669dc1f6201e361252b36570647d7` |
| `scripts/tests/draft-checkpoint.test.mjs` | `dca5eaf8d4fb03be9851c045335ad7bd52952a9565eca407ae2eacc9d92582ca` |
| `scripts/tests/conversation-draft-checkpoint.test.mjs` | `64bd17fc2d2666e949c7cb62329aedbd8e17d0aa85ec159e6d99ee779fc74e06` |
| R7 `admission-R7.json` | `e9ae83ecb2abe5bf75759fceb0e4c75266d558cd9a99ab6ee254e5205167e37e` |
| 最终旁置 `conversation/lib/client.js` | `4532278c8dfc6bd5ce76ca7dbe07692a32ce4226a68ead72ff395a5aa731df06` |

以上新返回/清单位于 `docs/evidence/`；R7装配及原字节备份位于 `.local/f-reference-attachments-20261027/`。候选包为 `0.2.0-rc.2.oasis-draft.2`；固定基础组合仍是 Desktop2.0.17 / DSH0.2.0-rc.2 / Cordis4.0.4 / Sidebar0.24.1及原UI补丁。

独立逐字计算新清单 **61成员/61一致**、R7 **183pin/183一致**。从固定官方 conversation/client.js（SHA `6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c`）在内存重新执行转换，产物与当前 R7 client **完全相等**。不存在只检查源码而漏查实际旁置产物的接受。

复审只写本报告，没有启动 Desktop/Host/浏览器，没有执行 seed/SDK proof、安装、认证读取/迁移、真实上传、模型/API调用、消息发送、费用、提交、推送或发布。Electron仅在 `ELECTRON_RUN_AS_NODE=1` 下作为解释器；独立反例使用实际固定包 class、真实 Cordis/Store及纯本地假传输，或进程内 checkpoint store。

## 2. F-DR-A01 复审：明确重试及跨会话传输归属

修复使用控制器拥有的 `restoredCheckpointFiles` 集合区别恢复文件和普通新选文件。恢复创建时登记，release/dispose时清除；显式重试成功后仍保留标记。`rebindDraftFiles` 对被标记文件先删除旧 operation 归属，再 abort，覆盖为 error/无receipt；不会自动开始新传输。实际原生 Workspace 选择器仍进入该方法，修复覆盖了首轮发现的真实调用点。

独立对照首轮精确 client 备份与当前 R7 的实际 ConversationController class；以相同公开合成 File 执行首轮序列 `restoreCheckpointAttachments → rebindDraftFiles('B', ids)`，未调用 retry：

| 实际 class | 本地假传输调用数 | 末态 |
|---|---:|---|
| 首轮原件 | 1 | ready，含B receipt，重现原缺陷 |
| R7 | 0 | error，无receipt，需明确重新上传 |

另独立验证比基础回归更细的交错：`显式retry A → rebind B → 显式retry B → 晚到A的progress和receipt → rebind C`。A的 signal 已abort，迟到A不能写B状态或删除B operation；最终B仅持新B receipt；再切C为error/无receipt，调用列表仍只有两次明确的 `['A','B']`。release后标记清除。该独立脚本退出0、真实网络请求0。

新鲜20项测试也覆盖恢复文件切B零传输、明确重试B后取得假receipt、再切C失效、明确重试C，以及在途A撤销后晚到不使B ready。普通新选文件仍沿固定原生 createDrafts/upload/rebind 行为，单独特征测试通过；未把正常新文件全部改成恢复文件规则。

裁定：首轮 **F-DR-A01 关闭于该固定 R7 实现/假传输合同层**。浏览器真实IndexedDB与实际导出class的 rebind 零调用证据另见第5节；这不是实际 Host重新上传、外网传输或模型收到附件的验收。

## 3. F-DR-A02 复审：UUID之前失效旧快照

修复在 UUID/克隆等可能抛错的工作之前同步写入空 fence，并规定有效 generation 非空。若首次 fence 写入失败，串行在已有队列之后写 schemaVersion=0 tombstone；后续校验拒绝该记录。

使用首轮原件 helper 与当前 R7 helper作独立内存对照。与首轮反例相同：先恢复图片，**保持文字不变，只删除附件**；模拟UUID异常，flush后重新bind相同正常文字镜像。结果均由新鲜断言和输出确认，脚本退出0：

| 场景 | 冷绑定后附件数 | 实际持久状态/提示 |
|---|---:|---|
| 首轮原件＋UUID故障 | 1 | generation/fence仍为old，重现图片复活 |
| R7＋UUID故障，fence可写 | 0 | fence为空，旧schema1记录不再有效，有故障与拒绝恢复提示 |
| R7＋fence写入失败，IDB可写 | 0 | 记录变为schema0，拒绝恢复 |
| R7＋fence与IDB均无法更新 | 1 | 旧schema1/fence保留；明确提示“两处恢复存储均无法更新，重启可能回到旧快照” |

最后一行是本报告**保留并实际确认的限制**，没有标为防复活通过。该进程内反例没有磁盘写入，没有打开旧业务库。异步事务尚未提交即崩溃也继续属于未保证范围。

裁定：首轮 **F-DR-A02 在有可用持久更新路径的具名合同内关闭**；不再把“有提示”当作旧fence已经失效的证明。双存储失败的风险已经准确告知，完整恢复承诺仍未接受。

## 4. 新鲜独立命令及原RED证据

在项目根目录实际运行，全部退出0：

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --version
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --version
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs
tools/node-v24.21.0-darwin-arm64/bin/node .local/f-reference-attachments-20261027/launch-R7.mjs --check
```

工具 Node24.21.0：**20通过/0失败/0跳过**；官方Electron内置Node24.18.1：**20通过/0失败/0跳过**。最后R7检查输出 `NO_MODEL_PREFLIGHT_ONLY/pinnedFiles=183/modelAndAccountAdaptersDisabled=true/originalAdmissionUnchanged=true/realCallBudget=0`，未用 `--start`。

读取原 `audit-fix-red.log`：19项中15通过/4失败，失败恰为恢复文件rebind、在途传输归属、UUID删除后冷恢复、fence失败兜底四项。后续19绿，再增加普通新文件行为特征检查至20；未声称该后补特征先RED。没有为了复审修改测试，也没有重跑未受影响业务整包verify、覆写活跃lib。

首轮独立重跑过的40项引用合同与原12次实际SDK身份拒绝，按未变业务输入/源码和原字节证据继续复用；本轮没有将它们冒称为新跑40项或重新打开SDK业务服务。

## 5. 当前R7 GUI、真实浏览器及旧普通稿证据分层

复审实际查看 `repair-R7-attachments-after.png` 与 `repair-R7-long-after-final.png`，读取配对AX和四组原始启动/退出记录，没有仅依据作者返回文字。

**R7实际Desktop附件/路径引用层：** `repair-R7-attachments-before.ax.txt` 与 `repair-R7-attachments-after.ax.txt` 的原始AX一致（SHA `84e2e01e78d2125a1a42ff591dfa4edb96ad7ec0a85325cae1f3e84b400a6885`），图片在截图可见。公开useInput均为同一workspace/session、73字符/73字节、SHA `38155cc6ab8cbd7f88aa53741a1a3528cea15903bc9a147bb99c72c39609e0b0`、attachmentCount1；两引用完整投影一致：`@review-long.md` offset37/length15、`@review-ordinary.md` offset53/length19，source=reference、invalid=false。这里非图片对象是原生磁盘路径结构化引用，不是通用上传文件的Desktop实传。

**R7实际Desktop长固定稿：** `repair-R7-long-before-final.ax.txt:251` 与 `repair-R7-long-after-final.ax.txt:263` 的完整公开摘要都为126692字符/127894字节、SHA `1ea283cfda8194abe88ab5c2667af0bf596f79696509538974ea24bf38cc85e2`、attachmentCount0，同workspace/session。相同SHA与首轮冻结全文对应。四次R7启动的原始PID13610/14027/14501/14575及退出JSON逐项一致、均正常退出0；附件及最终长稿的同配对重启证据成立。

先前 `repair-R7-long-after-report.ax.txt` 只有“树未改变”，`repair-R7-long-AX-exact-match.json` 为 `fullFixedProjectionFoundInActualAX=false/occurrences=0`。它们不足以证明长稿已交付，保持不充分；本报告使用明确另取的before-final/after-final完整摘要，不对旧缺证倒签成功。

**真实浏览器IDB＋实际Controller层：** R7公开 `F BLOB PROOF` 完整输出为passed，public-blob.md、text/markdown、lastModified12345、26字节，SHA `9e6504737138b546d2f9ff79ca4507e0021652a1e534d90a0f35fba4da69e4ec`，`uploads=0/workspaceRebindUploads=0/receiptRestored=false/manualRetryRequired=true`。观察器源码确实在自身独立Cordis Context/本补丁测试键完成真实IDB put/get、重建File，再调用实际导出Controller.rebindDraftFiles。fileUpload为本地假对象，没有Host上传。接受此Blob字节/直接恢复/rebind特征，不能把它写成旧附件迁移、实际Host receipt或模型传输验收。

**普通固定稿与审核边界：** 首轮R5普通6797字符/8161字节、固定SHA `a9cd61a86507b7bf3dda507bb7bfbbcaaabfb8e84e15c6d67cca4161ccc6ef58`、当前文件变化后不沿用审核、12次错误身份拒绝及原审核/正文证据保持。业务代码和对应输入没有变化，本轮复用具名普通子集；不声称普通稿在R7又完整手工重复。长稿126692字符也不变成150000的Desktop上限实测。

## 6. 新旧字节关系与保全

首轮174条工作路径中，**165条当前仍等于原值，9条是有意修复变化**；不能说当前174全部匹配旧hash。独立核对新清单的changedPaths恰等于实查差异集，且旧Expected均等于首轮冻结值。8条修复前备份逐项字节/SHA相等；观察器模板的重建原件也匹配旧值。

对该模板另独立执行精确逆差异：仅去掉 `rebindDraftFiles('F_BROWSER_OTHER_SESSION',ids)`/下一事件轮等待两行及 `workspaceRebindUploads` 输出属性，得到3812字节、SHA `1476e7ae976b27babb6ae22111f429c4e7e02c6efdf338cc38a92bb3f9ce9bef`，与首轮冻结模板逐字相等。重建性质没有被伪称为修复前复制。

R6→R7 pin差异恰为7条：两代launcher进出pin集、两份补丁源码、旁置conversation client/package版本、临时观察器client；无意外依赖重选。旧R6准入、首轮返回/执行/审计3件原字节均独立复核一致。首轮9组及本轮4组，共13组原始启动/退出记录均与各自清单相符；不由exit0改变R1—R3装配失败性质。

初始3542项既有文件仍0缺失，仅此前声明的他人AGENTS规划条款变化；本轮没有新的业务源码、主锁、活跃lib、R47 client或已有用户文件漂移。最终57563无监听（`lsof`退出1/无输出），startup.lock不存在。复审者只新增本报告。

## 7. 仍未接受的出口

- 旧孤立File/occurrence/Session/receipt缺归属，FH-A01历史失败不关闭；不猜配/删除/静默迁移。
- 双存储均不可更新、事务未提交即崩溃、强杀、多Renderer、跨平台/跨版本/文件清理等完整恢复仍未保证；首轮原所有权/UNKNOWN/装配限制继续有效。
- 通用文件实际Host重新上传、真实模型正文/附件参与、专业API新版映射与UNKNOWN、超150000固定文件引用、专业/用户接受仍缺。
- 普通默认入口、正式全写入方装配、发行/升级/回退、U1/D1、完整F、G→H→阶段6及发布均未因本次通过而放行。

最终复审裁定仅为：**R7旁置候选的两项具名P2已修复，具名无模型引用/新checkpoint恢复开发子集接受；新增必改P1=0、P2=0、Minor=0。** 原首轮报告保持历史、完整F继续开放。
