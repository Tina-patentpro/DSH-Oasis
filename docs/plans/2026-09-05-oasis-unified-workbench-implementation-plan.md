# 绿洲统一专业工作台：界面优先与固定版本分步实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 默认单代理；不得因此自动委派、创建任务、安装或发布。
>
> 日期：2026-09-05；修订：R4 阶段 2 执行结果
> 状态：阶段 1 原型 V3.1 已确认；阶段 2 固定版本适配与最小装配已在隔离 Desktop 中完成，G-BASE 通过；本地 Skills 保密边界 G-SKILL 仍未解决。
> 阶段 2 未调用真实 API、付费模型或真实私有 Skill，未修改真实 Profile，未提交、推送或发布；进入阶段 3 仍需新的明确授权。

**Goal:** 在固定的 DSH、anywhere-labs Desktop、Better Sidebar 组合中，让用户通过同一界面、仅切换生成来源，完成本地 Skills 或专业 API 生成；两类结果使用同一套审核、保存、引用和对话衔接能力。

**Architecture:** DSH 核心尽量原样复用；Desktop 和 Better Sidebar 采用配置/扩展优先的薄层二开；专业业务留在现有绿洲插件。本地 Skills 的产品级隐藏与技术上不可提取是不同目标，后者在用户控制的本机上不能保证；保密范围的待决门禁见第 3 节。

**Tech Stack:** DSH 0.1.2-rc.1、anywhere-labs Desktop v2.0.5（内置 DSH 0.1.2-rc.1）、Better Sidebar 0.18.0；沿用项目 React、Node、Cordis 和现有测试/构建体系，匹配新基线升级 SDK 依赖，不另建诊断平台。

---

## 1. 目标合同与本次用户决定

| 编号 | 已确定要求 | 对实现的约束 |
|---|---|---|
| R1 | 本项目业务 Skills 不向用户提供获取渠道；仍须本地执行 | 不转为服务端 Skills；不把隐藏界面、打包或混淆称为绝对保密；具体可接受保护范围待确认 |
| R2 | Skills 与 API 使用相同界面，仅通过开关切换 | 同一个业务模板、输入表单、提交组件、进度区、结果区；不能保留两块独立操作面板 |
| R3 | 两类生成内容同等对待 | 相同产物模型、审核、编辑后再审、版本、写回、导出、引用和权限；不按来源判定可信度或限制功能 |
| R4 | 第一阶段是界面设计和确认 | 未取得界面确认，不进行生产组件重构、依赖迁移、Desktop/Sidebar 二开或生成实现 |
| R5 | 使用第 2 节的最终统一版本 | 不自动追随 latest，不混用旧 SDK 与新 Host 后宣称兼容 |
| R6 | 充值、消费记录等在已有网站 | 插件只保留本次执行必要的费用/余额提示和网站入口，不建设支付、账务、退款系统 |
| R7 | Desktop 和 Sidebar 按需要二开，尽量复用现有能力 | 先公开服务/声明式装配；确实缺口才做小补丁，不复制文件管理、聊天、布局或 Agent 内核 |
| R8 | 所有项目配置集成到 DSH 设置页面 | 同一设置只保留一个权威存储；DSH/桌面/Sidebar 原有设置不另抄一份 |
| R9 | 生成内容可在 DSH 对话中使用 | 原生文件引用优先；固定审核版本通过只读产物工具读取；不自动发送、不自动触发新生成 |
| R10 | 业务交付优先 | 测试数量不作为业务进度；冻结旧诊断、监管器、反复全库审计的扩展 |

### 1.1 覆盖旧计划的范围

本文是后续工作的主计划。旧文档保留为历史证据，不删除、改写其当时结论。

明确替代旧方案中的：
- 先做版本/环境改造再设计界面的顺序；
- 两套本地/远程表单和结果区；
- 将业务 Skill 作为可浏览、可编辑的用户项目模板下发；
- 自动改为服务端 Skills 的建议；
- 在工作台中长期保留完整连接配置表单与流水观察；
- 将旧 DSH 0.1.1-rc.2 布局适配作为新产品的主要承载方式；
- 未经重新确认的 settings.plugin.item 等旧版本具体接线方案。

不替代真实 Profile 保全、凭据保护、Workspace 隔离、费用/外传确认、未知结果不重发、人工审核和无覆盖写回等安全约束。

### 1.2 交付范围与可操作的业务成果

不以“八阶段完成”代替“用户完成业务”。采用以下交付切片，不擅自缩减整体研发与专利目标：
- **首个端到端切片：** 一个已确认业务模板，用户在同页切换两种来源，分别生成文字正文、审阅、保存 Markdown，并在 DSH 对话中引用后继续讨论。技术研发作为候选，但须先证明存在语义匹配的实际 API；没有对应服务不能硬配。
- **第二个业务切片：** 另一个研发/专利模板复用同一条路径。专利受理、提纲、权利要求书或说明书是不同交付物，设计确认时写清本次输出类型；受理或提纲不冒充完整申请文件，人工审核不等于法律或授权保证。
- **后续材料/文件切片：** 正文提取、文件输入、二进制结果下载/导出单独排期与授权。现有“登记元数据与哈希”保留，但不得宣传为已经读取材料并参与生成。
- 首版文本范围及模板清单属于待界面确认的发行范围建议；不将未交付部分静默删掉。若只验证一个来源或一个模板，报告相应局部成果，不称整体双来源交付。
- 两种来源同等操作的对象是共同支持的产物类型。首版共同类型为文字/Markdown；API 附带文件 URL 只作“未下载、未验证的附件”显示，不能因此给本地文字减少操作，也不能把链接当作文件已交付。

### 1.3 方案取舍与裁剪

选择“复用现有插件 + 两个薄生成适配器 + 原生文件/对话能力”，不重建通用生成平台。
不选把 API 原面板藏到开关后：仍会留下两份表单、状态与权限规则。
不选整套重写或服务端私有 Skills：前者扩大升级成本，后者违反本地执行决定。
阶段门用于形成业务证据，不是新增监管器；授权方式与减少重复审批见第 7 节。

## 2. 固定版本、来源与证据

### 2.1 唯一实施基线

| 组成 | 固定版本 | 本轮证据性质 |
|---|---|---|
| 全局 DSH | 0.1.2-rc.1 | 本机安装包 package.json 已只读确认；未在本轮启动运行 |
| anywhere-labs Desktop | v2.0.5 | 用户指定；对应上游 tag 与桌面包 version 已读取；不是本机安装包验收 |
| Desktop 内置 DSH | 0.1.2-rc.1 | v2.0.5 桌面包依赖明确固定该版本；实际打包产物仍需阶段 2 核对 |
| Better Sidebar | 0.18.0 | 用户指定；上游版本资料与目标包清单已读取；实际目标 Profile 仍需核对 |
| Cordis | 4.0.2 | 本机新 DSH 依赖及 Desktop v2.0.5 清单一致；实施时按完整依赖闭包复核 |

实际 Desktop 进程不能改用全局 CLI 作为内置版本的替代证明。包声明、进程加载、Client 渲染、业务结果分层记录。

### 2.2 现状与新基线差距

