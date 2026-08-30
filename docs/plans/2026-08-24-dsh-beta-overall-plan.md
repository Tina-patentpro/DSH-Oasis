# 绿洲慧写 DSH Beta 整体 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不复制 DSH 左栏和会话中栏的前提下，交付一套与 DSH 项目原生关联、支持多任务页的右侧专业协作工作台，覆盖通用技术研发辅助和中国发明专利撰写的 Beta 闭环。

**Architecture:** 保留 DSH 原生导航、会话、输入和输出；绿洲入口注册到会话输入区，`shell.overlay`只提供生命周期锚点，专业工作台通过 React Portal 挂到`document.body`。正常态由固定版本、单写入者的最小布局适配器推挤`#root`预留右栏，展开态清除推挤并覆盖中栏但保留左栏。Host 端用 DSH Domain Storage 按 `workspaceId` 保存工作台状态，通过薄适配器调用既有专业服务；项目文件只在用户确认后安全写回。

**Tech Stack:** DeepSeek Harness `0.1.1-rc.2` 固定兼容基线、Cordis、React 18/React Portal、DSH Client Slots、版本化最小布局适配器、DSH Domain Storage + JSON backend、Node.js 22.19+、pnpm、tsdown、Node test runner、Playwright。

---

## 1. 文档地位与当前裁决

- 本文是当前仓库的 **Beta 执行总计划**；历史 PRD、第一周技术记录和审计报告继续作为来源与证据，不因本文而改写历史结论。
- UI 方案已经用户确认，以三张 V5 预览和一份 Codex 控件图标为视觉基线：
  - `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\ui-concepts\dsh-oasis-v5-state-1-panel-normal.png`
  - `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\ui-concepts\dsh-oasis-v5-state-2-panel-expanded.png`
  - `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\ui-concepts\dsh-oasis-v5-state-3-panel-hidden.png`
  - `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\ui-concepts\codex-controls\codex-right-panel-controls.svg`
- 用户已明确授权完成 Git 仓库与私有 GitHub 远端配置；第三周工作基于 `02b3eb7e40ff230689be8cae4218180869de836e`。独立全面复审修复已于 2026-08-29 完成并重新关闭；相关变更仍未提交，因此不暂存、不提交、不重置，继续用 Git diff、SHA-256 基线和证据账本保护变更。
- DSH 当前仍是 developer preview。Beta 固定到本机已验证版本，升级必须单列兼容性工作，不随普通依赖安装漂移。

## 2. 产品边界

### 2.1 Beta 必须提供

1. DSH 会话输入区保留“研发 / 专利”入口。
2. 右侧专业工作台具有隐藏、正常、展开三种状态，使用已确认的 Codex 同款图标和交互含义。
3. 同一 DSH 项目中可打开多个绿洲任务页；切换会话不丢失项目工作台状态。
4. 切换 DSH 项目时，右栏整体切换到对应项目的页签、输入、运行状态和结果预览。
5. 新建页先选择工作流；选择后原位转为“输入材料 + 参数 + 生成结果预览”。
6. 覆盖两类一级工作类型：`technical-rd` 与 `cn-invention-patent`。
7. 支持异步运行、进度、失败解释、重试、结果预览、下载和人工确认后的安全写回。
8. 专利内容始终保留事实来源、术语、支持关系和人工复核边界；插件不作授权或法律结论。

### 2.2 Beta 明确不做

- 不复制或重写 DSH 左侧项目导航、会话中栏、输入框和消息流。
- 不迁移旧站整套 SPA，也不建立第二套项目树、编辑器或账号体系。
- 不实现现有外部专业服务的内部流程；本仓库只维护版本化适配器契约。
- 不自动提交专利、不代替专利代理师作最终专业判断。
- 不在未确认时覆盖项目文件，不把浏览器本地存储作为唯一业务数据源。
- 不为未经批准的行业样例反向创造产品范围。

## 3. 已确认的界面契约

### 3.1 三种面板状态

| 状态 | 左栏 | 中栏 | 绿洲右栏 | 入口/控件 |
|---|---|---|---|---|
| `hidden` | 原样 | 原样 | 不显示 | 中栏右上显示“显示右栏”图标，输入区入口保留 |
| `normal` | 原样 | 保持可用并由布局压缩 | 固定在右侧，可调整到 DSH 允许范围 | 标题栏显示展开和隐藏图标 |
| `expanded` | 保留并可正常切项目 | 保持挂载但被专业工作台覆盖 | 占据左栏之外的全部工作区 | 标题栏显示还原和隐藏图标 |

