# 已完成内容审计修复实施计划

> 执行者按 `superpowers:executing-plans` 单代理逐任务执行；变更先复现、定向验证，结论前使用 `superpowers:verification-before-completion`。以下复选框为待执行项。本次请求仅制定计划，不执行修复、启动、安装、提交或发布。

**Goal:** 关闭2026-10-21审计的F1–F5，使当前候选、未决保护、结果编辑与审核、干净恢复分别具备可核对的收口证据。

**Architecture:** 沿用现有Desktop启动准入、原生LLM适配器、业务持久化及共同结果组件。先恢复固定输入并补齐断连状态语义，再将编辑草稿从组件移交现有客户端store管理、增加固定版本审核确认；供应链恢复在旁置干净目录完成，不改业务宿主架构。

**Tech Stack:** zsh；Node24.21.0、pnpm11.8.0、npm11.19.0；Desktop2.0.17 / DSH0.2.0-rc.2 / Cordis4.0.4 / Sidebar0.24.1及已审补丁；React18.3.1；Flow-2-6/0.2.2。

**Spec:** [审计报告](../evidence/2026-10-21-completed-work-audit.md)、[开发路线图](2026-10-13-oasis-development-roadmap.md)、[五项界面与功能需求](../design/2026-10-18-ui-five-changes.md)、根目录AGENTS.md及当前15图批准记录。

## 范围与全局约束

- 根目录为 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，沿用 `mac/continuity-v2`；计划起点HEAD为 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。复用现有工作区，不另建分支或子代理。
- 本次方案覆盖5项审计问题；不将阶段4其余卡片布局、版本改名/删除、对话完善、智能完善及升级入口一并算作本修复完成。它们继续留在阶段4实施范围。
- 2026-10-21已批准A1–E2共15张、此前13张基准均保持原件及原批准。修复沿用已确认语义；若需要新增或重大改变界面，先形成具体差异再按项目规则确认。
- 保全已有未提交设计/状态、9个运行、两来源原稿与人工修订、全部旧审核/保存记录和失败证据。旧unknown不得重判、清锁或通过复制任务规避保护。
- 不覆盖 `/Users/tinadong7036/Applications/DSH Desktop.app`、日常Profile或现有认证；应用恢复采用旁置目录。恢复包不能只凭版本号或最高文件名选取。
- 不恢复取消的G-SKILL保密门禁；凭据、项目归属、费用确认、安全预览、原生草稿保全及无覆盖写回继续有效。
- 旧模型/API预算已消费；本计划无须新真实生成即可完成代码修复与合成验收。任何新的真实调用须另有明确预算，不因“执行修复计划”自动新增。
- 新鲜Desktop操作是独立运行验收项：F1通过、精确固定候选装配后再执行；不以旧GUI、`--check`或组件夹具替代。
- 代码改动后只审阅更新相应准入条目，保留旧清单和逐项差异；不得把当前漂移的2.0.18哈希写入2.0.17旧验收。
- 原始证据保存在根下 `.local/audit-remediation-20261021/`；仓库只收源码、测试、计划和脱敏报告。提交/推送/部署不由本计划自动授权。

## 修复批次与依赖

| 批次 | 对应发现 | 交付 | 前置条件 |
| --- | --- | --- | --- |
| R0 | 全部 | 冻结输入和保全账本 | 执行开始 |
| R1 | F1 / P1 | 固定候选恢复及准入 | R0；可核验2.0.17原件 |
| R2 | F2 / P1 | 不确定断连保持unknown | R0；可独立于R1做无网络修复 |
| R3 | F3 / P1 | 版本/任务/项目切换不丢编辑 | R0；复用现有依赖 |
| R4 | F4 / P2 | 明确确认固定审核版本 | R3，复用草稿与操作失效规则 |
| R5 | F5 / P2 | 干净恢复与供应链证据 | R0；合法来源及校验元数据 |
| R6 | 全部 | 当前候选集成验收与逐项复审 | R1–R4通过；F5状态单列 |

推荐顺序：R0 → R1材料核验 → R2 → R3 → R4 → R5 → R6。若R1原件或R5元数据缺失，记录具体材料阻塞并继续R2–R4；这不等于F1/F5通过。单代理串行推进。

## 审查重点