- 当前绿洲插件 package.json 仍将 DSH peer/dev 依赖锁定到 0.1.1-rc.2、Cordis 4.0.1；不能只改字符串而忽略实际导出、生命周期、Client 服务变化。
- 本机 0.1.2-rc.1 的 settings 类型中有 settings.section（list）、settings.plugins.tab（list）等；没有据此验证旧 settings.plugin.item 接入。
- 新基线存在 ctx.subagents 的一次性 start 契约与 Skill registry 契约；接口存在不等于业务 Skill 本地隐蔽执行、真实模型运行或 UI 接入已验证。
- 已有 Workspace 任务、持久化、人工审核、安全写回、九端点 API 适配和 Sidebar 协调器可复用。
- 已有 local-mock 是演练，不是真实 Skills 生成。既有合成 API/browser 证据不是当前固定组合的真实非生产验收。
- 项目已有开发 Skill 与业务受理 Skill，且已进入当前 Git 工作区；历史文件不会因新规则变成“从未暴露”。发布边界与历史分发情况需区别处理，不改写 Git 历史。

补充的当前证据：
- 工作流目录里的研发与专利均为 local-mock，materialPolicy.contentReadMode 为 metadata-only。现有能力是演练、材料登记和结果管理，真实本地 Skill 生成不是已完成项。
- 现有本地结果要求 sections/risks/questions；API 结果保存 answerText/fileUrls。两者已共享内容寻址 artifact，但完整运行合同不同；“统一结果”应复用 artifact 并补薄视图，不伪造 API 没返回的分析章节。
- 新 DSH 的 SkillInvocationPolicy 分别控制 modelInvocable/userInvocable；Skill registry 支持 scope，但读取是 invocation-neutral，策略由消费边界执行。安装包的原生 skill 工具明确返回 content。因此 userInvocable=false 不是正文保密开关，scope 也不是对本机所有者的安全隔离。
- Better Sidebar 0.18.0 的上游 peer 范围带 ^，四个顶层版本一致仍不足以防止解析漂移；须同时记录实际锁文件与 Host 依赖闭包。此为静态清单证据，不是当前 Profile 已验证。

### 2.3 权威业务 API

唯一业务 API 基线：
D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md

本轮 SHA-256：
429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1

保持 legacy 方法、字段、文件约定、后端转接 Dify 的边界。deferred/目标态不能当作已部署接口；不为本项目重新实现全站接口或假设 /v1、设备码、退款、取消、幂等结算已经可用。

### 2.4 外部来源（版本化资料优先）

- anywhere-labs Desktop v2.0.5：https://github.com/anywhere-labs/dsh-desktop/tree/v2.0.5
- 桌面包依赖清单：https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.5/dsh-plugin-desktop/package.json
- Better Sidebar 0.18.0：https://github.com/omdsh-dev/DSH-better-sidebar/tree/v0.18.0
- Sidebar 公开扩展说明：https://github.com/omdsh-dev/DSH-better-sidebar/blob/v0.18.0/docs/external-plugin-guide.md
- DSH 官方源码：https://github.com/deepseek-ai/deepseek-harness

上游分支最新文档只作检索导航；具体实现以固定 tag、安装包实际导出及目标运行时为准。部分版本化说明页面本轮未能抓取，不据此推断 API 签名。

## 3. Skills 本地执行与保密边界：G-SKILL 门禁

### 3.1 已确认与尚未确认

已确认：
1. 用户要求本地执行，不接受自动迁移为服务端 Skills。
2. 产品不应向用户提供 Skill 查看、编辑、导出、下载入口。
3. 不以简单隐藏目录、关闭开发者工具、混淆或可逆加密冒充“不可获取”。

待用户明确确认：
- 是否接受“普通产品使用中不提供获取渠道，但不保证抵御设备所有者、管理员、调试、逆向、内存或模型请求抓取”的保护范围。

用户回复“继续”只授权继续编制与保存计划，不等于已经接受上述风险边界。
在明确确认前，G-SKILL 保持 OPEN：阶段 1 的界面设计可以进行；阶段 4 的真实本地私有 Skill 装配/运行不得开始。不得把这项冲突转移成服务器建设任务。

### 3.2 技术事实与诚实表述

- 本地运行需要可执行的规则或提示内容；控制本机的人可能提取运行时内容。
- 即使产品不显示，DSH 的 Skill 工具结果、子会话历史、轨迹、会话导出、崩溃日志、source map、包源码和用户配置的模型端点都可能形成获取途径。
- 本地执行不等于离线：如果 DSH 调用云端模型，输入和相关指令可能发送给该模型提供商。
- 模型也可能被诱导复述提示内容；提示词禁令或字符串过滤不能证明绝对防泄露。
- 不删除既有日志、不篡改真实会话或伪造审计记录以制造“未泄露”的结果。

### 3.3 待边界获批后的最小候选实现

1. 区分内部开发 Skill 与用户产品中的业务 Skill；开发指导不打入用户产品。
2. 业务 Skill 作为仅 Host 使用的受控资源装配，不放入用户 Workspace 的 .dsh/skills 或公共 Skill 目录；普通目录/命令入口不枚举其正文。
3. 客户端只接收业务能力标识、输入 schema、可用性、非秘密版本和执行结果；没有 getSkillBody/exportSkill/readSkillSource 一类 RPC。
4. 优先评估专用原生子任务 scope 内注册 Skill，显式关闭用户调用，仅为该任务允许必要模型调用；不做全局业务 Skill 注册。原生 skill 工具返回正文，必须连同子会话、导出和轨迹检查。该候选不是已满足保密要求的结论，不手写 Agent 循环。
5. 使用合成的非秘密 Skill 样本先查证原生执行、历史、导出、工具结果是否必然暴露正文。
6. 若公开接口无法满足已接受的默认可见性范围，记录具体泄漏面并停在此门禁；先评估小型可维护扩展，不能默认深改 DSH 核心或关闭全局审计。
7. 不把 minify/加密包作为安全边界；不为首版建设 DRM、授权服务器或自制加密协议。
8. 本地包被提取的剩余风险必须写入内部发布说明，不能对外承诺“技术上永远无法获取”。

候选方案不视为已实现或已被用户批准。

### 3.4 提前裁决风险，不等到业务实现后返工

G-SKILL 包含两个独立条件：用户接受明确的保护范围，以及固定运行时实测满足该范围。二者不能互相替代。
- 阶段 1：根据已读源码标出正常产品入口可能暴露正文的路径，保持 UI 设计可继续，不放真实 Skill 或秘密样本。
- 阶段 2 最先做一次隔离、非秘密样本的最小暴露面核对；只借现有工具/会话读取能力，不新建验证器，不调用付费模型。检查普通命令、父/子会话、工具结果、默认导出及客户端资源；模型请求去向另按实际配置说明。
- 若默认产品流程已暴露正文，不等到阶段 4 再宣布冲突；保留与此无关的 UI/API 工作，但不宣称本地方案可交付。
- 如果必须新增提示上下文的可见性规则，只提出具体小补丁和维护成本供确认；不得绕过原生安全记录、删除历史、全局隐藏用户其他 Skills 或自动转服务端。
- 用户不接受剩余风险时，真实私有 Skill 路线保持未解决，不用混淆工程代替决策。

## 4. 产品与数据职责

| 负责方 | 主要职责 | 不重复建设 |
|---|---|---|
| 既有网站 | 充值、消费记录、账单和账户事务 | 插件不建设支付/财务中心 |
| DSH | 模型、原生任务、会话、工具、权限、凭据及基础服务 | 绿洲不复制 Agent、会话日志或模型配置 |
| Desktop 二开 | 固定运行时装配、启动、窗口、更新、必要产品入口 | 不放专业业务和 API 密钥副本 |
| Sidebar 二开 | Tab 容器、布局、原生文件打开/编辑/预览/引用 | 不放专业工作流或第二份业务数据库 |
| 绿洲插件 | 统一业务 UI、输入映射、运行关联、产物审核、安全写回 | 不复制通用文件管理、聊天、账务和调度平台 |

