# Week 3 材料输入到结果预览本地闭环详细设计

- 日期：2026-08-25
- 状态：独立全面复审修复完成，并于 2026-08-29 依据 `docs/第三周-全面复审修复报告.md` 重新关闭
- 基线：DeepSeek Harness `0.1.1-rc.2`、`oasis-professional-service@0.0.1`、Git `main` / `02b3eb7e40ff230689be8cae4218180869de836e`

## 1. 设计结论

Week 3 不接入 Dify、收费管理或真实专业服务，而是在现有右栏与 Workspace 持久化之上建立一条可验证的本地闭环：

```text
Host 版本化工作流目录
  -> schema 驱动表单
  -> 项目相对路径材料引用与 Host SHA-256
  -> Host 捕获不可变输入快照
  -> 本地确定性 mock 运行
  -> 安全结果预览与运行历史
  -> 人工审核
  -> 两阶段 no-overwrite 写回
```

核心架构裁决是：**用户可编辑草稿与 Host 所有的材料证据、运行快照、审核结果、写回记录必须分权**。Client 继续负责右栏交互，但不得通过 `state/replace` 创建、修改或删除单个历史运行。所有证据型变更只能由 Host 的专用领域命令产生。

## 2. 需求来源与阶段合同

### 2.1 来源

- `docs/plans/2026-08-24-dsh-beta-overall-plan.md` 第 4.3～4.5、第三周路线、7.2、7.3 和质量门；
- `docs/PRD-DSH免费工作台.md` 的 CAT、FILE、ART、GATE、本地产物与血缘、专业输出合同和 DSH 插件验收要求；
- 已关闭的 Week 2 合同：Workspace 主键、Domain Storage、revision/CAS、Client 串行保存、A/B 项目隔离和右栏三态；
- 用户已确认的界面原则：左栏和中栏不动，右栏是项目关联的多任务工作区，工作流选择后原页转换。

### 2.2 Week 3 目标合同

1. 工作流卡片来自 Host 版本化目录，而不是 React 硬编码。
2. 选择工作流后保持同一 `taskId`，原位显示 schema 表单、材料、运行和预览。
3. 材料只以项目相对路径登记；Host 解析 Workspace 根、流式计算 SHA-256，不把文件正文写入状态或日志。
4. 每次生成由 Host 从权威草稿捕获不可变输入快照；相同输入和固定 mock 版本产生相同正文和产物哈希。
5. 修改输入只影响当前草稿；再次生成创建新运行，旧输入快照、旧结果和旧审核状态不变。
6. 技术研发与中国发明专利各提供一套本地演练输出；结果明确标为 mock，不宣称真实专业结论。
7. `blocked` 结果不得批准或写回；其他结果经用户明确批准后才可提交写回。
8. 写回先 prepare、后 commit；显示绝对目标和文件哈希，只能写入项目内用户确认的**新目录**，不能覆盖已有路径。
9. Host 重启后恢复草稿、材料引用、运行历史、审核和已完成写回记录；未提交确认令牌不恢复。
10. 新证据覆盖静态、单测、构建、Host 重启、真实浏览器、Profile 保全和文件系统前后基线。

### 2.3 非目标

- 不调用真实 Dify、商业平台、收费、报价、账户或上传接口；
- 不实现异步轮询、取消、重试和远程结果下载，这些属于 Week 4；
- 不解析 PDF、DOCX 或图片正文，不创建文件管理器，不引入 better-sidebar 的文件功能；
- 不在 Week 3 宣称完成专业研发分析或中国发明专利正式撰写；专业规则属于 Week 5；
- 不修改 DSH 左栏、中栏、AppFrame、原生 details 或真实 `C:\Users\TinaD\.dsh`；
- 不建立可覆盖写回、自动选路径、自动批准或后台静默导出。

## 3. 方案比较

### 方案 A：Client 内硬编码表单和 mock，继续整体保存状态

