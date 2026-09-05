# Oasis API 后续工作 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 单代理、分阶段批准；本文件是计划，不是执行授权。禁止暂存、提交、切换分支、操作真实业务或修改真实 Profile。

**Goal:** 先取得第四批准备阶段的真实副本证据，再补齐公共配置入口，最终完成隔离 Host/浏览器验收；不把这些结果外推为真实非生产业务或生产可用。

**Architecture:** 保持已验证 API 合同和现有业务适配器；公共 Settings/Credentials 配置与业务运行分离。采用 prepare → inspect → 配置 UI → integration 的顺序，inspect 只获取平台契约，不能绕开完整集成门禁。

**Tech Stack:** 本机 DSH 0.1.1-rc.2、现有 Node/pnpm 离线依赖、node:test、既有 Playwright/Edge。版本执行前复核；不升级、不联网安装、不引入通用依赖解析器。

---

## 1. 本轮只读核验与计划边界

2026-09-02 已核验：

- HEAD 为 `3c2bd5a469b67ed4070b0b9beacc30212cd038e3`，暂存区为空；第三批业务变更和第四批资产仍在 dirty 工作树，全部按既有内容保护。
- 权威 API 文档：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md。SHA256 为 `429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1`。
- 验证器 SHA256 为 `514D097779CB1BE7330CCC9D767840D1B7031EC0635792E67AD2D658D885FB83`；合同测试为 `0335C2E735856A6B7F335729D4632B7406FE625500361EF7C666C6D7D5E85A7E`，均与修复报告一致。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-003 尚不存在；正式 prepare 没有运行。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\oasis-api-phase4-browser.test.mjs 尚不存在；当前完整 integration 入口在任何安装/启动之前明确拒绝。
- 本机官方设置插件静态源码要求同时存在 Host 命名空间和 Client 设置卡；Oasis 目前只有前者。公共服务候选为 settingsScope、connection.api.credentials 和 remote 通知；候选卡槽为 settings.plugin.item。**这些是静态候选，不是已取得的 live Slot 契约。**
- 43/43 专项、79/79 根测试、271/271 包测试是上一轮修复报告的结果，本轮未重跑。79 已包含 43，不重复计算。
- 全局 Git ignore 不可读警告仍存在；不修改全局配置，不把受限列举说成完整磁盘审计。

依据：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-remediation-2026-09-02\attempt-001\audit-report.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-02-oasis-api-phase4-remediation.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-02-oasis-api-phase4-isolated-validation.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\dsh-plugin-development\SKILL.md

### 方案选择

推荐按下述阶段逐一放行，而不是一次性补 UI、安装、跑全矩阵：前者能区分依赖复制、平台契约、产品交互和业务集成的问题，失败时范围更小。只做适配器/内部 RPC 测试可以较快得到局部结果，但不能关闭第四批公共配置和浏览器缺口，因此不作为替代验收。

本轮只新增本计划，不运行测试、Profile 快照、DSH CLI、Host、浏览器或业务调用。

## 2. 全程适用的保护与证据规则

1. 唯一业务依据仍是上述 API 文档；继续只覆盖既有九端点，不从其他源码、猜测或现网试探扩充合同。不修改权威文档或降低来源/鉴权/写回校验。
2. C:\Users\TinaD\.dsh 只读保护，凭据文件只做哈希，不解析、输出或复制秘密。每次实际隔离运行前由用户确认暂停真实 DSH 写入，再执行三次间隔至少五秒的强快照；执行中和结束时继续检查。
3. 静止门禁失败时停止，不循环刷新基线、不排除 session/cache、不代停用户进程。历史 Profile 漂移原因仍未确认。
4. 每次运行使用全新 ASCII 系统临时根，前缀 oasis-dsh-p4-；模式之间使用独立 Home、Profile、缓存、工作区、产物和端口。不得回链真实 Profile、仓库依赖或另一模式；旧 attempt/临时目录保留。
5. 先冻结已知保护文件、HEAD、暂存区、API、链接与输出白名单；所有检查独立执行并保留失败。文件列举结合 Git 与已有冻结集合，不忽略 unreadable。
6. 只关闭本次持有的子进程并确认退出；不按名称杀进程。API 与浏览器只允许批准的 127.0.0.1 服务；禁止真实 JWT、真实材料、外网业务请求和收费。
7. 每阶段台账记录生成时间、输入哈希、实际 executable/argv/cwd、退出码、场景结果、资源收尾、保护前后差异以及未验证项。缺项不得标记完成。
8. 修复采用 systematic-debugging → test-driven-development；验收前 verification-before-completion。若失败需要修改阶段白名单之外的文件，先报告根因与扩围方案，不顺手修复。