状态机只能发生以下转换：

```text
hidden -> normal
normal -> hidden
normal -> expanded
expanded -> normal
expanded -> hidden
```

关闭/隐藏不删除任务页；展开/还原不重建任务页；项目切换不沿用其他项目的面板状态。

### 3.2 多页结构

- 顶部页签是“任务页”，不是浏览器标签页。
- 每个任务页只绑定一个工作流版本；需要更换工作流时新建任务页，避免覆盖已生成证据。
- 页签最少支持：新建、选择、关闭、重命名；关闭存在未保存输入或运行中任务时必须确认。
- 页签顺序、当前页、各页草稿和结果均按 `workspaceId` 保存。
- 同一项目的不同 DSH 会话共享这些任务页；会话只作为来源上下文，不作为工作台数据主键。

### 3.3 新建页的原位转换

1. 初始态：显示工作类型、工作流卡片、适用范围和所需材料摘要。
2. 用户选择工作流版本后，同一任务页转换为工作区，不另开弹窗或新路由。
3. 工作区左侧为材料与参数，右侧为结果预览；窄宽度下改为上下布局。
4. 结果预览始终显示版本、生成时间、输入快照摘要、证据状态和人工复核状态。
5. “写回项目”必须晚于预览与人工确认，且默认生成新文件。

## 4. 技术架构

### 4.1 Client 挂载策略

当前固定版本的 `details` 是 `single` 槽，且已由 DSH 会话插件占用；直接注册会替换原生详情栏并移除其子槽。因此 Beta **禁止**把绿洲工作台直接注册到 `details`，也禁止复制 DSH `AppFrame`。当前版本没有满足右栏推挤要求的公开布局API，故只允许一个版本化、单写入者、可完整恢复的最小布局适配器例外。

采用以下非替换式结构：

```text
conversation.input.right
  -> OasisEntry（研发 / 专利）
  -> 打开命令

shell.overlay（list/root，加法型生命周期锚点）
  -> OasisPanelPortal
     -> createPortal(document.body)
        -> OasisPanelHost
           -> PanelChrome
           -> ProjectTaskTabs
           -> WorkflowChooser | TaskWorkspace

OasisLayoutAdapter（固定0.1.1-rc.2）
  -> normal: 校验唯一结构和所有权，以CSS变量给#root增加360px margin-right
  -> expanded: 清除推挤，只读测量原生sidebar右边界后覆盖中栏
  -> hidden/fault/dispose: 卸载Portal并清除全部自有布局痕迹
```

实施约束：

- `OasisLayoutAdapter`是唯一DSH DOM写入者，只能：向`body`加一个Portal宿主、向`head`加一个自有style、给`#root`加/删自有所有权属性、给`documentElement`加/删`--oasis-right-rail-width`；其他组件不得写DSH DOM。
- DOM探测只使用`#root`、稳定`data-*`属性、唯一性和父子关系；禁止构建哈希class、`nth-child`、修改原生class/内容/顺序或调用`openDetails/closeDetails`。
- normal必须满足`#root`右边界与Portal左边界相邻、中栏不重叠且输入仍可交互；expanded和hidden必须不存在root推挤。原生details子树始终保持挂载与占用者不变。
- 小于1024px或预计中栏宽度小于520px时，请求的normal自动解析为effective expanded，但保留用户requested mode；左栏若已退化为rail，仍以实测边界为准。
- DOM结构不唯一、其他布局所有者、写入失败、几何后检失败、HMR、异常或卸载时必须fail-closed：隐藏绿洲面板并清除Portal、style、属性、变量、observer和timer，恢复原布局。
- 首次实现前必须用运行时 `Slots.listSubTree` 查询 `conversation.input.right`、`shell.overlay`、`details` 的真实协议和占用者；静态类型只作预检。

### 4.2 项目关联与状态主键

项目主键只能按 DSH 官方 Workspace 成员关系解析：

```text
currentSessionId = useSessions(state => state.current)
workspace = useWorkspaces(state =>
  state.items.find(item => item.sessionIds.includes(currentSessionId))
)
projectKey = workspace.workspaceId
```

- 禁止仅按 `cwd` 推断项目，避免同路径未入账会话被错误关联。
- 无当前会话或无 Workspace 归属时，右栏显示“未关联项目”，允许查看说明但禁止创建和运行任务。
- 项目删除或会话归档不自动删除专业任务；由 Host 标记为 orphaned，等待用户确认清理或重新关联。