改动最少，但 Client 能伪造材料哈希、改写历史运行和写回记录；工作流目录、真实服务适配和 UI 再次耦合。只能形成演示，不能形成可追溯本地闭环。拒绝。

### 方案 B：立即拆分多张 Domain 表和完整异步任务引擎

可获得最强领域隔离，但会提前实现 Week 4 的任务生命周期、远程缓存和下载基础设施，并引入跨表一致性问题。对仅有两条同步 mock 流程的 Week 3 过度设计。拒绝。

### 方案 C：记录 schema v2 + Host 专用命令 + 本地适配器（采用）

保留 `oasis_workbench` Domain version 1 和每 Workspace 单记录原子写，同时把记录升级为 schema v2。`state/replace` 只接收可编辑投影；Host 合并并保护材料、运行和写回证据。材料、运行、审核、写回分别走专用 RPC，均在现有 Workspace 队列内提交。该方案能证明本地闭环，也为 Week 4 留出清晰适配边界。

## 4. 组件与职责

```text
React 右栏
  PanelPages / WorkflowForm / MaterialReferences / RunPreview / WritebackPanel
       |
       | strict loopback RPC
       v
  workbench-rpc
       |
       v
  WorkbenchService --------------------- WorkspaceRegistry
       |                                      |
       |                                      +-- canonical Workspace root
       +-- WorkflowCatalog
       +-- WorkspaceMaterials --------------- fs read/hash only
       +-- LocalMockRunner
       +-- WritebackService ----------------- fs new-path writes only
       +-- WorkbenchRepository -------------- oasis_workbench Domain
```

### 4.1 模块边界

- `workbench-contract.js`：wire schema、记录 schema、预算和不变量；
- `workbench-domain.js`：v1/v2 存储 union、v1→v2 迁移、冻结与克隆；
- `workbench-repository.js`：Workspace 串行队列、可编辑投影合并、Host 内部 mutation；
- `workflow-catalog.js`：冻结的本地目录、表单 DSL 和 Host 校验；
- `workspace-materials.js`：Workspace 根解析、相对路径安全、文件元数据和 SHA-256；
- `local-mock-runner.js`：纯函数输出，不读网络、不写文件；
- `writeback-service.js`：prepare token、目标复检、暂存和 no-overwrite 发布；
- `workbench-service.js`：领域编排、幂等、审核门和错误映射；
- `workbench-rpc.js`：只做严格 payload 解析和结果封装，不承载业务规则。

## 5. 数据合同与所有权

### 5.1 存储版本

实际 Domain 保持不变：

```text
Domain: oasis_workbench
Domain version: 1
Table: workspaces
Storage key: workspaceId
Current record schemaVersion: 2
```

Domain 表 schema 接受**严格 v1 或严格 v2**。读取 v1 时在内存中确定性迁移为 v2，不在只读 `get` 中落盘；下一次用户明确变更时才持久化 v2。未知版本继续 fail-closed。Week 2 的 v1 `run`、`preview` 只能是 `null`，所以迁移不会吞掉既有运行数据。

### 5.2 ProjectWorkbenchV2

```js
{
  schemaVersion: 2,
  workspaceId,
  revision,
  panelMode,
  activeTaskId,
  taskOrder,
  tasks: { [taskId]: ProfessionalTaskV2 },
  updatedAt
}
```

`ProfessionalTaskV2`：

```js
{
  taskId, title, workType, workflowId, workflowVersion,
  formValues,
  inputRefs: MaterialReference[],
  activeRunId: string | null,
  runOrder: string[],
  runs: { [runId]: RunSnapshot },
  createdAt, updatedAt
}
```

继续校验 task/order/map/active ID 一致性，并新增 run/order/map/active ID 一致性。运行不得跨 task 引用；写回记录的 `artifactId` 必须属于同一运行。

### 5.3 MaterialReference

```js
{
  referenceId,
  kind: 'project-file',
  relativePath,
  displayName,
  mediaType,
  sizeBytes,
  sha256,
  observedAt,
  confirmedAt
}
```

