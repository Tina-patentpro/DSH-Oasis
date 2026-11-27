# M06 0.1.0-rc.1业务稿恢复最小离线方案 R1

2026-11-07，Asia/Shanghai；R4-01准备出口。状态：**DESIGN_READY_NOT_EXECUTED**。本轮只读核对准确源码/归档并固定本方案，没有创建测试根、业务记录、运行器或安装物，没有启动应用或调用模型/API。

## 1. 对象和准备结论

目标业务包为`oasis-professional-service/0.1.0-rc.1`，123成员归档SHA256 `a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3`。现有已验bundle为`061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c`，安装根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-public-installed-20261107-r1`，本方案不写入该根。固定Desktop2.0.17、DSH0.2.0-rc.2、Sidebar0.24.1、Cordis4.0.4、Node24.21.0、pnpm11.8.0及checkpoint3。

最小可实施切片是：**同一归档的公共业务服务→真实固定DomainFacility/JSON后端→审核/修订/保存→关闭进程→独立进程冷重读**。一次新合成执行器返回固定七字段样例，用于建立业务记录；它不是模型生成、真实Host运行或原生UI接受。全程不需要模型凭据、网站账户、HTTP、DSH boot或App。

现安装组合的零生成RPC只允许`state/get`、`workflow/catalog`、`workflow/v340/catalog`、`workflow/v340/prepare`。它不允许业务稿的创建、修订、审核或保存。不能通过改白名单、移除进程标记、伪造已有任务或手写快照，让当前预览承担业务恢复试验。下述公共服务合成试验在App之外进行，证据明确标synthetic；不能据此宣称原生受控入口可生成或已恢复业务UI。

## 2. 准确隔离范围和样例

拟用新根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-rc1-business-recovery-offline-20261107-r1`。**本轮未创建，未来须先确认不存在、非符号链接且不与任何现用根共用可写数据。** 若已经存在，先只读核对原回执，不清空或自动另换名字重试。

未来如执行该切片，复用现有本地061d bundle与其rc1冻结控制器，经原`installFBundle`官方流程将同版候选旁置到这个新根；只物化这一个被选场景，不重建或重包业务/宿主，不复制旧Profile/认证/存储。依赖仍按固定pnpm离线、冻结锁、忽略生命周期脚本物化；不手写安装JSON、nonce、link元数据或降低guard。

| 对象 | 绑定方式 |
|---|---|
| workspace A / B | `rc1-recovery-a`→新根`data/workspace-a`；`rc1-recovery-b`→`data/workspace-b`；映射在本次显式registry固定，不凭同名猜权限 |
| task / node / source | `rc1-recovery-task`／`Flow-2-6`／`local-skill`；实际运行标`evidenceKind=synthetic` |
| 初次请求 | `rc1-recovery-synthetic-once-r1`；合成执行器恰好一次，后续重读执行器只拒绝派发 |
| 运行及版本身份 | 从公共服务返回的`activeRunId`、`workflowRunUid`、`activeVersionId/resultVersions`捕获；不预填随机UID或手写run/revision |
| 输入与固定输出模板 | [recovery-case-r1.json](m06-rc1-business-recovery-case-r1.json)，公开自编机械阀合成材料；八输入中两项文本，其余明确未提供，不读评价答案/客户/原审核稿 |
| 字节身份 | 样例字段按UTF-8固定hash；真正`inputSha256`、业务MD/快照hash、生成文件名及保存回执必须由实际服务产生并在执行后捕获，不把样例模板hash冒充业务hash |
| 存储 | 新根`data/home/storages/oasis_workbench.json`，经repository/DomainFacility/JSON后端产生，不预写业务JSON；保存MD在workspace A根目录，无来源后缀 |

该样例只有一个工作稿和一次正文编辑，不变更T2/T4业务表行、不仿造专业结论，不替代原18250e4c固定稿。缺上游累计MD、表格/支持材料不足和`model_completion`未评估等由现公共装配器按合同产生，全部保留；不把固定稿的15条警示机械复制为新样例预设。