1. 原生SDK将网络异常包装为finish.error后仍需识别不确定性；不能将“流结束”直接解释成提供方已取消。R2负责。
2. 已确认拒绝、完整响应后的格式错误与不确定断连必须区分；避免修复后所有失败都永久锁死。R2负责。
3. 同一runId/正文哈希不能跨Workspace、任务复用编辑草稿；异步保存返回不得清除后续新编辑。R3负责。
4. 审核确认打开后切版本、产生新版本或状态变化，原确认必须失效；双击提交不能重复登记。R4负责。
5. 恢复与验证不得写坏活跃依赖/应用，不能靠关闭校验或重算旧pin制造成功。R1/R5/R6负责。

## R0 冻结修复输入与回退材料

**文件与证据：** 读取AGENTS.md、当前状态、审计报告、`.local/audit-20261021/`、当前manifest/lock和批准记录；新增本地保全账本。不修改产品源码。

- [x] 记录实际分支、HEAD、Git暂存/未暂存差异及未跟踪文件清单；保全当前工作树，区分本轮新增文件与既有用户文件。
- [x] 记录审计报告、源文件、package/lock、32项准入、15图批准记录/图片及13图基准的当前哈希；出现新漂移先记录，不覆盖旧审计快照。
- [x] 对当前业务存储与项目文件保存非秘密的只读快照/哈希；复制范围明确排除credentials、Cookie与认证数据库，不把秘密写进账本。
- [x] 核对进程和存储写者。禁止在现有Host仍写同一存储时做安装/替换；保全阶段不停止无关应用，也不删除startup.lock。
- [x] 建立逐项状态表：F1–F5均为待修复/待验证，另列原历史结论、当前结果与下一步；本轮计划保存不改变验收状态。

**退出条件：** 后续每个改动有可回退原件，能证明用户既有修改与业务证据未被混入或覆盖。

## R1 恢复固定Desktop候选并保持漂移拒绝

**关联：** F1。修改范围为必要的 `scripts/macos-development-launch.mjs`、`tests/macos-development-launch.test.mjs`、`docs/development-layout.md`及忽略的本地准入；不改签名应用内部内容。

**已知材料缺口：** `.local/stage0-20261013/cleanup-manifest.json` 曾记录2.0.17展开件移入 `/Users/tinadong7036/.Trash/dsh-lab-stage0-20261013/01-desktop-2.0.17`；本次计划只读核对，该路径已不存在。不能将清单存在当作恢复件存在。

- [ ] 根据原安装/交接清单定位指定2.0.17分发包、原始SHA256及签名来源；逐项核验原件。不从目录排序推断，不把2.0.18当作替代。缺失则将“指定2.0.17原件和可核验来源”列为材料阻塞。
- [ ] 在不覆盖现应用的前提下，拟将核验通过的原件恢复到 `/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/runtime/desktop-2.0.17/DSH Desktop.app`；目标必须是新建目录，已存在时先核对归属，不能强制覆盖。
- [ ] 增补启动合同：应用真实版本与候选一致；更新器/另一应用替换该路径后，任一受控pin漂移或缺文件均在spawn前拒绝。旁置恢复失败不得修改旧准入。
- [ ] 先运行新增定向合同确认失败，再只按核验原件更新本地app路径及对应文件路径；内容hash应与原2.0.17输入一致。若原件内容不一致，停止并解释差异，不直接改成新hash。
- [ ] 两种 `--check` 分别验证；检查通过后仍只标记准入通过。修复后Desktop运行保留到R6执行门槛，不在本步骤新增真实调用。
- [ ] 记录旧/新应用路径、版本、完整性/签名结果及32项pin差异，更新开发入口说明；保持现2.0.18应用原字节。

**验证命令（zsh，根目录执行）：**

```zsh
tools/bin/node --test tests/macos-development-launch.test.mjs
tools/bin/node scripts/macos-development-launch.mjs --check
tools/bin/node scripts/macos-development-launch.mjs --check --real-acceptance
```

**关闭F1：** 指定2.0.17可恢复且准入通过，R6再证明当前装配可运行。若用户决定评估2.0.18，则另记明确版本决定、重新冻结整个组合并取得新运行证据；此替代路线不自动执行。

## R2 修复派发后断连的未决状态

