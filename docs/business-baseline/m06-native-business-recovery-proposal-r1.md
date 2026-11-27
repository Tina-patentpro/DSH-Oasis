# M06 原生业务恢复最小方案 V0.1

2026-11-08，Asia/Shanghai；Codex，单代理。对应R5-01／DS-02、04、05。

**状态：方案可审，尚未批准实施；本轮只做静态核对。** 未实现、构建、安装、准备新业务数据或启动App/Host；模型/API/上传/费用/发送/发布均为0。本文不是原V0.1只读预览的扩权批准，原四项RPC白名单不改。

**目标：** 在新的隔离候选中，通过原生Workspace权威定位已有合成业务任务，复用现有结果页完成选择、展示、结果修订再审、无覆盖保存、固定版本资料和退出重启恢复。生成入口、输入修改、外部账户及导入保持关闭。

**依据：** [R5原计划](../plans/2026-11-07-project-summary-and-next-plan-r5.md)、[SDK恢复实际回执](../evidence/2026-11-07-m06-rc1-business-recovery-r1/execution-return.md)、[原生只读预览回执](../evidence/2026-11-07-m06-rc1-native-r1/execution-return.md)。本次整体及本项目followup已从S2-R1接到P1108；BM1-R1/S1/S2-R1/G1/GH1与原业务门保持，P1108没有新增实施许可。

## 1. 静态核对结论与方案选择

以下18份相关源码与061d/a7cf安装内对应文件逐字相同，见[源码—安装配对](../evidence/2026-11-08-m06-native-business-recovery-proposal-r1/source-installed-pairing.json)。本轮未执行产品模块或用旧测试充当新运行。

| 现有事实 | 来源及影响 |
|---|---|
| 业务记录有任务，activeTaskId=null | SDK记录revision9、taskOrder含rc1-recovery-task。`recordToWorkspaceState`把它映射为activePageId；null不证明数据丢失或产品缺陷 |
| 已有“重新打开”入口 | FunctionCenter→OasisWorkbenchSurface的resume→store.activatePage。现有activatePage经dispatch/自动保存调用`state/replace`，范围包含任务表单/标题/顺序等，不能直接对白名单放开 |
| 结果版本选择只在内存 | store.selectV340Version写pageOperations.v340Selection；持久化run.activeVersionId由结果修订服务更新。重启默认恢复活动版本，不承诺恢复任意临时查看的历史版本 |
| 审核/修订/保存/资料公共服务已存在 | v340-result-service及v340-runtime-service可复用；各自有revision、归属、审核和无覆盖合同。commit-save负载只有token，不能按负载缺少workspaceId就免做范围校验 |
| 新目录模式需要真实Workspace身份 | 固定DSH0.2.0-rc.2的WorkspaceRegistry.create(path,title)规范化真实路径，并以randomUUID创建ID；原生controller亦调用该方法 |
| SDK样例没有验证原生WorkspaceRegistry | 原runner第62行是测试get适配器，把rc1-recovery-a/B映射到隔离路径；Domain/JSON/writer是真实安装能力，但该适配器不是原生注册证明。不能只复制业务JSON或把目标原生UUID强改成测试ID |
| 取消零模式不能保证零调用 | 受控Host会构造原生M06执行器；客户端会尝试账户状态、专业bootstrap并出现候选生成按钮。仅靠界面禁用、无凭据或代理拒网均不足以定义恢复模式 |

**方案比较（以下为Codex提议，尚未由用户选定）：**

| 方案 | 取舍与结论 |
|---|---|
| 仅展示结果的只读方案 | 改动较少，但不能验证任务选择持久化、编辑再审和保存链；不能关闭R5-03对应缺口 |
| 独立受控恢复模式＋窄任务选择接口 | **推荐。** 复用结果页/服务，新增一个明确的任务选择命令；精确允许本地结果操作，服务端默认拒绝其余接口。需新代码、客户端构建及新候选，不能仅换配置 |
| 完整运行模式＋禁网/隐藏按钮 | 不采用：仍可能触达模型准备、账户读取、宽状态替换和其他业务操作，无法证明只做恢复 |