只存引用和证据元数据，不存正文、绝对路径、下载 URL 或凭据。`confirmedAt` 只在用户勾选“确认将该文件作为本次任务材料”后由 Host 产生。

Week 2 的严格 v1 schema 曾允许 `inputRefs` 保存任意 JSON 对象。为保证所有合法 v1 记录都能无损迁移，v2 还接受一个只由迁移器生成的隔离类型：

```js
{
  referenceId: 'legacy-v1-<index>',
  kind: 'legacy-v1',
  legacyValue: JsonObject
}
```

它不被信任为路径、哈希或用户确认，Client 不得创建。存在 `legacy-v1` 引用时运行必须 fail-closed，UI 只允许用户移除或按项目相对路径重新登记；不得从旧对象猜测或补写证据字段。

Week 2 的 v1 schema 还允许 `workType`、`workflowId`、`workflowVersion` 三元组部分填写。迁移必须逐值原样保留，不猜测缺失项。repository 允许该历史状态按原值落盘升级，但禁止修改这个部分三元组；新 task 以及原来三元组全空的 task 只能保持全空或一次性选择完整三元组。历史部分状态需由用户关闭旧 task 后新建任务恢复，运行命令必须 fail-closed。

### 5.4 RunSnapshot

```js
{
  runId,
  requestKey,
  mode: 'local-mock',
  mockVersion: '1',
  status: 'completed',
  workflowId,
  workflowVersion,
  inputSnapshot: {
    formValues,
    inputRefs,
    sha256,
    capturedAt
  },
  result: {
    contentStatus: 'warning' | 'blocked',
    sections,
    risks,
    questions,
    disclaimer,
    artifact: {
      artifactId,
      suggestedFileName,
      mediaType: 'text/markdown',
      body,
      sha256
    }
  },
  review: {
    status: 'not-reviewed' | 'changes-requested' | 'approved',
    note,
    updatedAt
  },
  writebacks: WritebackRecord[],
  createdAt,
  completedAt
}
```

mock 的正文只由规范化输入快照和固定 mock 版本决定。`runId`、请求键和时间是外部元数据，不参与正文生成；因此同一快照产生同一 `artifact.sha256`。`artifactId` 使用内容寻址标识。Week 3 的 mock 永不返回 `ready`，避免把结构化演练误称为专业完成。

### 5.5 WritebackRecord

```js
{
  writebackId,
  artifactId,
  relativeDirectory,
  files: [{ relativePath, sha256, mediaType }],
  reviewStatus: 'approved',
  committedAt
}
```

持久记录只保留 Workspace 相对路径；prepare 响应可向当前用户临时显示绝对路径，但绝对路径、确认 token 和材料正文不写入状态、日志或错误。

### 5.6 数据所有权

| 字段/动作 | Client 可编辑 | Host 专用命令 |
|---|---:|---:|
| 面板模式、页签顺序、标题、当前表单 | 是 | 校验和持久化 |
| 工作流首次选择 | 是 | 目录与版本校验；选择后不可静默替换 |
| 材料引用、哈希和确认时间 | 否 | add/refresh/remove |
| 运行、输入快照、结果和产物哈希 | 否 | task/create |
| 审核状态和审核时间 | 否 | task/review |
| writeback manifest、token 和记录 | 否 | artifact/prepare、artifact/commit |

`state/replace` 改为接收 `WorkbenchEditableDraftV2`，其中不含 `inputRefs`、`runOrder`、`runs`。Host 对已存在 task 合并证据字段，对新 task 初始化为空，对显式关闭 task 才删除其全部数据；有历史运行的关闭操作必须在 UI 二次确认。

## 6. 工作流目录与表单 DSL

Week 3 不引入完整 JSON Schema renderer。Host 返回一个受限、版本化、可严格校验的表单 DSL，只支持 `short-text`、`long-text`、`string-list` 和 `select`。每个字段固定包含：

