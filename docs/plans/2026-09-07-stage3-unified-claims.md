# 阶段 3：统一权利要求书工作区实施清单

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans and test-driven-development. 单代理分批执行；提交/推送依照下述最新授权顺序，不发布安装包或 npm。

**Goal:** 将已确认的 V3.1 落入实际插件，以“权利要求书生成”的可审阅文字草稿为首个模板，统一输入、来源与结果操作。

**Architecture:** 沿用现有 Host 工作流目录、Domain、revision 队列、内容寻址 artifact 和 Better Sidebar。新增来源合同只描述业务输入/状态，不实现 Provider 框架。阶段 3 使用非秘密合成执行；正式 Skills/API 均保留不可用状态，不伪装真实生成。

**Tech Stack:** 保持 DSH 0.1.2-rc.1、Desktop 2.0.5、Better Sidebar 0.18.0；React、Zod、Node test、现有 tsdown。

## 授权与目标合同

- 最新连续目标授权（2026-09-07）：完成整个阶段 3 后提交；随后全面审计阶段 3，按审计结果修复、复验，再提交新增变更并推送既有 GitHub 仓库。此授权取代本文件历史批次中的“不得自动提交/推送”，不扩大到真实调用、真实 Profile 安装或产品发布。主分支起点为 398e2b5，保留全部阶段 3 未提交成果；未完成验收前不提前将阶段记为完成或提交开发批次。
- 执行顺序：C1 修复 Sidebar/设置层级并原位复现验证；C2 原生安全预览及文件打开、双来源完整操作/跨项目/恢复/宽窄布局；C3 整体验证和开发提交；C4 提交后独立审计、定向修复复验、修复提交与非强制推送。每一步证据记录在本文或审计报告，不新建监管器。需通用补丁时保留固定上游版本、精确补丁及可复现装配，不修改安装在系统目录中的原件或共享包缓存。

- 2026-09-07：用户确认启动阶段 3，并回答“可以”，确认首个模板为权利要求书生成、输出可审阅文字草稿；不等于完整申请文件或专业审核结论。
- 当前起点：main / 398e2b5；工作树干净。阶段 2 的设置与 rc1 适配已存在，不重复实现。
- 不改真实 Profile，不装配真实私有 Skill，不调用真实 API/模型，不发生上传/费用。G-SKILL 继续未通过。
- 首模板 ID `patent-claims`，version/inputSchemaVersion `1`。七个文字页签：claims（权利要求书，必填，20000 字符）、technicalField（技术领域，12000）、background（背景技术，12000）、benefits（有益效果，12000）、embodiments（具体实施方式，20000）、drawings（附图说明，12000）、instructions（用户指令，4000）；其余可选。保留原型字段和顺序，不臆造 API 映射。
- 权威 API 文件及其既有基线不变；此批不读取远端目录。所有实际字段绑定保持待核实，不采用文档示例服务 ID。

## A：统一草稿页（本地实现完成）

### A1 合同、目录与显式迁移
- 新增 `packages/oasis-professional-service/src/generation-contract.js`：来源枚举 local-skill/oasis-api、首模板标识、schema 版本及不可用原因；无秘密、URL、执行实现。
- 修改 `src/workbench-contract.js`、`src/workbench-domain.js`、`src/workbench-repository.js`（以上 src 均在同一包下）：v4 在任务中加入 nullable generation 草稿元数据；v1/v2/v3 显式升级为 v4；旧任务 generation=null，旧运行/哈希/审核完全不变。
- `src/workflow-catalog.js` 增加独立 patent-claims@1；两项旧 local-mock 定义仅作历史兼容，不能改名为 Skills。Host 校验拒绝将新模板提交到旧执行入口。
- 测试：`test/workbench-v4-contract.test.mjs`、既有 migration/domain/repository/catalog 测试。先验证新需求失败，再实现。

### A2 来源与草稿持久化
- 修改 `src/client/workbench-model.js`、`src/client/workbench-store.js`：一份 formValues，来源切换只改 generation.source；通过既有 revision 保存，不发生成/专业 API 请求。
- 切换来源或输入使价格/外传/写回确认失效；旧运行快照保留。运行未解决时 Host 与 Client 均拒绝修改该任务来源/输入或删除任务。
- 保持 Workspace 归属与冲突处理，不自动覆盖。旧 v3 客户端不得把已升级任务的 generation 元数据静默清空。
- 定向测试：新 `test/unified-generation-ui.test.mjs` 与已有 store/model/persistence 测试。

### A3 实际选项卡与紧凑标题
- 新增 `src/client/GenerationSourceSwitch.js` 和 `src/client/UnifiedGenerationPage.js`；修改 `WorkflowForm.js`、`PanelPages.js`、`OasisWorkbenchSurface.js`。
- 统一模板显示一个输入模块、一个来源开关、一个生成入口和一个结果区；不挂旧 ProfessionalServicePanel/材料上传/流水观察。历史任务仍可读原结果。
- 宽度依据自身容器，不按屏幕宽度猜测：宽时标题/开关/提示同行，窄时提示换行；窄栏输入与结果选项卡切换。页签可键盘选择，每次只显示一个编辑区域。
- 此批正式生成禁用并显示具体原因；不接旧 mock 冒充新来源。结果空态如实提示。
- 验证：React 渲染与事件/状态测试、生产构建；浏览器视觉与实际 Desktop 留到 C，不以组件测试宣称 V3.1 实际视觉验收。

