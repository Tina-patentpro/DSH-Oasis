# 阶段 4A：本地 Skill 保密边界与一次性子任务可行性

日期：2026-09-07。授权：用户“可以接收”风险范围，随后“批准执行阶段 4A”。

## 1. 目标与边界

保留用户确认的 V3.1 界面和双来源业务合同，只裁决本地生成接点是否符合产品级正文不可获取要求。

- 接受普通产品不提供正文获取渠道，不保证抵御本机管理员、逆向、调试或模型请求抓取。
- 正常 UI、工具结果、子会话、轨迹、导出不能因此豁免。
- 仅使用明确非秘密的 canary；不装配真实私有 Skill，不启动模型/API，不读取凭据，不修改真实 Profile。
- 不修改业务代码、安装包或上游源码，不提交/推送；不建设新的验证框架。
- 执行前 Git：`main...origin/main`，工作树干净，HEAD `caab79f8e691f4c32c34f6079ff399543c643907`。

## 2. 执行顺序与停点

1. 将风险范围确认写入 AGENTS.md 和主计划，技术 G-SKILL 保持未通过。
2. 只读检查固定隔离安装包的原生 `spawn`、子任务组合、请求记录及导出路径。
3. 用一次性离线样本调用该安装包的纯函数复核；不伪造父 Agent，不把内存 fixture 当成真实子任务。
4. 普通获取路径一旦证实，停止进一步启动环境/调用模型；给出下一步接点与未证明项，而非追加全套 UI 排障。
5. 如无反例，再安排无真实模型的隔离子会话/UI 检查；没有实际操作证据不得宣布可见性通过。

候选接线（尚未实现）：实际 Workspace/Session 对应的父 Agent → `subagents.start('spawn', ...)` → Host 指令作为 `persona` → 只接收终态文本进入现有 artifact。`spawn` 不继承父历史，但仍组合父 preset；工具必须显式最小允许集、限制深度，不开放 Shell、文件写入或递归子任务。来源切换、审核、保存及对话草稿规则不变。

该候选是用业务指令组合原生子任务，不是通过原生 `skill` 工具运行；后者完整正文进入工具结果的阶段 2 结论不重测。

## 3. 证据账本

结论状态：`STATIC_ONLY`。4A 已执行至反例停点，未经修改的原生 `spawn + persona` 不能作为满足保密边界的接线。风险接受已记录，技术 G-SKILL 仍未通过，G-LOCAL 未开始。

本轮直接读取阶段 3 隔离 Desktop 安装包；所核对的 DSH 子包版本均为 `0.1.2-rc.1`。具体文件 SHA-256 随离线结果保存，不能拿版本字符串替代源码指纹。

### 3.1 已证实的暴露链

下列位置均属于 `.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/` 内的固定包；不是上游 latest 的推断。

| 接点 | 当前证据 | 裁决 |
|---|---|---|
| `dsh-subagent-spawn-in-process/lib/index.js` | `inheritsParentContext=false`；公开声明 persona、toolFilter、depthLimit 能力 | 可作为一次性子任务候选，但不继承历史不等于不记录指令 |
| `dsh-subagent/lib/types/child-agent.js` 的 `applyChildComposition` | persona 原文进入 `deployment:persona` system section；会组合父 preset 并调用工具限制 | 无需 Skill 工具即可注入指令，但不能据此宣称保密 |
| `dsh-system-prompt/lib/index.js:108`，`dsh-agent-loop/lib/index.js:616,735–772` | 渲染完整 system；同一 canonical header 被写为 `request/header`，也供模型请求使用 | 正文进入子会话记录，不仅存在于 Host 短期变量中 |
| `dsh-session/lib/index.js:380–388` | `canonicalHeader` 保留非空 system | 离线调用确实保留非秘密标记 |
| `dsh-session-persistence-jsonl/lib/index.js:178–180` | 事件以 JSONL 序列化，未在此删除 system | 源码证据；本轮未启动持久化 Host |
| `dsh-session-log-export/lib/index.js:168–212,376–433` | 原生 `/export` 与下载路由输出 raw artifact；可包含子会话 | 离线调用真实导出条目函数保留整个样本记录，含原文标记 |
| `dsh-session-log-export/lib/client.js` 的 `run/apply` | “Session 日志”按钮和 `/export` 都调用下载；显式 `includeDescendants=true` | 正常父会话导出即可包含子会话，不需要调试或自行构造参数 |
| `dsh-web-app/cordis.patch.yml:59` | Web 组合声明日志导出插件 | 不是只在 SDK 中存在的未声明能力；本轮未操作 Desktop 按钮 |