```text
fieldId, label, control, required, description,
maxChars 或 maxItems/itemMaxChars, options（仅 select）
```

目录 schemaVersion 为 `1`，本地工作流版本沿用 Week 2 已持久化的 `'1'`：

### 6.1 技术研发辅助 `technical-rd@1`

| 字段 | 控件 | 必填 | 预算 |
|---|---|---:|---:|
| `objective` 研发目标 | long-text | 是 | 8,000 字符 |
| `currentState` 现状与已知事实 | long-text | 是 | 12,000 字符 |
| `constraints` 约束清单 | string-list | 否 | 32×500 字符 |
| `evidenceStatus` 证据状态 | select | 是 | verified/partial/unverified |
| `expectedDeliverable` 期望交付 | long-text | 否 | 4,000 字符 |

本地预览固定包含问题分解、候选方案空间、风险、验证计划和交付清单。它只能重组用户输入并生成待确认项，不补写实验数据、性能值或外部事实。

### 6.2 中国发明专利 `cn-invention-patent@1`

| 字段 | 控件 | 必填 | 预算 |
|---|---|---:|---:|
| `technicalDisclosure` 技术交底 | long-text | 是 | 20,000 字符 |
| `inventiveConcept` 拟保护的发明构思 | long-text | 是 | 8,000 字符 |
| `knownPriorArt` 已知对比材料说明 | long-text | 否 | 12,000 字符 |
| `terms` 术语清单 | string-list | 否 | 64×300 字符 |
| `unconfirmedFacts` 待确认事实 | string-list | 否 | 64×500 字符 |
| `desiredScope` 保护范围偏好 | long-text | 否 | 4,000 字符 |

本地预览固定包含术语表、支持关系矩阵、权利要求策略骨架、权利要求书骨架、说明书骨架和问题清单。存在 `unconfirmedFacts` 时结果为 `blocked`；不得批准、写回或呈现授权前景、侵权、有效性等法律结论。

### 6.3 表单保存

表单在 Client 立即更新本地状态；未在传输中的最新草稿以 400 ms trailing debounce 合并保存，运行、项目切换、页签关闭和面板隐藏前显式 flush。已有的 revision 冲突语义不变。保存队列只保留一个在途请求和一个最新待发快照，避免每个按键形成独立 Domain 写入。

## 7. 材料引用与项目路径安全

Week 3 采用“输入项目相对路径”的最小入口，不创建文件浏览器。Host 注入固定版本 `@deepseek-ai/dsh-workspace@0.1.1-rc.2`，通过 `ctx.workspaceRegistry.get(workspaceId)` 获取真实规范 Workspace 根。

### 7.1 add/refresh 流程

1. payload 只接受相对路径、taskId、expectedRevision 和显式确认布尔值；
2. 拒绝绝对路径、UNC、驱动器限定路径、空段、`.`、`..`、NUL、ADS、尾随点/空格和超长段；
3. 逐段 `lstat`，拒绝符号链接和 junction/reparse 路径；
4. `realpath` 后再次证明文件位于 canonical Workspace 根内；
5. 只读打开文件，`fstat`，按流计算 SHA-256，不把正文读入内存或日志；
6. 检查扩展名、MIME、单文件 50 MiB 和目录项类型；
7. 关闭文件后比较关键 stat，变化则返回 `MATERIAL_CHANGED`；
8. 在 Workspace repository 队列中提交引用，revision 加一。

Week 3 可登记 `.txt`、`.md`、`.pdf`、`.docx`、`.png`、`.jpg`、`.jpeg`，但 mock 只使用文件名、类型、大小和哈希，不宣称读取或理解正文。UI 必须直接披露这一点。

### 7.2 运行前复检

`task/create` 对所有材料重新打开并计算哈希。任何缺失、变化、越界或未确认引用都阻断运行，要求用户 refresh/remove；不静默更新旧引用。成功后把复检结果复制进不可变输入快照。

## 8. 本地 mock、运行历史与审核

