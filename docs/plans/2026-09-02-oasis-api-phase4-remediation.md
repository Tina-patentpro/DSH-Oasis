# Oasis 第四批验证器阻断修复 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 单代理；先测试后修复；不得提交、切换分支或操作真实 Profile。本文等待用户批准，不代表已经执行修复。

**Goal:** 修复隔离依赖复制与保护性后检，安全完成副本构建/打包复验；不将验证器修复扩展为未经准备的完整 Host/浏览器验收。

**Architecture:** 保留现有业务包和 API 合同。对 pnpm node_modules 做物理文件复制及内部链接重定位，而不是递归 dereference；所有后检独立执行并聚合失败。把准备阶段和完整集成阶段分开，后者在浏览器驱动及公共配置界面未就绪时明确拒绝启动。

**Tech Stack:** 当前本机 DSH 0.1.1-rc.2、Node、pnpm 已安装依赖、node:test、Node fs/child_process；不新增依赖、不联网安装。

---

## 1. 当前证据与决策

2026-09-02 本轮只读复核：

1. 权威合同 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md 的 SHA256 仍为 `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`；第三批冻结的 83 个包文件无漂移。
2. 上次副本构建因 `ansis` 无法解析退出 1。源依赖实际存在；本轮枚举源 node_modules 得到 2,942 个普通文件、646 个目录链接、0 个文件链接，646 个链接最终目标全部位于该 node_modules 内。采用保留目录结构、重新定位内部链接的最小算法即可，无需做通用包管理器或依赖扁平化。
3. 上次真实 Profile 的一个 session 文件和 session_projcache.json 内容发生变化。这里只确认历史漂移，未确认归因，也未在本轮重新证明真实 Profile 当前静止；不得将“用户同时使用 DSH”写成已证实原因。
4. runner 的 finally 用同一 try 包住所有后检，Profile 比较失败会跳过仓库、API、HEAD、暂存区检查。上次由独立收尾脚本补齐，不代表 runner 本身正确。
5. 计划中的浏览器驱动仍不存在；完整入口会在后续运行才发现缺失。
6. 当前官方 DSH 设置 UI 的 ConfigurablePluginsTabController 只显示“已服务命名空间 ∩ 已注册 settings.plugin.item 卡”。Oasis 源码目前只有 Host settings 注册，没有 Client 设置卡。**这是静态确认的原计划前提缺口，尚无浏览器复现证据。**不能用内部 Store/RPC 写入地址或凭据来冒充公共产品 UI 配置。
7. 暂存区仍为空，第三批 dirty 变更和第四批未提交资产存在。本轮 git 另报全局 ignore 文件不可读；执行时记录此限制，不据此修改全局 Git 配置。

来源：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\audit-report.md 及其中 attempt-001/002 证据。本轮未重跑测试；此前的 271/55/19 仅作回归参考，不作本轮通过结论。

## 2. 范围与放行边界

### 本修复允许修改

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

新增输出仅放在全新证据 attempt 和全新系统临时目录。本文是本轮唯一新增文档。

### 保持不变

- 业务 src/lib/test、包清单、锁文件、API 文档、第三批变更、旧验证器、全局技能与记忆。
- 已有 fourth-batch fixture、attempt-001/002 及其所有日志与临时目录；不得覆盖“修正”历史结果。
- 不手动安装 ansis，不链接回仓库/真实 Profile，不改用原包原地构建，不配置真实 JWT，不请求真实业务接口，不暂存或提交。

### 两个阶段

**R：阻断修复与准备阶段复验（本次拟批准范围）**：测试、依赖副本、标准构建、map 校验、离线打包及保护性前后检。到此停止，不执行 DSH CLI 的 dump-config/plugin/Host，不启动浏览器。

**I：完整第四批恢复（保留独立门禁）**：浏览器驱动和公共 Settings/Credentials 入口未就绪。单独制定并批准必要的产品 UI 修复/验证方案后，才能恢复原第四批 Host/浏览器矩阵。R 成功不自动授权 I，也不标记第四批完成。

## Task 0：冻结与测试准备

1. 读取本计划、原第四批计划和项目 DSH Skill；执行技能顺序为 systematic-debugging → test-driven-development → verification-before-completion。保护 dirty 工作树，不创建 worktree、不切换分支。
2. 记录当前 HEAD、暂存区、全部已知保护文件的类型/大小/SHA、链接目标；包括旧证据及原 API 文档。结合 Git 文件清单与上次冻结清单，任何列举/读取失败都必须记录，不将不可读项算作未变化。
3. 修复代码的测试使用全新的合成临时树，不读取或写入真实 Profile；这部分不要求用户先关闭 DSH。
4. 每项新增测试先确认因目标行为缺失而红灯，再单项实现转绿；不把 unrelated import 错误当成全部场景的 RED 证明。