**重要反证约束：** 一次性子任务 descriptor 本身不保存 persona，离线检查也确认了这一点。泄漏点是请求头和原生日志导出，不是 descriptor。默认 HTTP 参数不包含 descendants，但原生客户端按钮主动传 true；不能以服务端默认值证明父会话导出安全。

### 3.2 离线样本复核

Shell：cmd.exe。执行命令（退出码 0）：

```cmd
node "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-07-stage4a-offline-probe.mjs"
```

样本为公开字符串 `OASIS_STAGE4A_PUBLIC_CANARY_NOT_A_PRIVATE_SKILL`。脚本使用固定安装包实际导出的渲染、请求头和导出条目函数；提供内存 assembly/事件/目录 fixture，不创建父 Agent，不调用 `subagents.start`，不启动子任务、模型、API 或 HTTP 服务。设置 `fetch` 拒绝调用只是本脚本的额外防误用措施，不冒充系统级断网证明。

复核结果：
- 渲染后的正文完整保留在 canonical request header。
- one-shot descriptor 不含 persona。
- 直接导出子会话样本，保留正文。
- 只导出父会话样本且不包含 descendants，不出现子正文（对照组）。
- 包含 descendants 的父会话导出，保留子样本正文。

这些断言正常结束，证明的是**暴露反例**，不是保密通过。原生实际子会话创建、工具权限执行、UI 展示、ZIP 下载、真实模型终态均未验证；不以此宣布运行态安全或业务完成。已有决定性反例，按第 2 节停点不继续展开 UI/环境测试。

完整输出与指纹：
`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-07-stage4a-offline-probe.json`

## 4. 后续最小修订范围（未授权实施）

2026-09-07 后续只读分析与待确认接点选择：docs/plans/2026-09-07-stage4a-next-generation-seam-design.md。发现原生 llm 单次调用可作为比改写子任务日志更小的候选；它改变此前子任务接线，尚待用户明确选择，不能静默替换本记录的原候选。

**决定：当前候选停止真实私有 Skill 装配。** 不能只隐藏工具卡片或子会话 Tab，也不能只改绿洲的结果组件：原生导出仍可取到正文。不删除旧日志、不全局关闭审计、不迁移到服务器，不改变确认的界面。

下一步先设计一个仅限受控一次性业务执行的 Host 接点，再决定是否值得实施小补丁：

1. 明确分离“模型执行所需完整指令”和“普通产品可读的会话记录”。优先检查公开请求构造/记录接点能否实现；不能让删减后的记录误用于模型请求或恢复。
2. 对新的受控执行，只向公共记录投影非秘密版本、输入/产物哈希、运行 ID、终态与错误分类；验证正文不经持久化、会话查询/订阅、工具结果、导出或普通错误进入客户端。不改变已有会话记录或普通 DSH 会话的完整导出语义。
3. 接点须由 Host 权威作用域决定，不能让用户输入一个标记就任意隐藏会话。需覆盖父子 lineage、终态及中断恢复；不支持安全恢复时禁止自动恢复/重新提交，不能伪造成功。
4. 若只能改 DSH 核心的多个生命周期来满足要求，先列出具体文件、升级冲突和回退方案，请用户裁决；目前没有证据证明这是“小补丁”，不得先承诺低成本兼容再实现。
5. 批准修订后仍只用非秘密样本做一次定向集成：正常 UI、父/子导出、查询与终态；结果正常可审阅、保存、用于对话草稿，且不开放 Shell、写文件、递归子任务。测试不能保证模型绝不复述提示词，该剩余风险须另列，不能用字符串过滤保证。

通过技术 G-SKILL 后，再申请真实模型调用的数据范围和费用授权，实施本地生成切片；当前授权不延伸到这一步。专业 API、双来源结果同等规则以及设置集成目标不缩减。

## 5. 本批变更与验收

- 只更新 AGENTS.md、主计划、本执行记录，新增一次性离线证据脚本及 JSON；未修改插件业务代码、SDK、Desktop/Sidebar 包、真实 Profile 或用户会话。
- 没有真实私有 Skill、模型/API、凭据操作或网络生成；没有 Git 提交、推送或发布。
- `git diff --check`：退出码 0；仅提示既有 Git 换行规则将 LF 转为 CRLF。
- 未重跑阶段 3 的全量业务测试：本批没有业务代码改变。证据范围止于源码与离线函数合同，不提升为 Desktop/真实生成验收。
