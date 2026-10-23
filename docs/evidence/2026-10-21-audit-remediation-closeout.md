# 审计修复代码与组件验收收口

日期：2026-10-21，北京时间。依据[修复计划](../plans/2026-10-21-audit-remediation-plan.md)与[原审计报告](2026-10-21-completed-work-audit.md)，执行用户本轮“先完成不受2.0.17恢复件缺失影响”的范围。分支 `mac/continuity-v2`，起点HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`，未提交/推送。

**结论：R2–R4代码修复、定向测试、全包回归及真实React DOM组件验收通过；F2在无网络替身与持久化合同范围关闭，F3/F4代码及组件通过、Desktop验收待执行。F1仍阻断Desktop启动；F5旁置离线恢复未取得供应链验证完成回执。整体候选不标记为运行或发行通过。**

## 一 逐项结果

| 审计项 | 本轮交付 | 当前状态 |
| --- | --- | --- |
| F1 固定Desktop漂移 | 两种check重新执行，均在可执行文件pin拒绝；应用、原准入与Profile未改变 | 材料阻塞；没有替换2.0.18或将其登记为2.0.17 |
| F2 断连误判 | 派发前/后区分；一般传输错误与无终态截断保留unknown，原请求/输入与锁保持 | 代码、原生运行库替身、序列化重开及阻止新增请求通过；未新增真实生成 |
| F3 编辑丢失 | 编辑草稿归store，按项目/任务/运行/基准artifact隔离；版本与视图切换保留正文，保存竞争不清除新编辑 | 代码/节点测试/真实组件挂载通过；当前Desktop待验收 |
| F4 审核误触 | 入口只展开确认；展示固定版本、来源、短哈希和未评估提示；明确确认后才登记 | 代码/节点测试/真实组件挂载通过；当前Desktop键盘/窗口整体验收待执行 |
| F5 供应链缺口 | 新旁置目录、固定pnpm/冻结锁/离线/忽略脚本，92个包复用、包体下载0；校验未关闭 | 136项锁输入供应链验证45秒内未完成，进程由本轮超时边界终止；未关闭 |

F1缺失的恢复件路径沿用原清单，不以扫描到的更高版本替代。后续若评估2.0.18，仍须明确版本决定及新的组合证据。

## 二 实现与审计要点

### 断连未决保护

`src/dsh-generation-adapter.js` 在调用prepared.stream前记录派发边界。派发后无法证明提供方终态的GENERATION_FAILED，以及没有finish的截断，返回unknown；不把SDK包装的finish.error当作后端取消/停止计费证明。保持120000ms期限，不自动换源、重试或重发。

原明确认证/额度拒绝、明确max-tokens等终态、完整stop后的格式失败仍为可证明失败。TIMEOUT/ABORTED保持既有unknown行为。业务服务和持久化schema没有扩展；原始错误、指令及部分正文不进入存储。

新增回归使用固定Cordis/LLM运行库和本地替身，分别覆盖首包前断连、部分正文后ECONNRESET及截断流；经序列化重新打开repository/service后，观察和同key请求不重派发，新key仍被WORKSPACE_GENERATION_ACTIVE拒绝。既有迟到结果、重复停止和期限测试继续通过。

### 编辑草稿保全

`src/client/workbench-store.js` 的pageOperations管理 `resultEditDrafts[runId]`，记录baseArtifactId、逐字正文、revision和dirty。页面转发新增草稿动作，`UnifiedResultPanel`不再把正文仅保存在将被版本切换卸载的组件状态中。

保存仍调用现有Host editUnifiedResult创建待审核新版本；只有仍是同一个已提交草稿对象才清除，迟到响应不会抹掉后续编辑。失败、revision冲突或artifact基准失效时保留原文；基准变化禁止直接附到新artifact。

dirty草稿阻止任务关闭、显式重新载入、审核、固定资料引用和写回准备；开始编辑使旧写回清单/确认失效。引用在异步准备完成、真正插入原生草稿前再次检查dirty。原审核artifact、原文件和原审核记录保持。

同进程版本/任务/项目/隐藏视图切换保全已验证；**未提交结果草稿跨应用退出或崩溃恢复没有实现，本轮不作该承诺**。这与用户要求的输入实时持久化是不同合同；后者原合同未被替换。

### 固定版本审核确认

审核入口只打开就地确认区域，显示版本、来源、短哈希及未评估提示。确认绑定Workspace、任务、run、artifact和Workspace revision；切版本、切项目、进入编辑、同步状态变化会使其失效。确认不默认获得焦点，Esc取消并把焦点还给入口。

组件同步锁住已消费确认，避免快速双击；store在flush之前和实际Host派发前检查当前目标，操作失败不展示批准、不自动解锁保存/引用。通过审核后仍保留风险/待确认问题未评估提示。

为兼容原有非统一结果的显式审核动作，store.reviewRun保留可选的确认参数；当前统一UI总是传固定目标。该UI确认不是新增的Host权限协议，不应被描述为所有旧调用均已迁移。

## 三 新鲜验证结果

执行shell为zsh，固定Node24.21.0；主包命令cwd为 `/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service`。使用私有HOME/cache、独立user/global npm配置、合成标志与阻断外部代理；组件浏览器只连接本机回环测试页。

| 验证 | 结果及证据 |
| --- | --- |
| R2红测 | 3项断连/截断预期unknown，旧实现实际failed；日志r2-red.log |
| R2定向修复后 | 28/28，退出0；r2-green.log |
| R3红测 | 缺少store草稿能力，5项失败；r3-red.log |
| R3首批相关回归 | 43/43，退出0；r3-store-green.log |
| R4红测 | 版本变化后原审核仍可登记，2项失败；r4-store-red.log |
| R4与共有UI回归 | 18/18，退出0；r4-store-green.log |
| 补充基准/保存/审核竞争 | 9/9，退出0；r3-r4-edge-green.log |
| 复审异常安全回归 | 新增错误对象原型变动测试先失败，修复后相关33/33；review-error-red/green.log |
| 最终主包全量测试 | 886总计，884通过、0失败、2历史跳过，退出0；final-tests.log |
| 固定tsdown构建 | 退出0；final-build.log，client.js/map已重建 |
| 固定npm pack dry-run | 退出0，110成员，未含测试、依赖、工具、运行或归档目录；final-pack.log |
| Mac启动器合同 | 14/14、0跳过，退出0；final-launch-contract.log |
| 默认及正式check | 分别退出1，均为Desktop可执行文件pin漂移；final-preflight.log、final-real-preflight.log |

两项历史跳过仍是 `test/native-offline-runtime.test.mjs` 对旧Windows `.dsh-test/stage2-desktop` 的离线准入及原生服务声明检查；没有算作通过，也未创建假目录消除跳过。

完整verify采用固定Node直接执行tsdown、全包tests、固定npm pack三步，避免pnpm run再次自动物化活跃依赖。没有因为阶段4设计确认而新增任何模型/API预算。

## 四 真实组件挂载证据

`test/result-panel.browser.mjs` 使用现有React18.3.1/ReactDOM createRoot/StrictMode，挂载真实UnifiedResultPanel与真实store；Host边界使用纯合成数据和失败回执。它通过固定tsdown打包到忽略目录，由临时回环HTTP服务承载，不启动DSH/签名Desktop，不登录、不外传。

本轮IAB实际执行并读回以下4项通过：

1. A版本编辑→B→A，以及Workspace切换导致真实组件卸载/重挂载，逐字正文恢复；保存失败保留，明确放弃后才退出。
2. 审核入口不调用Host；明确确认固定版本后快速双击只派发一次，未评估提示保留。
3. 切版本使旧确认消失；Esc取消并恢复入口焦点；审核失败仍为未审状态，须重新打开确认。
4. 专业来源使用同一确认规则；开始编辑使审核确认失效，版本切换仍保留编辑。

审核组件在修改前实际DOM结果为两项“入口立即批准”失败；修复后通过。补测StrictMode又发现liveness标记未在effect重新装配时恢复，导致无法确认；该失败已复现并修正。DOM测试不再仅依赖审计时的自制hook重挂载模拟器。

![真实React DOM组件验收结果](/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/audit-remediation-20261021/browser-final.png)

这是组件行为证据，不是当前Desktop布局、Sidebar原生文件/对话接线、窗口缩放或正常重启的修改后验收。后者保留为R6待执行。

## 五 旁置恢复尝试与保全

R5在 `.local/audit-remediation-20261021/clean-restore/packages/oasis-professional-service/` 新目录执行。仅复制原manifest/lock；使用既有固定store，offline/frozen-lockfile/ignore-scripts和禁止包管理器自动下载，供应链与完整性政策保持启用。为核验固定锁图允许官方registry的非认证元数据请求，不向registry发送业务材料/凭据，不获取新版本包体。

首命令因pnpm不接受直接的manage-package-manager-versions参数退出1，尚未物化；保留clean-restore-first.json和日志。按固定CLI提示改为 `--config.manage-package-manager-versions=false`、`--config.optimistic-repeat-install=false` 后，日志显示136项供应链验证启动、92包reused、downloaded0并已形成目录，但45秒边界内没有验证完成/成功退出。此为未完成的恢复尝试，不能按包目录存在记为供应链通过。原失败和新超时证据均保留；未复制旁置依赖覆盖活跃node_modules。

保全核对覆盖初始3198个指定文件：除本轮6份生产源文件、2份原有测试、重建client.js/map及当前状态新增摘要外，其余字节保持；新增正式测试及夹具另列Git未跟踪文件。现有15+13设计图、清单、旧产物与业务存储、准入和已安装应用可执行文件均未改变。package.json/lock原字节保持。当前准入共7项差异：6项原Desktop漂移，加1项本轮重建client.js；没有重算pin使新候选假装获准。

当前状态文件采用原字节前置摘要，保留旧完整后缀及227处CRLF，不通过普通文本重写归一化旧历史。旧审计、计划、未知运行及批准记录不被回填为新通过。

## 六 复审与下一步

按项目单代理规则，本轮是作者执行后的单独复审，不宣称外部或独立复审。复审检查了派发/终态语义、SDK错误包装、保存响应竞争、跨项目归属、确认失效、迟到引用、React StrictMode和原有审核调用兼容；补充发现的异常安全及StrictMode问题均有失败→修正→通过证据。

执行裁定：复用当前分支，不启子代理、不提交；编辑草稿仅承诺本进程保全；原有显式审核API保持兼容，统一UI负责新增确认；当前Desktop证据与供应链验证保持未通过。这些裁定的代价分别是缺少独立复审、退出前未提交正文仍可能丢失，以及安装包/干净恢复风险尚未由本轮排除。

后续优先提供可核验2.0.17原件，或明确决定评估新组合，再绑定本轮代码/构建并做R6实际Desktop验收。F5继续核对固定136项输入所需合法校验元数据并取得完整退出0，不能关闭policy或以活跃依赖可用替代。完成前不标记阶段4整体、阶段6、发布或新真实双来源验收通过。

完整机器证据、命令/cwd/退出码与ledger保留根下 `.local/audit-remediation-20261021/`。本轮没有真实生成、业务材料上传、对话发送、认证迁移、应用替换、Git提交/推送或部署。