## 2. 身份、数据与隔离根

**冻结来源：** oasis-professional-service 0.1.0-rc.1，123成员；归档SHA256 `a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3`；bundle `061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c`。固定宿主Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4、checkpoint3及Node24.21.0／pnpm11.8.0/原锁不升级。

原SDK根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-rc1-business-recovery-offline-20261107-r1`，仍只保全原字节。工作区rc1-recovery-a、任务rc1-recovery-task、run `v340-18c30218-54f7-4d73-a0fb-18ccca8b6ae7`、V1 `revision-0c324380-1be7-459a-b737-b0afc184f521`只作来源身份，不伪装成原生注册对象。

原业务JSON SHA256 `c911b85a99981d671d4a9c51607bc4033e0b89da201dbf4d19c7ee9c7333e36b`；固定审核V1 `a18c75504f2609cf579540e80533424eaac54b0870e770b42453ce11f52b599b`；当前显式修改后的MD `4d486f429f5802215e0e546cc2dfc9431243a528a28038bf1d206c0231c6eed0`。三者都不改；原初次断言exit1、一次合成执行及后续接续证据保留。

**拟用新根：** `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1`，本轮未创建。新包版本、归档、bundle、安装ID和新业务ID均须由实际产物/公共服务产生，现为null，不预填rc.2或重用旧hash。

**数据准备推荐路径：** 在后续获准的离线准备中，先以固定版公开WorkspaceRegistry及实际安装Domain/JSON/writer，在新根创建/取回`data/workspace-a`的权威ID；验证其持久化与公开get/path一致。只能用真实公开设施；不以伪造get、手写Workspace表或复制旧认证替代。第二工作区B同样由权威创建，专用于归属负例。

再沿既有createV340Task/updateV340Draft/createV340Run公共服务，消费原公开自编场景的输入和synthetic response，**另建一个明确派生的原生恢复夹具**：新Workspace/task/run/版本和新输入hash，最多一次合成执行，真实预算0；原SDK completed run不重建、不重跑。派生记录链接原case/hash，明确本次必要增量是原生身份与UI链，不宣称迁移了原SDK历史对象。预置原稿及已审核保存V1均走公共服务；审核只标工程合成，不移授Tina D专业/用户结论。

**前置可行性门P1：** WorkspaceRegistry公开create的源码已核，但其在新根、无App/Host的离线设施装配尚未执行验证。后续先验证这个最小装配；若必须启动Host才能建立权威身份，停止依赖准备，返回方案修订并明确原生初始化的额外启停范围。不得自动换测试适配器、改旧ID或偷偷多启动。当前交付不声称新夹具/注册或候选可启动已通过。

## 3. 任务选择与界面行为

复用现有功能中心的“重新打开”、任务Tab、V340GenerationPage的输入/结果区域、历史版本、编辑、审核、保存和打开按钮。新模式在原区域显示：“本地业务恢复验收：仅处理本次合成任务，不生成、不联网或发送；审核仅为工程验证。”不新建页面、第二表单、账户中心或原生结构单槽。

1. 从DSH公开Workspace/Session上下文取得当前ID和真实路径；与本次可信恢复范围逐项匹配，失败即拒绝。经state/get加载任务，不按同名/相同hash跨项目寻找。
2. 无活动任务时保留空选择，展示已有任务的重新打开入口，不自动新建任务；点击目标任务后使用下述窄接口。冷启动有合法activeTaskId时恢复它；无效ID不回填任意任务。
3. 新恢复模式的activatePage必须进入既有按Workspace串行队列，发窄选择命令、消费权威revision，成功后才切换。禁用普通dispatch/自动state/replace路径；panel展开/隐藏仅在内存，不引发宽状态写入。
4. 选择版本沿原内存逻辑；本模式结果编辑只支持现有core-markdown，来源开关和八输入只读。候选确认/生成、新建、改名、删任务、导入及其他模板入口禁用；设置页不刷新账户。模式目录读取成功前也不得抢跑账户/bootstrap。
5. 恢复后先显示所选任务的结果区域和实际hash/审核/警示；当前文件有改动时明确原审核不适用于磁盘新内容。切换项目、任务或revision使未消费确认失效；编辑草稿沿原规则保留，不自动丢弃。

这是新的受控交互及模式边界，需要按项目AGENTS第4节确认**本V0.1**后才进入实现；原只读预览V0.1的批准不覆盖它。

## 4. 必要接口与写入边界

所有路径为本机现有`POST /api/oasis-workbench/<endpoint>`及原client envelope；这不是后台/Dify新API。恢复模式在路由与handler两层默认拒绝非清单动作，普通模式及原零预览白名单保持。新增模式和nativeZeroGeneration互斥，缺少/失配可信范围或两者同时配置必须拒绝启动，不能回落完整模式。

**可信范围来源（拟议）：** 新安装profile-template中的`nativeBusinessRecovery`策略及守卫文件/hash、准确新根和离线准备回执；Host从受控本地装配取得绑定的Workspace ID/规范路径、taskId、nodeId=Flow-2-6、单个completed run及来源指纹，校验后封存。浏览器、RPC负载、环境变量单独出现均不能授予范围。它不增加用户配置页，也不使用任何凭据。

新catalog字段拟为`nativeBusinessRecovery:{schemaVersion:1,policy:'m06-native-business-recovery-v1'}`，仅表明模式，不泄漏绝对根/策略文件。同步严格schema、Host和client；不复用nativeZeroGeneration=true冒充相同白名单，不把catalog字段本身当权限。返回目录不暴露可生成候选能力，dispatchEnabled仍为false。

| endpoint（恢复模式仅以下11项） | 负载／复用合同 | 允许效果及额外约束 |
|---|---|---|
| state/get | `{workspaceId}` | 只读本次范围内的实际工作区业务记录；先校验Registry身份/路径；B不能读取A |
| workflow/catalog | 现有workType schema | 只读目录，API/本地生成不可用；不因此开放旧模板入口 |
| workflow/v340/catalog | `{}` | 返回严格模式标识和只读目录；不触达账户/模型 |
| **workflow/v340/task/select（新增）** | 严格`{workspaceId,taskId,expectedRevision}` | `selectV340Task(command)`在repository.mutate的同一revision事务中检查真实Workspace、范围内已有M06任务及completed run；仅变activeTaskId，允许框架revision/updatedAt递增，其他内容不变。不接收整份state；同目标且当前revision匹配应无写入 |
| workflow/v340/result/draft | 现有workspaceId/taskId/expectedRevision/runId/baseSha256/body/format | 限绑定run，`format='core-markdown'`，保存/明确放弃核心编辑草稿；不改输入。baseSha须唯一对应范围内版本，歧义拒绝 |
| workflow/v340/result/edit | 现有versionId/baseSha256/draftSha256/requestKey及共同字段 | 仅已保存核心草稿形成新revision/parent关联；本模式拒绝m06Structure扩展；新版本未审核，旧表格/历史/警示保留 |
| workflow/v340/result/review | 现有versionId/resultSha256/confirmed=true及共同字段 | 精确版本审核，复用未决/草稿/revision拒绝；不抹去警示或变更专业/法律状态 |
| workflow/v340/result/prepare-save | 现有versionId/resultSha256及共同字段 | 只创建本进程内存plan/token，不写业务JSON/文件；当前真实工作区根、已审核固定版本、相对目录`.` |
| workflow/v340/result/commit-save | **仅**`{confirmationToken}` | 先校验该Host内存中由本模式prepare登记的token→Workspace/task/run/version/hash/revision/真实根，再委托原服务单次consume/publish；不得先consume检查后再consume。不接受外来、失效、跨进程或跨项目token |
| workflow/v340/result/conversation-draft | 现有versionId/resultSha256及共同字段 | Host只读生成固定审核版资料；沿原原生接口仅写当前会话未发送草稿，原归属/长度/确认规则不变，不截断、不发送 |
| workflow/v340/result/saved-file | 现有versionId/resultSha256/writebackId及共同字段 | 只解析该版保存回执，在当前权威根内安全读取；返回currentSha256/matchesReviewed，经Sidebar公共接口打开当前文件，不执行HTML/远程资源 |

`selectV340Task`是拟新增公共服务，不冒称0.1.0-rc.1已经存在。其返回沿现有`{committed,current,reason?}`合同；冲突返回`committed:false, reason:'revision-conflict'`及当前记录，禁止自动覆盖。范围拒绝拟返回`NATIVE_BUSINESS_RECOVERY_DENIED`，非法模式`NATIVE_BUSINESS_RECOVERY_INVALID`；原结果/回写错误原样保留，不借通用错误隐藏失败载荷。

**其余默认拒绝，尤其：** state/replace；workflow/v340/prepare、task/create、task/draft、candidate/prepare、candidate/run、run/create/observe/stop；全部account/*、import/*、professional/*、旧task/*、material/*、artifact/*。run/observe也不开放：现服务可能把prepared持久改为unknown，本例只允许completed run。不是按“read”命名就放行。

Host在恢复模式不构造原生M06执行器、localGeneration、账户或导入服务，不调用credential/accountStatus/模型准备；RPC外直接createV340Run亦因无executor拒绝。离线夹具准备的单次合成执行器只存在专用SDK准备过程，关闭后不带入原生Host或发行入口。DSH官方本地认证初始化若新根启动需要，单列未来范围，不能借此登录外部账户。

**磁盘允许范围（后续实际执行才生效）：** 新根内data/home/storages下官方设施数据及本次oasis_workbench.json；data/workspace-a内新派生MD/元数据及原写回服务临时区；官方新根user/home/userdata/cache/temp/evidence，以及本次具名证据目录。B不接收业务写回。旧根、日常HOME/Profile、旧产物/归档、凭据、源项目与远端均不写。新安装程序区只由固定安装/构建步骤生成，不由业务RPC写入。

**写入细则：** 任务选择不改taskOrder、标题、draft、输入快照、run、正文、审核、writeback；编辑只改本任务草稿/新版本；审核只绑定该版本hash；保存沿原原子发布与独占创建，重复文件拒绝。token/选择/审核受并发revision变化约束。索引写入失败且文件已落盘时保留原恢复清单，停止自动保存，不重新prepare/重发。所有业务写入必须持installed单writer，原生与SDK分时，不让两个Host或SDK/Host同时写。

## 5. 后续最小实现落点（本轮均未修改）

路径基准：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/`。实现继续使用现有结构，不建通用权限/Provider/迁移平台。