### 8.1 task/create

RPC 只接受：

```js
{ workspaceId, taskId, expectedRevision, requestKey }
```

Host 从权威记录读取 workflow、formValues 和 inputRefs，按目录版本校验，生成 canonical snapshot/hash，再调用纯 `LocalMockRunner`。Client 不能上传所谓“运行结果”。同一个 `requestKey + taskId + inputSnapshot.sha256` 返回既有运行；同一请求键绑定不同快照时返回 `IDEMPOTENCY_CONFLICT`。

每 task 最多 8 个运行，不自动裁剪历史。达到上限返回 `RUN_LIMIT_REACHED`，避免为满足 1 MiB 预算而静默丢证据。

### 8.2 输出安全

- 主 Markdown 固定包含 PRD 的八个二级章节；
- 用户文本按不执行 HTML 的规则转义或以安全引用块写入；
- React 预览使用组件和纯文本节点，不用 `dangerouslySetInnerHTML`；
- 外链只显示文本，不自动加载远程内容；
- 缺失信息进入显式问题/占位，不补写事实；
- mock 标识、能力边界和未读取材料正文的说明同时出现在 UI 和主 Markdown。

### 8.3 运行选择与草稿偏离

最新运行生成后成为 `activeRunId`。用户可以切换历史运行。Client 比较当前草稿和所选运行的输入快照；不一致时显示“当前草稿已变化，旧结果不会自动更新”，只提供“生成新运行”，不修改旧结果。

### 8.4 审核

审核命令为：

```js
{ workspaceId, taskId, runId, expectedRevision, status, note }
```

- `changes-requested` 必须有 1～2,000 字符说明；
- `approved` 代表“已人工检查，允许导出此 mock 草稿”，不代表专业正确或法律结论；
- `blocked` 结果拒绝 approved；
- 审核只改变目标运行的 review，不改变输入、结果或其他运行；
- 写回时再次检查目标运行仍为 approved。

## 9. 安全写回

### 9.1 prepare

用户输入 Workspace 内的相对**新目录**，例如 `oasis-output\任务A-20260825`。prepare：

1. 校验目录路径并证明现有父目录在 Workspace 内且无 symlink/junction；
2. 要求目标目录当前不存在；
3. 生成主 Markdown 和相邻 `<base>.oasis.json` 元数据清单；
4. 返回绝对目标、相对路径、大小、SHA-256、冲突状态、过期时间和一次性确认 token；
5. token 仅在 Host 内存保存，10 分钟过期，不写 Domain、浏览器持久存储或日志。

相邻元数据记录 task/run/workflow/mock/input/artifact/review/hash，不记录报价、绝对路径、凭据或正文副本。Week 3 不追加可能已存在的全局 `lineage.jsonl`，避免并发和覆盖语义扩张。

### 9.2 commit

commit payload 只含 confirmation token。Host：

1. 单次消费 token，并重新检查 Workspace、运行、artifact hash、approved 和目标不存在；
2. 在目标父目录创建本次专属临时目录，写入、fsync、复核所有暂存文件；
3. 全部暂存完成后再次复检 Workspace canonical root、既有父目录和最终目标不存在；
4. 在发布前完成时间读取并冻结 WritebackRecord，使最终提交后不再需要任何文件系统操作或可能失败的记录构造；
5. 以同一父目录内的单次 `rename(stagingDirectory, targetDirectory)` 作为唯一最终提交点；最终目标在竞态中出现时必须失败，且不得删除或改写该目标；
6. rename 失败时只清理本次已成功创建的暂存文件和暂存目录，不递归删除、不触碰最终目标或相邻既有路径；
7. rename 成功后立即返回已冻结记录，再由领域服务向运行追加 WritebackRecord；不存在“已提交但暂存清理失败”的后提交分支。

若文件已完整落地但 Domain 索引提交失败，不删除用户产物；返回 `WRITEBACK_COMMITTED_INDEX_FAILED` 和可核对 manifest。相邻 `.oasis.json` 是恢复依据，后续不得以重试覆盖现有目录。