### 4.3 Host 状态与持久化

使用 DSH `storageDomain` 建立实际名称为 `oasis_workbench`、version 为 `1` 的领域（产品展示名仍为 Oasis Workbench v1），JSON backend 负责原子持久化。浏览器只保留瞬态 UI 状态，不以 `localStorage` 保存材料或结果。

```ts
type ProjectWorkbench = {
  schemaVersion: 1
  workspaceId: string
  revision: number
  panelMode: 'hidden' | 'normal' | 'expanded'
  activeTaskId: string | null
  taskOrder: string[]
  tasks: Record<string, ProfessionalTaskPage>
  updatedAt: string
}

type ProfessionalTaskPage = {
  taskId: string
  title: string
  workType: 'technical-rd' | 'cn-invention-patent' | null
  workflowId: string | null
  workflowVersion: string | null
  inputRefs: MaterialReference[]
  formValues: Record<string, JsonValue>
  run: null | RunSnapshot
  preview: null | ResultPreview
  review: 'not-reviewed' | 'changes-requested' | 'approved'
  createdAt: string
  updatedAt: string
}
```

必须满足：

- 每次状态写入带 `schemaVersion`，未知版本拒绝打开并给出恢复说明。
- 材料引用记录来源、哈希、时间和用户确认状态；不把大文件正文重复塞入状态 JSON。
- Host 写操作串行化；Client 使用 revision 做乐观并发检查，冲突时不静默覆盖。
- 第二周固定状态预算：每 Workspace 最多 32 个任务、每任务最多 64 个材料引用、JSON 最深 8 层、数组最多 1024 项、对象最多 256 键、单字符串最多 256 KiB、序列化草稿最多 1 MiB；超限请求在进入 repository 前拒绝。
- 单元测试和浏览器集成全部使用全新隔离 `DSH_HOME`。

### 4.4 工作流目录与外部服务适配器

Client 不硬编码服务 URL、鉴权或服务端字段。Host 提供稳定的插件领域接口：

```text
workflow.catalog(workType)
task.create(workspaceId, workflowId, workflowVersion, inputSnapshot)
task.status(taskId)
task.cancel(taskId)
task.result(taskId)
artifact.download(artifactId)
artifact.prepareWriteback(artifactId, target)
artifact.commitWriteback(confirmationToken)
```

- 工作流目录返回版本化表单 schema、材料要求、输出类型和适用范围。
- 适配器负责把领域接口转换为既有专业服务接口；不得把服务端内部概念暴露给 React 组件。
- 任务创建必须提交不可变输入快照；后续编辑只生成新运行，不改写旧运行证据。
- 超时、鉴权失效、服务不可用、任务失败分别映射，不以笼统“生成失败”吞掉原因。

### 4.5 文件产物与安全写回

- 预览、下载和写回是三个独立动作。
- 默认写回目录：项目内用户确认的新目录；默认文件名包含任务标题、工作流版本和时间戳。
- 写回前显示绝对目标、已有文件冲突、内容哈希和将新增的文件清单。
- 默认 `no-overwrite`；冲突时建议新文件名，不允许自动覆盖。
- Host 先生成临时文件并校验，再原子发布；失败时清理本次临时文件，不触碰既有文件。
- 写回记录保存 `artifactId`、目标、前后哈希、确认人动作和时间。

### 4.6 专业 Skills

Skill 分为三层，避免把“入口存在”宣传成“完整专业能力”：

1. `dsh-plugin-development`：DSH 官方合同、Slot 查询、Bundle/Profile、隔离验证和证据分层。
2. `oasis-rd-intake`：任务受理、证据状态、范围和人工门；继续作为通用前置 Skill。
3. 后续新增：
   - `oasis-technical-rd`：技术问题定义、方案分解、证据矩阵、验证计划和研发交付。
   - `oasis-cn-invention-patent`：交底理解、术语表、支持关系、权利要求策略、说明书草案、一致性审查和人工复核。

专业输出不得虚构事实、实验数据、引用、发明人或实施例；不确定内容进入问题清单或显式占位，不得悄悄补全。

## 5. 六周路线图