### 4.1 唯一业务数据源

- Workspace 身份来自 DSH 的权威 Workspace/Session 上下文，不由标题、默认 cwd 或模型参数猜测。
- 业务任务、运行、审核和产物继续保存在现有工作台 Domain；DSH Session 只作为运行与对话关联，不作为第二份业务任务仓库。
- Sidebar Tab 是视图，不是任务身份。关闭 Tab 不等于取消运行，切换会话不改变原任务所属 Workspace。
- 后台 folder_id 独立于本地 Workspace ID；在原生设置的当前项目区域建立显式绑定，提交前仍按 API 校验。
- 不允许两个 Host 同时写同一业务存储；不能假设现有串行写队列已经提供跨进程锁。

### 4.2 统一输入与结果合同

对一个业务模板，两种来源必须读取同一份输入草稿和同一 inputSchemaVersion。
- 表单字段、顺序、校验展示和动作位置不随开关改变。
- API 特有参数在适配器中由显式映射或已确认的项目配置提供；不得通过换模式增加第二张表单。
- 某个 API 无法无损映射全部必需字段时，该模板下禁用 API 选项并给出原因；不得悄悄丢弃输入或编造默认值。
- 首版只开放能证明两种来源语义对应的模板。目录中其他服务不冒充双来源能力。
- 新任务初始默认建议为本地 Skills；若用户在 DSH 设置选择了有效默认来源，则新任务读取该偏好。已有任务保留自己的来源，切换不发起生成；不可用时明确禁用，不自动换来源。
- 输入、来源、模型/服务版本、项目绑定或价格变化使本次确认失效。
- 运行中锁定输入和来源；失败不自动切换来源；再次生成创建新的运行记录。
- 结果使用同一产物数据结构与消费规则，而非要求两端产生相同章节或字节；具体合同见第 4.4 节。
- 来源仅作追溯元数据与费用/隐私说明，不构成质量等级。相同处理不等于承诺输出内容或专业质量完全相同。
- local-mock 仅留测试/历史兼容，不作为用户可选的正式第三种来源。

### 4.3 业务模板映射必须在设计确认前准备

阶段 1 只读对照现有 workflow-catalog 和已验证 API 文档的 8.4/8.5 节，形成“共同字段 → 本地 Skill 输入 → API inputs 字段 → 结果类型”的映射表，放入同一份 UI 设计文档，不新建目录发现系统。
- 现有研发 objective/currentState 等与文档示例 User_input/technical_field/technical_solutions 等并非天然一一对应；示例也不能证明存在某个研发服务。不得按名称相似、文档示例 ID、历史合成 ID 或把所有字段塞进一个字符串来假装语义一致。
- 每个发行模板保留一条非秘密绑定记录：templateId/version、公共 schema 指纹、Skill 版本、API origin/服务标识、实际 input/output schema 指纹、执行方式及材料/结果限制。它是固定映射数据，不是任意脚本或插件框架。
- required、长度和必填语义以经确认的公共业务合同为准；API 文档示例没标 required 不等于所有字段可省略。列表到文本的转换必须保留标签、顺序与完整内容，并在映射记录中说明。
- 设计时缺少实际服务详情：可确认布局和公共交互，业务绑定标“待核实”；不得预填可交付。阶段 5 获批后读取实际目录/详情确认；若不得不改公共表单，更新同一个设计并仅确认受影响部分。
- 执行前比对实际详情与已批准绑定；新增必需字段、结果类型或业务语义变更只禁用该模板 API，不静默改表单或回退到旧映射。

### 4.4 最小共同合同及生产者—消费者约束

下表是拟定的业务合同，不是声称 DSH SDK 已导出同名接口。沿用既有 artifact、运行存储和写回服务，不再新增第二套数据库。

| 数据 | 生产者 | 必需信息 / 确定性处理 | 消费者 |
|---|---|---|---|
| 模板绑定 | 已确认业务目录 | 模板/输入 schema/映射版本、来源可用性、输入输出类型 | 同一表单、两个适配器；未知类型禁用而非猜测 |
| 执行快照 | Host 统一提交入口 | workspaceId/taskId/runId、来源、输入哈希、绑定与配置 revision、必要确认；只存凭据引用，不存令牌 | 原生任务/API 适配、恢复及迟到响应校验 |
| 文字产物 | 两个生成适配器 | 非空 body、mediaType、既有 sha256/artifactId、来源运行关联 | 共同预览、审核、保存、导出、对话 |
| 补充分析 | 生成结果（可选） | sections/risks/questions 未返回时标“未提供/未评估”，不能空数组冒充无风险 | 共同审阅区；不补造专业结论 |
| 审核版本 | 用户审阅动作 | 精确 artifactId/哈希、版本、审核状态和时间 | 写回、固定版本引用；内容改变即新草稿 |
| 执行状态 | Host 根据实际结果归一 | 原生状态与业务状态分开；“执行结束但无可用正文”不算文本业务成功 | 页面、恢复、异常提示 |

内容相同的跨项目产物可能有相同内容哈希；哈希不是授权凭证。列表/读取必须先从调用上下文确认 Workspace，再验证 task/run/artifact 归属。
首版“导出”复用确认后的 Markdown 文件保存，不承诺 DOCX/PDF 渲染器。纯文本 API 响应可作为正文区整体显示，不强拆成假结构。
非空正文仍需业务审阅：研发输出应回应技术问题、依据与验证动作；专利类应标明实际交付类型、术语与待确认事实。请求成功或模型自评不能代替人工内容验收。

### 4.5 设置作用域、账户与草稿归属

| 配置 / 状态 | 权威作用域与所有者 | 变化后的行为 |
|---|---|---|
| 模型、模型凭据、调用权限 | DSH 原有设置与 credentials | 绿洲仅引用；缺失时说明，不另存密钥 |
| API origin、下载来源与 JWT 引用 | 当前 DSH Profile 的绿洲设置 / credentials | origin 或账户改变后旧 folder/目录/费用确认失效；禁止把旧 JWT 自动带到新 origin |
| 网站入口、初始来源等全局偏好 | 经确认的产品配置 / 原生设置 | 未核实网站地址不开放；默认值只影响新任务 |
| 后台 folder、输出目录、项目偏好 | 权威 Workspace 下的绿洲项目配置 | 后台绑定同时校验 API origin 和账户身份；不以同名或单独 folder_id 复用 |
| 本次来源、草稿、确认 | 当前 Workspace/task 的业务状态 | 不是全局配置；切换 Tab/会话不覆盖别的任务 |
| 运行中的配置 | 创建前冻结的非秘密 revision 与关联 | 不热切换目的地、账户或输入；凭据失效先停止后续请求并保留未知状态 |

“设置都在 DSH 设置页”不等于都保存为全局值。项目区域显示明确的当前项目标识；保存由 Host 校验作用域，不能只信前端传入的 Workspace ID。
设置迁移先读取旧命名空间、确认映射并保留凭据引用；不要要求用户在聊天中重贴 JWT。取消/清空普通输入不等于删除已保存凭据，应有明确动作与结果。
用户草稿在任务内持久化；同任务并发编辑用 revision 冲突提示，禁用自动覆盖。首版每 Workspace 最多一个活跃生成，不做排队调度器。

### 4.6 有限状态与恢复边界

