# 阶段5三项P2修复、全量回归及复审

日期：2026-10-22（Asia/Shanghai）。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支 `mac/continuity-v2`；HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**裁定：[上一轮审计](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/evidence/2026-10-22-stage5-runtime-reaudit.md)的A1、A2、A3三项P2已在代码、合同及合成持久化范围修复并复审。新增11项正式回归，主包935/935、Mac26/26、复跑审计探针7/7通过，均0失败、0跳过。当前修复范围未遗留已知P1/P2；阶段5整体、真实Desktop及安装包/真实生成验收仍未完成。**

按用户明确修复指令和[本批计划](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/plans/2026-10-22-stage5-p2-runtime-repair.md)单代理实施及作者复审，未派发独立审阅代理，不称第三方独立审计。原审计、计划、失败证据及旧状态完整后缀保留。原始账本与命令/退出码位于 `.local/stage5-p2-repair-20261022/`。

## 一 修复结果

### A1：准入、观察、停止与关闭

[运行服务](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-service.js)在异步准入开始前记录在途准入，在成功、revision冲突及失败路径通过finally释放。观察同时核对当前Workspace的在途准入与实际运行所有者；真正提交孤儿unknown的repository mutation内再次复核所有权，不能用排队前的旧判断覆盖活跃运行。

prepared落盘而create尚未返回时，三个并发观察不会误标INTERRUPTED，运行只派发一次，正常结果完成、持久化并重开一致。真正重开无所有者的prepared仍转unknown且不重放；异常准入写入结果未知时，所有权标记释放，观察可恢复unknown，新请求仍被未决保护拒绝。

关闭先中止已有执行，再等待在途准入结束，并中止其间新登记的所有者后等待结算。最终复审补充了两个时序回归：一个Workspace已运行、另一Workspace正准备时，已有执行不会因等待准入而延迟abort；停止已经落盘、创建调用的后续流程尚未恢复时，排队执行器会在真正派发前复核盘上prepared状态，调用次数为0。没有把“发起停止请求”误当成“停止已经持久化”，也没有把本地停止当作服务端取消。

### A2：长文稿组装、校验、持久化与下游读取

[浏览器安全合同](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-contract.js)新增唯一 `documentBytes=1048576` 和共享 `v340DocumentBodySchema`，按UTF-8实际字节检查。[累计文稿模块](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-document.js)的组装、inspect及upstream文稿读取共用该合同，消除原300000字符与1MiB字节上限冲突。

299000字符合法输入产生的305294字符、306328字节文稿现在正常completed，正文/hash落盘并重开不变，不再因读取schema误拒绝而停prepared/unknown。恰好1MiB的真实多字节累计文稿也可完成并保存；同一输入增加1字节导致组装超限时，明确完成响应被标记failed/INVALID_OUTPUT，旧完成结果和草稿不变，不伪装为可自动重发。

实际临时Workspace文件验证长稿可传到下一节点，读取的正文及hash与文件一致；原文及人工修改版本分别走完Flow-1-2运行、持久化和仓库重开。长前序文件发生人工修改时，实际修改后的完整正文及manual_edit_manifest保留，并继续给出警示；不恢复旧结构化正文来覆盖人工版本。累计快照允许容纳Host保留的完整文稿，模型单项输出和普通材料原300000字符边界保持。

这不放宽其他容量：输入草稿/完整输入快照各2MiB、完整Workspace8MiB、旧字段部分1MiB、最多8次运行均保持。1MiB文稿并不保证在所有累计场景都能装入2MiB完整输入快照或8MiB记录；超出相应总量仍应拒绝，不截断或淘汰旧证据。

### A3：长编辑草稿保存

结果、持久化resultDraft以及result/draft RPC命令共用同一个1MiB UTF-8正文合同，移除较小的100000字符草稿限制。116294字符、117328字节的已完成结果可通过实际RPC以完整正文保存，追加人工编辑后重开逐字一致。

原baseSha256、expectedRevision、过期放弃、当前明确放弃及not-reviewed合同保持：错误hash拒绝，旧revision放弃返回冲突，不能擦除较新长稿；正确当前revision明确放弃只清草稿。原结果正文/hash及审核状态不变，不自动批准审核。

