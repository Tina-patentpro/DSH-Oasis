# 阶段 4A 后续：本地生成接点选择与最小验证计划

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement the approved branch task-by-task. 默认单代理；本文件不是业务代码、宿主补丁、真实模型或私有 Skill 的执行授权。

**Goal:** 在不改 V3.1 界面和双来源结果规则的前提下，选择首个纯文字模板的本地生成接点，避免为隐藏指令正文而重写 DSH 的日志与恢复系统。

**Architecture:** 推荐优先验证插件 Host 通过 DSH 原生 `llm.prepareCall/stream` 发起一次无工具模型调用；业务指令仅在 Host 请求内存中组装，业务存储记录运行与产物而不是指令。该路线替代此前原生子任务接线，必须由用户明确选择；不把它冒称为原生 Skill 工具或 Agent 子任务。

**Tech Stack:** 已锁定的 DSH `0.1.2-rc.1`、Desktop `2.0.5`、Better Sidebar `0.18.0`，既有绿洲 Host、业务存储及 artifact；不新增 Provider 框架、模型凭据设置或 Agent 循环。

日期：2026-09-07。最新状态：用户“同意按方案执行”已批准推荐 A 的非秘密接点验证。原生服务集成已执行至错误文本暴露停点；报告见 docs/evidence/2026-09-07-stage4a-native-llm.md。此授权不包含改写宿主核心或真实生成。

## 1. 为什么不直接修补导出

阶段 4A 已发现 `spawn + persona → request/header.system → 原生日志导出` 的暴露链。继续同一路线时：

- `agent/request` 只能替换模型调用配置，不能改模型可见正文。
- `llm/stream` 收到 Agent loop 构造的深冻结请求，公开合同要求只读。它不是“记录假正文、发送真正文”的合法改写接点。
- `session-telemetry/record` 只处理向遥测后端导出的副本，不改变会话原始记录或 ZIP；仅在这里删减不能解决问题。
- 只改 ZIP 导出仍留下查询、订阅、冷恢复与普通日志路径。全局删减或禁用审计会伤害普通 DSH 功能。

因此，没有证据表明原生子任务方案只需修改一处导出即可满足要求。保留它将涉及执行与公共记录分离、查询/订阅、持久化及恢复的跨生命周期设计，不能包装成已证明的小补丁。

## 2. 三条路线与建议

| 路线 | 保留什么 | 代价/结论 |
|---|---|---|
| **A：Host 业务指令 + 原生 llm 单次调用（推荐）** | 本地执行、DSH 模型/凭据/适配器、统一 UI、统一产物 | 不创建原生子任务，不执行原生 Skill 工具；只适用于当前单次纯文字切片。有机会不改 DSH 核心，但未实证保密 |
| B：继续原生子任务，新增受控执行记录机制 | 原生 Agent 生命周期与子会话身份 | 涉及多个核心接点和升级/恢复成本；须另行设计与批准，不在本次直接实现 |
| C：只隐藏 UI 或过滤 ZIP | 原有接线 | 仍有其他正文获取路径，不满足要求，排除 |

不提供服务器替代路线；不以本地混淆/加密包证明保密。不缩减后续复杂 Skill 的整体目标：如果实际业务 Skill 依赖多步工具执行、文件/脚本或 Agent 循环，A 不能无损承载，必须禁用并单独立项，而不是抽掉能力后宣称已支持。

**路线已确认：** 用户“同意按方案执行”后采用推荐 A 进行非秘密验证，已同步 AGENTS.md。仍不写生产 adapter，不把本次确认扩大为复杂多步 Skill 能力或真实调用授权。

## 3. 本轮新鲜源码证据

安装包根目录：
`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage3-desktop-app\resources\app.asar.unpacked\node_modules\@deepseek-ai`

| 固定包内位置 | 本轮确认内容 |
|---|---|
| `dsh-tool-cordis/lib/index.js:4716–4723` | `agent/request` 返回 LlmCallConfig，模型正文应使用已记录通道，不允许改 messages |
| `dsh-tool-cordis/lib/index.js:5035–5053` | `llm/stream` 只读冻结的 loop 请求；遥测删减不改变 canonical log |
| `dsh-llm/lib/index.js:1591–1627,1735–1741` | `prepareCall` 绑定适配器代次并限制一次 dispatch；流经过原生 waterfall；此服务方法本身未追加 session 事件 |
| `dsh-llm/README.zh.md` | 插件可直接流式发起一次调用、使用 BlockAssembler；不是必须建立 Agent 才能调用模型 |
| `dsh-session-title-llm/lib/index.js:184–244` | 上游确有非 Agent 的单次调用用法，但此辅助函数自己先追加含 system/messages 的请求记录，因此**不能直接复用该函数**来隐藏正文 |
| `dsh-session-title/lib/index.js:417–425` | 原生标题监听要求 `isAgentLoopRequest`；不能仅凭相同 sessionId 把手工调用认作主会话请求 |
| `dsh-session-checkpoint-policy/lib/index.js:60–65` | 带真实 sessionId 的请求会刷新当前已有会话；该监听不追加请求正文。插件运行记录仍须自行在调用前持久化 |
| `packages/oasis-professional-service/src/unified-generation-service.js` | 当前是合成运行：prepared 入库后才调用 runner、发布冲突只重试发布、结果由统一 artifact 承载；不能简单把真实 runner 塞入 fixture 并沿用 synthetic 标签 |

