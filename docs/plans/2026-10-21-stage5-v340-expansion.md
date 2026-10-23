# 阶段5 V3.4.0扩展执行计划

> 使用 superpowers:executing-plans 单代理执行，test-driven-development 验证，结论前 verification-before-completion。用户已明确绑定dsh-lab并执行阶段5；不自动提交、推送、部署或新增真实生成预算。

**Goal:** 依路线图顺序，使14节点具备同一公共输入、累计产物及来源合同；逐批接入本地Skills和实际API，不能无损映射的来源保持禁用。

**Architecture:** 复用现有Workspace材料读取与RPC边界，新增独立版本的V3.4.0合同及确定性累计组装，不修改旧claims合同、业务记录或历史Skill。先交付Host可调用的14节点目录和明确文件准备，再实施有持久化、未决保护、人工审核的运行接线。

**Tech Stack:** 当前固定Node24.21.0、zod4.4.3；无新增依赖。

**Spec:** `docs/business-baseline/14节点清单V3.4.0.md`，SHA256 `a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6`；`docs/plans/2026-10-13-oasis-development-roadmap.md`阶段5；根AGENTS.md。

## 全局约束

- 复用mac/continuity-v2；保留设计原件、R2–R4未提交代码、旧unknown、旧审核与保存文件。
- 一个ID只接受一个文件或文本；user_input仅用户手动输入；只读调用方明确指定的当前项目文件，不扫描目录、不猜最新。
- 缺材料/业务风险进入警示，继续生成；路径越界、哈希变化、编码/容量限制属于读取安全失败，不冒充已读取。
- 全部开放警示、来源、模型补齐、人工修改、稳定ID与T1–T6随累计快照传递；代码不作专业法律判断。
- 保留旧claims运行方式，新版准备不派发、不自动改任务或开放API；无损映射和真实语义证据缺失时明确不可执行。

## 本批任务

### Task 1: 14节点冻结合同目录

**Files:** 新增 `src/v340-contracts.json`、`src/v340-catalog.js`、`test/v340-workflow.test.mjs`（业务包内）。
**Interfaces:** `getV340Catalog()`返回14节点字段与来源可用状态；`getV340Node(nodeId)`精确取版本；`loadV340Instruction(nodeId)`验证固定包指纹并返回业务公共合同与该节点原文。

- [x] 先测试14节点输入差异、错误节点拒绝、全部来源未就绪、原文指纹变更拒绝。
- [x] 从已批准原文提取版本化静态合同包；固定哈希，不改历史资源。
- [x] 运行定向测试，预期全部通过。

### Task 2: 输入和累计Markdown确定性合同

**Files:** 新增 `src/v340-document.js`、扩展同一测试。
**Interfaces:** `prepareV340Inputs(nodeId, values)`返回逐ID回执、前序快照和警示；`assembleV340Document({nodeId,workflowRunUid,generatedAt,prepared,output})`只校验/合并LLM明确返回的内容，返回body/fileName/sha256/snapshot；`inspectV340Document`读精确前序文件。

- [x] 先测试缺件持续输出、编号文件分离、模型伪造指令拒绝、前序节点/名称/哈希异常警示、上海秒级UUID命名。
- [x] 测试14节点顺序交接，开放警示不丢、T1–T6和实用新型标志继承、正文不递归膨胀、无手动指令不得覆盖稳定内容、模型补齐不能冒充人工事实。
- [x] 实现严格版本化输入/输出schema和累计组装；没有模型内容就不能伪造草稿。
- [x] 定向测试，预期全部通过。

### Task 3: Host只读准备入口

**Files:** 新增 `src/v340-preparation.js`；修改 `workbench-service.js`、`workbench-rpc.js`、`workbench-connection.js`，新增准备集成测试。
**Interfaces:** `getV340Catalog()`；`prepareV340({workspaceId,nodeId,textInputs,filePaths,configuration,confirmed:true})`通过既有Workspace读者完整读取指定UTF-8 md/txt并冻结哈希；只返回准备快照和不可执行原因，不调用模型或写运行状态。

- [x] 红测真实临时Workspace读取、跨项目/路径/软链接拒绝、额外字段与文件ID滥用拒绝；空目录不扫描。
- [x] RPC严格验证，出错不泄露正文、路径或底层异常。
- [x] 运行准备/RPC/路由及现有claims受影响回归。

## 后续接线与验收（不以本批准备代替完成）

- [x] 公共运行schema/旧记录兼容、草稿/结果状态、按Workspace持久化与unknown保护：已完成Host内部合成执行及仓库重开验证，见2026-10-21-stage5-runtime-persistence.md；不代替实际Desktop重启验收。
- [ ] 首模板新版 → Flow-1-1～1-5 → 2-7 → 3-8～3-10 → 4-11～5-13 → 6-14的本地资源加载和单次原生模型执行接线。
- [ ] 每节点共同字段→API inputs→结果类型映射、实际目录/schema/资源指纹及账户项目绑定；缺证据保持禁用。
- [ ] 文件解析扩展到PDF/DOCX/图片等实际材料；不以UTF-8文本支持冒充全文件支持。
- [ ] 真实Desktop宽窄页、两来源逐节点生成/审核/保存/引用及相邻交接验收，真实请求需具体预算。

## 复审重点

1. 模型不能修改用户指令或把补齐变为确认事实。
2. 上游人工编辑/警示必须保留；损坏元数据不能被悄悄当可信。
3. 异常/超大输入不会截断后假装完整读取。
4. 非法路径/文件替换不泄露跨项目内容。
5. 14节点目录/合成组装不被报告为14节点真实可运行。

本地账本：`.local/stage5-v340-20261021/progress.md`。本批完成后按事实更新勾选和剩余阻塞，不把整个阶段5标为通过。

## 本批执行记录

公共合同、累计组装和Host只读准备已实施；13项新增测试通过，完整899项中897通过/2历史跳过，构建、14启动合同和114成员打包预览通过。Desktop两种check均因固定应用漂移退出1，阶段5整体未完成。证据：`docs/evidence/2026-10-21-stage5-v340-foundation.md`。


2026-10-21后续：新版运行与持久化基础已实施；真实来源仍禁用，common页面/原生模型/API/非文本/实际Desktop验收保持未完成。精确新鲜结果见docs/evidence/2026-10-21-stage5-runtime-closeout.md。

## 2026-10-22共同页面及结果闭环进展

- [x] 共同页面、功能中心14节点、单草稿/来源切换、结果版本编辑、固定版本人工审核及无覆盖文件保存：源码、真实RPC/store、React DOM及临时磁盘合成范围完成。关闭标签保留Host任务，冲突保留可复制草稿；生产执行器及run/create RPC仍禁用。
- [x] 本切片正式回归15/15，主包960/960、Mac26/26、恢复后包合同9/9；两种来源标签浏览器合成场景通过。旁置候选包119成员，与当前源码配对；活跃lib恢复为本切片起点完整SHA256，未装配应用。
- [ ] 原生模型/API逐节点接线与实际绑定、非文本解析、原生打开/导出/对话引用、实际Desktop与安装升级验收继续保留。此前“共同页面未完成”仅在上述代码/合成范围被本条更新，不替代产品验收或阶段5整体完成。

范围、失败记录、构建偏差及保全见 [共同页面及编辑审核保存报告](../evidence/2026-10-22-stage5-pages-results-closeout.md)。