**文件：** 修改 `packages/oasis-professional-service/src/dsh-generation-adapter.js`；必要时修改 `src/local-generation-service.js`，保持现有状态模型。测试为 `test/dsh-generation-adapter.test.mjs`、`test/dsh-stream-lifecycle.test.mjs`、`test/local-generation-service.test.mjs`。

**接口：** 保持 `createDshGenerationAdapter(...).generate(input)` 和 `{status, code, executionSummary}` 返回合同。新增行为使用现有 `unknown` / `GENERATION_FAILED`，不将原始网络错误、堆栈、指令或部分正文持久化。

- [x] 把审计替身复现转成正式回归：原生替身先返回部分正文，再ECONNRESET；预期unknown、无result、未决锁保持。修复前必须观察到failed及错误解锁导致测试失败。
- [x] 增加无网络场景：派发后首包前断连、部分正文后断连、没有权威finish的截断流、SDK包装的未知传输错误、unknown后迟到正文/终态及重启观察。预期不重派发、不解锁、不发布部分正文、不增加运行。
- [x] 同时固定反例：原生明确认证/额度拒绝、明确max-tokens终态、收到完整stop后业务格式不合格，继续按可证明的失败类别处理；既有TIMEOUT/ABORTED unknown语义不放宽。
- [x] 在适配器内部区分派发进度与终态证据。SDK生成的finish.error不能单独作为提供方明确终结证明；传输结果不确定时返回unknown。保持120000ms期限，不换模型/来源，不加自动重试。
- [x] 检验真实业务服务的持久化：同requestKey观察不重跑，新requestKey被 `WORKSPACE_GENERATION_ACTIVE` 拒绝；输入/来源保持锁定，存储异常仍不重建请求。
- [x] 运行以下定向组；记录红/绿命令、退出码和调用计数。本轮替身外部请求数必须为0，旧真实unknown不迁移、不回填。

```zsh
cd /Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service
../../tools/bin/node --test test/dsh-generation-adapter.test.mjs test/dsh-stream-lifecycle.test.mjs test/local-generation-service.test.mjs
```

**关闭F2：** 经原生运行库包装后的不确定断连保持unknown；持久化/重启与迟到保护通过，原明确失败的负例仍成立。

## R3 保全结果编辑草稿与保存竞争

**文件：** 修改 `src/client/workbench-store.js`、`src/client/UnifiedResultPanel.js`、`src/client/UnifiedGenerationPage.js`、`src/client/PanelPages.js`、`src/client/OasisWorkbenchSurface.js`；沿现有actions接线修改必要的 `OasisPanelHost.js` / `OasisPanelPortal.js`。新增 `test/result-edit-drafts.test.mjs`，扩展 `test/unified-generation-client.test.mjs` / `test/unified-generation-ui.test.mjs` / `test/panel-local-loop-ui.test.mjs`。以上路径均相对业务包。

**选定方案：** 在现有客户端store的pageOperations中按runId管理结果编辑草稿，身份为Workspace + taskId + runId + baseArtifactId。切换版本/任务/Workspace只切视图，保留原草稿；清除只发生在指定草稿成功提交或明确放弃时。继续复用Host的 `editUnifiedResult` 生成待审核新版本，不直接改旧artifact。

**接口约定：** store增加 `updateResultEditDraft(workspaceId,pageId,runId,body)`、`discardResultEditDraft(workspaceId,pageId,runId)`；页面通过 `operation.resultEditDrafts[runId]` 读取 `{baseArtifactId, body, revision, dirty}`，不接受跨项目或已失效基准。保存沿用 `editUnifiedResult`，捕获草稿revision，成功后只清理仍与该revision一致的草稿。

- [x] 正式回归覆盖“A编辑→B→A”、切任务、切Workspace、隐藏/再显示面板，恢复原逐字正文；同runId跨项目不得串稿。以现组件本地useState的丢稿结果作为红证据。
- [x] 增加保存竞争：保存期间新增输入、响应晚到、请求失败、revision冲突、新版本切换与基准失效。失败或冲突保留正文；旧响应不能清掉新草稿，不能将正文归到另一项目/版本。
- [x] 将正文受控值和编辑状态接入上述store草稿；dirty状态禁止审核/引用/回写，不把草稿当已生成或已审核artifact。
- [x] 保存成功创建新版本且审核重置，原版本原字节保持；明确“放弃编辑”才删除对应草稿。关闭任务页或显式重新载入将丢弃草稿时必须先阻止并提示处理，不能借现有运行记录确认悄悄删除正文。
- [x] 沿用现有版式和反馈区域说明“未保存编辑”；不借此实现整个阶段4视觉重构。组件夹具之外补实际组件挂载/卸载验证，避免只在自制hook模拟器上得到绿灯；不为此新增产品依赖。
- [ ] 运行草稿、统一客户端/结果UI、对话草稿与保存的受影响组，并在R6做当前Desktop路径验收。