| 文件 | 必要变化 |
|---|---|
| packages/oasis-professional-service/src/m06-native-business-recovery.js（拟新增） | 单一受控模式的可信范围检查、窄选择服务及token范围记忆；复用repository公共事务，不直接写table/JSON |
| src/index.js、workbench-rpc.js、workbench-connection.js、v340-runtime-contract.js（均在上述业务包内） | 模式互斥和Host组合不挂执行器；11项精确接口及schema/新select注册；旧模式行为保持 |
| 业务包src/client/workbench-store.js、workbench-remote.js | 恢复模式窄选择入原队列，正确应用权威revision；阻止宽自动保存、输入/生成及bootstrap |
| 业务包src/client/OasisWorkbenchSurface.js、FunctionCenter.js、V340GenerationPage.js、product-settings.js | 复用入口和结果控件，清楚模式提示；输入只读、结果可审修、无新建/导入/账户/生成动作，目录读取前不抢跑 |
| scripts/f-installed-runtime.mjs及现有bundle准备路径 | 为**新派生控制器**增加可信恢复策略/新guard配对及launch spec；旧控制器原件/版本guard不修改。不能手工放宽旧package版本期望值 |
| 业务包test/m06-native-business-recovery.test.mjs、test/m06-native-business-recovery-client.test.mjs；scripts/tests/f-installed-native-business-recovery.test.mjs（拟新增） | 仅覆盖该边界与接续；新用例先RED再最小实现GREEN；复用旧结果/writer用例，不重造诊断器 |

