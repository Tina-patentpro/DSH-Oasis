# 第一周结果深度反思与审计实施计划

> **For Codex:** 执行时使用 `executing-plans`，技能顺序为：`质量打磨 → code-review-excellence → playwright → verification-before-completion`。全程单代理执行，不调用子代理。

**Goal:** 判断第一周技术验证是否真实、可复现、与 PRD 及用户边界一致，并把“测试通过”“实际运行”“浏览器可用”和“产品能力完成”严格分层。

**Architecture:** 采用“目标追溯 → 官方/本机合同核对 → 静态代码与安全审查 → 测试质量审查 → 全新隔离运行复现 → 证据化裁决”六层审计。审计阶段不修复源代码；只新增审计报告和证据，修复另立计划并按 TDD 执行。

**Tech Stack:** DeepSeek Harness `0.1.1-rc.2`、Node.js `22.19.0`、pnpm `11.19.0`、Cordis、React 18、tsdown、Node test runner、Playwright CLI、Windows cmd。

---

## 质量打磨状态卡

- 目标来源：用户要求“先对第一周结果进行深度反思和审计”
- 目标对象：第一周 DSH Skill、Bundle、Host、Client、测试、隔离脚本和验证记录
- 当前大阶段：方案
- 当前小阶段：计划已形成，等待明确开始执行
- 已确认事实：工作区无 Git、无 OpenSpec、无项目级 `AGENTS.md`；本机 DSH 仍为 `0.1.1-rc.2`；现有文档声明 8 项测试和浏览器烟雾通过
- 未确认信息：第一周运行声明能否从全新环境复现；真实 Profile 在第一周开始前没有强哈希基线；官方在线仓库页面本轮未返回可用抓取内容
- 涉及文件：工作区内全部第一周产物，重点见下文
- 当前阻断点：无；正式执行需用户确认计划完成并开始
- 是否已能判断远程测试建议：否；本任务原则上不需要远程测试

## 目标契约

- **目标对象：** `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研` 第一周交付结果。
- **成功标准：** 每项第一周声明都有需求来源、代码实现、自动测试和对应证据层级；所有发现按 P0-P3 分级并给出可复现证据；最终只给一个 V4.1 状态桶。
- **不修改范围：** 不修改 Dify、收费管理、用户真实 Profile、现有插件源代码、PRD 或商业方案；不发布 npm，不连接生产服务。
- **允许新增：** `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第一周-深度反思与审计报告.md`、`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week1-audit-2026-08-23` 和 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\playwright\week1-audit`。
- **关键约束：** 全新 `DSH_HOME` 必须位于经核验的临时目录；用户真实 `C:\Users\TinaD\.dsh\profiles\web` 只读并做前后哈希比对。
- **证据分层：** 静态、构建、单元/合同测试、隔离 Host、HTTP Client、浏览器、外部服务七层分别下结论，不跨层推断。
- **停止条件：** 命令解析到真实 Profile、需要生产凭据、将访问非 loopback 地址、待写目标不在声明的新目录、或发现现有文件可能被覆盖时立即停止。

## 严重度与裁决规则

- **P0：** 真实 Profile/用户数据/密钥被写入或泄露，或存在可直接造成数据损失的行为。
- **P1：** 第一周核心声明不真实、插件无法在干净环境加载、Host/Client 核心合同错误。
- **P2：** 可复现性、隔离、安全防护、测试有效性或跨机器可移植性存在可行动缺口。
- **P3：** 文档、命名、维护性或非阻断性覆盖不足。
- 任何未解决的本地可行动 P0-P2，最终不得给 `PASS` 或 `PASS_WITH_CONCERNS`。

## 审计前已发现、但尚待执行验证的假设

1. 工作区没有独立的 Beta/第一周项目计划文件，第一周验收合同目前只能从 PRD、第一周记录和用户修订重建。
2. 8 项测试主要检查文件、正则合同和 mock `ctx`；没有持久化的真实 Host 工具清单、浏览器控制台、截图或事件证据。
3. `oasis-professional-service:open` 只有事件生产者，没有消费者；当前按钮是扩展缝而不是可打开的工作台。
4. `software-ai`、`electronics-embedded`、`mechanical` 三个基准域只在状态代码、测试和第一周记录出现，尚未找到 PRD 来源。
5. DSH 发现测试和隔离包装器依赖全局 npm 安装布局，跨 npm prefix/机器可移植性待评估。
6. README 把会安装依赖的 `pnpm install` 放在“静态验证”中，且未要求 `--frozen-lockfile`；依赖与构建可重复性待审计。
7. 第一周“未修改真实 Profile”的结论缺少任务开始前强哈希，无法追溯性证明；本次只能证明审计自身前后未改变它。

---

### Task 1：冻结审计基线和证据账本

**读取：**
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\PRD-DSH免费工作台.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第一周-DSH插件技术验证记录.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\README.md`

