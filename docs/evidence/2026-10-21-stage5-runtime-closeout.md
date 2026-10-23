# 阶段5新版运行、持久化与旧记录兼容收口及审计

日期：2026-10-21。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。依据用户“优先新版运行、持久化及旧记录兼容，暂不启动Desktop或新增真实调用”的明确指令，按[本批执行计划](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/plans/2026-10-21-stage5-runtime-persistence.md)单代理实施、测试与复审。

**裁定：阶段5新版任务的Host运行/持久化基础及旧记录读取兼容在本批范围完成。新增19项正式测试（新版18项、Host重建1项）；最终主包924/924通过、0失败、0跳过，Mac相关26/26通过。构建及117成员pack dry-run通过。开发内复审发现的边界已修复并保留红→绿证据，本批未遗留已知P1/P2。阶段5整体及真实运行验收仍未完成。**

## 一 实施内容

### 版本化数据与旧记录兼容

[运行合同](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-contract.js)为浏览器可用的纯数据合同；[完整性检查](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-integrity.js)仅在Host读取固定资源和累计文稿。新客户端包没有带入Host文件读取器。

沿用现有 `oasis_workbench` 域、workspaces表和根schemaVersion=4；只有新建V3.4.0任务具有 `v340.schemaVersion=1`。旧任务不补这个字段，原v1→v4读取迁移保持，读取不写盘、不重算旧输入/产物hash、不把旧claims改标为新版。本批核验v1/v2/v3/v4及无关旧工作流恰有V3.4.0版本字符串的情形；后者仍按旧记录读取。

新任务记录一份版本化输入草稿，默认local-skill，保留文件/文本/配置ID边界；来源与正文可在未运行时保存。新版字段为Host所有，普通state/replace不能伪造或擦除新版运行、结果及编辑草稿，也不能通过旧客户端删除新版任务；原有旧任务删除规则保持。revision冲突不会覆盖已保存的新值。

旧→新读取兼容不承诺旧二进制能读取新增字段后的新版记录；回退/旧安装包读取新版数据仍属后续升级恢复验收。本次未写入真实业务库或Profile。

### 运行、输入冻结与结果持久化

[生命周期服务](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-service.js)复用现有repository队列、revision及Workspace操作互斥。准入先保存requestKey、UUID/runId、项目/任务/节点/来源、资源指纹、实际输入及准备回执、时间和输入hash，再允许执行。请求标识与运行元数据纳入快照hash；输入正文或身份漂移会拒绝读取，不以重算hash掩盖。

唯一可注入的执行器标签为synthetic，生产Host不传执行器。即使传入native-model标签也会拒绝；所有14节点的真实local-skill/oasis-api来源继续禁用。目录能力改为runtime-persistence-only、dispatchEnabled=false，不冒充14节点已可生成。

运行状态为prepared/completed/failed/unknown，与累计文稿的workflow_status/deliverable_status分开。没有明确终态、停止、执行异常或重开后丢失所有者均保留unknown；prepared和unknown阻止Workspace新派发，也与旧本地/API未决互相保护。不自动重试、切源或清未决。相同请求只观察已有记录，改输入/任务不能复用原requestKey；同Workspace跨任务runId碰撞在派发前拒绝。

完成结果由既有累计组装器形成一份主Markdown，保留输入正文、累计快照、警示、T1–T6及双业务状态，并核验正文/快照/身份/时间/hash一致。结果及独立的人工编辑草稿均持久化；草稿绑定原产物hash，过期放弃不能擦除新稿，原产物不被修改，也不会自动批准审核。

这里的Markdown正文保存在运行记录中，尚未接入新版共同结果页面的编辑新版本、人工审核、物理Markdown无覆盖保存、导出或原生引用。不能将其描述为这些产品操作已经完成。

### Host接线

实际Workbench服务共享同一个仓库和操作互斥；Host dispose关闭新版工作。新增5条精确RPC：

- workflow/v340/task/create
- workflow/v340/task/draft
- workflow/v340/run/observe
- workflow/v340/run/stop
- workflow/v340/result/draft

总路由43→48；保留旧路由、POST/关联ID/错误与清理断言。没有workflow/v340/run/create路由，也没有新增界面生成入口。原workflow/v340/prepare仍只读、不创建运行。

## 二 新鲜测试与证据

命令由zsh启动包装器，显式调用固定Node24.21.0、tsdown0.22.14和固定npm，使用私有HOME/cache、空npm配置及阻断业务外网的环境。没有安装或升级依赖。完整argv/cwd/时间/退出码在 `.local/stage5-runtime-20261021/commands.jsonl`；摘要不能替代原始日志。

| 检查 | 本批最终结果 | 证据 |
| --- | --- | --- |
| 起点主包全量 | 905/905，0跳过，退出0 | baseline.log |
| 新版运行/兼容正式测试 | 18/18，0跳过，退出0 | verified-runtime-green.log |
| 主包完整回归 | 924/924，0失败/0跳过，退出0 | release-full-green.log |
| Mac原生Markdown、Sidebar、Web、启动及安全预览 | 26/26，0跳过，退出0 | final-mac.log |
| 固定构建 | 退出0；更新client.js及map | verified-build.log |
| 固定npm pack dry-run | 退出0，117成员；只新增3个运行模块，无测试/依赖/工具/运行/归档/凭据目录 | verified-pack.log、audit-summary.json |
| 两种Desktop --check | 均退出1，应用可执行文件漂移被拒绝；未spawn | check-synthetic.log、check-real.log |
| diff及保全核验 | 退出0；无意外变更 | final-checks.json、preservation.json |