## Task 1：优先修复后检，确保后续失败仍可闭合证据

**修改函数边界：** 从 runVerification 的 finally 提取 `finalizeVerification`；对每个检查/证据写入独立捕获错误。

**先写回归：** 构建失败、Profile 漂移、保护文件消失、API 变化、单份证据写入失败、子进程启动失败等故障注入；即使第一项失败，后续检查全部被尝试。fixture 只用合成目录，不故意改动真实 Profile。

**实现要求：**

1. 子进程退出/资源关闭、Profile、仓库文件、API、HEAD、暂存区、新增路径白名单各为独立检查项；每项输出 checked/failed/not-collected 之一及脱敏原因。
2. 一份文件读取失败不短路同组其他文件；在比较结果中标出不可读/缺失，不能跳过。
3. 保留 `primaryFailure` 和全部 `cleanupFailures`/`preservationFailures`，不能用后检错误覆盖原构建错误。
4. 各证据文件使用独占新建；单项写失败不阻断其他项保存。最终台账若无法保存，退出非零并向 stderr 给出不含秘密的失败摘要，不谎称证据已保存。
5. `run()` 对 spawn error/退出码/信号都记录 executable、argv、cwd、开始结束时间；构建超时 120 秒、打包超时 60 秒。只终止本次持有的 ChildProcess，等待退出再后检；不按进程名批量终止。
6. 台账包含 `requestedStage`、`stageComplete`、`phase4Complete:false` 和逐层证据，删除“无主错误即整批 complete”的歧义。准备阶段通过只能表示准备阶段完成。

**验收：** 故障注入中所有可执行后检均有结果；主错误和二次错误均保留；任一必要检查失败均退出非零。

## Task 2：保留 pnpm 内部链接结构

**修改函数边界：** 保留 checkedCopy 处理已确认无链接的普通源码文件；新增并使用 `copyIsolatedNodeModules(sourceRoot, destinationRoot)`，禁止 node_modules 继续使用 dereference:true。

**先写回归：** 合成 `.pnpm/tool@1/node_modules/tool → dep → leaf` 多级依赖，顶层 tool 目录链接，多版本同名依赖；在新副本执行真实 Node ESM import 得到预期结果。另测目标已存在、坏链接、外部目标、非目录链接、源复制中变化均拒绝。

**两遍复制算法（不引入依赖求解器）：**

1. 固定 sourceRoot 的 realpath。以 lstat 遍历物理树，不递归跟随链接；冻结普通文件哈希及每个目录链接的原目标和最终 canonical target。
2. 本机当前只有目录链接。任何链接目标不在 sourceRoot 内、链接断裂/循环、未知 reparse 类型或文件链接，明确停止；不猜测、更不复制目标外的数据。
3. 第一次只复制实际目录和普通文件到全新 destinationRoot，保持相对路径；使用独占创建，不产生硬链接，不复制原绝对 junction。
4. 第二次逐项建立目录 junction：`newTarget = destinationRoot + relative(sourceRoot, canonicalTarget)`。先确认目标目录已存在且为副本内物理目录，再创建；Windows 使用 directory junction，其他平台用相对目录 symlink。
5. 逐个 lstat/realpath 复核新链接；它们必须解析到**本模式副本的 node_modules 内**，不是只要求位于总临时根。Home 路径仍禁止任何重解析跳转，不放宽 validateIsolatedHome。
6. 比较普通文件字节哈希、链接数量与映射关系；复算源树，复制期间任何漂移均丢弃本次尝试的可用性，但保留现场，不覆盖重试。
7. 从复制后的 tsdown 包入口通过固定 Node、shell:false 执行；不调用可能带原路径的 .bin shim。先证明实际解析/import 路径均在副本内，再执行标准构建。

**验收：** 多级依赖与多版本测试通过；真实副本 tsdown/ansis/构建依赖可解析；源节点和副本节点哈希一致；没有指回仓库、真实 Profile 或另一模式的链接。不以“直接复制一个 ansis 到顶层”作为修复。

## Task 3：把真实 Profile 静止检查前移

**注意：** 修复的是验证流程，不是恢复或修改真实 Profile。

1. 准备阶段正式运行前，请用户暂停会写 C:\Users\TinaD\.dsh 的 DSH 任务，给出静止窗口；代理不代为关停用户进程。
2. runner 在构建之前对整个真实 Profile 做三次强快照，相邻快照至少间隔 5 秒。凭据文件仍只读哈希；链接只比较目标文本，不遍历。
3. 哈希读取前后校验文件 stat；内容、文件集合、大小/时间或链接目标变化、读取失败均判定不稳定。三次内容比较一致仅是前置门禁，不宣称运行全程已静止。
4. 不稳定时不复制构建、不安装、不启动 Host，记录差异并退出；不得反复“刷新基线直到变绿”、排除 session/cache 或归因于用户以放行。
5. 每种模式构建前以及最终收尾再次检查；执行中漂移立即停止后续阶段，仍执行 Task 1 的全部后检。