**新增：**
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week1-audit-2026-08-23\evidence-ledger.md`
- 同目录下的 `environment.txt`、`source-hashes-before.txt`、`profile-hashes-before.txt`

**步骤：**
1. 用 `where dsh`、`dsh --version`、`node --version`、`pnpm --version` 记录实际工具链和解析路径。
2. 记录工作区文件清单；排除 `node_modules`、`.pnpm-store`、`.dsh-test` 和新证据目录。
3. 因工作区没有 Git，使用 SHA-256 记录所有第一周源文件和文档基线。
4. 用显式 `powershell -NoProfile -Command` 只读枚举并哈希 `C:\Users\TinaD\.dsh\profiles\web`；PowerShell 仅用于 cmd 难以安全表达的递归哈希。
5. 证据账本每条记录：声明、证据文件、命令、退出码、证明层级、不能证明的内容。

**通过条件：** 基线文件完整，真实 Profile 只读，所有新增路径均位于允许目录。

### Task 2：重建需求—交付—证据追溯矩阵

**审计来源：**
- PRD V1.1 的产品原则、P0 目标、组件边界、上线前验证项。
- 第一周记录第 1、5、6 节。
- 用户已确认边界：Dify 与收费管理是稳定外部能力，不审计其内部实现。

**步骤：**
1. 为 Skill-first、Bundle/Profile、Host 工具、Client lazy-CJS、浏览器入口、业务 Skill、隔离 `DSH_HOME` 七项声明建立矩阵。
2. 每项标记为：`CURRENT_VERIFIED`、`SESSION_ONLY`、`INFERRED`、`UNSUPPORTED`。
3. 检查第一周合同是否在事前计划中有来源；没有来源的内容不得反向写成既定需求。
4. 特别裁决三基准域和“研发 / 专利入口”是否属于已授权范围，还是实施时新增的假设。
5. 区分“技术扩展缝成立”和“面向用户的工作台已可用”。

**通过条件：** 第一周每项结论都有唯一证据层级，不以测试数量替代需求符合性。

### Task 3：核对官方合同、本机合同和包分发合同

**重点文件：**
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\dsh-plugin-development\SKILL.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\dsh-plugin-development\references\official-contracts.md`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\package.json`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\cordis.patch.yml`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\tsdown.config.mjs`

**步骤：**
1. 先以本机已安装 `0.1.1-rc.2` 的 `package.json`、导出和实际源码为当前运行合同。
2. 再核对 DeepSeek 官方首个插件、工具、发布、Client AGENTS、外部 Client 构建和 Skill 文档。
3. 若官方在线页面仍不可读，报告明确限定为“已安装版本合同已核对，官方 master 最新状态未刷新”，不得宣称最新官方一致。
4. 执行 `npm pack --dry-run --json`，核对实际分发文件、源映射、源码入口和 `private` 边界。
5. 执行 `pnpm list --depth 0`，核对锁文件解析版本、peer/dev 依赖、React 平台版本和 prerelease semver 漂移风险。
6. 审查 `clean: false`、构建产物新鲜度、`main/exports`、Node engine、包名和发布准备度。

**通过条件：** 当前本机版本可运行合同与代码一致；所有官方 master 漂移风险被明确分层。

### Task 4：逐文件代码、架构、安全和专业能力审查

**重点文件：**
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\status.js`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\index.js`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client.js`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\dsh-isolated.cmd`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\dsh-local-api-smoke.mjs`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh\skills\oasis-rd-intake\SKILL.md`

**步骤：**
1. 按正确性、边界条件、错误处理、可维护性、可移植性、供应链和最小权限逐行审查。
2. 对 Client 事件验证生产者/消费者、可访问性、重复注入、卸载/清理和用户反馈边界。
3. 对 Host 工具验证 schema、注册、执行、渲染、异常和真实运行可发现性。
4. 对隔离脚本验证 DSH_HOME 归一化、shim 解析、参数传递、失败行为和真实 Profile 保护。
5. 对 loopback 烟雾脚本验证协议限制、主机规范化、端点限制、错误响应、任意本地文件读取和误连其他本机服务的风险。
6. 扫描源码、配置、产物和日志中的 token、API key、secret、Authorization、用户绝对路径和敏感材料。
7. 以“第一周受理 Skill”而非“完整专利撰写能力”评价 `oasis-rd-intake`；检查事实来源、术语、权利要求支持、人工门和不得虚构边界，同时禁止把它宣传为完整专利代理交付能力。

**通过条件：** 所有发现都有绝对文件路径、紧凑行号、复现方式、影响和最小修复方向。

### Task 5：审计测试有效性与构建可重复性

**验证命令：**

```cmd
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service
pnpm run build
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研
node --test tests\skills\dsh-plugin-development.test.mjs tests\skills\dsh-plugin-development-discovery.test.mjs packages\oasis-professional-service\test\bundle-contract.test.mjs packages\oasis-professional-service\test\client-build-contract.test.mjs packages\oasis-professional-service\test\host-tool.test.mjs packages\oasis-professional-service\test\skill-contract.test.mjs packages\oasis-professional-service\test\status.test.mjs
```

**步骤：**
1. 构建前后比较 `lib\client.js` 内容哈希，判断生成产物是否可重复且是否可能陈旧。
2. 保存完整 stdout、stderr、退出码和时长；预期构建退出 `0`，测试 `8/8` 通过。
3. 建立“测试 → 真实行为”矩阵，区分存在性/正则、纯单元、mock 集成、真实 DSH、浏览器五类。
4. 检查负向场景：缺依赖、错误包名、错误 Loader ID、重复注入、非 loopback URL、非法响应、Skill frontmatter 错误。
5. 运行 Codex Skill `quick_validate.py`；若仍缺 PyYAML，只记录工具链缺口，不擅自安装依赖，也不把 DSH Provider 通过等同于该验证器通过。

**通过条件：** 不仅报告“8 项通过”，还明确这些测试没有证明什么；不得在审计阶段为制造绿灯而修改测试。

### Task 6：从零复现隔离 Host、Skill 和浏览器 Client

**隔离目录：** `%TEMP%\oasis-dsh-week1-audit-20260823`，不得复用工作区 `.dsh-test`。

**步骤：**
1. 用 `where npx` 完成 Playwright 前置检查；使用已安装 skill 的 CLI wrapper，不安装新依赖，除非另行获批。
2. 确认临时目录规范化后位于 `%TEMP%`，再设置 `DSH_HOME` 并显式调用 `%APPDATA%\npm\dsh.cmd`。
3. 在全新 web Profile 中安装本地插件、导出组合配置并捕获 Host 启动日志；若任何命令解析到真实 Profile，立即停止。
4. 在启动前确认审计端口空闲；启动后只访问 `127.0.0.1`。
5. 通过 `session.create` 创建工作区会话，再通过 `skill.list` 验证两个项目 Skill；保存原始请求和响应。
6. Host 状态工具只有在真实运行清单或真实调用证据存在时才标为 runtime verified；“服务器无报错 + mock 单测”只能标为组合证据，不能升级为真实调用。
7. Playwright 先 snapshot，再验证目标按钮、Client 模块、控制台 Errors/Warnings，并在页面注册一次临时事件监听后点击按钮，核对事件名与 `detail.source`。
8. 保存 screenshot、snapshot、console 和事件结果到 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\output\playwright\week1-audit`。
9. 关闭浏览器和 Host，确认测试端口无监听；复制必要日志后，仅在确认绝对路径属于声明的 `%TEMP%` 子目录时清理新建临时目录。
10. 重新生成真实 Profile 哈希并与 Task 1 逐字节比较；差异即 P0，并立即停止。