## 3. 阶段 A：完成已批准的 prepare 复验

**入口门禁：** 用户明确确认真实 DSH 写入已暂停。现有修复授权只覆盖本阶段，不覆盖下述新 UI 或 Host 工作。

**文件：** 不修改任何代码；仅独占新建 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-003 和全新临时根。若目标已存在则停止，另定新 attempt，不复用覆盖。

**步骤：**

1. 复核本计划记录的输入哈希、HEAD、暂存区与第三批冻结集合；漂移先审查，不把新内容自动当成批准基线。
2. 用 cmd，在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研 执行下列现有命令：

```cmd
node scripts/verify-oasis-api-phase4.mjs --stage prepare --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-003 --modes standalone,better-sidebar --offline
```

3. 核对两个真实依赖副本的链接闭包、tsdown 实际解析位置、标准构建、client.js 字节一致、map 的 mappings/sourcesContent/源内容一致。
4. 核对 dry-run 和实际 tarball 的既定 43 项文件及逐项哈希；真实 Profile、原文件、API、HEAD、暂存区后检全部完成。
5. 检查命令台账中没有 dump-config、plugin install、Host 或浏览器启动；失败仍完整后检并保留现场。

**放行：** 两模式 prepare 退出 0、所有必要后检通过，仅证明副本构建/打包准备完成，phase4Complete 仍为 false。失败则只形成新的定界修复计划，不进入 B。

## 4. 阶段 B：隔离平台契约探测，不实施配置 UI

**入口门禁：** A 完成；用户另行批准本阶段的验证器扩展、全新隔离 CLI/Host 与只读浏览器探测。完整 integration 仍关闭。

**拟修改：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

**拟新增（仅测试探针）：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\fixtures\oasis-api-phase4-slot-probe\package.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\fixtures\oasis-api-phase4-slot-probe\cordis.patch.yml
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\fixtures\oasis-api-phase4-slot-probe\src\index.js

**步骤与实现决策：**

1. 先审查现有未开放安装分支：官方 runtime 的物理依赖/链接拓扑、精确包版本、本机离线缓存、CLI 写入路径、端口和子进程所有权。禁止直接放开旧分支；禁止按包名全局 overrides 将多版本闭包压成一个版本。若现有资产无法在副本内离线解析，停止，不联网补包。
2. 先写失败测试，再新增显式 inspect 阶段。prepare 的零 CLI/零 Host 行为不变；默认/integration 仍拒绝。inspect 的完成字段独立，不能设置 phase4Complete。
3. 为 inspect 的环境泄漏、离线缺包、外部链接、Host 启动失败/超时、端口冲突、探针失败、收尾失败与 Profile 漂移增加故障测试；真实运行之前这些测试必须通过。
4. 在全新隔离副本用固定 Node 直接调用已核验的官方 CLI 入口。Profile 由官方 CLI 创建/安装，不手写真实清单；Oasis 保持地址为空、无凭据。仅安装基准 bundle、Oasis 和最小探针，第二模式再加精确 better-sidebar 0.15.2。
5. 探针仅在 loopback 提供有超时的只读 Slot 查询；参数白名单，不输出配置值、凭据或任意文件。通过公开流程创建合成工作区/空会话以连接 Client，不调用模型、不预置业务运行记录。
6. 对每种模式先调用 Slots.listSubTree 不带 root，再精确查询 settings.section、settings.plugins.tab、settings.plugin.item、conversation.input.right、shell.overlay、details。逐项记录 purpose、kind、scope、options、standard/owner props、occupants、replacement risk、descendants；保留原始脱敏结果。
7. 读取匹配本机版本的公开类型/导出，冻结 settingsScope 的读写、校验、冲突、restart 语义及 credentials.describe/set、reference-updated 的请求/响应/错误契约。静态源码只作导航，不能替代 live Slot 输出。
8. 浏览器只验证加载、设置入口和槽树探测，不写地址或凭据、不请求 mock 业务。两模式独立运行、关闭后完整保护检查。

**产出与停止点：** 新 attempt 中保存平台合同、版本/包图、完整及精确槽树、Host/Client 加载与退出证据、保护结果。B 完成后先审查合同；若候选槽不存在、已被占用、服务不公开或版本不匹配，停止并修订 C，绝不猜 Slot options 或改私有 DOM/store。