| 阶段 | 主要目标 | 关键交付 | 退出门 |
|---|---|---|---|
| 第一周（已完成） | 证明 DSH Plugin/Bundle/Host/Client/Skill 最小链路 | 开发 Skill、受理 Skill、Bundle、Host 状态工具、Client 入口、隔离脚本与审计 | 历史结果保留；审计状态仍为 `FAIL`，不能替代补充工作 |
| 第一周补充（历史阶段） | 关闭初次审计缺口并证明右栏原型 | 加固脚本、冻结依赖、运行时 Slot 证据、面板 Host、项目关联状态机、三状态浏览器证据 | 后续全面审计已推翻“全部关闭”结论；不得再作为当前准入证据 |
| 第一周审计修复（已关闭，2026-08-25） | 关闭全面审计的本地可行动P1/P2 | 官方CLI隔离包装器、Portal与最小布局适配器、三态恢复、键盘焦点、IPv6与全量隔离验证 | 完成门已通过；以`docs/第一周-审计修复验证报告.md`和`docs/evidence/week1-audit-remediation-2026-08-24`为当前准入证据 |
| 第二周（已关闭，2026-08-25） | 完成项目原生多任务页与本地持久化 | 页签 CRUD、工作流选择页、项目切换、Domain Storage、恢复/冲突处理、严格 wire schema 与资源预算 | 已通过同一隔离 Home 的 Host1/Host2 恢复、A/B 隔离、真实浏览器刷新和原生 details 共存；证据见第二周修复复审与持久化验证报告 |
| 第三周（已关闭，复审修复完成） | 完成材料输入到结果预览的本地闭环，并关闭独立复审 W3R-01～W3R-06 | schema v2 表单、Workspace 材料引用、确定性 local-mock、预览、审核状态、原子 no-overwrite 写回、持久记录完整性复算 | 2026-08-29 已完成修复计划、Week 1/2/3 Host/浏览器回归、实际 tarball 静态检查与 Task 6 确认基线前后比较；剩余边界见最终修复报告 |
| 第四周 | 接入既有专业服务 | Host 适配器、异步状态、取消/重试、结果下载、错误映射 | 两类工作各一条真实非生产 E2E；无客户端密钥和直连 |
| 第五周 | 完善研发与中国发明专利专业能力 | 两套专业 Skill、术语/支持矩阵、权利要求与说明书草案、研发验证包 | 代表性案例通过领域规则与人工复核；不跨越专业边界 |
| 第六周 | Beta 加固与可分发 | 无障碍、安全、兼容性、安装/卸载、Profile、版本说明、Beta 报告 | Beta 出口清单全部有新证据；无 P0-P2 未解决项 |

详细的第一周补充任务见：

`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-08-24-week1-supplement.md`

第一周审计修复的当前裁决与证据见：

`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第一周-审计修复验证报告.md`

第二周关闭裁决与 Host/浏览器证据见：

- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第二周-第一二批修复复审报告.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第二周-持久化验证报告.md`

第三周历史关闭记录、独立全面复审与当前修复证据见：

- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第三周-本地闭环验证报告.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第三周-全面审计报告.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第三周-全面复审报告.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第三周-全面复审修复报告.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-08-26-week3-reaudit-remediation.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week3-reaudit-remediation-2026-08-27\evidence-ledger.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week3-implementation-2026-08-26\task9\evidence-ledger.md`

## 6. 质量门与证据分层

### 6.1 每周通用门禁

1. `REQUIREMENT_SOURCE_GATE`：所有公开字段、模式和验收案例都有用户、PRD或计划来源。
2. `VERSION_PIN_GATE`：DSH 与工具链版本固定；变更版本必须重新执行兼容矩阵。
3. `PROFILE_PRESERVATION_GATE`：测试前后真实 Profile 全树哈希一致。
4. `CLEAN_DSH_HOME_GATE`：集成测试使用全新临时根，不复用 `.dsh-test` 作为“干净环境”证据。
5. `SLOT_CONTRACT_GATE`：运行时 Slot 协议、占用者和替换风险均已记录。
6. `NATIVE_UI_PRESERVATION_GATE`：隐藏插件后 DSH 原生左栏、中栏和 details 行为不变。
7. `PROJECT_ISOLATION_GATE`：A/B 项目的任务、草稿、结果和面板模式互不串用。
8. `NO_OVERWRITE_GATE`：所有文件写回默认不覆盖且有前后哈希。
9. `PROFESSIONAL_SCOPE_GATE`：受理、生成、审查、人工批准分别命名，不跨层宣传。
10. `EVIDENCE_LAYER_GATE`：静态、单测、构建、Host、浏览器、外部服务和生产证据分开报告。

### 6.2 状态规则