### 9.3 并发与 TOCTOU

同一 canonical 目标使用 Host 内存锁；同父目录的最终 `rename` 是实际原子发布与 no-overwrite 裁决。prepare 不是预留，用户必须理解目标可能在确认期间变化。验证必须覆盖 prepare 后人为创建目标、最终 rename 时目标出现、两个 token 并发、符号链接替换和 Host 重启后旧 token 失效。

## 10. RPC 与错误合同

保留 channel `/oasis-workbench` 与 loopback authority，Week 3 增加：

```text
workflow/catalog
material/add
material/refresh
material/remove
task/create
task/review
artifact/prepare-writeback
artifact/commit-writeback
```

保留 `state/get`，将 `state/replace` 升级为 v2 editable draft。所有 payload/response strict；额外字段和身份错配为 `bad-request`。领域错误必须使用稳定 code 和用户动作，不把绝对路径、正文或底层堆栈返回 Client：

```text
WORKSPACE_NOT_FOUND / WORKSPACE_MISSING_DIR
WORKFLOW_NOT_FOUND / WORKFLOW_VERSION_MISMATCH / FORM_INVALID
MATERIAL_PATH_INVALID / MATERIAL_NOT_FOUND / MATERIAL_UNSUPPORTED
MATERIAL_TOO_LARGE / MATERIAL_CHANGED / MATERIAL_UNCONFIRMED
REVISION_CONFLICT / IDEMPOTENCY_CONFLICT / RUN_LIMIT_REACHED / RUN_NOT_FOUND
REVIEW_REQUIRED / REVIEW_BLOCKED
WRITEBACK_PATH_INVALID / WRITEBACK_TARGET_EXISTS
WRITEBACK_TOKEN_EXPIRED / WRITEBACK_TOKEN_USED / WRITEBACK_FAILED
WRITEBACK_COMMITTED_INDEX_FAILED
```

Week 4 再增加异步 `task/status`、`task/cancel`、`task/result` 和 `artifact/download`；Week 3 不用假实现掩盖能力缺失。

## 11. 右栏交互设计

左栏、中栏和面板布局适配器不变。右栏 normal 模式采用纵向阶段卡片，expanded 模式可在同一 DOM 内把输入与预览排成双列，不复制业务状态。

1. **选择页**：从 catalog 渲染两张工作流卡；选择后 `taskId` 不变。
2. **输入卡**：schema 表单、字段级错误、保存状态和工作流版本。
3. **材料卡**：相对路径输入、确认勾选、添加/刷新/移除、短 SHA、大小和正文未读取提示。
4. **运行卡**：“生成本地演练预览”按钮、运行历史、输入 hash、草稿偏离提示。
5. **预览卡**：内容状态、八章节结构、来源、风险、问题和 mock 免责声明。
6. **审核卡**：请求修改/批准导出；blocked 时给出补充动作。
7. **写回卡**：相对新目录、prepare manifest、绝对路径/哈希确认、commit 结果。

所有输入有显式 label；异步状态使用 `aria-live`；错误摘要可聚焦；按钮禁用有文字原因；页签关闭有运行历史时二次确认；预览不抢夺中栏焦点。

## 12. 资源预算与 fail-closed

在 Week 2 预算上增加：

| 资源 | 上限 |
|---|---:|
| 每 task 运行 | 8 |
| 每运行 review note | 2,000 字符 |
| 每运行风险/问题 | 各 64 项 |
| 每运行写回记录 | 8 |
| 单 material 文件 | 50 MiB，流式哈希 |
| 单 mock artifact body | 256 KiB UTF-8 |
| 单次写回文件 | 2 |
| 活跃 confirmation token | 128 |
| token TTL | 10 分钟 |
| Workspace 持久草稿总量 | 继续为 1 MiB |

任何超限都在 repository 写入或文件创建之前拒绝；不自动删除历史、不截断文本、不降低哈希覆盖。