## 5. 阶段 C：最小公共 Settings/Credentials 界面

**入口门禁：** B 的契约冻结和审查完成；用户批准本阶段的确切补丁范围。以下为功能和文件边界；具体 Slot 注册参数只能采用 B 的实际返回值，合同不同则重新规划，不由实施者临场替代。

**拟修改：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\package.json（仅必要 Client 生命周期依赖声明）
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js.map

**拟新增：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisSettingsCard.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\oasis-settings-controller.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-settings-controller.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-settings-card.test.mjs

**产品决策：**

- 只增加 Oasis 自有键的设置卡，不替换整个设置页或任何结构单槽。设置服务缺失时保留既有工作台，不假装配置成功；订阅与控件在卸载时完整释放。
- 环境固定并只读显示 non-production；允许编辑 API origin、逐行下载 origin；显示当前 credentialRef（默认 OASIS_USER_JWT）但本轮不开放修改引用名。空地址表示禁用，不触发远程请求。
- 配置通过公共 settingsScope 保存，Host 既有 normalizeOasisRuntimeConfig 继续作最终校验；保留 applies=restart，明确提示“保存后需重启生效”，不在产品中新增自动重启能力。
- 凭据使用独立的“更新凭据”操作，与“保存配置”分开，不宣称两个不同域的写入具有原子性。密码型输入仅暂存于控件内存；空输入不调用 set、不删除已配置值；成功/关闭时清空，不写日志、URL、Domain、localStorage 或测试报告。
- 凭据状态仅使用 describe 返回的元数据；set 必须检查实际响应的成功/失败，不能因旧凭据仍 configured 就把本次失败误报成功。过期异步响应、断连/重连和通知更新必须按请求代次及引用绑定。
- 不增加“测试连接”按钮，避免保存配置产生隐式业务请求；业务提交仍由原来的双确认流程触发。

**实施与验收：**

1. 控制器、注册/卸载、输入与提交行为分别先红后绿；覆盖非法 origin、服务缺失、保存失败/冲突、restart 提示、凭据写入失败但已有旧凭据、乱序响应、卸载清理与秘密不外泄。
2. 运行包测试和根脚本测试；通过后才在独立副本标准构建。两次新副本构建证明可复现，再有范围地更新上述两个生成文件；禁止用 build 的 clean 顺带清理其他文件。
3. 明确创建新的“配置 UI 版本”冻结清单并关联第三批旧基线。新增源码后 tarball 文件数会变化，按批准的新增两份源码审查显式清单，不能继续硬套 43，也不能自动接受任意打包差异。
4. 不修改 Host API、运行记录/写回逻辑、API 基线、锁文件或安装依赖。若公开接口确实要求新增依赖/其他文件，先提交证据和修订范围。

**放行：** 本阶段只证明实现和本地测试/构建；设置实际可用、凭据生效、重启及原生 UI 未受损留给 D 的浏览器验收，不提前宣称。

## 6. 阶段 D：恢复完整第四批隔离验收

**入口门禁：** A/B/C 完成；配置实现、live 合同和新包哈希可追溯；用户批准开放 integration。不得仅以浏览器文件存在判定前提满足。

**拟修改：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

**拟新增：**

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\oasis-api-phase4-browser.test.mjs

既有 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\fixtures\oasis-api-phase4-server.mjs 默认不改；能力不足时先提交 fixture 的定界变更，不通过跳过用例绕开。

**步骤：**

1. 先增加前提缺失、输入漂移、缺场景/skip、浏览器失败、重启重叠和收尾失败都不能得到完整完成状态的测试，再有条件开放显式 integration；默认仍保持拒绝，避免误启动。
2. prepare 使用 C 之后批准的新冻结集合和显式 pack 清单，不覆盖旧证据，不把主动 UI 变更伪装成第三批“零漂移”。不相关文件依旧必须零变化。
3. 复用已审查的隔离 CLI/单 Host 生命周期；启动本地 mock 后，经产品公共设置页填写 loopback 地址及仅本次合成凭据。禁止配置文件、内部 RPC/store 注入来替代 UI。凭据输入阶段关闭截图/trace/请求体日志。
4. 确认旧的自有 Host 完全退出，再以同一隔离 Profile/存储重启，证明 applies=restart；不得同时存在两个存储写入者。全部浏览器业务均走真实适配器到 mock HTTP。
5. standalone 完整执行后再运行独立 better-sidebar 0.15.2 模式。每场景使用独立 fixture 生命周期或可证明的状态重置，避免“一次 create”计数被前场景污染。