- 主路径：草稿 → 校验/本次确认 → 运行 → 可用结果待审 → 已审核 → 确认保存/引用。审核、文件保存与运行状态分离。
- 原生任务：停止请求已发出不等于已取消；只按真实终止回执结束。Host 中断后保留运行关联，恢复只观察已有任务，不隐式新建。
- API：发送前持久化 requestKey 与运行快照；超时、断连或 Host 中断后请求是否生效不明，保持 submission-unknown。不重新 create，也不从 401/403 自动推断此前一定没有执行。
- queryprocess 文档只保证进度示例，不保证同步请求结果能恢复、100% 一定带正文或取消成功。观测完成但无正文时显示“执行已结束，结果仍未取得”，允许查看网站既有记录，不编造恢复接口。
- 重复终止通知只关联同一原生/API 运行；旧回调不得更新新草稿。配置、账户或项目变化后，不能把迟到结果挂到当前选中的任务。
- 预览、默认导出和对话引用将生成内容视为资料而不是系统指令；Markdown 不执行原始 HTML/脚本，远程资源不自动加载。优先复用宿主安全渲染能力，不新建渲染器或通过引用启动工具。
- 文件在审核后被外部编辑：保留原审核快照；显示“当前文件已变化”，如需纳入业务成果则创建新草稿并再审，不覆盖历史。

## 5. 第一阶段界面目标（必须人工确认）

### 5.1 一张业务页面

建议的共同布局：
1. 顶部：项目与任务名称、业务模板。
2. 生成来源分段开关：[本地 Skills] [专业 API]。
3. 统一输入区：由已确认业务模板定义的文字字段；首版仅文本，材料登记如保留须明确“仅登记，未用于生成”，不能摆出可生成的文件上传假入口。
4. 固定位置的执行摘要：当前来源、数据去向、必要成本/余额提示。
5. 单一“生成”按钮与统一进度/错误区域。
6. 单一结果区：预览、历史版本、审核、保存到项目、在对话中使用。

不得在同页同时出现“本地生成区”与“非生产专业服务区”两套表单和按钮。
不得把 Skills 模式隐藏成聊天输入的另一种操作路径；两种来源都从上述共同 UI 操作。

### 5.2 设置与网站入口

- DSH 设置中增加“绿洲工作台”页面，包含连接、生成默认值、项目绑定与输出偏好、版本/可用性信息。
- 不提供业务 Skill 源码、提示词编辑器、下载或导入替换入口。
- DSH 模型、Desktop 运行/更新、Sidebar 布局继续进入各自原有设置；同一值不重复保存。
- 工作台不保留整块 API/JWT 表单，仅显示必要状态和“前往设置”。
- 充值/消费记录通过已确认的官网链接在系统浏览器打开；不携带 JWT、Skill、客户内容或会话快照。
- 本次价格、资料外传和审核确认仍在业务页面，不变为永久关闭的配置项。

### 5.3 状态与交互确认清单

必须设计：空任务、草稿、模式可用/不可用、输入错误、未配置、待确认、运行中、取消中、失败、结果未知、完成待审、修改后待审、已审核、写回冲突、断连/恢复。
- API 不支持真实取消时，显示“停止等待，服务端状态未确认”，不能伪装成已取消。
- 不确定结果不显示伪成功；不换 key 自动重发 create。
- 暗色/浅色、窄侧栏/展开布局、键盘导航、焦点和长内容滚动保持可用。
- 不固定复制旧 360px 布局；尺寸服从 Sidebar 容器，断点在设计确认中冻结。
- 仅生成来源值、可用性和必要费用/隐私文字变化；不改变页面结构与结果权利。

## 6. 分阶段实施清单

### 阶段 1：界面设计与确认（必须最先执行）

**输入：** 本文、既有 UI/用户截图、固定版本的界面契约；使用合成数据，不读取秘密或真实业务材料。

**新增交付物（阶段 1 V3 已迭代）：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui.html
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui-acceptance.md

**步骤：**
1. 盘点现有入口、任务页、配置区、运行/审核/写回位置，列出保留与合并项；同时完成第 4.3 节只读字段映射和待核实项，不修改生产源码。
2. 在同一静态原型中给出窄侧栏和展开两种布局；复用宿主视觉语言，不绘制另一套 DSH 外壳。
3. 实现原型内的来源开关，验证输入值不丢失、结构不变化、结果操作完全相同；全部使用明确标为模拟的 fixture。
4. 设计所有第 5.3 节状态与同结构确认摘要；把服务/模型成本和资料流向表达清楚。
5. 设计原生设置页与网站辅助入口；没有 Skill 正文或完整账务页面。
6. 一次集中确认布局、开关文案、默认规则、公共输入 schema、实际输出类型、结果操作、设置作用域及异常状态；把后台绑定未核实项单列，不让用户对每个字段反复审批。
7. 在 acceptance 文件中记录实际确认的原型版本/哈希、日期和用户反馈；不得预填“已确认”。

**验收 G-UI：** 用户明确确认具体设计版本与交互；首个实际业务模板须在阶段 3 前另行明确，不是阶段 2 的阻塞项。只记录模拟截图不算确认；示例服务不算实际业务绑定。未通过则只迭代界面，不进入阶段 2。
**并行约束：** 不趁设计阶段升级依赖、安装 Profile、fork/修改宿主或连接真实 API。

### 阶段 2：固定版本适配与最小产品装配

**前置：** G-UI 通过，另行批准本地适配。G-SKILL 未确认时允许使用合成 fixture 检查通用 UI，不实施真实业务 Skill。

**主要修改文件：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\package.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\pnpm-lock.yaml
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\cordis.patch.yml
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\tsdown.config.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\WorkspaceContextBridge.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\panel-host-coordinator.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisBetterSidebarTab.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\dsh-plugin-development\SKILL.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\dsh-plugin-development\references\official-contracts.md

**新增：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\release\oasis-runtime-baseline.json

**步骤：**
1. 记录四项实际版本、全局 CLI 路径、Desktop 实际安装/内置运行时路径、目标 Bundle 列表及单一存储所有者；随后先完成第 3.4 节非秘密样本可见性核对。局部风险未决不扩大成全系统排障。
2. 对比新旧 SDK 实际导出和接线，只处理入口、上下文、设置、工具、存储及必要 Agent 契约，不扫描无关功能。
3. 为变更的契约补最小失败用例，再将相关 peer/dev 依赖统一到固定版本；沿用各仓库工具链与锁文件，避免宿主服务/React 被重复打包。
4. 在隔离 Profile 中读取 live Slot 全树及候选 Slot 精确信息；只核对本次入口/设置涉及的节点。计划采用 settings.section 下的“绿洲工作台”页面，未确认 live 契约不得注册。
5. 复用 Sidebar registerTab、定向打开、生命周期、文件打开/引用能力；记录 0.18.0 实际可用性。出现双挂载直接修装配，不添加第二套布局所有者。
6. 新产品默认 Sidebar 承载；旧独立面板只保留历史兼容，不作为新基线主路径。Sidebar 缺失时给出明确安装/启用提示，保留安全只读能力，不抢占原生结构单槽。
7. 在目标 Desktop 中完成空白业务页与设置入口的真实渲染，保留一次关键截图/错误结论。
8. 更新基线 JSON 和开发 Skill 的版本指引，旧版本条目标记历史，不清理历史证据。
9. 将下列兼容接点收敛在现有适配文件或对应新增生成适配器中：Workspace/Session 上下文、原生子任务、设置/凭据、Sidebar Tab 生命周期、文件引用、Domain 存储。业务合同不导入宿主类型/私有 store/DOM 选择器；不为两个来源建通用 Provider 插件平台。
10. 基线清单记录上游 tag/commit、补丁 revision、实际依赖解析、关键 capability 及 schema 版本。版本吻合但 capability 缺失时只禁用受影响动作，保留已有成果读取；不通过版本字符串单独判断兼容。
11. 做一次最小安装包可行性检查：固定发行包能装配绿洲入口、读取正确运行时；品牌化、更新 UI 和最终打包仍在阶段 7，不提前二开整个 Desktop。