18项新版正式测试覆盖：

1. 旧v1–v4读取不写盘、不补新版字段；新增新版任务后，旧批准审核、输入/产物及保存回执逐字保留，仓库重开一致。
2. 输入来源及配置/文件/文本通道、UTF-8字节限额、输入/结果编辑草稿磁盘重开、普通旧草稿防伪及防擦除。
3. 派发前持久化、同revision竞争、请求幂等/碰撞、跨Workspace相同runId隔离、同Workspace跨任务runId拒绝。
4. 未决输入/来源锁定、旧本地及API未决互斥、观察重开不重放、停止/关闭/迟到响应保护。
5. 准入写失败不调用执行器；结果写失败保持可观察未决；忽略abort的执行器不使关闭无限等待。
6. 真实临时Workspace文件读取冻结：外部随后修改文件，运行仍保留实际准入原文/hash，结果没有偷偷读取新版本。
7. 生产执行器禁用、严格RPC入参/安全错误、新来源均未开放、结果草稿的基线与过期放弃保护。

持久化证据使用真实临时JSON文件的storageDomain测试适配器，执行实际repository关闭/重开；Host接线使用真实插件/Cordis与Connection协议、合成服务及存储夹具，另验证Host重建读取。它们不是实际DSH安装包存储或Desktop进程重启验收。崩溃恢复测试只在旧所有者关闭后恢复测试专用崩溃镜像，不让两个Host写同一存储；本批没有声称新增了跨进程互斥。

## 三 开发内审计及修正

单代理逐项复审合同、持久化及运行边界，以下问题均有失败证据后修复：

| 发现 | 修正及回归证据 |
| --- | --- |
| 旧editable可以删除已完成的新版任务，丢失Host证据 | 旧替换路径拒绝移除任何新版任务；legacy-delete-red.log→runtime-green.log，编辑草稿保全继续扩展验证 |
| 准入落盘后、排队执行器派发前关闭，仍会调用执行器 | 在实际派发微任务内复核closing/abort；close-dispatch-red.log及后续绿色回归 |
| requestKey等元数据未全部绑定输入hash | requestKey、runId/UUID、捕获时间纳入冻结快照并逐项核验；request-identity-red.log→request-identity-green.log |
| runId碰撞最初只检查当前任务 | 扩为Workspace全部新版任务，schema也拒绝运行/请求标识碰撞；run-id-collision-red.log→run-id-collision-green.log |
| 新版版本字符串判定过宽，误拒绝无关旧工作流 | 限定批准的14节点ID与V3.4.0组合；legacy-version-red.log→legacy-version-green.log |

首次受影响组的43/48路由计数失败已按新增5条真实接口更新，原安全断言保留。最后补旧审核/保存混合记录测试时，首次构造器试图修改已冻结的迁移v4对象，targeted和release-full.log均记录该测试夹具错误；改为克隆测试原件后构造旧审核/回执，保留全部断言，18项及最终924项重新通过。未把这些红测、过渡计数或夹具错误隐藏、覆盖或计为成功。

本批最终未遗留已知P1/P2；这是作者单代理复审，不是第三方独立审计。原两项P2路径测试保持原字节，继续纳入全量0跳过结果。

## 四 保全、限额及未完成项

原3255项版本控制范围文件冻结。仅改本批列明的9份生产源码、3份旧Host/路由测试、2份lib、当前阶段5计划及状态；新增3份运行模块、1份正式测试、执行计划及本报告。其余既有设计、前轮P1/P2、业务资源、锁及历史证据保持。主锁SHA256仍为 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`；manifest、业务基准和资源包未变；原12项组件/补丁pin及admission.json共13项保持。原lib已备份到本轮before/且与起点hash一致；新client.js SHA256见audit-summary.json，需要以后单独审阅绑定，未重写准入。

新版单draft及完整输入快照各2MiB、最多8次运行、累计文稿沿用1MiB、完整Workspace最多8MiB；其中旧字段部分仍保持原1MiB上限。超限拒绝，不截断正文、不自动淘汰旧运行。现阶段只接受现有UTF-8 md/txt准备能力，不能把它扩称为PDF/DOCX/图片正文已参与。

**剩余可离线推进：** 新版共同输入/结果页面、资源与原生调用适配的无模型接线、各节点精确API字段/结果/账户项目绑定证据、非文本解析，以及发行清单和合成迁移/回退准备。它们不因本批完成而关闭；14节点真实来源仍禁用。后续真实接线还需冻结会话/模型或账户/服务及费用确认，不能把synthetic执行器直接改标签冒充真实能力。

**仍依赖恢复件或独立运行验收：** F1/R1的2.0.17可信原件及旁置恢复、当前源码/lib与候选配对准入；R6/F3/F4实际Desktop编辑/审核/键盘/窗口；原生文件/对话草稿、正常重启、安装升级恢复及发行。本轮未启动Desktop，未新增真实模型/API、认证、上传或发送对话，未改日常/隔离Profile、应用、准入，未提交/推送/发布。阶段5整体保持未完成。

原状态只前置本批摘要，旧完整字节后缀保留。全部原始证据在 `/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/stage5-runtime-20261021/`，最终保全结果见preservation.json。