## 3. 已核公共接口与复用实现

以下均相对项目根，且实际归档成员已与安装c3逐字核对。只阅读了接口及有关路径，没有在本轮导入或执行产品模块。

| 接点 | 现有实现与准确接口 |
|---|---|
| 安装/所有权 | 新根自身`control/scripts/f-installed-runtime.mjs`的`installFBundle`、`checkFInstallation(root)`、`withInstalledWriter(root,'sdk',callback)`；冻结rc1控制器，不使用根下仍有旧0.0.1表的控制器来解释新包 |
| JSON provider | release `components/c5/index.mjs`导出的`createSingleOwnerJsonBackend(storage, JsonStorageBackend)`；先核installed lease，再取JSON root所有权。失败drain保留锁，不强解 |
| SDK Domain | 从同release App公开依赖解析`@deepseek-ai/dsh-storage-json`的`JsonStorageBackend`与`@deepseek-ai/dsh-storage-domain`的`DomainFacility`；先构造DomainFacility再`openOasisWorkbenchRepository(facility)`，不将业务Domain声明直接送低层KV |
| 业务建稿 | c3 `src/workbench-service.js`的`createWorkbenchService({repository,workspaceRegistry,v340Executor:{evidenceKind:'synthetic',generate}})`；顺序`createV340Task`→`updateV340Draft`→`createV340Run`。每次从repository当前revision构造command，核`committed/current`，不得强行递增revision |
| 修订与审核 | `saveV340ResultDraft`（`format:'core-markdown'`）→`editV340Result`（`baseSha256/draftSha256/requestKey/versionId`）→`reviewV340Result`（准确新版本、hash、`confirmed:true`） |
| 保存与引用 | `prepareV340Save`→`commitV340Save({confirmationToken})`；`resolveV340SavedFile`核`writebackId`和当前文件hash；`prepareV340ConversationDraft`只准备未发送资料 |
| 关闭与重读 | `service.closeV340Runtime()`→`repository.close()`→`facility.closeAll()`→`backend.close()`→writer释放；第二独立Node进程重新取得同根writer并沿同链打开、读取 |

固定SDK/所有权构造可复用[原合成UNKNOWN试验的withSdk结构](../evidence/2026-11-06-m06-p4-installed-update-r1/exercise-installed-update.mjs)，**不运行该旧脚本**：它带有旧根、旧请求及升级/回退动作。现`test/v340-result-fixture.mjs`仅参考公共服务用法，不采用其手写测试JSON后端冒充真实installed provider。也不使用任意`repository.mutate`、`state/replace`或直接`table.put`植入completed/approved/writebacks。

## 4. 未来最小执行步骤与判据

本节是待实施步骤，本轮各项均**NOT_EXECUTED**。执行落在新的具名证据目录，不回写本方案或旧收据。