**定向测试：** package-contract、bundle-contract、client-build-contract、slot-contract、workspace-context-bridge、panel-host-coordinator、embedded-workspace-host。
**验收 G-BASE：** 固定组合实际加载且项目切换准确；不是“版本字符串一致”即可通过。

**2026-09-06 执行结果：** G-BASE 通过。隔离 Desktop `2.0.5` 使用内置 DSH `0.1.2-rc.1`、Better Sidebar `0.18.0` 与绿洲 Bundle 完成真实启动/重启；绿洲原生设置页与唯一 Sidebar Tab 实际渲染；workspace-a 与 workspace-b 切换后任务状态保持隔离。Better Sidebar 自有设置关闭“文件变动”和“终端”，重启后的新建标签菜单不再出现二者。证据见 `docs/release/oasis-runtime-baseline.json` 与其中登记的截图。本结论不包含生成业务、真实 API、真实模型或私有 Skill。

**独立关注：** 固定包的原生 Skill 工具结果会携带完整 Skill `content`，客户端可展开查看；因此阶段 2 没有把 G-SKILL 误判为通过，也没有装入真实私有 Skill。该问题只阻断阶段 4 的私有本地 Skill 路线，不否定 G-BASE。

### 阶段 3：统一业务界面、设置和数据合同

**前置：** G-BASE 通过。使用模拟执行适配器先完成 UI，模拟结果不能登记为真实生成。

**主要修改：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisWorkbenchSurface.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\PanelPages.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\WorkflowForm.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\RunPreview.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-model.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-store.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\oasis-connection-settings.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-runtime-config.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-domain.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-service.js

**新增：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\GenerationSourceSwitch.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisSettingsSection.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\generation-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\unified-generation-ui.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\workbench-v4-contract.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-settings-section.test.mjs

**步骤：**
1. 按已确认原型将两套表单/按钮合并为一个视图；旧 ProfessionalServicePanel 的 API 接线提取复用，不让它继续成为第二个业务入口。
2. 增加固定来源枚举 local-skill / oasis-api；对外只暴露两个选项，local-mock 不作为正式选项。
3. 定义一个模板、一份输入、一份校验结果；API 映射失败时禁用该来源并说明原因，不按来源重建字段。
4. 把配置组件复用到新设置页面；旧工作台配置区退出主流程。复用现有命名空间和凭据引用，保存后显示真实生效/需重启状态。
5. 将“观察流水”主界面替换为网站辅助入口；保留历史记录，不扩展账务接口。只移除此次合并后确认无引用的代码。
6. 以 schema v4 显式承载新增来源/运行关联/项目偏好；保留 v1/v2/v3 读入迁移、旧模式和哈希算法，不把历史 local-mock 改称本地 Skills。
7. 统一运行状态的展示；保留原生执行状态用于追溯。API 未知不得转换成取消/失败后可安全重试。
8. 原始响应和生成操作在存储锁之外；先登记运行快照，结束后核对运行/Workspace/版本再更新，拒绝陈旧回调写入新任务。
9. 两种来源运行同一套 UI/权限测试；正文可不同，共同合同及操作权利相同。复用现有内容寻址 artifact，按第 4.4 节处理缺失的结构化分析。
10. 使用两个合成来源产物提前验证“保存 Markdown → 原生文件打开 → 填入对话草稿”的最小路径；不启动真实生成。固定审核版本读取与真实双来源验收在阶段 6 完成，不到那时才确认引用入口是否存在。
11. 将第 4.5/4.6 节的作用域、草稿持久化、配置失效、重复回调及未知状态规则纳入既有 store/domain 测试，不新增状态监管器。

**验收 G-UNIFIED：** 开关切换不改布局/输入，不自动生成；两个 fixture 的结果能力完全相同；旧数据可读且哈希不变；原生设置可用。

### 阶段 4：本地 Skills 的受控调用与真实生成

**前置：** G-UNIFIED、G-SKILL 均通过，并单独确认本次模型调用/资料外传范围。

**主要修改：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\index.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-service.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workflow-catalog.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\package.json

**新增候选文件（保密边界确认后才能实现）：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\dsh-generation-adapter.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\business-skill-runtime.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\dsh-generation-adapter.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\business-skill-exposure.test.mjs

业务 Skill 源码归受限开发资源，不在本文记录正文；实际存放、打包、源码映射与发布排除策略在 G-SKILL 的确认记录中确定，不自动分发已有 .dsh/skills。

**步骤：**
1. 复用阶段 2 的非秘密样本结论；若执行接线/版本变化，只补查受影响暴露面。普通入口不可获取与防本机提取是两件事，不重新建立全套审计链。
2. 如普通产品功能必然暴露正文，暂停并报告；不能先放入真实业务内容再补隐藏，也不能改为服务器执行。
3. 复用 DSH 公开一次性子任务能力；当前会话/Workspace 必须有效，不伪造父 Agent。不默认继承整个父会话历史。
4. 只加载当前业务需要的 Skill；仅允许必要工具。禁止子任务收费提交、任意 Shell、跨项目读取、自动写回、自动批准或继续创建子任务。
5. 使用 DSH 原有模型与凭据配置；不建立绿洲自己的模型密钥存储。模型不可用只禁生成，已保存产物仍可读。
6. 将任务 ID、输入哈希、非秘密 Skill 版本和 DSH 运行 ID 关联；不将 Skill 正文写入业务 Domain、产物来源文件或用户可见错误。
7. 读取真实终止原因和非空有效产物；不能把 idle、Promise resolve 或 HTTP 200 当业务成功。失败/未知保持诚实。
8. 先跑通 G-UI 确认的首个文本业务模板，再以同一接口装配另一个研发/专利模板；候选顺序不覆盖实际业务映射决定，不新建第二套 UI。
9. 完成一次合成输入的真实模型运行，并记录实际使用 Skill 的证据与剩余可提取风险；业务内容需人工判断。

**验收 G-LOCAL：** 从统一 UI 实际生成结果；不配置专业 API 仍可用；满足用户已经接受的产品级可见性范围；未取得绝对防逆向证明，也不得作此宣传。

### 阶段 5：现有 API 接入同一业务合同

**前置：** G-UNIFIED 通过；可在 G-SKILL 未决时进行 API 的纯契约准备，但不得据此宣称双来源交付完成。

**主要修改：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-rpc.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-remote.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workflow-catalog.js

**新增：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-generation-adapter.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\generation-provider-parity.test.mjs