**回归：** 合成 Profile 的稳定/文件新增删除/链接变化/哈希期间变化/连续变化。用可注入快照和时钟测试门禁，避免测试依赖真实用户 Profile 或固定长等待。

## Task 4：修复不完整入口与验收范围

1. 新增明确的 `--stage prepare` 参数；允许原 `--modes standalone,better-sidebar --offline`，但 prepare 在每种模式“副本构建+map+pack”后返回，不进入官方 DSH CLI 命令。
2. 默认完整路径及 `--stage integration` 本次均不放行，返回明确的 `INTEGRATION_NOT_READY`，列出浏览器驱动缺失和公共配置 UI 前提未满足；只允许创建本次新失败证据，不得先安装再发现缺文件。
3. 不创建空的 browser.test.mjs、不 skip 必测矩阵来伪造完整入口；也不删除历史未验收分支做顺手重构。后续独立批准再实现/开放集成阶段。
4. 参数校验和 stage 分派在有副作用的操作之前完成；重复、缺值、未知 stage 拒绝。
5. 强化已有 create 额外字段测试：构造正确的 wire 五字段（id/key/inputs/api_process/folder_id），只添加一个 extra 字段；另开新 fixture 验证同一正确 body 成功。避免目前同时用了 apiProcess/folderId 而掩盖“额外字段”测试原因。原九端点、鉴权及安全策略不变。

**回归：** prepare 不调用 DSH CLI/Host/浏览器；integration 缺前提时零安装零启动；未实现能力不会得到 stageComplete/phase4Complete。

## Task 5：独立复验与交付

正式执行时，首次新建 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-remediation-2026-09-02\attempt-001 保存修复 RED/GREEN/台账。

准备阶段现场沿用原验证证据根的新 attempt-003（不存在时才创建；存在则停止，不复用），运行根用新 mkdtemp `oasis-dsh-p4-*`。每种模式独立副本/缓存/输出，不复用 rSYbJi。

工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

```cmd
node --test tests/scripts/oasis-api-phase4-contract.test.mjs
node --test tests/scripts/*.test.mjs
node --test packages/oasis-professional-service/test/*.test.mjs
node scripts/verify-oasis-api-phase4.mjs --stage prepare --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-003 --modes standalone,better-sidebar --offline
git diff --check
git diff --check -- scripts tests packages/oasis-professional-service/src packages/oasis-professional-service/test
```

- 测试按实际计数报告，预期无新增失败；此前 root 55 包含新增 19，不能重复统计。
- 两个独立副本均需标准构建退出 0；client.js 必须与原冻结产物逐字节一致，map 比较 mappings/sourcesContent/解析 sources 内容；任何差异停止，不重写原 lib。
- dry-run pack 和实际 tarball 均为既定 43 项白名单；核对实际归档清单及每项内容哈希，测试、node_modules、证据不得入包。缓存全部在本模式根，禁止 npm 生命周期脚本及联网。
- 新旧源码分别检查；git diff 不覆盖 untracked，新增/未跟踪修改文件另做逐行空白检查。原生成代码四处空白不修，仍单列真实 exit 2。
- 原保护文件、API、HEAD、暂存区零漂移；只有本次两个指定源码和新批准输出可变化。检测额外新增路径，不只比较旧文件哈希。
- Profile 任意变化且未归因时为 BLOCKED_WAITING_FOR_USER；普通修复/构建失败为 FAIL；全部准备检查完成但无完整业务证据时为 STATIC_ONLY。最终只选择一个汇总状态，层级分别陈述事实。
- 本轮没有 Host/浏览器验收，也不关闭历史签名 URL、旧记录、artifact/预览完整性风险。

## 3. 下一道独立门禁（不纳入本修复执行）

需要恢复原第四批时，先单独审查并规划 Oasis 的公共设置卡/写入型凭据控件。须遵循当前官方 Settings/Credentials API，先取得完整及精确 live Slot 契约，不接触真实密钥，不用内部 Store 绕过，设置继续 applies=restart。此项可能需要业务 Client 和清单变化，超出本次两文件修复范围。

随后才能实现原计划浏览器驱动、安装与单 Host 生命周期、双模式运行矩阵。缺少这些证据时，不把“准备阶段修好”表述为“第四批修复完成”。