策略/客户端/Host有代码变化，故需要新业务包、bundle、安装身份和旁置根；旧a7cf/061d保持。实际新版本及完整hash在构建/装配后另记，不仅改Profile就称同版候选。业务公共输入输出及原资源pin保持；本方案不扩成新模板/真实能力接受。

## 6. 可判定的后续验证与停止点

| 步骤 | 要求与出口 |
|---|---|
| P0 本次方案 | 代码/安装身份、11项接口、读写范围、身份缺口、UI行为及方案采用状态可审；仅文档完成 |
| P1 本地实现前段 | 在获准范围内实现/离线验证官方Registry的最小SDK装配、真实ID持久化；不启动App/Host、不读取旧认证。装配不成立即停，返回方案，不自动增加启停 |
| P2 离线实现/定向检查 | 选择仅改activeTaskId；未知任务/其他节点/跨项目/旧revision拒绝；宽state替换、全部禁止RPC、双模式/无可信策略拒绝；执行器/credentials/account/network访问计数0。验证直接绕过按钮亦被Host拒绝 |
| P3 离线装配及新夹具 | 固定工具/冻结锁/禁脚本/禁止自动下载；新根真实Registry ID下最多一次新派生合成run，走公共服务形成V0/V1/审核/保存。记录来源关系与新身份，旧SDK稿/JSON原字节保持；只完成准备，不启动。当前文件差异负例仅对本次新夹具的已保存MD追加具名合成标记，不改旧a18/4d稿 |
| P4 另行绑定原生启停范围后 | 只对实际新候选启动，选择同一任务→结果/固定版→编辑草稿→新版本未审→审核→无覆盖保存→安全打开/未发送资料；正常退出后重启一次，验证原生同任务/活动版本、草稿/审核/回执/文件及writer恢复。预期2次启动/2次正常退出；若另需初始化启停，必须先改准确范围，不自行追加 |
| P5 接续 | 原生恢复只关闭本方案实际验证子集；新公开资源真实生成、专业/用户、完整F/升级及发布仍沿R5-04或原合同另办 |