**步骤：**
1. 从已验证 API 文档和实际服务详情确定首个同义业务模板，不硬编码历史服务 ID/价格。
2. 完成阶段 1 映射表中的实际服务绑定，校验 id/name/api_process、input/output schema 指纹及账号项目归属；requestKey 由本次运行生成。create 仍严格使用文档五字段，不加入自定义顶层参数。
3. 校验公共模板的所有必需输入均可表达，不增设 API 专用表单；不能映射则不开放该模板的 API 模式。
4. 复用现有价格/余额快照、输入和外传确认，统一在相同摘要组件展示。来源切换必须重新确认。
5. 复用一次创建、原 key 进度观察和结果未知保护；但不把 queryprocess 当作已证实的同步结果恢复 API。100% 无正文仍是结果未取得，本地停止等待不是后端取消，不保证退款或服务端幂等。
6. 将实际返回正文装入共同 artifact；保留原始正文，不伪造风险/问题/章节。只有文件 URL 而无文字时，标明超出本次文本切片，不宣称文字生成验收成功，也不自动付费重跑。
7. 首个真实案例限定为同步文字输入/正文输出；不要为此提前开发多文件、DOCX/PDF 原件下载、完整异步/Chatflow 或账务系统。
8. 先通过现有合成后端；真实非生产验收需批准 origin、账户、项目、模板、数据和费用预算，首个切片最多一次 create、零上传。此预算与阶段 8 共用，不每阶段再花一次；额外调用另行授权。

**验收 G-API：** 同一任务页面仅切换来源即可取得可审核结果；实际调用符合文档；两种来源运行同一结果权利测试。

### 阶段 6：统一审核、保存与 DSH 对话使用

**前置：** 两类 fixture 已进入共同产物合同；阶段 3 已验证基本原生引用入口。本阶段可在获批批次内先完成共同操作，最终双来源验收需 G-LOCAL 与 G-API。

**主要修改：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\RunPreview.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\WritebackPanel.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\writeback-service.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-rpc.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\index.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisBetterSidebarTab.js

**新增：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\artifact-tools.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ArtifactActions.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\artifact-tools.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\artifact-actions.test.mjs

**步骤：**
1. 两类内容使用相同审核状态；生成成功不等于审核通过，编辑后成为新草稿版本。
2. 复用既有 prepare/confirm/commit 无覆盖写回，保留输入和输出哈希；新文件只写入用户确认的当前项目目录。
3. 使用 Sidebar 的文件打开/预览/编辑能力，不新增 Markdown 编辑器。
4. 区分“引用当前文件”与“使用已审核版本”：前者走原生可变文件引用，后者读取固定产物 ID/版本/哈希，不能给修改后的文件沿用旧审核结论。
5. 只新增项目内产物列表/读取两个轻量工具；从调用会话解析 Workspace，拒绝任意绝对路径与跨项目 ID。大内容分段读取，无新向量库。
6. 用户点击引用只填入对话草稿或产物引用，不自动发送、不自动启动生成。
7. 返回正文作为资料而非指令；不返回 Skill 正文、模型秘密、后台凭据或隐藏运行上下文。
8. 关闭页面、切项目、刷新/正常重启后保持任务与产物关联；不自动重跑未确认任务。

**验收 G-ARTIFACT：** 两种来源的内容都能预览、审阅、保存、引用及继续对话；所有权利一致，跨项目拒绝，文件变化导致重新审核。

### 阶段 7：Desktop/Sidebar 薄层二开与发行装配

**前置：** G-UI 已确认，固定基线已能承载业务；只做需求确实要求的改动，不把“二开”变成必须修改内核的指标。

**后续源码工作目录（本轮不创建；阶段开始前检查不存在、路径无重解析越界，作为独立 Git 仓库）：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\desktop
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\better-sidebar

主仓库只跟踪配置/补丁清单、版本锁定及自有业务，不直接纳入整个上游源码。创建独立源码目录时再添加精确忽略规则，不改写真实 Profile。

**已知源码落点：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\desktop\dsh-plugin-desktop\package.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\desktop\dsh-plugin-desktop\cordis.patch.yml
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\desktop\dsh-plugin-desktop\src
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\better-sidebar\package.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\better-sidebar\cordis.patch.yml
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\integrations\better-sidebar\src\client

上述具体修改必须先读取固定 tag 的本地源码与 AGENTS.md；不存在的文件不得凭 master 示例创建同名替身。装配已满足需求时不加补丁。
固定上游 tag 只作为基线，二开包须有可区分的自有 build/revision；不得修改代码后仍冒充未修改上游发行包。无远端 push 授权时可以仅做本地分支/补丁。

**新增主仓库交付物：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\release\oasis-distribution-manifest.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\release\oasis-upstream-patches.md

**步骤：**
1. 取得固定 tag 的本地源码并记录 commit、锁文件与来源；不使用浮动 latest，不自动发布远程 fork。
2. 读取两个仓库自己的构建/许可证/安全规则，复用其各自工具链；不强行统一 Yarn 与 pnpm。
3. Desktop 只处理产品入口、所需插件组合、运行时定位、版本信息和受控升级体验；不放专业 API/审核逻辑。
4. Sidebar 使用现有 Tab、设置、打开与引用服务；只有某项已确认设计缺少公共扩展点时，做通用小补丁并记录删除条件。
5. 同一个配置只保留一个 owner；桌面/Sidebar 的原生设置保持原位，绿洲设置页面不复制模型、窗口或布局配置。
6. 核实一份 Sidebar 实例、一份 DSH 运行时、独立正确的 Profile/存储归属；禁止让两个 Host 写同一业务目录。
7. 沿用原安装包构建与更新机制，不能以“隐藏 Skill”为由关闭全局调试/审计、放宽 CSP、打开 Node 集成或取消原有安全能力。
8. 发行包检查用户产品不意外包含开发 Skill、真实测试数据、秘密、无关调试资源；Host 本地资源仍存在可提取风险，不冒充不存在。
9. 只发布经本项目确认的整套组合；保留第三方许可证/署名，区分自有业务资源授权，不静默移除应披露源码。
10. 更新来源与发布通道复用 Desktop 现有机制，清单锁定批准组合；不仅主程序更新，插件市场/启动时插件解析也不得绕过组合锁。不能满足时关闭受影响的自动替换路径并明确提示，不修改用户别的 Profile。
11. 验证原有包完整性/更新校验仍生效；记录已安装版本与内置运行时路径，升级时先停业务写入并保全数据。源码可跑、npm dry-run 和真实安装包三者不得混用证据。

**验收 G-DIST：** 用户在产品发行包中无需手工拼装即可完成业务；版本/来源可追溯；不是开发目录可运行即代表安装包可用。

### 阶段 8：最小业务验收、发布与定期升级

**新增验收入口：**
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-unified-business-acceptance.md

**步骤：**
1. 在同一固定组合、两个隔离测试 Workspace 中执行第 8 节验收用例。
2. 使用阶段 4/5 已获批调用作为端到端验收样例，贯通审核、保存、对话。只有构建、版本、配置与相关接线一致才复用证据；发行包发生相关变化时说明补验理由及费用，先授权再调用，不把旧构建结果标为新包验收。
3. 完成人工内容审阅，取得两份同等可操作的产物，再分别在 DSH 对话继续使用。
4. 验证正常重启、项目切换、版本迁移和非覆盖写回；保持旧数据、配置和已生成文件。
5. 生成发行清单：Desktop tag/补丁、两处 DSH 版本、Sidebar tag/补丁、绿洲插件、业务资源版本、数据 schema、包哈希。
6. 只对确实验证的 Windows Desktop/本地 Web 组合声明支持，不扩展到未测平台或任意插件组合。
7. 采用每两周评估上游变化、每月受控升级窗口的建议节奏；无收益或不兼容可跳过。安全修复单独评估。本计划不创建任何定时任务。
8. 更新必须选择明确 tag/版本；先隔离迁移与业务回归，确认无进行中任务后再由用户执行。Desktop 不得绕开组合审批自动替换成上游 latest。
9. 程序回滚与数据回滚分开：备份迁移前数据，保留升级后新产物；旧版本不识别新 schema 时阻止写入，不能靠覆盖安装承诺安全回退。