- `PASS`：当前阶段全部必需门禁有新鲜证据，且无未解决 P0-P2。
- `PASS_WITH_CONCERNS`：必需门禁通过，仅剩已披露且不影响阶段目标的 P3。
- `STATIC_ONLY`：只有静态/测试证据，缺真实 Host、浏览器或外部运行证据。
- `BLOCKED_WAITING_FOR_USER`：必须的浏览器、凭据、真实服务或人工复核证据只能由用户提供。
- `FAIL`：存在可执行的 P0-P2 或关键后置条件失败。

任何周不得用测试数量、HTTP 200 或“页面能打开”替代业务后置条件。

## 7. Beta 验收场景

### 7.1 项目与面板

1. 在项目 A 打开右栏，建立两个任务页并输入不同草稿。
2. 同项目切换会话，右栏保持项目 A 的页签和当前状态。
3. 切到项目 B，显示项目 B 的独立状态；首次进入为空。
4. 切回项目 A，原有状态恢复。
5. 依次验证 normal → expanded → normal → hidden → normal；无数据丢失、无中栏重建。
6. 隐藏绿洲面板后，DSH 原生工具详情仍可打开。

### 7.2 通用技术研发

1. 选择技术研发工作流，登记目标、约束、材料和证据状态。
2. 生成问题分解、候选方案、风险、验证计划和研发交付预览。
3. 修改输入后创建新运行，旧运行和来源快照仍可查看。
4. 经人工确认将新产物写入项目，不覆盖已有文件。

### 7.3 中国发明专利

1. 选择中国发明专利工作流，录入技术交底、对比材料、术语和待确认事实。
2. 生成术语表、支持关系矩阵、权利要求策略、权利要求书与说明书草案预览。
3. 对缺乏支持的特征、数值、效果和实施方式给出阻断或问题清单。
4. 人工审查通过后下载或安全写回；界面不宣称授权前景或法律结论。

## 8. 风险、止损与升级策略

| 风险 | 处理 |
|---|---|
| DSH Slot 或 Layout 在新版本变化 | 固定版本；升级前运行 live Slot 树、类型、构建和浏览器兼容矩阵 |
| `shell.overlay` 本身不提供右栏推挤几何 | 仅在固定`0.1.1-rc.2`启用自建最小布局适配器；写入严格受DOM预算和所有权约束。检测、冲突、几何后检或清理任一失败即隐藏并恢复；不得偷换成`details`、复制AppFrame或扩大到其他工作台功能 |
| 项目状态跨项目串用 | 所有 Host API 强制显式 `workspaceId`，Client 每次调用核对当前成员关系 |
| 长任务中断或重复提交 | 幂等请求键 + 不可变输入快照 + 可恢复状态轮询 |
| 材料敏感或过大 | 状态只存引用和哈希；下载、日志、错误信息不回显密钥或全文 |
| 专利草案缺乏支持 | 支持矩阵和人工门作为交付阻断，不允许以语言润色掩盖证据缺口 |

## 9. Beta 出口清单

- [ ] 安装、卸载、重装和固定版本升级均有隔离 Profile 证据。
- [x] normal/expanded/hidden 三状态与 Codex 图标语义一致。
- [x] 左栏、中栏、原生 details 不被替换或破坏。
- [x] 多任务页按 Workspace 持久化，项目切换无串数据。
- [x] 工作流选择原位转换为输入和结果预览骨架。
- [ ] 技术研发与中国发明专利各至少一条真实非生产 E2E。
- [ ] 失败、超时、取消、重试、恢复、冲突和离线均有可理解反馈。
- [ ] 预览、下载、写回分离，默认 no-overwrite。
- [ ] 专业事实、术语、支持关系、运行版本和人工复核可追溯。
- [ ] 键盘、焦点、屏幕阅读器、缩放和窄屏门禁通过。
- [ ] 无 Client 密钥、敏感日志、路径遍历或任意本地服务访问。
- [ ] 最终报告只给一个 V4.1 状态，并列明命令、退出码、证据层与未验证风险。

## 10. 计划维护规则

- 用户确认优先于旧 PRD 或旧代码中的同名字段。
- 整体范围变化先更新本文，再更新周计划和实现；不得从代码反向制造需求。
- 历史审计报告只追加后续验证引用，不改写原裁决。
- 未经用户明确授权，不执行 Git 初始化、提交、远程写入、发布或生产部署。
- 每周计划必须列出精确文件、TDD 步骤、验证命令、证据目录和停止条件。