1. **同版装配准入。** 核a7cf归档、061d本地bundle、固定控制器/依赖及新根缺失；只做新根官方离线安装和自身`--check`。旧两安装、新已验预览根、UNKNOWN和受限稿先固定hash。判据：123成员同版、checkpoint3和所有权有效；无App/Host/认证初始化或业务JSON预写。
2. **公共服务建立样例。** 在单一`withInstalledWriter`范围内打开真实Domain/JSON链，固定A/B registry；合成executor只返回样例七字段，调用三项公共建稿方法。等原run有限观察到completed即停止等待；不因超时/unknown再派发。判据：准确输入快照、`evidenceKind=synthetic`、一次合成执行、无真实请求；无效输出保留failed，不手修成成功。
3. **审核与修订。** 捕获V0及其hash，经公共审核后存正文编辑草稿，再公开`editV340Result`生成V1。判据：V0字节及审核保持；V1父版本明确、`not-reviewed`，未再审前`prepareV340Save`返回`V340_REVIEW_REQUIRED`；不改表行、输入/来源历史或原警示。
4. **再审与保存。** 对准确V1显式工程审核，prepare/commit无覆盖保存；捕获workspace/task/run/version/result/input/recordRevision/writebackId、文件路径及两类hash。判据：MD实际字节SHA等于V1 resultSha256，artifactId为`sha256:<同hash>`；保存回执属于同项目/版本，专业/用户接受仍未取得。回写索引失败则保留`WRITEBACK_COMMITTED_INDEX_FAILED`清单，禁止自动重试提交或删除文件。
5. **冷重读。** 完整关闭第一进程并确认退出code0/释放writer后，启动第二个仅SDK的Node进程（不启动DSH/App）；executor任何调用均计数并拒绝。重新打开repository，仅get同A业务记录并解析保存回执。判据：V0/V1、审核、保存文件、各hash、警示/未评估、当前revision和草稿状态与关闭前准确一致；零新增派发，读取前后业务文件字节不变。运行UID/真实时间导致的不同hash不得改expected解释。
6. **三个直接负例。** A的run/version不得在B中解析；用旧expectedRevision的审核/保存被拒绝且无文件/状态变更；对已有MD再prepare保存不得覆盖。只在新根测试，不触及旧业务稿。判据：观察准确错误/拒绝与前后hash，不能仅看命令退出0。
7. **当前文件与固定审核稿分开。** 最后仅在A保存的合成MD追加明确测试标记；调用`resolveV340SavedFile`应返回`kind:'current-file'`、新`currentSha256`且`matchesReviewed=false`，保留V1 resultSha256/审核不改。若生成固定版本对话资料，必须仍指向V1正文/hash而非磁盘已改文件；仅准备，不发送。
8. **租约与收尾。** 在父进程实际持有租约时，单独子Node只尝试取得同根合作writer，应拒绝，不能打开业务后端；父关闭后另一Node可取得并释放。最终保留新根及证据，不删除试验文件；旧保护对象hash相同，App进程/启动动作/HTTP/模型/API/上传/费用均未发生。

保存confirmationToken只在原运行管理器的本次进程有效，不要求冷重启恢复或重放token；冷重读对象是持久化版本、审核与已提交保存回执。断电耐久、任意非合作writer隔离、崩溃注入与真实未知模型恢复不在本最小切片内。失败时先观察原产物/收据及所有权，不重建根、seed状态、换请求键或增加生成次数。

## 5. 与原生、升级和授权的差异

| 动作 | 本轮 | 下一阶段所需准确范围 |
|---|---|---|
| 本方案、样例、接口/123成员身份核对 | 已授权准备；本轮完成 | 不需重问既定署名/许可/固定稿接受 |
| 新根离线安装及上述SDK公共服务业务写入 | 本轮未执行 | 明确允许该新根、同版061d/a7cf、一次合成执行、工程审核/修订/无覆盖保存/SDK冷重读及有限租约子进程；真实预算全0 |
| App/Host/UI业务恢复 | 不启动，也未准备新的正常模式bundle | 当前061d零模式不能开放业务结果操作；需先形成允许原有业务路径的准确受控配置/新bundle及范围，保持旧guard不变，再办理启动/业务动作。不沿旧两次启停许可再启动 |
| 升级/回退 | 不制造新目标、不执行 | 旧完整synthetic UNKNOWN升级/回退直接引用；真实新的升级差异出现后才选目标版本/输入，不能把一次SDK冷重读称升级验收 |
| 新真实生成、API、专业/用户接受及发布 | 均不执行 | 精确包/资源/Host/输入与去向/次数和费用、相应具名接受与渠道授权分别满足 |

本方案只关闭R4-01的“最小离线方案和授权差异准备”，没有关闭实际恢复、完整R3-03/F或可用业务Skill首发。R4-02技术事实另见[首发技术事实](../release/m06-public-0.1.0-rc.1/TECHNICAL-FACTS-R1.md)。本轮输入/hash、归档接口与保护核对见[准备回执](../evidence/2026-11-07-m06-rc1-recovery-release-prep-r1/execution-return.md)。