重点负例：①目录标识剥离或伪造不能绕过可信策略；②token只有字符串也不能跨项目/进程/失效revision提交；③当前文件改动保持matchesReviewed=false、固定资料不夹带改动；④并发writer拒绝且退出可复取；⑤选择历史版本不冒称重启持久化；⑥旧未决run不observe/stop/重派；⑦fixture source的7/9条警示与旧固定稿15条区分，新输出按实际数目判定。

未验官方SDK装配前不声称可原生复用旧记录；不以业务JSON无绝对路径就推断归属可迁移。若选用“复制/迁移旧业务历史”而非本次明确派生夹具，另列权限/迁移合同后再设计，不能把本方案当作迁移通过。

## 7. 交付与当前决定边界

本轮R5-01的最小方案出口完成；推荐方案、11项接口和新夹具路径均是**待确认的V0.1设计**，未批准实施，P1—P5未执行。执行方式已明确单代理，不再询问代理选择。新交互依[项目AGENTS第4节](../../AGENTS.md#4-设计与人工授权)“新增界面方案或重大设计变化须明确确认具体版本后实施”；后续确认本方案只覆盖当时明确的本地实现/离线验证，不能自动包含新包启动、真实调用或发布。

读取/完整字节hash、P1108并行变动及原件保全见[preflight.json](../evidence/2026-11-08-m06-native-business-recovery-proposal-r1/preflight.json)、[differences.json](../evidence/2026-11-08-m06-native-business-recovery-proposal-r1/differences.json)及[verification.json](../evidence/2026-11-08-m06-native-business-recovery-proposal-r1/verification.json)。本轮只在两current_entry追加本次导航，正被其他工作维护的总计划和中心不修改；旧R5及所有冻结材料保持。