**验收 G-RELEASE：** 业务验收与保密边界均有真实结论；剩余风险明确，用户批准发布范围。任一缺证层不得借单测或模拟结果替代。

## 7. 任务依赖与授权门禁

实施顺序：
阶段 1 → G-UI → 阶段 2 → 阶段 3 → 阶段 4 → 阶段 5 → 阶段 6 → 阶段 7 → 阶段 8。

有依赖门禁时只暂停受影响部分：
- G-SKILL 未解决：阶段 1 可继续；阶段 2/3 的共同能力、阶段 5 的 API 适配及阶段 6 的共同产物能力可按范围单独批准；真实 API 仍另需数据/费用授权，阶段 4 不得执行。
- 无真实 API 授权：可完成合成适配，不执行真实 create/upload，不宣称双来源真实验收。
- 无法安全确定 Workspace/运行时所有者：停止该次生成/写回，不修改真实 Profile 来绕过。
- UI 不确认：不越过阶段 1，不能拿本次文档保存当作界面通过。

默认先走上述顺序，但允许在一个明确获批的本地批次内采用更短的端到端路径：
阶段 1 确认 → 阶段 2 最小装配/非秘密样本 → 阶段 3 共同 UI/产物/基本对话引用 → 两个来源各自接入共同路径 → 阶段 6 真实引用验收 → 阶段 7/8 发行与升级。
阶段 4 受 G-SKILL 阻挡时，阶段 5 的实际实现或阶段 6 的共同能力可以单独授权先行；不只允许写 API 文档，也不把局部交付冒充双来源完成。

**授权与验收分开：**
- G-BASE/G-UNIFIED/G-LOCAL/G-API/G-ARTIFACT/G-DIST 是内部验收点，不默认要求用户逐点回复“批准”。
- 真正需要明确决定的是：具体 UI 版本及发行范围、G-SKILL 风险边界、真实外部调用/费用与数据、版本/范围重大变化及发布；真实 Profile 修改、提交/推送仍遵循既有授权边界。
- 用户可以一次批准一个边界明确的阶段组；组内局部文件修改、定向测试和已纳入范围的修复无需重复征询。失败先尝试范围内最小修复，新增费用、权限、架构或版本变化才暂停。
- 2026-09-06 用户已确认 V3.1 界面，并另行批准按修订计划执行阶段 2；该批准不延伸到阶段 3 业务界面实施、真实调用、提交、推送或发布。

每阶段采用：目标行为的最小失败测试 → 最小实现 → 对应测试 → 一个用户可见验收结果 → 记录证据。
每阶段只提交明确批准的文件；提交/推送、远端发布和真实环境修改仍需相应授权。不恢复旧 N3、监管器或全套环境诊断任务。

## 8. 验收矩阵（两种来源同等执行）

| 用例 | 必须达到的结果 | 证据 |
|---|---|---|
| U01 模式切换 | 同页同字段同按钮，草稿不丢、不自动发请求 | 原型确认 + 参数化 UI 测试 |
| U02 输出平等 | 同样预览、审核、保存、导出、引用与权限 | 两个来源参数化测试 + 实际操作 |
| U03 本地生成 | 真正使用本地业务 Skill 与 DSH，非 local-mock | 运行关联、终止状态、产物与人工评阅 |
| U04 API 生成 | 符合已验证 API，最多一次批准 create | 无秘密调用摘要、实际正文、人工评阅 |
| U05 设置集中 | 在原生设置完成；工作台无重复配置/Skill 源码入口 | Desktop 操作证据 |
| U06 隐私与费用 | 同结构摘要准确说明数据去向和成本；变化重新确认 | 两个来源的确认测试 |
| U07 Skill 可见性 | 满足明确获批的保护范围，不提供普通产品获取路径 | 合成样本暴露面检查；不是防逆向证明 |
| U08 异常诚实 | 缺模型/权限/网络错误可辨；未知不成功、不自动换来源重发 | 定向错误用例 |
| U09 对话引用 | 两种来源均可引用；当前文件与审核快照区分 | 两个来源各一次 DSH 对话操作 |
| U10 项目隔离 | A 产物不能被 B 的工具读取；切换/晚到响应不串项目 | 定向测试 + 两项目操作 |
| U11 迁移与写回 | 旧记录/哈希保留，已存在文件不覆盖，编辑后再审 | 迁移测试 + 文件内容比较 |
| U12 网站辅助 | 系统浏览器打开充值/记录，不带 JWT/正文 | URL 构造测试 + 人工入口确认 |
| U13 装配与升级 | 固定四版本及实际解析、单实例、重启后数据可用；市场更新不绕过批准组合 | 包/进程/界面分层证据 |
| U14 映射漂移 | 实际服务必需字段/语义变化只阻断对应来源，不丢输入、不换表单 | 共同 schema 与 API 指纹差异用例 |
| U15 输入与正文诚实 | 登记材料不冒充已读；仅文件/进度完成不冒充文字成果；未返回风险不显示“无风险” | 两个来源共用产物/显示用例 |
| U16 账户与任务切换 | origin/账户变化使旧绑定和确认失效，不发送旧 JWT 到新地址；并发编辑不覆盖 | 既有配置/store/service 定向用例 |
| U17 引用与输出安全 | 同哈希跨项目仍拒绝越权；HTML/外链不自动执行或加载，引用不发起工具/生成 | 原生渲染/工具权限及草稿操作 |

统一界面不免除供应商差异的真实说明；两份产物享有同等操作能力，不意味着相同价格、模型、内容质量或结果必定相同。

## 9. 验证命令与证据预算

Shell：Windows cmd。以下为后续阶段命令，不是本轮执行结果。
工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service

执行前用 where node / where pnpm 确定现有工具，不自动联网安装或修全局 PATH。

~~~bat
node --test test\package-contract.test.mjs test\bundle-contract.test.mjs test\panel-host-coordinator.test.mjs test\workspace-context-bridge.test.mjs
node --test test\unified-generation-ui.test.mjs test\workbench-v4-contract.test.mjs test\workbench-migration.test.mjs test\oasis-settings-section.test.mjs
node --test test\dsh-generation-adapter.test.mjs test\business-skill-exposure.test.mjs
node --test test\oasis-api-contract.test.mjs test\oasis-remote-service.test.mjs test\generation-provider-parity.test.mjs
node --test test\artifact-tools.test.mjs test\artifact-actions.test.mjs test\writeback-service.test.mjs
pnpm --config.verify-deps-before-run=false run verify
~~~

- 新测试文件仅在对应实施阶段创建；不能现在执行尚不存在的测试。
- 每批只运行对应命令，集成候选再运行一次既有 verify；预期 exit=0，但真实结果必须现测现报。
- Desktop 和 Sidebar 沿用固定版本各自已有构建/测试命令，阶段 7 阅读其 package.json 后记录，不虚构统一总测试器。
- 原型只验证 UI；合成后端只验证协议/流程；实际模型与非生产 API 分别验证。
- 必要环境问题最多一次最小修复与复验，建议预算 30 分钟；超出转为明确阻塞，不新增环境实验工具链。
- 一张业务验收表即可。禁止用测试数量、HTTP 200、绿色静态检查或包版本取代业务验收。

## 10. 规划、阶段 1 落盘范围及阶段 2 起点

最初落盘及 R2 修订仅涉及以下两份文件：
1. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-05-oasis-unified-workbench-implementation-plan.md
2. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\AGENTS.md

上述 R2 修订当时未实施 UI，也未修改 SDK/锁文件、已有 Skill、Host/Profile 或业务代码。