**关闭F3：** 审计复现的版本切换丢稿消失；同进程的任务/项目/视图切换及异步保存不会丢失或串用正文。

**持久化边界：** 本批客户端草稿保全不冒充应用强退后恢复。用户已确认的“输入实时保存”继续由既有输入持久化合同处理，不能用本批内存草稿替代。若阶段4要承诺未提交结果编辑跨进程恢复，须另明确持久化schema、迁移和退出合同后实施；R6报告明确这一未执行项。

## R4 将打开审核与登记批准分开

**文件：** `src/client/UnifiedResultPanel.js`、`src/client/workbench-store.js`、`test/unified-generation-ui.test.mjs`、`test/unified-generation-client.test.mjs`；复用 `test/workbench-service.test.mjs` 核对Host固定版本审核合同。

**接口：** 继续使用现有 `reviewRun(workspaceId,pageId,runId,status,note)`；客户端确认绑定 `{workspaceId,pageId,runId,artifactId}`，打开确认区域不调用Host。状态变化导致确认失效。

- [x] 写红测：点击审核入口时Host调用数为0；仅展开就地确认区，展示版本、来源、短哈希和风险/待确认问题未评估信息。
- [x] 写失效测试：打开后切版本/任务/项目、正文产生新版本、进入编辑、结果不可用或有新未决状态；旧确认不得批准当前新版本。
- [x] 增加重复提交与失败场景：双击确认只登记一次；调用失败不展示成功，也不解锁保存/引用；重新确认需要当前身份有效。
- [x] 实现明确的“确认审核版本N”和取消动作，沿用已确认设计的操作层级。按钮默认不自动聚焦到批准；Esc取消，键盘焦点可回到入口。
- [x] 确认通过后仅批准所选固定版本；编辑成新版本仍待审核，风险提示不因approved自动消失。保留历史误操作记录，不批量撤销旧approved。
- [ ] 定向验证两来源相同行为；R6用现有公开产物/合成版本核对实际键盘与宽窄窗口，无新真实生成。

**关闭F4：** 一次入口点击不会登记批准；当前固定版本只有明确确认后获批，所有身份变化和重复提交路径受保护。

## R5 在旁置目录关闭供应链与干净恢复缺口

**文件与输入：** 主包package/lock、固定pnpm及既有store保持原件；新建 `.local/audit-remediation-20261021/clean-restore/` 与日志。补充 `docs/development-layout.md` 和本次修复证据，不重建诊断工具链。

- [ ] 复核原始依赖恢复失败日志、minimumReleaseAge/供应链规则、实际解析的92包及固定工具输入；列出缺少的精确验证元数据及其官方来源。不能只写“网络恢复后重试”。
- [ ] 优先核对已有合法缓存/交接原件；若确需获取元数据，先形成仅限固定锁图与官方registry的获取范围，明确不获取新包版本、不发送凭据或业务材料。缺少许可/来源时保留材料阻塞，不改变policy。
- [ ] 在全新旁置目录复制批准manifest/lock及必要源码，使用独立私有HOME/cache和固定store。使用pnpm11.8.0，offline、frozen-lockfile、ignore-scripts、禁止包管理器自动下载；针对既有store迁移显式关闭optimisticRepeatInstall。实际选项须先按固定pnpm自身帮助/既有成功命令核对，不靠另装CLI验证。
- [ ] 完整物化命令必须退出0，且供应链/完整性规则保持启用；验证依赖正文、链接、storeDir、lock与上游/补丁指纹。包版本变化、校验拒绝或缺少元数据任一出现，F5保持未关闭。
- [ ] 在干净树执行固定构建与包测试/打包，检查归档、工具、运行数据和认证未入包；不能将活跃node_modules复制过来充当干净安装。
- [ ] 对活跃应用、原依赖及旧失败材料复核原字节保持。输出可复用恢复说明与明确的全过程退出码，不将目录已经形成等同于政策通过。