字节边界测试同时覆盖命令与持久化schema：多字节草稿恰好1048576字节接受，增加1字节拒绝，拒绝后整个记录不变。新增容量回归验证8MiB总记录边界：前7份1MiB草稿保留，第8份使记录超限时拒绝；8次运行记录仍完整，第9次运行拒绝，不淘汰历史。

## 二 正式回归与旧证据保全

在原 `test/v340-runtime.test.mjs` 中追加11项正式测试，原18项测试主体逐字保留；其主体SHA256仍为 `3a7ac8a810465ab38e719098797936f46c70879fa1f487a8f3b4302dd14423c3`，检查见 `assertion-preservation.json`。既有其他正式测试及前轮P1/P2测试保持原字节。

| 新增回归 | 核验内容 |
| --- | --- |
| 落盘至创建返回间的三个并发观察 | 正常completed，只派发一次，重开一致 |
| 关闭遇到在途准备 | 关闭等待准入收尾，不派发 |
| 准入写入后报告错误 | 释放所有权，观察unknown，不重发 |
| 长文稿持久化/下游/人工修改 | 305294字符产物重开、实际文件读取及修改后全文保全 |
| 恰好1MiB文稿与增加1字节 | 合法完成及草稿保存、超限明确失败、旧结果不变 |
| 长编辑稿实际RPC与重开 | 全文保存、编辑、错误hash、过期放弃与当前放弃 |
| 统一UTF-8边界 | 命令/持久化schema同限；普通材料300001字符仍拒绝 |
| 8MiB总量与8次运行 | 超限不截断、不淘汰，整记录保持 |
| 关闭已有执行及另一项目准入 | 立即abort已有执行，准入收尾不派发，项目隔离 |
| 停止先持久化、创建继续稍后恢复 | 真正派发前复核状态，0调用，保留ABORTED |
| 混合旧证据完整生命周期 | V2/V3/V4旧批准审核、原输入/产物hash、双文件保存回执逐项不变 |

最后一项使用长新版文稿及长编辑稿，走完新版创建、运行、保存草稿、第二次运行停止、迟到结果与重开；每一步旧task整体深相等。原v1–v4读取不写盘、不补v340、不重算hash，以及旧本地/API与新版未决互斥、Host字段保全、同revision竞争、跨Workspace及迟到隔离也实际纳入全量通过。

临时JSON storageDomain适配器的辅助改动只有可选运行依赖、post-durability时序钩子和共享写队列。固定DSH存储域实际`table.put`使用共享`host.enqueue`，本轮据其源码对齐测试适配器；没有在产品中增加诊断器、跨进程锁或测试钩子。测试不是实际DSH安装包存储或真实业务库迁移验收。

## 三 新鲜命令与结果

zsh执行包装器显式使用固定Node24.21.0、tsdown0.22.14和固定npm；私有HOME/cache、空npm配置、业务外网阻断环境，无依赖安装/升级。完整argv、cwd、UTC时间及退出码见[commands.jsonl](/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/stage5-p2-repair-20261022/commands.jsonl)。