**通过条件：** 全新隔离 Profile 可重复加载，两个 Skill 被发现，Client 在真实浏览器加载并发出正确事件，控制台无新增错误；真实 Profile 前后完全一致。

### Task 7：形成 findings-first 审计报告和下一阶段门禁

**新增：**
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第一周-深度反思与审计报告.md`

**报告结构：**
1. 先列 P0→P3 发现，每条包含文件/行号、证据、影响、为何旧验证未发现、最小修复方向。
2. 再列通过项和可复用成果，避免只报告问题。
3. 给出需求追溯矩阵、测试强度矩阵和证据分层表。
4. 对第一周原结论逐项判定：维持、降级、撤回或待验证。
5. 单列“审计遗漏复盘”：补什么测试、脚本、Skill 门禁才能拦住同类问题。
6. 把建议分为“第二周前必须修复”“第二周可并行”“后续产品阶段”，但本轮不执行修复。
7. 最终只输出一个状态：存在本地可行动 P0-P2 时为 `FAIL`；仅有披露后不推翻结论的 P3 时可为 `PASS_WITH_CONCERNS`；缺浏览器/运行证据时为 `STATIC_ONLY`；需要用户侧证据时为 `BLOCKED_WAITING_FOR_USER`；完全满足且无 P0-P2 时为 `PASS`。

## 最终验收

- 审计报告中的每个通过/失败声明均能追溯到证据文件和命令退出码。
- 不把本地、浏览器、外部服务或生产证据互相替代。
- Dify 和收费管理的内部稳定性不重新审计；只审计本插件是否正确保留集成边界。
- 不修改真实 Profile，不发布、不部署、不连接生产系统。
- 审计完成后再决定是否制定修复计划；未经用户确认不直接修复。