重要限制：这说明 A 是值得验证的公开接点，不证明实际安装组合的监听器、提供方错误、崩溃记录和模型输出都不会带出正文。README 中“请求可从日志重建”的一般性说明也不能当作私有指令可以不受记录合同限制的保证；A 明确是业务单次作业，不提供原生子会话重放能力。

## 4. 若选择 A，下一批只验证一个非秘密样本

### 4.1 目标合同

1. 使用一个公开 canary 和合成输入；只挂载离线测试适配器，凭据缺失时也不能回退到真实提供方。
2. Host 从权威 Workspace/Session 上下文读取当前模型路由，冻结运行；不从客户端接收任意 provider、system、Skill 路径或假 sessionId。未取得有效上下文时禁用生成。
3. 用原生 `prepareCall` 解析精确配置，再调用其单次 `stream`；不自行 fetch 提供方、不更换模型/凭据 owner、不注册替代生产 Provider，不在中途改路由。
4. 请求只含当前七项表单快照和 Host 指令；不自动加入父会话历史、文件、Skills 工具或其他 tools。原生 sessionId 只在已授权的真实上下文中使用；业务运行 ID 不能冒充 DSH 子会话 ID。
5. 使用原生 BlockAssembler，只接受一个 `finish.kind=stop` 且非空、限长的文字结果。`tool-calls`、`max-tokens`、缺少/重复终态、空结果、异常都不发布成功；不执行模型返回的工具或脚本，不发布 reasoning/replayState。
6. 运行前先持久化非秘密运行标识、Workspace/Session 归属、输入快照/哈希、Skill 非秘密版本和模型配置摘要。指令/system/完整请求不进入业务普通存储、RPC、调试对象或错误；不复制原生标题生成器的正文日志事件。
7. 返回状态/产物进入现有统一结果路径；审核后保存 Markdown、准备对话草稿仍由既有能力承担。来源名称仍为“本地 Skills”，但内部证据准确注明 Host 指令单次执行，不伪造原生 Skill 工具调用记录。
8. 不自动重试、切来源或补发。取消/超时只停止本地等待及发送 abort，不能宣称提供方取消/退款；中断后保留未知状态并阻止自动再生成。输出不完整不沿用审核结论。
9. 不截取/过滤字符串来承诺模型不复述指令。样本暴露即失败；普通泄漏与用户已接受的管理员抓取风险分开处理。

### 4.2 最小文件与执行顺序

首批不写生产 `src/dsh-generation-adapter.js`。只在既有测试体系验证真实原生服务接点：

- 新增候选测试：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\stage4a-native-llm.test.mjs`。
- 复用阶段 3 隔离包与既有 Host/测试装配，不新建诊断平台；使用正常初始化的原生服务及必要父会话，不用自制 llm 对象的绿色结果代替原生合同。
- 输出一次证据到 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-07-stage4a-native-llm.md`，包括实际包指纹、挂载监听器、样本路线、请求次数、终态和检查的输出面。
- 执行命令（cmd）：`node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\stage4a-native-llm.test.mjs"`。

测试只覆盖：正常文本与原生配置/凭据所有权、明确失败/超时/工具返回、跨项目拒绝、运行中配置冻结、普通记录与导出不含 canary、普通 DSH 会话原有导出不变。离线成功后，在同一固定隔离 Desktop 用一个样本检查正常展示/导出；不为完成此步骤反复重建环境。

如果原生装配不能在一次最小环境修正内运行，记录未验证面并停止；不把纯函数证据升级为 Desktop 通过。出现正文暴露，直接停在对应接点，不自动进入 B 或追加核心补丁。

### 4.3 尚不属于本批

- 私有 Skill 内容分发、受控目录/包保护、真实模型费用和外传授权。
- 把当前 `unified-fixture` 状态机迁移为真实执行模式，以及正式的流式、取消、重启未知状态 UI 接线。
- 真实模型业务质量、完整专利申请文件或第二模板。
- Git 提交/推送、真实 Profile 安装、系统 Desktop 升级、生产发布。

以上必须在 A 的可见性与接点验证后，按既定阶段 4 后续切片处理；不能以这次较小的路线选择宣称 G-SKILL/G-LOCAL 或双来源交付完成。

## 5. 本轮变更与证明边界

本轮只读代码并新增本设计文档、在 4A 记录中添加后续索引。保留前轮五项未提交变更；不修改或重跑前轮 JSON 证据，不启动 DSH，不运行真实生成。

设计时 Shell：cmd.exe；Node `v22.19.0`。本文件初版仅为源码级评估。后续已实际运行新增原生集成测试，正常会话/持久化/导出不含正文，但原生错误消息未脱敏；未运行 Desktop、真实模型或生产 adapter，完整证据以执行报告为准。第 4 节尚未验证的接线/权限/恢复/UI 项不因原生测试正常结束而视为完成。