## 13. 迁移、兼容和回滚

- DSH 和所有 DeepSeek 包固定 `0.1.1-rc.2`；发现实际 API 漂移立即停止，不猜测；
- `oasis_workbench` Domain version 不变，确保 Week 2 JSON 文件仍可打开；
- v1→v2 迁移有固定 fixture、幂等和 Host1/Host2 验证；任意合法旧 `inputRefs` 以隔离的 `legacy-v1` 引用无损保留，不冒充新证据；历史部分工作流三元组逐值保留但不可继续修改或运行；
- v2 写入后旧 Week 2 代码不能再读取，实施前必须保留 Git 回滚点；回滚代码时只能使用迁移前隔离 Home 或人工导出，不能让旧代码覆盖 v2；
- Client/Host bundle 必须同版本发布，wire version 不兼容时明确拒绝；
- 卸载和异常仍由现有布局适配器恢复 `#root` 和 CSS 变量；Week 3 不改变该机制。

## 14. 验收与证据

### 14.1 单元与合同

- v1→v2、未知版本、证据字段防篡改、运行不变量和预算；
- 两个 catalog/表单的合法、缺失、额外字段和边界；
- material traversal、UNC、ADS、symlink/junction、大小、变化和流式哈希；
- mock 确定性、八章节、转义、blocked、幂等和运行上限；
- review 门和旧运行不可变；
- writeback 目标冲突、prepare 后冲突、并发、过期 token、部分失败清理和 index failure；
- Client hydrate/save coalescing、revision conflict、A/B 隔离和组件可访问状态。

### 14.2 Host 与浏览器

在全新 `%TEMP%\oasis-dsh-week3-*`：

1. Host1 建立 A/B 两项目和不同材料；
2. A 创建技术运行，编辑输入后创建第二运行，证明第一运行 hash/正文不变；
3. B 创建专利 blocked 运行，证明不能批准；补齐输入后生成 warning 运行并批准；
4. prepare 显示绝对新目录与两文件 hash，commit 成功；同目录再次写回被拒绝且原文件 hash 不变；
5. Host2 重启恢复两个项目、运行、审核和写回记录；Host1 token 失效；
6. 浏览器证明选择页原位转换、刷新恢复、运行历史、草稿偏离、审核和写回确认；
7. normal/expanded/hidden、窄屏、原生 details、左栏和中栏回归不退化；
8. console error/pageerror 为 0，网络无 Dify/收费/第三方请求；
9. 真实 `C:\Users\TinaD\.dsh` 前后全树强哈希一致；
10. 临时 Workspace 基线证明仅声明的新目录和文件被创建，A/B 既有文件均未改变。

### 14.3 Week 3 退出门

只有以下条件全部满足才可将第三周标为完成：

- package fresh build/test/pack、根级测试和 Skills 校验通过；
- Host1/Host2、真实浏览器、Profile 和文件系统证据齐全；
- 技术/专利本地闭环各一条正向路径，另有 blocked/no-overwrite 负向路径；
- 无本地可行动 P0-P2；
- 报告明确 `local-mock` 证据不等于真实服务、生产或专业验收；
- 使用 V4.1 唯一裁决状态；缺 Host/浏览器证据时最多 `STATIC_ONLY`。

## 15. 实施止损条件

出现以下任一情况立即停止相关实施并保留证据：

1. Git 出现非 Week 3 的既有改动，无法证明可安全隔离；
2. DSH 或 `@deepseek-ai/dsh-workspace` 实际版本/合同与冻结基线不一致；
3. 验证脚本将写入真实 Profile、真实项目既有目录或预先存在路径；
4. 无法在最终文件系统动作上证明 no-overwrite；
5. v1 迁移不能无损处理当前合法记录；
6. 浏览器需要引入原生 UI 替换、文件管理器或 Client 密钥；
7. 任一静态结果被误作 Host、浏览器、外部服务或专业完成证据。