**必测矩阵（两模式均记录）：**

| 组 | 验收要点 |
| --- | --- |
| 配置与鉴权 | 未配置/无凭据清晰展示且 upload/create 为 0；非法地址拒绝；公共保存、凭据更新、重启生效；失败不可误报 |
| 服务与输入 | 动态目录/详情/表单、整数 folder；价格和外传双确认；编辑字段/材料后确认失效 |
| 成功闭环 | 合成上传 1 次、create 1 次；查询进度；文本及多个结果 URL 标注“未下载/未验证”；不自动下载 |
| 审阅与写回 | 审阅先于 prepare；prepare 不写产物；显式 commit 仅创建两个批准文件，哈希与 provider 五键白名单一致 |
| 幂等与冲突 | token 一次性、重复提交、revision 冲突、文件已存在均不静默覆盖 |
| 流水 | unverifiable/not-observed/observed 候选；重复/畸形/无关联数据拒绝；不声明扣费已核对或财务结算 |
| create 不确定 | 丢失响应/缺 id 后不重新 create；重启持久化；以原 key 继续查询且 create 总数仍 1；未解决记录不可关闭 |
| 工作区与竞态 | A/A/B/A、关闭/移除/恢复、迟到响应、不残留 busy 或跨项目状态；无法从 UI 触达的分支单列 Host/RPC 证据 |
| 停止 | 只停止本地等待，不宣称取消服务端任务或撤销流水 |
| URL 安全 | query/fragment/userinfo、非允许 origin 等保持 fail-closed；不为方便 mock 放宽策略 |
| 原生 UI | normal/expanded/narrow/reload/unload，原生侧栏/聊天/输入保留；两布局所有者不能同时写 root；完整与精确 Slot 树留证 |

**验收台账：** 每行绑定测试 ID、模式、输入包哈希、实际结果、日志/截图及证明层级；mandatory 的 missing/skip 都不能关闭第四批。真实目标 Profile 的完整 bundle 组合未在此验证，不能把这两条受控路径称为“真实全部插件兼容”。

## 7. 阶段 E：复审、交付与下一道真实业务门禁

1. 单代理执行独立复审：对照 API 九端点、阶段白名单、原第四批矩阵、实际退出码与保护台账逐条核对，不以汇总测试数替代场景证据。必要修复重新经历定界、红绿与相关场景复验。
2. 运行新鲜专项、全部根脚本、全部业务包测试，两个模式集成，再检查 tracked 与 untracked 的空白/范围。原 lib/client.js 四处模板空白属于既有差异，若仍存在如实单列，不扩围清理。
3. 每份报告只选一个汇总状态：保护/静止窗口阻断用 BLOCKED_WAITING_FOR_USER；普通失败用 FAIL；只有本地/隔离模拟证据时用 STATIC_ONLY，并分别说明 prepare、Host、browser 哪些确已完成。不得因模拟矩阵完成宣称真实业务上线。
4. 用户后续另行提出提交时，先列出拟提交文件和现有 dirty 归属，排除历史日志中的敏感信息及无关变更，得到明确提交范围后才暂存/提交。本计划不包含提交、推送或发布。
5. 真实非生产联调另立计划并单独批准：URL/环境证明、通过产品 UI 配置凭据、允许 folder、合成/脱敏材料、次数与费用上限、数据保留、回收责任、外传确认。不得在本批探测真实接口。
6. 联调前明确处理或接受剩余风险：带签名 query 的 URL 不支持；旧不安全 URL 记录保持拒绝且不迁移/删除；create.id 与流水 link_id 缺少权威关联；查询不能补证 create 来源；历史 artifact 内容与预览文本/文件的等价性尚有缺口。不得以扩写假设关闭这些项。

## 8. 执行交接

推荐下一次只执行阶段 A：不再改验证器，先取得真实副本构建/打包与保护证据。当前唯一前置输入是用户确认 C:\Users\TinaD\.dsh 的写入已暂停。

B、C、D 各有独立批准与证据门禁；本计划获原则同意也不取消真实 Profile 静止要求，不自动授权真实 API、凭据、费用、提交或上线。平台契约探测结果需要改变方案时，先修订计划再继续。