阶段 1 已获授权并迭代至 V3.1 离线合成原型，新增：
3. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui.md
4. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui.html
5. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\design\oasis-unified-workbench-ui-acceptance.md

阶段 1 未修改 SDK/锁文件、已有 Skill、Host/Profile 或业务代码，未调用模型/API，也未提交或推送。

V3.1 保留功能选择页和输入/结果页两个明确验收画面及绿洲慧写 3.0 材料选项卡；恢复“侧边对话”，精简标注的解释文案，并将来源选择与提示按 Sidebar 容器宽度响应式排列。V3.1 浏览器预览保存在 `docs/design/previews`，旧版证据保留。

当前步骤：阶段 2 已完成并通过 G-BASE。下一步是由用户确认首个实际业务模板并明确授权阶段 3，再按 V3.1 实现统一业务界面、共同数据合同和合成双来源；不从原型示例静默推定模板。G-SKILL 仍需单独处理，不能由 G-BASE 或界面确认替代。

R2 仅完善两份规划文件；当前阶段 1 仅新增三份原型交付物，不新增辅助脚本、审计报告、OpenSpec 或全局 Skill。仓库未提供 OpenSpec，不趁此建设治理体系。

### 决策与进度记录

| 项目 | 状态 | 说明 |
|---|---|---|
| 固定四项版本 | 已通过 G-BASE | 隔离 Desktop 中已实际加载并完成一次重启，证据见运行基线 JSON |
| 第一阶段界面确认 | 已确认 | 用户于 2026-09-06 明确确认 V3.1 满足界面要求；不代表 Desktop 集成或业务运行 |
| 第二阶段固定版本适配 | 已完成 | 原生设置、Sidebar 单 Tab、固定依赖与双 Workspace 隔离已实测；不含真实生成、提交或发布 |
| 同界面开关、同等产物 | 已确定 | 旧分离式 UI 不再作为目标 |
| Skills 本地执行 | 已确定 | 不改服务端 |
| 本地 Skills 可接受保密范围 G-SKILL | 未通过 | 固定原生 Skill 工具结果会返回并展示完整正文；真实私有 Skill 仍禁止装配 |
| 真实模型/API 与发行发布 | 未授权执行 | 按明确数据/费用与发布范围取得授权，内部验收不机械重复审批 |

## 11. R2 反思、证据与收敛记录

**目标契约 / 状态卡：** 目标来源为用户“深度反思并补充完善”；对象仅本文与 AGENTS.md；当前处于方案完善；成功标准是消除实施依赖矛盾、给出可执行业务切片及未决边界。不得修改代码、版本、真实 Profile、既有材料或调用真实生成。发现新增重大范围决定时标待确认，不默认代选。
**遗漏复盘：** R1 偏重列文件、版本和阶段门，缺少“同一业务输入是否真的能被两端消费”“原生 Skill 正文流向”“早期端到端路径”和审批成本检查。此为本项目规划遗漏，不足以证明全局 Skill 缺陷；仅补项目规则，不修改全局 Skill 或建立新门禁系统。

| 规划缺口 | 影响 | R2 处理 |
|---|---|---|
| 同页开关先于业务映射核实 | UI 确认后可能根本无法对接同义 API | 4.3 与阶段 1 前置只读映射，实际绑定另核实 |
| Skills 只强调目录隐藏，实际风险验证太晚 | scope/userInvocable 被误当保密保证，后期返工 | 2.2、3.4 和阶段 2 提前非秘密样本核对 |
| 材料、完整专利、文件导出范围不清 | 演练/文件链接被当成业务交付 | 1.2、4.4 与 U15 明确共同文本范围及后续切片 |
| 要求相同结果，却未区分可选分析 | API 未返回的风险/章节被编造或错误设空 | 4.4 required/可选字段消费表 |
| 设置统一入口却未定作用域 | 账户、项目、草稿串用或泄露凭据 | 4.5 与 U16，Host 权威校验 |
| 同步超时默认可以查询恢复 | 假成功或重复收费 | 4.6 与阶段 5，观察进度不等于恢复正文 |
| 对话入口、打包可行性验证过晚 | 主功能完成后才暴露宿主阻塞 | 阶段 2/3 提前最小接入，后期只做真实整体验收 |
| 固定顶层版本未限制解析/插件更新 | 使用时组合悄然漂移 | 阶段 2/7 锁实际闭包、能力与发行通道 |
| 每阶段一项审批、各跑一次真实生成 | 重复往返、测试与消费代替交付 | 第 7 节区分内部验收与授权，阶段 8 复用符合条件的证据 |

**证据台账（静态，2026-09-05）：**
- E1：R2 起点仅有本文与根 AGENTS.md 两个未跟踪文件；阶段 1 新增三份设计原型文档，没有修改产品代码。
- E2：包内 workflow-catalog.js 的两个模板均 local-mock/metadata-only；workbench-contract.js 的两类结果合同不同但已共享内容寻址 artifact。
- E3：权威 API 文件哈希仍为第 2.3 节值；8.4 详情示例字段不等于当前研发字段，8.5 区分文字/文件结果，8.7 未承诺同步结果恢复。
- E4：本机固定 DSH 的 dsh-skill 类型与 dsh-tool-skill 实现：scope 与 invocation 分层，skill 工具返回正文。未在本轮运行原生会话，不据源码宣称全部 UI 暴露面已实测。
- E5：[Sidebar 固定包清单](https://github.com/omdsh-dev/DSH-better-sidebar/blob/v0.18.0/package.json) 与 [Desktop 固定包清单](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.5/dsh-plugin-desktop/package.json) 已只读复核；它们提供现成服务/构建入口，不证明本机组合加载成功。Sidebar 版本化扩展说明抓取失败，不猜签名。
- 文档验证仅检查内容一致性、范围、路径与空白；无产品运行结论。不建议本轮进入真实远程调用。

**待决而非假完成：** G-SKILL；实际业务服务绑定；首版模板/文本范围。V3.1 界面已确认，当前有效业务产出转为固定组合的最小可装配基线，而不是继续追加诊断工具或审计层。

### 阶段 2 证据台账（本地隔离，2026-09-06）

- E6：全局 DSH、Desktop、内置 DSH、Better Sidebar 的版本与清单哈希已复核；项目依赖迁移至固定 rc1 合同，锁文件随之更新。
- E7：固定 rc1 的实际 Client 合同为 `connection.generation`、`remote.credentials`、字符串 namespace 与 `settings.section`；旧 `hostDescription`、`connection.api.credentials`、`settingsNamespace` 不再进入实现。
- E8：目标 Desktop 中实际显示绿洲原生设置页、会话输入入口和一个 Better Sidebar 工作台 Tab；本地 fixture 工作流目录可见，未调用生成。
- E9：使用 Desktop 原生工作区操作在 workspace-a 创建绿洲任务，切换到 workspace-b 时保持空状态，再切回 workspace-a 后原任务仍在，证明当前项目归属切换准确。
- E10：Better Sidebar 自有设置保存 `tabsEnabled.git=false` 与 `tabsEnabled.terminal=false`；真实重启后新建标签菜单仅保留文件、任务管理、侧边对话、浏览器和绿洲工作台。
- E11：固定 `dsh-tool-skill` / Client 合同显示原生工具结果包含并可展开 Skill 完整正文；没有安装或运行真实私有 Skill，也没有调用付费模型。G-SKILL 保持未通过。
- E12：阶段 2 没有新增持久诊断器、监管器或全 Slot 扫描器；仅保留运行基线 JSON 与一张关键截图。