**关闭F5：** 从干净目录完整恢复全过程退出0，依赖身份、政策和构建证据齐备。既有依赖可构建仍只支持局部结论，不代替本关闭标准。

## R6 集成、当前Desktop验收与审计收口

**文件：** 新增 `docs/evidence/2026-10-21-audit-remediation-closeout.md`；执行完成后向当前状态追加精确摘要，原审计/验收记录保持。本文件是未来执行产物，计划制定时不创建虚假收口报告。

- [ ] 对冻结后的同一源码/依赖候选执行一次完整主包verify等价三步：固定Node调用tsdown、主包全量node tests、固定npm pack dry-run；用私有不同user/global npm配置避免重复加载。无需通过pnpm run再次触发物化。
- [ ] 根目录运行Mac启动合同、受影响安全预览/文件与对话桥接合同；列清跳过项。先前“869通过/2跳过”和“14通过”仅是基线，不预填为修复后结果。
- [ ] 逐项审阅新lib、源码/资源和准入差异，绑定同一候选后再次执行两种 `--check`。只有必要已审变化可更新本地pin，不放宽漂移拒绝。
- [ ] 在已获明确运行许可的前提下，以默认合成模式启动隔离Desktop，保持固定57517/loopback，使用新合成版本验证F3/F4、长文、宽窄窗口、键盘与焦点；R2使用无网络替身，不用新增真实模型/API故障实验。
- [ ] 验证两来源共有结果操作、编辑新版本/再审、无覆盖保存、原生打开及固定审核资料草稿。测试后还原已知测试草稿，对话不发送；若无法安全保全原composer则停止该操作并保留未验状态。
- [ ] 正常退出/重开验证已有输入、来源、运行、审核、保存与旧unknown保持；对预先记录的文件和业务快照作精确对照，解释测试新建记录，不能声称修改后的全库仍逐字相等。
- [ ] 依据本计划关闭标准复审F1–F5，分别填“已修复并验证／代码通过待GUI／材料阻塞／未执行”，附输入哈希、命令、退出码与证据路径。F5未关闭时只可发布局部修复结论，阶段6继续未完成。
- [ ] 对初始用户修改、15+13设计基准、日常应用/配置做保全复核。执行批次如获得明确Git提交授权，仅提交列明的源码/测试/脱敏文档；不使用 `git add .`，不自动提交全部既有设计，不推送或部署。

## 验收总表

| 发现 | 必须满足 | 当前状态 |
| --- | --- | --- |
| F1 | 2.0.17原件可核验；旁置候选准入与当前装配运行通过；2.0.18原应用不被覆盖 | 未执行；已知恢复件缺失 |
| F2 | 不确定断连unknown、禁止新增请求、重启及迟到保护，确定失败反例不回归 | 代码/无网络原生替身及持久化合同通过 |
| F3 | 版本/任务/项目切换逐字保全，保存竞争与冲突不丢稿，实际组件和Desktop证明 | 代码/真实组件通过；Desktop待验 |
| F4 | 审核入口不直接批准；固定版本明确确认；失效、重复和键盘路径正确 | 代码/真实组件通过；Desktop待验 |
| F5 | 干净恢复与供应链/完整性验证全过程退出0，固定依赖和原件保持 | 旁置复用92包；136项校验45秒未完成，未关闭 |

**本计划交付：** 修复范围、选定方案、执行顺序、材料门槛和验收标准已明确。当前仅完成计划制定，不将任何修复或新版本/运行/费用许可登记为已完成。

## 2026-10-21执行进展

用户另行批准先执行不受2.0.17缺件影响的工作。R0与R2已完成；R3/R4代码、测试及真实React DOM/StrictMode组件验收通过，包含Desktop的复合步骤仍留未勾选。R5旁置恢复校验未完成，R6代码集成部分通过而Desktop部分未执行。最终886项测试884通过/2历史跳过、14启动合同、4组件场景通过；没有提交、推送、修改准入或真实生成。详见[本轮收口](../evidence/2026-10-21-audit-remediation-closeout.md)。上文“仅制定计划”为初始交付边界，不覆盖本次后续执行授权。