## B：双来源合成闭环（本批 B1–B3 本地实现完成，余项见台账）

2026-09-07 用户批准下一步。执行拆为 B1 运行合同/Host、B2 同等产物/审核/无覆盖保存、B3 同页接线/对话草稿；保留 A 全部未提交变更，不提交或推送。

- B1：在 v4 的 runs 中新增 unified-fixture；source 与 evidenceKind=synthetic 分开；状态 prepared/completed/failed/stopped，pending 不带结果。v3 合同仍只接受历史种类。输入哈希覆盖模板、schema、来源、合成版本和七字段；completed 产物使用既有 artifact。默认不启用，Host 仅在 DSH_HOME 为项目批准隔离目录且显式开启合成标记时开放。持久化 prepared 后锁外执行，回写逐项核对原运行；CAS 冲突只重试保存已得结果，不再次生成。中断保留 prepared；明确停止后拒绝晚到结果。
- B2：复用 task/review 和 artifact/prepare-writeback、commit-writeback；新增 task/edit-result，仅允许 completed 合成产物，创建 parentRunId 链接的新版本并重置审核，旧正文/哈希不变。写回元数据包含 synthetic/source/版本关系。待完成或已停止运行不得审核/保存。
- B3：workflow/catalog 返回可选合成 capability；旧 Host 缺失时默认禁用。同一个生成按钮、结果区和审核/保存操作处理两个来源；保留明显合成标签。新增只读 artifact/conversation-draft 按 Workspace/task/run/artifact 校验已审核固定正文，Client 经 rc1 公共 InputActions.setDraft 准备对话草稿；原草稿非空、Session/Workspace 已变或接口缺失时拒绝，不使用 submit/send、不覆盖原稿。设置偏好及文件打开/富文本预览若未接完保持待验收，不冒充完成。
- 验证：先写真实仓库/服务的定向红灯测试；内存 Domain 仅替代磁盘存储。覆盖双来源、请求去重/锁/中断、编辑后再审、篡改/跨项目拒绝；再检查 RPC、组件/Store 和构建。真实 Desktop 仍属于 C。

- 新增显式 `unified-fixture` 运行种类，分离 source 与 evidenceKind；只在批准隔离 Profile 的合成模式启用，默认关闭。不把旧 local-mock 改写成新来源。
- 沿用 Host run/review/writeback 服务和 artifact；先登记运行/输入/配置快照，执行在锁外，回写核对 workspace/task/run/revision；每 Workspace 至多一个活跃运行。
- 两类 fixture 使用同一结果预览/审核/版本/保存，缺失分析标未评估。编辑正文创建新版本并撤销审核；不修改旧 artifact。
- 在未知结果、断连、重复回调、配置变化、切换任务时不自动重新创建或换来源。
- 复用公开 Sidebar 文件打开和 DSH 对话草稿能力；只准备引用，不自动发送。接口不满足时禁用该动作并记录具体缺口，不用 DOM/私有 store 兜底。
- 只在 DSH 原生设置中补必要默认来源/项目输出偏好；默认来源仅影响新任务，账户/API 绑定保持待核实；网站地址未确认时不编造链接。

## C：集成验收与记录

### B4–B5 本轮实施范围（2026-09-07 用户同意下一步）

1. 在现有设置 namespace 中加入 `defaultGenerationSource`（默认 local-skill）和 `outputDirectoryPrefix`（默认空，仅安全 Workspace 相对目录）。来源在选择新模板时读取一次；前缀仅预填新任务的待确认保存目录，不创建文件、不改变既有任务/已准备清单。API origin/JWT 的重启和失效规则保持不变。
2. 将旧 WorkflowChooser 换为 V3.1 功能中心：保留技术研发/专利撰写/辅助工具分类；只有 Host 提供的统一模板可新建，旧 local-mock 仍可读取已有任务。原生文件、任务管理、侧边对话、浏览器入口经 Sidebar getTabs/isTabEnabled/openTab + targetedOpen 调用，按当前唯一 Workspace/Session 校验；无能力时禁用，不模拟点击、不修改 Sidebar 私有状态。
3. 定向测试覆盖设置值校验、只影响新任务、无生成/文件副作用、原生入口 scope/偏好/生命周期。随后构建并在既有隔离 Desktop 验证已接通的页面与设置；不以未覆盖项目宣称 C 全部通过。
4. 固定 DSH MarkdownText 公开实现明确自动加载 HTTP(S) 图片且无资源关闭参数；Sidebar 0.18.0 的 Markdown 文件打开默认进入 preview，并有 raw-HTML 路径。因此本轮不直接把不可信产物交给该预览，也不新增自制渲染器。保留安全纯文本；原生文件打开/富文本预览记录为待解决安全能力缺口，不能声称已交付。

- A/B 各只跑受影响测试；集成候选执行包内 `pnpm run verify` 一次。
- 使用现有隔离 Desktop，检查功能中心（保留侧边对话）、宽/窄输入结果页、草稿重开、双 Workspace、双 fixture 审阅/保存/原生文件打开/对话草稿。验证前后核对真实 Profile 基线。
- 保存最少截图/命令/退出码；不新增监管器、全 Slot 扫描器或自动审计平台。
- G-UNIFIED 只在 A/B/C 都有证据后通过。真实 API、本地私有 Skill、最终安装包及发布不在本阶段成果声明中。

## 证据台账与停止条件