| 检查 | 最终结果 | 证据文件 |
| --- | --- | --- |
| 主包所有test/*.test.mjs | **935/935，0失败/0跳过，退出0** | release-full.log（最终）、full.log |
| Mac Markdown/Sidebar/Web/启动/安全预览 | **26/26，0失败/0跳过，退出0** | mac.log |
| 上轮7项审计探针复跑 | **7/7，0失败/0跳过，退出0** | audit-probes.test.mjs、audit-probes.log |
| 固定构建及旁置重构 | 均退出0，client.js逐字一致 | build.log、reproducible-build.log |
| 固定npm pack dry-run | 退出0，117成员，无测试/依赖/工具/运行/归档目录 | pack.log、verification-summary.json |
| 两种只读--check | 均退出1，拒绝现有应用可执行文件漂移；未spawn | check-synthetic.log、check-real.log |
| 原断言、变更及旧状态保全 | 原18项主体逐字保留，无意外变更；旧状态完整字节后缀保留；diff退出0 | assertion-preservation.json、preservation.json、final-checks.json |

7项探针以本轮副本复跑，原代码/日志不动。副本将“inspect必须因300000字符拒绝”的旧根因定位断言改成“合法文稿accepted”，保留最终completed业务断言；等待实际完成状态，替代原两个event-loop tick假设，并只记录结果hash而非完整大正文。28个节点/来源标签合成组合、旧证据全流程和第9次运行拒绝均再次通过，不外推为14节点真实生成能力。

## 四 红→绿、复审发现及处理

- `a1-red.log`：21项，19通过、2失败，分别为观察误标及关闭过早返回；`a1-green.log`受影响组41/41通过。
- `a2-a3-red.log`：26项，21通过、5项容量回归失败；`a2-a3-green.log`相关39/39通过。
- `close-drain-red.log`：复审发现等待另一Workspace准入时未立即abort已有执行；先补失败测试，再修为等待前后分别abort。
- `final-targeted.log`：48/49，出现一次私有JSON测试适配器跨Workspace整文件写入竞争。核对固定DSH共享写队列后对齐夹具，全部断言保留，`final-targeted-green.log`49/49通过；未把该失败隐藏或计为成功。
- `stopped-admission-red.log`：人为延迟实际Workspace guard的返回，在停止已落盘后恢复创建，复现1次不应发生的派发；增加派发前盘上状态复核后，`stopped-admission-green.log`相关3/3通过。
- `a1-final-harness-red.log`：在忽略目录只读复制修复前运行服务，配合最终共享队列夹具，原并发观察回归再次明确失败unknown≠completed；活跃生产文件未回滚。这证明夹具对齐没有掩盖原A1。

最终按计划Review Focus另做作者复审：在途准入成功/失败/关闭均释放、真正孤儿prepared仍可恢复unknown、停止/关闭后不新派发、长前序修改不丢正文、字节与总量限额未弱化、旧hash/revision/审核回执保持。当前修复范围无新增未处理P1/P2。未设置独立审阅代理，不以作者复审等同第三方独立审计。

## 五 保全与未完成项

起点3262份文件冻结。本批只修改3份生产源码、1份正式测试、2份构建lib及当前状态，新增执行计划和本报告；其他既有未提交工作、业务基准、资源、历史报告保持。主锁SHA256仍为 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，13项组件/补丁及admission文件hash保持。

原lib备份保存在本轮before/；新client.js SHA256为 `2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`。已重构验证，未重写准入；源码/lib与目标安装候选的完整配对仍待恢复件及后续审阅，不能由组件pin未变代替。

**实施取舍：** 按用户与项目规则沿用当前分支、单代理、不提交或删除证据，不采用技能默认的另建工作树、独立审阅/提交流程；限制是本次没有独立审阅或Git集成结论。直接执行已授权的三项审计修复，保留既定1/2/8MiB容量及未决保护；若后续业务需要更大容量，应另定合同，不能自动放宽或截断。

**仍可离线推进：** 已确认设计下的新版共同输入/结果页面，编辑新版本与人工审核/无覆盖保存/导出/原生草稿的无模型接线，本地资源及原生适配器替身测试，各节点API字段/结果/账户项目绑定的已有证据核对，非文本解析切片，以及发行清单、历史资源版本和合成迁移/回退准备。本轮没有开始这些后续产品范围。

**仍未完成：** 2.0.17可信恢复件及旁置应用仍缺失；F1/R1整套候选恢复准入，R6/F3/F4实际Desktop编辑/审核/键盘/窗口、原生文件与对话草稿、正常重启、安装升级/回退及发行验收继续待办。真实模型/API还分别受当前用户禁令及独立调用授权条件限制，旧调用预算不续用。

本轮未启动Desktop或实际DSH进程，未新增真实模型/API、登录、上传、费用、认证读取、对话发送、真实Profile/业务库/应用/准入修改，也未提交、推送或发布。新版真实来源继续disabled，无run/create RPC；新版审核/物理Markdown保存/原生引用尚未实现，三项P2修复不关闭整个阶段5。