- 起点证据：`git status --short --branch` 干净；现有代码仍是两套表单，OasisSettingsSection 已在阶段 2 实现。
- A1–A3 本地实现已完成，状态 **STATIC_ONLY**：可创建统一权利要求书草稿、按七个页签编辑、切换来源并持久化；正式生成仍禁用。未将新模板提交到旧 mock/API 面板。
- v1/v2/v3 通过显式迁移读取为 v4；测试核对旧运行/哈希保持不变、revision 冲突、旧客户端元数据丢失拒绝、未解决运行的输入锁定。未迁移真实 Profile。
- TDD 记录：新 schema、目录、来源方法及选项卡测试先失败；补齐实现后通过。Host 旧 mock 入口先触发错误执行路径，加入阻止逻辑后返回 GENERATION_NOT_ENABLED，未读取材料或调用 mock。
- 2026-09-07，Shell：cmd；工作目录 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service`。
  - `node --test --test-reporter=spec test/workbench-v4-contract.test.mjs test/unified-generation-ui.test.mjs test/workbench-migration.test.mjs test/workbench-domain.test.mjs test/workbench-repository.test.mjs test/workbench-model.test.mjs test/workbench-store.test.mjs test/workflow-catalog.test.mjs test/workbench-persistence.test.mjs test/workbench-v3-contract.test.mjs test/workbench-service.test.mjs test/workbench-contract.test.mjs test/workbench-rpc.test.mjs test/workbench-remote.test.mjs test/panel-persistence-ui.test.mjs test/panel-local-loop-ui.test.mjs test/embedded-workspace-host.test.mjs test/workspace-context-bridge.test.mjs test/host-tool.test.mjs test/panel-keyboard.test.mjs`：161/161，退出码 0。
  - `pnpm run build`：退出码 0；已更新本地 client 构建文件，未安装到真实 Profile。
  - 构建后 `node --test --test-reporter=spec test/client-build-contract.test.mjs test/client-panel-contract.test.mjs test/bundle-contract.test.mjs test/package-contract.test.mjs`：25/25，退出码 0。
  - 仓库根目录 `git diff --check`：退出码 0。
- 边界：以上为本地合同/状态/组件渲染/构建证据，未执行完整 verify、真实 API/模型/私有 Skill、浏览器或 Desktop 验收，未提交/推送。
- A 结束时待完成：双来源合成执行、同等结果编辑/审核/保存/对话复用、功能中心融合与 Desktop 宽窄视觉验收；输入预览当前仅安全纯文本，宿主 Markdown 预览接线仍待完成。G-UNIFIED 尚未通过，不把 A 批次算作阶段 3 全部交付。
- 如旧数据哈希变化、误接真实服务、Profile 非隔离、非公开宿主接线、或需改变七个字段语义，停止相关修改；保留其他已验证工作并说明原因。

### B1–B3 本批记录（2026-09-07）

状态：**STATIC_ONLY**。以下为实际生产源码 + 本地合成测试，不是 Desktop 已安装或真实生成已验收。

- `unified-generation-service.js` / `unified-fixture.js`：持久化 prepared、锁外合成、固定输入/来源哈希、同请求只观察、不重新执行；停止后晚到结果不写入；v3 历史种类与 v4 合成运行分开。
- `unified-fixture-environment.js`：仅在显式 OASIS_UNIFIED_FIXTURE=1 且 DSH_HOME 精确指向项目 `.dsh-test/stage2-desktop` 的非重定向隔离目录时启用；此为开发验收开关，不是用户业务设置。本轮未设置真实 Host 的环境变量、未启动 Desktop。合成 Host 同时禁用旧专业 API runtime，目录读取也不解析凭据/发请求。
- `UnifiedGenerationPage.js` / `UnifiedResultPanel.js`：同页生成合成样本、共同版本/审核/修订/保存入口；正文安全纯文本呈现。修订创建新 artifact，重置审核并保留 parentRunId；两来源共用原有两步无覆盖写回管理器，输出 Markdown 与包含 synthetic/source 的元数据。
- `conversation-draft-bridge.js` / `ConversationInputRegistration.js`：按 rc1 `SessionStandardProps.useInput/inputActions` 和 `InputActions.setDraft` 公开合同接线。Host 按 Workspace/task/run/artifact/revision 校验审核版本，只返回固定正文资料；Client 校验当前会话、项目、输入 revision 和空草稿。能力缺失/已有文字或附件/会话切换时禁用或拒绝；不调用 submit/send，不使用宿主私有 DOM/store。当前是固定正文复制到草稿，不宣称原生引用 chip 或已发送。
- 本轮复用 A 已有未提交改动，未暂存/提交/推送；未读取凭据原值、调用真实 API/模型/Skill 或修改真实 Profile。文件写回测试只创建系统临时目录内的新输出。

验证命令（cmd，包目录）：

1. 定向红绿测试覆盖合成入口缺失、来源/审核/版本、请求去重/停止、RPC、对话占用/会话变化、禁用旧 API 目录和关闭保护。
2. `pnpm run verify`：构建与当时 316 项测试通过；npm pack 阶段因全局 npm-cache 的 EPERM 退出 1，不记为整条 verify 通过。
3. 收尾接线后 `pnpm run build`：退出 0。
4. `node --test --test-reporter=spec test/*.test.mjs`：最终 317/317，退出 0，包括 Store→RPC→Host→Domain 双来源合成、审核和对话草稿联通。
5. `npm pack --dry-run --json --cache ..\..\.tmp-npm-cache`：退出 0；55 个打包条目，不含测试或 Profile。只复验失败打包步骤，未修改系统 npm 设置或权限。
6. 仓库根目录 `git -c core.safecrlf=false diff --check`：退出 0。

剩余交付：功能中心与原生侧边对话入口融合、必要的默认来源/输出偏好原生设置、原生文件打开/宿主 Markdown 预览，以及 C 隔离 Desktop 宽窄布局/重开/切换实测。不得把本批 317 项测试或合成结果作为这些能力已完成的证据。真实 Skills/API、G-SKILL、最终安装包/发布仍不在本批结论内。

### B4–B5 与 C 局部 Desktop 记录（2026-09-07）

本次授权“同意进行下一步”后完成必要设置与功能中心接线，并在既有隔离 Desktop 验证以下业务路径；不把本段结果提升为阶段 3 全部通过。

#### 已实现与观察到的业务能力

- 原生 DSH 设置“绿洲工作台”新增默认来源、保存目录前缀，复用既有设置 namespace/存储。默认来源只在新任务选择模板时读取；本次将默认设为专业 API，创建的新任务确实选中专业 API，旧任务仍保留。
- 保存目录前缀 `stage3-output` 在新任务中预填 `stage3-output\<taskId>`，不创建目录、不触发生成。沿用无覆盖管理器：前缀所指父目录必须已存在；本次只验证预填，实际保存时手工改为 Workspace 根内的全新目录。该建议保存在当前页面操作状态中，刷新后保存目标需重新填写，不冒充任务持久化设置。
- 功能中心保留三个业务分类和原生文件/任务管理/侧边对话/浏览器，不提供终端/文件变动入口。只有 Host 已提供的权利要求书统一模板开放；其他模板显示待接入，未用旧 local-mock 代替。原生入口逐次校验公开 Sidebar 能力、启用状态和唯一 Session/Workspace 归属；文件入口对应固定 Sidebar 的 `editor`。
- 在 workspace-b 新建“阶段3-双来源合成”，七字段表单中填写权利要求书文字。先通过专业 API 标记 fixture 生成、审核版本 1；切换本地 Skills 后输入不丢失，再生成、审核版本 2。两次都明确显示合成验收，没有真实 API、模型或 Skill 调用。
- 版本 1 经现有两步确认，实际创建 Markdown 和元数据文件；“在对话中使用”将固定审核正文放入当前 DSH 主对话草稿，未发送。版本 2 生成后，已有对话草稿被保留，不覆盖；其“在对话中使用”因占用而禁用。
- 从功能中心打开原生“侧边对话”，进入 Sidebar 新对话页；没有调用模型。初次截图仍是加载状态，随后页面文本检查确认原生输入页就绪，截图本身不作为就绪证明。
- 刷新后确认本地来源、权利要求书输入、版本 1/2 和版本 2 审核状态保留。自动重开流程两次被稍晚出现的 DSH 无密钥引导弹窗挡住，均不记作通过；关闭已出现的“稍后配置”后，不再次刷新，完成恢复结果断言与截图，退出 0。

#### 运行环境与最小证据

- 使用已安装 Desktop 2.0.5 的隔离启动，`DSH_HOME` 为 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage2-desktop`，独立 user-data-dir 为同根 `.dsh-test\stage2-desktop-userdata`；明确开启合成开关，未改真实 Profile。实际页面回报 Desktop 2.0.5；沿用阶段 2 锁定的内置 DSH rc.1 / Sidebar 0.18.0 组合，没有升级或重新解析 latest。
- 本次 Workspace：`3cdf1fd9-ba0c-4cac-aa6d-8809c1078ae2`；新任务：`7674663b-eec4-4f8f-a946-936cf72c7971`；版本 1 运行：`run-8cb9b02a-e204-4938-939a-a17eb4142bd8`。均为批准隔离环境标识。
- 实际输出：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage2-workspaces\workspace-b\stage3-api-20260907\patent-claims.md`，337 字节，SHA-256 `cb58b043b83800ea814e4529b783d1f4e2e1a9629e9510fcb294c0e678a49aec`，与已审核 artifact 一致。同目录 `patent-claims.oasis.json` 明示 `unified-fixture` / `oasis-api` / `synthetic` / `approved`。
- 截图目录：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\playwright\stage3-20260907`。关键文件：`function-center.png`、`native-settings.png`（遮挡问题）、`saved-conversation-draft.png`、`synthetic-local-result.png`、`claims-restored.png`；均为真实隔离 Desktop 界面，不是新原型或真实生成证据。
- 真实目录 `C:\Users\TinaD\.dsh`（14143 个条目）与 `C:\Users\TinaD\AppData\Roaming\DSH Desktop`（6390 个条目）使用已有基线模块采集内容哈希，链接不跟随。Desktop 关闭后比对 `changes=[]`，退出 0。原始路径/哈希清单只保存在已忽略的 `.dsh-test\stage3-baselines`，不随截图或发布包分发。
- 已关闭本次隔离 Desktop。CDP 的 Browser.close 因目标正常退出而抛出连接关闭错误（命令退出 1），随后独立进程/监听检查返回 `DesktopProcesses=0; IsolatedPortListeners=0`、退出 0；不将关闭脚本自身冒记为成功。

#### 新鲜验证与边界

Shell：cmd；验证工作目录 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service`。

1. 设置/新任务偏好、功能中心/原生入口测试先红后绿；定向设置 29/29、UI/协调器 25/25，均退出 0。首次全测 321/322，失败来自旧测试仍要求功能选择页的任务改名框；将该断言放回历史任务页保留改名覆盖后，定向 5/5，退出 0。
2. 最终 `pnpm run verify` 使用仅当前命令生效的仓库本地 npm cache：构建、322/322 测试、`npm pack --dry-run --json` 均完成，整条退出 0；打包 57 项，无测试/Profile。没有修改全局 npm 配置。此前 PowerShell 包装器被本机执行策略或原生命令 stderr 处理打断，未当作 verify 通过；最终使用 cmd 包装器运行。
3. 一次性 Playwright 操作脚本仅连接当前隔离 Desktop，复用现有工具；生成两次合成样本、审核、保存、对话草稿以及恢复断言均有上述实际结果。没有新建验证器平台。
4. 本次未暂存、提交、推送、发布或修改真实配置；既有阶段 3 A/B 未提交修改全部保留。真实 API 映射与真实生成仍没有验收证据，G-SKILL 未通过。

#### 交付问题与后续最小顺序

1. **设置弹窗遮挡：**1600×1000 CSS 视口下，原生 DSH 设置弹窗右侧被 Sidebar 覆盖，鼠标关闭操作被截获；键盘操作可以关闭，但不是问题修复。下一批先在固定 Desktop/Sidebar 装配边界查明层级 owner，优先现有公开能力，必要时只做通用最小补丁；不得在绿洲业务中读写宿主私有 DOM/store 或复制设置。没有旧构建对照，暂不判定为本批引入或历史问题。
2. **安全原生预览缺口：**固定包 MarkdownText 自动加载 HTTP(S) 图片，且公开参数未提供关闭外部资源能力；Sidebar Markdown 默认进入预览并存在 raw-HTML 处理。因此本批不接产物自动文件打开/富文本预览，保留安全纯文本。后续仅评估最小通用资源禁用能力；不能用自制渲染平台、混淆或“默认可信”绕开。原生通用文件入口与“安全打开生成产物”分开验收。
3. 修复必要集成问题后补 C：按面板实际宽度验证宽/窄布局和 V3.1 信息层级，验证双 Workspace 隔离、两来源各自的编辑后再审/保存/对话草稿，并核对保存目录偏好的可用性。不把本次仅一来源文件落盘/对话草稿、单 Workspace 和窄栏结果当成完整对等性验收。

**结论：**功能中心、原生新任务偏好与双来源合成主链已有实际 Desktop 局部证据；C、G-UNIFIED、真实生成和最终安装包/发布均未完成。后续继续聚焦上述业务阻塞，不扩展诊断工具链。

### 连续目标 C1：Desktop 设置层级修复（2026-09-07）

- 本目标首轮为实际进展：新增受控 Desktop 补丁和本地装配，补丁副本原生设置关闭操作通过；未执行开发提交，C2/C3/C4 尚待完成。
- 根因复现：原设置关闭按钮中心命中 Sidebar 的“功能中心”，失败断言退出 1。原生 Settings 自身 z-index=1000，但其祖先 Desktop `#root` 同时具有 fixed、translateZ(0)、isolation:isolate，形成低层级上下文；Sidebar 是 body 的另一个层级（25）。因此不是绿洲设置组件的问题，也不能仅降 Sidebar z-index 解决。
- 最小实验先移除 fixed/transform 后仍失败；补充 computed-style 证据定位到同一根容器上的 isolation。统一移除根容器层叠隔离后鼠标关闭成功。实验仅作根因证据，不作为已装配验收。
- 正式补丁位于 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\patches\desktop-2.0.5`：只变 Desktop 自有 `src/client/extended-styles.ts` 的根容器定位/transform/隔离，不改原生 Slot、业务 DOM 或 Sidebar 私有 store。保持 36px 顶部留白、标题栏独立层级和 shell-overlay 的既有 transform。上游版本仍为 2.0.5，自有 revision 为 oasis-frame-1。
- `scripts/assemble-stage3-desktop.mjs` 是此补丁的本地装配入口，不是诊断器：校验安装源 package/client/map 的固定哈希，在全新 `.dsh-test\stage3-desktop-app` 中复制运行时并应用精确补丁；拒绝覆盖、重定向与未知输入。源文件没有被改写，未改真实 Profile、升级版本或下载依赖。首次预检发现 sourcemap 保留 `${DESKTOP_FRAME_HEIGHT}` 而编译输出使用 36px，未复制任何文件；加入该精确源代码形式的测试后装配退出 0。
- TDD：补丁缺失时行为测试红灯；最终 `node --test tests\desktop-frame-patch.test.mjs` 3/3，退出 0，覆盖原生弹窗层级策略、未知/重复/已打补丁输入拒绝及 sourcemap 帧高度变量保留。只修改 CSS，生成行数保留，map 的源内容同步修正。
- 实际运行复制的 `.dsh-test\stage3-desktop-app\DSH Desktop.exe`，不是修改系统安装，也不是浏览器响应替换；复用批准隔离 DSH_HOME/user-data-dir。原生页面报告 compatibility / Desktop 2.0.5；测试没有注入 CSS，确认根容器 absolute/none/auto、Settings 关闭按钮可命中并实际点击关闭、关闭后工作台仍在。1600×1000 CSS 视口中标题栏高度 36、内容区 y=36/high=964 断言通过，退出 0。
- 补丁输出 client SHA-256：`cb332b89b011a53b437bf9732a0c3421629c638829bab2b84f269477b0055204`。安装原件 client 哈希仍为 `3d20a3abc3578fb0b984eea7c1d57109fb553e895b90b15485315d589d0562fb`；装配记录保留在副本根 `oasis-patch.json`。
- 截图采集先后在 8 秒和 30 秒超时，均记失败，不修改浏览器/GPU/系统环境。几何和鼠标操作单独复验退出 0；截图参数改为可选仅为继续功能复验，**不将缺失截图当成视觉通过**。还需在 C2 补充 extended 模式、宽窄工作区视觉与导航回归。C1 属于已修复并取得局部运行证据，不代表整套 Desktop 补丁发行验收。
- 复制实例已关闭；关闭连接产生预期断开错误后，独立检查确认 DesktopProcesses=0、IsolatedPortListeners=0、退出 0。本轮 `.dsh` 与 `AppData\Roaming\DSH Desktop` 前后哈希比对为 `protectedRoots=2, changes=[]`，退出 0；原始清单只留在忽略的 `.dsh-test\stage3-closure-baselines`。`git -c core.safecrlf=false diff --check` 退出 0，未暂存或提交。

下一步 C2 保持原目标，不降级为仅纯文本交付：评估在固定 DSH MarkdownText 增加向后兼容的显式远程图片禁用能力，原始 HTML 继续不执行；由 Sidebar 自有文件预览接线消费该能力，再由绿洲通过公开能力检查使用。默认缺失能力时仍禁用不安全路径，不复制通用编辑器、聊天或渲染器。补丁必须在实际候选运行时中验证没有自动资源请求，再补两种 fixture 的保存→原生文件打开→对话草稿以及同等修订审核路径；C2 完成前不进行 C3 开发提交。

### C2 局部：原生安全 Markdown 与统一预览接线（2026-09-07）

状态：**STATIC_ONLY**。本轮有实际产品代码进展，未启动新构建 Desktop，不代表 C2 完成。

- 对候选真实 `MarkdownText` 先做红灯验证：即使传 `allowRemoteImages:false`，原版仍输出两个远程图片元素；能力标识缺失。补丁现在对内联/引用图片统一显示替代文字，保留标题、加粗、表格和 HTML 转义；默认调用方仍允许原有图片行为。禁图模式走现有 settled parser，不保留可能带图片的流式缓存。公式依赖浏览器 DOMParser，留到实际 Desktop 校验，不用 Node 测试冒充。
- 精确补丁、输入哈希和公开合同保存在 `patches/dsh-0.1.2-rc.1`，revision `oasis-markdown-resources-1`。只改 `.dsh-test/stage3-desktop-app` 的复制包，系统原件两个哈希前后不变。候选 `lib/index.js` 新 SHA-256：`b4d84b32da9c0c992993373416b73f949b4425bcc7b2d38280e2593f61201ae4`；记录见候选根 `oasis-markdown-patch.json`。本轮没有修改真实 Profile 或调用真实生成。
- 输入七页签预览与两来源结果共用 `SafeMarkdownPreview`；仅在原生 `resourcePolicyVersion===1` 时传禁图参数，旧宿主退回纯文本。没有文件 resolver、HTML 注入或自制 Markdown 解析器。`client-entry.js` 仅承担原生组件导入，业务 Client 通过参数注入该组件，构建明确外置原生包，避免打包未修补副本。
- 固定原生包增加明确 peer/dev 依赖并更新项目锁文件。离线元数据缺失、沙箱网络 EACCES 后停止重试；经受控升级仅从官方 npm registry 更新锁文件（`--lockfile-only --ignore-scripts`，退出 0）。未安装这些依赖、未运行安装脚本；新元数据缓存保存在忽略的 `.tmp-pnpm-cache`。候选运行时仍使用复制的固定安装包，锁文件不替代候选运行证据。
- 本地装配脚本已包含两个精确补丁及源哈希保全；`node --check scripts\assemble-stage3-desktop.mjs` 退出 0。未重跑全量复制：现有候选按一次性精确哈希检查补丁更新，装配入口仍拒绝覆盖已有候选。
- 验证（cmd）：根目录 `node --test tests\native-markdown-policy.test.mjs tests\desktop-frame-patch.test.mjs`：6/6，退出 0。包目录 `pnpm.cmd run build`：退出 0；`node --test test\unified-generation-ui.test.mjs test\unified-generation-client.test.mjs test\client-build-contract.test.mjs test\client-panel-contract.test.mjs test\package-contract.test.mjs test\bundle-contract.test.mjs`：34/34，退出 0。`git -c core.safecrlf=false diff --check`：退出 0。本轮未执行全量 verify、暂存、提交或推送。

下一步仍在 C2：为 Sidebar 原生文件预览增加显式安全选项，保留普通文件打开默认行为，保证 tab 去重/重开不丢安全策略；按当前 Workspace 的持久化 writeback 文件记录打开 Markdown，不接受任意路径。然后一次隔离 Desktop 验证输入/结果富文本、公式/恶意资源无自动请求、两来源保存→原生文件打开→对话草稿，并补齐宽窄/跨项目/恢复。完成这些业务证据后再进入 C3/C4，不扩展旧诊断链。

### C2 更新：安全原生文件与双来源实际闭环（2026-09-07）

本轮有实际产品交付进展；以下为隔离 Desktop 合成证据，不是真实 API/Skills 生成，不代表整个阶段完成。

#### 实现与装配

- Sidebar 补丁 `patches/better-sidebar-0.18.0` 增加 `safeFilePreview`、`openFile(...,{safePreview:true})`。安全与普通页独立去重；安全元数据按原生页签保存，安全页只选择 Markdown/文本读取器，禁用 raw HTML、远程图片、HTML/自定义资源读取器接管。使用既有编辑器，普通文件默认行为不改。
- 新只读 RPC `artifact/saved-file` 根据 Workspace/task/run/artifact/writebackId/revision 查持久化保存记录，服务端解析项目内现存 Markdown 路径并拒绝越界、重定向、硬链接；不接受客户端任意路径。异步返回前后核对 revision，Client 再核对当前任务/运行和原生上下文。UI 标明“当前文件可编辑，不沿用审核结论”。
- 实际启动发现：组件 npm 包补丁已存在，但原生 Web 入口内嵌旧 MarkdownText，仍显示纯文本回退。新增同一策略的精确 Web 构建补丁及 `web-baseline.json`；不另造渲染器。新资源 `index-oasis-0e1ea3eccc233ba6.js` 的 SHA-256 为 `0e1ea3eccc233ba66f566c1af3115d88d49c848447934d730d9818da9db63631`，候选入口 HTML 引用新文件，旧资源与系统原件保留。
- `scripts/assemble-stage3-sidebar.mjs`、`scripts/assemble-stage3-web-markdown.mjs` 已纳入既有全量 Desktop 装配。输入固定版本和字节校验，未知/重复补丁拒绝；只改项目候选，不修改系统安装或真实 Profile。精确修改编译文件不等于上游源码重建。

#### 实际业务证据

- 输入预览以无秘密合成材料验证标题、加粗、表格、公式。内联图片、引用图片及原始 HTML 中图片均不产生请求；脚本显示为文字，没有执行。两来源结果使用同一原生组件和限制。
- 隔离 Workspace-b 新任务“阶段3-安全文件双来源”生成 API 标记样本，审核后编辑为版本 2，确认重新进入待审核且保存入口不可用；再次审核后无覆盖保存、打开 Sidebar 安全文件页，原生编辑器可读相同正文。准备对话草稿成功，未发送。
- 本地标记样本以同样顺序形成版本 3/4，完整生成→修订→再审→保存→原生预览/编辑→对话草稿操作脚本退出 0，测试资源请求为 0。API 文件另外重新打开复验，资源请求同样为 0。
- API 操作脚本第一次错误地等待未审核时的保存按钮；实际产品正确隐藏该入口。改为“入口不存在”的断言后从已有修订版本继续，没有重新生成或重复创建。之后 Playwright fill 未清除原生受控输入，被原有草稿保护正确拒绝；备份已知合成草稿后用正常键盘全选/退格清除，再插入成功，没有改业务保护逻辑。
- 两文件分别位于 `.dsh-test/stage2-workspaces/workspace-b/stage3-safe-api-20260907/patent-claims.md`（667 字节，SHA-256 `62b564a8cab96b1142f8d096c16511d3080581631510e3ed900b1e2d6177f58a`）和 `stage3-safe-local-20260907/patent-claims.md`（672 字节，SHA-256 `73262f99dcea452e3d1da2797137c5a16387af971a7339366e0ceb3b7e556a69`）。元数据明确 synthetic、来源、schema 和 parentRunId；结构化证据见 `output/playwright/stage3-20260907/safe-file-artifacts.json`。
- 刷新后本地来源、四个版本、当前审核版本和安全文件页恢复，未发起测试资源请求。经原生项目菜单切到 Workspace-a 时，不显示 Workspace-b 的任务/打开文件动作；切回后原四版本恢复，操作断言退出 0。
- 实际结果截图 `output/playwright/stage3-20260907/safe-file-result.png` 已采集并查看，显示原生对话草稿与保存文件入口。宽 952.33px / 窄 448.33px 工作区几何检查无水平溢出；宽窄完整截图仍有超时，不记视觉验收通过，也不以几何断言替代完整视觉证据。
- 相同候选的原生设置鼠标关闭与 36px frame 复验退出 0。尝试原生“扩展窗口”后等待导航超时，期间保持 compatibility；稍后候选发生重启、调试端口消失，模式结论仍待核实。仅在核对候选可执行路径及主进程隔离 user-data-dir 后清理残留进程，未关闭其他 Desktop。

#### 验证与保全

Shell：cmd；包内命令工作目录为仓库的 `packages/oasis-professional-service`，根测试在仓库根执行。

- Store→RPC→Host→真实临时文件→公开原生打开接口的双来源链路、已保存文件 UI/归属/路径/能力拒绝及协调器测试：`node --test test\unified-generation-service.test.mjs test\saved-file-open.test.mjs test\function-center.test.mjs`，10/10，退出 0。
- Web 策略测试先因缺函数红灯，最小实现后通过；最终根目录四项补丁测试 8/8，退出 0。公开组件/构建接线受影响测试 12/12，退出 0。
- `pnpm.cmd run build` 触发自动依赖安装并因无 TTY 拒绝清空模块目录，退出 1；未允许 purge 或更改全局设置。改用现有依赖的 `npm.cmd run build`，退出 0。最终同一 verify 脚本由 `npm.cmd run verify` 执行：构建、326/326、pack dry-run 59 项全部完成，退出 0；仅当前命令使用项目本地 npm cache。
- 真实 `C:\Users\TinaD\.dsh` 与 `C:\Users\TinaD\AppData\Roaming\DSH Desktop` 前后内容哈希比较 `changes=[]`，退出 0，原始清单仅留 `.dsh-test/stage3-safe-file-baselines`。最终独立检查 `DesktopProcesses=0; IsolatedPortListeners=0`，退出 0。
- 未暂存、提交、推送、发布或调用真实生成，保留全部既有阶段 3 修改。

**剩余顺序：**C2 只收口必要的完整宽窄视觉/扩展模式及保存目录前缀真实使用，不继续建立环境诊断工具链；然后 C3 完成开发提交，再 C4 独立审计、修复复验、修复提交及推送。模式或截图再次形成重复外部阻塞时明确说明边界，不无限重试或提前宣称 G-UNIFIED。

### C2 收口与 C3 开发验收（2026-09-07）

- 启动前确认候选进程/端口均为 0。只读检查已批准的隔离 Desktop 偏好中 `mode=extended`，重新启动同一候选后，实际页面 URL、body 属性及顶部控件均报告 extended/2.0.5；无需修改宿主代码或伪造 URL。
- 保持实际窗口尺寸，不调用 `setViewportSize` 模拟大于原生窗口的尺寸。本次通过 Sidebar 原有拖动柄调整宽度，实际业务容器 952.33px 时输入/结果并列、开关居中、提示同排；448.33px 时分页显示且提示下移。两张实际截图 `unified-960.png`、`unified-448.png` 均采集并人工式查看，业务容器没有水平溢出。宽栏由用户拖动占用较多宿主空间时主对话随 Sidebar 原有行为收缩，不把其截图当作主对话最小宽度的保证。
- 扩展模式的原生设置关闭按钮中心可命中并实际鼠标关闭，frame 高度 36、内容区 y=36/high=innerHeight-36；`stage3-settings-layer.mjs --native --screenshot` 退出 0。截图 `settings-frame-patch.png` 已查看，原生设置不再被 Sidebar 覆盖。此前等待模式切换和截图超时不再作为未完成结论，但保留失败记录，不篡改旧证据。
- 在隔离 Workspace-b 中新建验收父目录 `stage3-prefix-acceptance`（原来不存在），在 DSH 原生绿洲设置保存该前缀及默认 API。旧“阶段3-安全文件双来源”仍是本地来源；新“阶段3-保存前缀验收”默认 API，生成/审核后预填 `stage3-prefix-acceptance\fb1fc3db-62c5-4dd8-9ff7-fa9059ea11e9`，未手改目录即完成新目录保存并原生打开。此为合成验收；父目录必须存在，不承诺未提交保存目标刷新持久化。
- 最终功能中心截图 `function-center-final.png` 已查看：保留文件、任务管理、侧边对话、浏览器及三类业务选择，无终端/文件变动入口；未实现模板禁用，未伪装完成。以上截图均在 `output/playwright/stage3-20260907`，没有凭据。
- 正常 CDP 退出后独立检查确认 `DesktopProcesses=0; IsolatedPortListeners=0`，退出 0。两处真实 Profile 前后强基线比较 `changes=[]`，退出 0；原始清单留 `.dsh-test/stage3-final-ui-baselines`，不打包或提交。
- 开发验收重跑既有包 `npm.cmd run verify`（仅当前命令使用本地 cache），构建、326/326、pack dry-run 59 项，退出 0。根补丁 8/8 与前述行为证据对应同一未改动代码候选；未运行真实 API/模型/Skill。

**G-UNIFIED：阶段 3 合成范围通过。** 同页同草稿/七字段、切换无生成、副本来源追溯、同等修订/审核/保存/原生文件/对话草稿、旧记录迁移/哈希、原生设置及 Workspace 隔离已有对应测试和上述运行证据。正式 API 绑定、真实私有 Skill、真实费用、完整发行升级属于后续阶段，不宣称通过。现在执行 C3 开发提交；随后依用户授权独立审计该提交，发现问题后修复复验，再提交并推送。目标在 C4 完成之前保持 active。

## C3/C4 提交后审计与修复（2026-09-07）

开发提交：`12afb9dff84a67a6cf2a051b7f29afe4aec55190`。提交后重新审计业务合同、异步状态、审核版本、Workspace 文件/对话边界及固定补丁，复现两处 P2：生成响应覆盖同项目另一任务未保存材料，以及版本切换后插入晚到资料。两项均先取得失败断言，再定向修复，不添加新的诊断框架。

修复后定向 14/14、包 verify 构建与 328/328、pack dry-run 59 项，退出 0；实际隔离 Desktop 已加载修复构建，正常审核版本放入原生对话草稿且未发送。关闭后进程/端口为 0、真实 Profile 基线 changes=[]。完整审计/修复与证据边界见 `docs/evidence/2026-09-07-stage3-post-commit-audit.md`；精简新构建运行记录见 `output/playwright/stage3-20260907/audit-fix-runtime.json`。

剩余为修复提交和非强制推送；不将这一步扩展为真实服务调用、真实 Profile 安装或产品发行。GitHub main 已只读核对为开发基线 `398e2b5b5cf31d8c8c3d96f094942e39fb1b3ec2`，如发生远端推进则停止推送而非强制覆盖。

### 推送门禁结果

修复已提交为 `597189d`。执行已授权的 `git push origin main:main` 时，安全审查在进程创建前拒绝：远端保全规则禁止代理修改既有远端默认分支。没有实施推送，不改用其他命令、工具或分支绕过。用户须在本项目目录人工执行 `git push origin main:main`；若远端有新提交而拒绝快进，不使用强制推送。人工操作后再只读核对远端 SHA。连续目标尚未全部完成，剩余仅此人工推送及核对，不重做已完成的开发/审计/运行。
