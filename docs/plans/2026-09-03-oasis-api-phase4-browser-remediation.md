# 阶段 B 浏览器阻塞与验证器可靠性修复 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复已证实的隔离和证据缺陷，以浏览器单独预检定位启动失败，再恢复两个隔离模式的公开平台契约探测；不把启动成功、历史绿灯或静态检查等同于阶段 B 完成。

**Architecture:** 保留现有验证器和安全终止工具；仅增加一个受父进程监管的浏览器 Node worker，将 Playwright 本身及其隐式子进程一起放入显式环境和工作目录。先修可靠性，再做单变量诊断，不改第三方安装包，不猜测 Windows 环境变量修复。

**Tech Stack:** Windows、Node.js、现有 Node test runner、Playwright 1.62.1、Edge、DSH 0.1.1-rc.2、Better Sidebar 0.15.2。

**日期与权限:** 2026-09-03。本文是分析与待批准修复计划，本次只新增本文。未运行新的浏览器、DSH CLI、Host 或回归测试。后续实现采用单代理；不自动提交、不创建工作树、不修改全局配置。阶段 B 的再次运行另设人工门禁，不能沿用昨日“真实 DSH 已暂停”的确认。

## 1. 结论与证据边界

当前阶段 B 结论为 **FAIL**：最近真实执行在浏览器连接之前失败，平台契约尚未完成。问题分为三组，不能混为一个根因：

1. **已经定位、可以直接修复的验证器缺陷：** Playwright 父进程环境边界缺口、启动失败误报关闭、失败诊断丢失/被收尾覆盖、缺少浏览器早期门禁。
2. **需要受控实验才能判定的启动问题：** Windows 令牌/已知文件夹解析与严格环境、persistent 启动方式的交互。不能据日志直接认定缺少某一变量或需要提升权限。
3. **独立未关闭的兼容与证明缺口：** peer 版本漂移、Client 实际依赖来源、浏览器子进程退出、启动期后台网络、两个模式的 live Slot 证据。

### 1.1 本次重新读取的当前基线

| 项目 | 当前值 |
|---|---|
| HEAD | `3c2bd5a469b67ed4070b0b9beacc30212cd038e3` |
| Git 暂存区 | 空；工作树已有大量修改及未跟踪证据，全部保护 |
| 主验证器 SHA-256 | `2372D0C8DFBF9A44B91232754561619AF2B09CBCA107A2DB11A3C6BFF56F76D1` |
| 合同测试 SHA-256 | `86ECDED4151CC5D6A02C0B495DD7BE681DF053BF475D6CDF44942078A242B66C` |
| 已验证 API 文档 SHA-256 | `429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1` |
| Playwright coreBundle SHA-256 | `9393FA79E1C67C74EDC26B610D65A4F7ED73D345A762465CC88340A33A2454AC` |
| 计划写入前既有 Git 可见文件强基线 | 2,935 个；写后重新比较，不包含 Git 内部与忽略目录 |

API 唯一业务权威仍是：

`D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md`

本轮不扩展既有九接口，不更改其请求、响应、鉴权或收费行为。Windows `ERROR_NO_TOKEN` 不是该文档中的业务 JWT 或模型 API Key 错误。

### 1.2 历史运行事实，不冒充今天的新运行

证据目录：

`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-006`

- 外层退出码 1。standalone 复制、构建、43 文件打包、离线安装、Host 启动已经发生。
- 记录的 15 个命令均退出 0，不包含“浏览器阶段成功”这一含义。
- 复制官方 runtime 29,503 文件、检查 1,079 个模式内链接；复制至版本检查约耗时 7 分 40 秒，之后才发现浏览器不可用。
- Edge PID 20844 在 `launchPersistentContext` 等待 180,000ms 后超时；没有浏览器连接、页面访问、live Slot 查询或截图；Better Sidebar 模式未执行。
- 收尾独立检查记录 Host PID 5108 和 Edge 根 PID 不存在、5151 端口关闭；没有完整浏览器后代进程证明。
- 当次真实 Profile 15,218 条快照记录和既有 2,885 文件保持不变；HEAD、暂存区、API 文档未变。该事实只证明当次保护结果，不证明今天真实 DSH 仍暂停。
- 浏览器日志存在 Microsoft 后台请求尝试且代理连接失败，不能声称“没有任何网络尝试”。

attempt-005 在第一次只读 Git 查询因 sandbox 用户与仓库所有者不一致而失败；未启动 DSH。所有者上下文的单独只读探测通过，不意味着整个验证器必须提升权限。全局 Git ignore 的权限警告仍存在，但不能与上述 dubious ownership 或 Edge 故障混为一谈。

历史浏览器成功记录已重读实际 TAP，而不只是报告：

- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week3-comprehensive-audit-remediation-2026-08-29\task6\attempt-09\standalone\runtime\browser-tap.txt`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week3-comprehensive-audit-remediation-2026-08-29\task6\attempt-09\better-sidebar\runtime\browser-tap.txt`

两份均为 1/1 通过，但历史路径采用 `chromium.launch()` + `browser.newContext()`，并继承父进程环境。当前同时改成 persistent context 和严格环境，且未证明浏览器工具版本、执行令牌完全相同。因此旧成功不能排除环境问题，也不能直接证明换回非 persistent 即可修复。

## 2. 逐项问题、因果边界与处置

### F1 / P1：Playwright 自身的父进程环境没有隔离

当前验证器只给 Edge 传 `env`，但 Playwright 仍运行在主验证器进程中。

本机源码：

`C:\Users\TinaD\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright-core\lib\coreBundle.js`

- 8898 行起的 `launchProcess` 传递 `options.env`、`options.cwd`。
- 39538 行附近的浏览器启动调用提供 env，却没有提供 cwd，浏览器因此继承调用进程工作目录。
- 8988 行的 Windows 强制清理使用 `spawnSync(taskkill..., { shell: true })`，没有显式 env/cwd；继承的是 Playwright 父进程，而不是 Edge 的 env。

**影响：** 上一轮修复的自有 `taskkill` helper 并未覆盖第三方清理路径；工作区仍可能成为隐式子进程工作目录。该缺口已静态证实，但没有证据证明它制造了之前的 `%SystemDrive%` 缓存，也不应将其直接定为此次 Edge 超时根因。

**修复：** Playwright 只在新 worker 中导入；父进程以完整、白名单化的隔离 env 和新 ASCII 临时 cwd 启动 worker。worker 及库内隐式 shell/子进程继承同一安全环境，不修改第三方源码或全局 `process.env`。

### F2 / P1：启动失败被误记为关闭成功，缺少完整退出证明

文件：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs`

584–645 行：只有 `launchPersistentContext` 完成才赋值 browser；643 行即使 browser 不存在，也无条件设置 `closed = true`。实际证据确实出现 `started: false, closed: true`。

**修复：** 将“启动请求”“进程已产生”“context 连接”“页面就绪”“进程退出确认”分开；空 browser 对象不能推出进程未产生或已关闭。父进程持有 worker 的真实 ChildProcess，并使用现有安全树终止机制；收尾必须记录可归属进程身份和退出证据。根 PID 消失不能被改写成全树退出。

### F3 / P1：首要错误、清理错误和观测范围混淆

- 当前 `finally` 的 close/save 异常可能覆盖启动或页面的首要错误。
- Playwright 错误被安全汇总折叠成通用 `VERIFICATION_FAILED`；attempt-006 浏览器日志为控制台摘录，不是完整、结构化的启动生命周期。
- 路由和 pageerror 监听在启动成功后注册；启动失败时两个空数组不代表“没有错误/网络”。

**修复：** 持久化独立的 `primaryFailure`、`cleanupFailures[]`、`evidenceFailures[]`、`failedPhase` 与 `observationCoverage`。保留经过脱敏、有大小上限的启动诊断；日志截断或写入失败必须显式记录，不能因此清除原始失败。

### F4 / P1：Edge 的 Windows 文件夹/令牌问题尚未隔离根因

日志同时出现 `0x3F0`、`Unable to get local app data path` 和要求非默认 user-data-dir 的提示，但实际 argv 已包含新的隔离 `--user-data-dir`。因此“补上该参数”不是有效诊断。

Microsoft 定义 `0x3F0` 为 `ERROR_NO_TOKEN`；Windows 已知文件夹 API 的用户选择与令牌/用户配置单元有关，仅有环境字符串不能证明 OS 识别了同一用户上下文。[Windows 错误码](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1000-1299-)；[SHGetKnownFolderPath](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath)。这些资料只解释排查方向，不能证明 Edge 的具体失败调用栈。

本机 Playwright 源码 4264–4265 行定义普通默认超时 30 秒、启动默认超时 3 分钟，与此次 180 秒一致；不能照当前在线文档假定本机启动只等 30 秒。

**处置：** 明确设置时限；执行第 4 节的有界单变量实验。禁止靠增加超时、恢复真实 APPDATA/USERPROFILE、添加更多关闭沙箱参数或索要 API Key 解决。

### F5 / P2：观察者环境、原生辅助命令与浏览器环境混用

只读 Git 观察也使用隔离 HOME，会改变 Git 信任配置的可见性；随后将整次运行切换到所有者上下文，不能证明浏览器需要同样权限。

**修复：** 分离三种能力：只读 Git 观察、模式内 DSH/原生命令、浏览器 worker。Git 不写任何配置；先在当前允许上下文预检，失败则仅对具体只读命令申请所有者上下文。拒绝或仍失败就停在 baseline 阶段，不启动 Host。不得 `safe.directory=*`，不得为通过 Git 检查而自动提升全部浏览器流程。

### F6 / P1（兼容门禁）：peer 版本声明与物理解析不一致

本次只读检查保留的 attempt-006 副本发现：

| 依赖 | 插件精确声明 | 沿安装位置向上解析得到 |
|---|---|---|
| react | 18.2.0 | 18.3.1 |
| react-dom | 18.2.0 | 19.2.8，链接指向 runtime 内 dsh-client-ui-trajectory 的嵌套依赖 |
| 其余 11 个 peer | 各自精确版本 | 本次物理清单一致 |

两个链接位于：`C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-tkV7sm\standalone\home\profiles\node_modules`

该路径仅为保留证据，后续不复用或修改。实际 Client 产物用 `window.__ModuleLoader__.load`，factory 内 require react/react-dom；官方 Client loader 的 seed/模块表与 Node 物理解析不同。因此不能据以上版本直接断言页面加载了 React DOM 19，也不能把 peer warning 忽略为已兼容。

**处置：** 新增逐 peer 清单：声明、物理来源/版本、Host 或 Client 使用面、公开模块契约/前端资产来源、实际浏览器结果。Host 必需依赖缺失或隔离链接逃逸时禁止启动。仅 Client 版本疑点允许在已隔离的阶段 B 诊断运行中取证，但禁止宣布兼容或阶段完成。若实际 Client 版本仍不满足精确声明，另立包版本兼容修改申请；本批不改业务 package.json、lockfile、不强制 overrides、不静默放宽 semver。

### F7 / P2：失败发现过晚、回归覆盖没有经过真实组件边界

既有环境测试和 Node 进程树测试可通过，但没有覆盖“真实 Playwright 自己启动和清理”的链路。旧浏览器验证走另一套启动方式；因此之前的 99/99、271/271 不是当前启动链路的证明。

**修复：** 在大规模复制/安装前运行同一个 worker 的 browser-preflight；不复制官方 runtime、不启动 DSH、不创建业务会话。先验证真正会用于阶段 B 的浏览器启动与收尾，再支付完整复制成本。本批不增加 runtime 缓存机制，不削弱复制前后强校验。

### F8 / P1（验收门禁）：公开契约、网络与两种布局模式仍缺证据

六个精确根查询、完整 live Slot 树、设置页渲染及 Better Sidebar 路径均未完成。静态类型文件不替代 live 值；`details` 有原生占用是应保留事实，不是要求替换它的缺陷。

**修复：** 阶段 B 必须同时覆盖 standalone 和 Better Sidebar 0.15.2；每种模式独立临时 Profile，先完整树，再六个精确根，附属性、占用、替换风险、截图、页面错误和收尾。运行保护或任一契约缺失均不得完成；阶段 B 即使通过，`phase4Complete` 仍为 false，不打开未验收的 integration 分支或阶段 C。

## 3. 变更白名单与明确排除

实现批次仅允许修改：

1. `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs`
2. `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs`

允许新增：

3. `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-browser-worker.mjs`
4. 新证据目录：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001`

临时运行根使用经检查不存在链接/重解析歧义的系统 temp 下新建 ASCII 随机目录，登记真实绝对路径；不写默认 Profile，不复用 attempt-006 目录。证据目录采用排他创建，存在则停止，不覆盖旧日志。

排除业务 src/lib、package.json/lockfile、真实 Profile、API 文档、全局 Git/Windows/Edge 配置、已安装 Playwright/DSH、远端文件及共享 Skill/记忆。发现必须扩大这些范围的根因时，出具单独差异和审批，不混入本批。

## 4. 可执行任务与门禁

### R0 — 冻结与安全前置检查（实现批准后）

1. 重新读取上述文件、Git HEAD/暂存区/工作树；与本文 hash 比较，漂移则先重审，不使用昨日结果自动放行。
2. 保存 target-contract、baseline、commands、evidence-ledger；记录准确 Node、Playwright、Edge 文件版本/哈希、执行身份、批准范围。只输出白名单环境项，不输出全量环境或凭据。
3. 新证据/临时目录排他创建并校验 raw path、realpath 和祖先；所有新增文件纳入允许清单。
4. 当前用户 Git 预检必须先于复制/Host。所有者权限仅在需要时对具体只读命令请求，不改仓库信任。
5. 记录历史证据，但不重新执行 DSH。R1 的本地测试可使用合成进程；不视为真实浏览器或 Host 结果。

### R1 — 先红后绿修复 worker、生命周期与证据

实现接口固定为主验证器负责路径、父进程监管与证据落盘，worker 负责 Playwright/UI，IPC 仅传结构化消息与白名单参数。worker 不接受任意脚本、shell、外部 URL 或用户环境字典。

- 主进程显式启动固定 Node 可执行文件和固定 worker 文件，使用 `inspectionEnvironment` 派生的完整 env、模式内 cwd 和可追踪 ChildProcess。
- 不在父进程导入 Playwright；worker 不读取真实 DSH Profile、业务配置、账号或凭据。
- IPC 至少包含 boot、launch-requested、context-connected、page-ready、failure、closing、closed；每条含序号和时间。父进程校验状态转移、消息大小、模式及文件名，拒绝迟到/重复成功消息改变失败结果。
- 保留现有 `closed` 供兼容，但只能由 `terminationConfirmed === true` 推导。补充 `workerSpawned`、`browserProcessObserved`、`contextConnected`、`pageReady`、`failedPhase`、`primaryFailure`、`cleanupFailures`、`evidenceFailures`、`observationCoverage`。
- 没有产生进程的确定性 spawn error，与产生了进程但没有 context 的 launch error分别记录；后者默认退出状态 unknown，不能自动 closed。
- worker 失败后等待父进程收尾确认；父进程强制期限内结束受控树，使用既有固定 taskkill 工具/安全上下文，不以进程名称扫杀，不附着用户浏览器。
- 记录 worker/可归属浏览器 PID、创建时间、父子关系、唯一 user-data-dir 标记，以及收尾的存活检查；检查同一隔离标记的残留进程。仅 PID 不存在或仅一次进程列表不能称为完整进程树证明。归属、枚举权限或退出确认不充分就失败并停止，不提升为成功，不引入未经批准的 Windows Job/系统服务等更大改造。
- Playwright 启动显式 30 秒；预检页面操作每步 10 秒；graceful close 5 秒、强制终止 5 秒、退出复查 2 秒。browser-preflight worker 硬上限 75 秒；正式 inspect worker 硬上限 180 秒，启动仍只允许 30 秒。超时必须取消/终止真实工作，不使用只抛错而不清理的 Promise.race。
- 启动错误和清理错误分别落盘。保存有限的脱敏诊断（单通道最多 256 KiB，截断另记）；禁记 cookies、Authorization、材料与任意全量 env。证据写入失败时非零退出，stderr 输出安全错误码，不吞首要失败。
- 在连接后、首次页面访问前挂载 route、requestfailed、console/pageerror；记录 `prelaunchNetworkObserved: false`，不把空页面网络数组当作启动期无外联证据。

必须新增且先验证红灯的测试：启动前抛错；启动进程但无 context；worker 崩溃；关闭永不返回；close 抛错；证据写失败；首要错误与两种收尾错误同时发生；迟到成功 IPC；错误 PID/创建时间拒绝终止；后代状态 unknown 拒绝完成；真实 Profile/env canary 不传递；第三方 shell 继承 worker 隔离 env/cwd；browser-preflight 不触发 DSH/import/install/会话 RPC；默认 integration 继续拒绝；缺任一模式或契约不完成。

原生合成父子进程测试只结束自己持有的进程树；如操作系统拒绝终止，先收集只读归属证据，再申请精确权限，不重复盲试。

### R2 — 浏览器单独预检与因果隔离（批准包含浏览器启动时才执行）

新增显式 CLI 阶段 `browser-preflight`，缺省阶段行为不变。使用固定本机 Edge/Playwright、全新隔离路径、无凭据、dead proxy 和仅本机静态测试页，不加载 DSH 或产品。测试页由监管进程绑定 `127.0.0.1` 的系统分配端口，只有静态 GET；关闭后验证端口关闭。浏览器 context 必须可连接、页面标记可读、截图成功、关闭可证。

按顺序最多三种诊断条件，每次独立新根、完整收尾；上一条件收尾不明时禁止下一条件：

| 条件 | 不变项 | 唯一目标变量 | 决策 |
|---|---|---|---|
| A | worker、显式隔离 env/cwd、当前执行身份、Edge/Playwright、代理 | persistent context，30 秒启动期限 | 建立受控复现；成功不自动归因于某个环境变量 |
| B | 与 A 相同 | `launch()` + `newContext()`，临时 profile 全部落在隔离 TEMP | 若 A 失败而 B 通过且收尾完整，采用 B；阶段 B 无跨重启浏览器持久化需求 |
| C（条件执行） | 与失败的 B 完全相同 | 仅 Windows 执行身份/令牌上下文 | 只有 A/B 均失败且得到该项明确批准，才比较所有者上下文；不得自动提升整个验证器 |

若 A/B 均通过，优先 B：无需持久化的更简单启动方式足够；报告“受控方式可用”，不声称旧故障唯一根因已找到。若 B 失败而 A 通过，采用 A 并保留唯一新 user-data-dir。选定候选额外连续两次冷启动均须通过，任一次失败回到未稳定状态。

失败时补充只读的同身份已知文件夹解析、目录权限及版本诊断，错误码单独保存；不恢复真实 APPDATA/HOME，不修改注册表、用户配置单元或浏览器策略。A/B/C 均失败或必须放宽真实用户目录才能成功，则停止并提出新方案；不继续堆叠环境变量或进行第四种猜测。

网络结论限于：测试无真实业务凭据；页面路由仅允许精确本机 origin；保留后台代理失败诊断。dead proxy 和路由不是 OS 网络沙箱，不能声明系统级零外联；若后续要求硬性零外联，必须另批 OS 隔离方案，不能改全局防火墙作为本批捷径。

### R3 — 集成选定方式、回归和独立复审

1. 主验证器 inspect 复用 R2 的同一个 worker 和启动参数，而不是复制另一套启动逻辑；大规模复制前运行该预检，失败即退出。
2. browser-preflight 成功只写其自身 verdict，不添加 platform-contract 成功账本，不把 stage B 或 phase4 标为完成。
3. 保留完整树 + 六个精确根的 collector 和现有 schema 验证；UI 必须就绪才进入查询。保存创建 workspace/session 的脱敏结果及 ID 一致性，不保存无关响应体。
4. 审核页面请求和 DSH 公开 RPC 的实际方法契约；现有 Node 控制面仍只允许 workspace.create/session.create/session.rename。页面不允许凭据写入、模型调用、业务运行或非本机 origin；不使用内部 store 改设置以绕过 UI。发现当前 denylist 未覆盖真实敏感方法时补充合同测试，未知变更请求默认阻止并报告，而不是静默放行。
5. 增加 peer 清单与 unresolved gate，保留不同版本的真实依赖拓扑，不自动压平依赖。Client 真实版本必须从匹配本机版本的公开模块服务/装载契约取得，不读取或改写私有模块表，不根据 Node 路径伪造浏览器版本。如需要扩展 Slot probe 的 Client 取证能力，先列出最小额外文件/公开契约并申请扩围，本批停在缺证据状态。
6. 运行本节命令，红/绿、退出码、生成时间、输入 hash 分别入账。业务回归只运行已有测试；构建、打包只能在独立副本中进行，不覆盖当前 lib。
7. 独立检查输入/暂存区/既有文件、真实 Profile（若在本次权限范围中建立过基线）、新增路径、worker/浏览器/端口；复核错误注入确实能阻止完成。没有所需退出证明，即使截图成功也失败。

执行 shell：`cmd.exe`。下列是后续实现的验收命令，本次未执行：

```bat
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs"
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-browser-worker.mjs"
"C:\Program Files\nodejs\node.exe" --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs"
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\regression-runner.mjs" root
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\regression-runner.mjs" package
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs" --stage browser-preflight --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\browser-preflight" --offline
git -C "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研" diff --check
```

在新证据目录生成一次性 `regression-runner.mjs`，只接受 root/package 两个固定选择：分别以 fs.readdir 读取 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts` 和 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test`，筛选普通文件且名称以 `.test.mjs` 结尾，排序后传显式绝对路径 argv 给固定 Node 的 `--test`。先保存测试文件清单/hash；空集合报错；不得依赖 cmd 或 Node 22 对通配符的隐式展开。复用现有安全原生环境/命令监管，单次回归期限 120 秒，保存 stdout/stderr、退出码及超时清理记录；helper 不调用 build/install/DSH/browser。

每条原子执行，使用适合该测试的隔离 cwd/env，命令输出写入新证据目录。新 worker/未跟踪文件另做内容空白检查；不能只依赖 Git diff --check。99/99 和 271/271 仅为历史参考；实际应记录新增后准确总数、失败/跳过与退出码，禁止用固定旧计数代替新验证。

### R4 — 阶段 B 双模式复验（独立人工门禁）

仅当 R1–R3 的实现及浏览器证明齐全、用户再次确认真实 DSH 写入暂停并批准阶段 B 后运行：

1. 重新获得真实 Profile 三次一致强快照；既有文件、API 文档、HEAD/暂存区基线齐全。只暂停声明不够，快照不稳必须停。
2. 重新创建 standalone 与 Better Sidebar 0.15.2 的独立 mode 根，沿用已验证的离线复制/安装和来源 hash；不复用旧失败 Profile，不跳过链接/输入校验。
3. Host 版本、Bundle 顺序、Client 依赖证明及公开 UI 就绪后，先查询完整 live Slot 树，再查 `settings.section`、`settings.plugins.tab`、`settings.plugin.item`、`conversation.input.right`、`shell.overlay`、`details`。
4. 每个根记录 purpose、kind、scope、options、standard props、owner props、occupants、replacement risk、descendants。保留原生单槽，不注册替代 details。
5. 两模式分别保存设置页截图、页面错误/网络覆盖、契约 JSON、安装告警分类、Host/worker/browser/端口收尾与真实 Profile/既有文件强对比。
6. 未关闭的 peer 契约疑点、页面错误、契约缺字段、只跑一模式、不可确认退出或保护漂移，均使 `stageComplete=false`、非零退出；阶段 B 成功也必须保持 `phase4Complete=false`。

未来命令（证据子目录不存在才允许执行）：

```bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs" --stage inspect --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\stage-b" --modes standalone,better-sidebar --offline
```

## 5. 证据账本、失败分类与停止条件

每个新运行至少保存：目标契约/授权范围、before/after 强基线、工具版本与 hash、命令/退出码、所选启动条件、worker 生命周期、受控进程归属及退出记录、诊断覆盖/截断、primary/cleanup/evidence failures、页面与 Slot 结果、peer-resolution、最终 verdict。

清理结果和功能结果分开：资源退出不等于页面成功；截图不等于契约完整；静态通过不等于运行通过；本机隔离通过不等于真实 API、生产或收费场景通过。

立即停止条件：

- 原有文件/Profile/API/HEAD/暂存区漂移，或新路径不在许可清单。
- 需要修改真实用户配置、全局 Git 信任、第三方已安装文件或业务依赖声明。
- 浏览器/worker 归属或退出无法证明；不得开启下一次运行造成叠加残留。
- 实验需要真实凭据、业务外联、模型调用、生产材料或收费请求。
- 默认 integration 意外可进入、缺证据仍报告完成、未知敏感 RPC 被放行。
- 三种诊断条件仍无稳定候选，或最小隔离假设必须被打破。

不自动删除旧证据或临时失败目录。若确需清理，只能在单独列明本次新增绝对路径、强基线、进程/端口关闭及链接检查后审批；不能用递归清理工作区代替归属判断。

## 6. 本次审计遗漏复盘与防复发

| 原来遗漏的原因 | 缺失的门禁 | 此次补齐位置 | 如何证明不会再漏 |
|---|---|---|---|
| 只审查自有 taskkill helper，未追到 Playwright 内部 shell | 第三方子进程环境传播 | worker 边界及合同测试 | 合成隐式 shell 读取白名单 env/cwd，再以真实 Playwright 预检核验 |
| 将 browser 对象生命周期误当 OS 进程生命周期 | 启动中途失败/未赋值 | 状态机与父进程监管 | 注入“已启动但无 context”，closed 必须保持不成立直到退出确认 |
| 只验证正常关闭 | 双重异常/证据落盘失败 | finalization 测试 | 首错、清理错、证据错同时存在时都保留且退出非零 |
| 历史浏览器绿灯来自不同启动配置 | 当前配置的真实早期探针 | browser-preflight | 同 worker、同工具 hash、同 env、同参数，失败发生在复制/Host 之前 |
| 安装返回 0 被赋予过强含义 | peer 实际来源和 Client 装载区分 | peer-resolution 与完成门禁 | React 版本漂移不能因 CLI 退出 0 消失，未知 Client 来源阻止兼容结论 |
| 空日志数组被当无事件 | 启动前/连接后覆盖标识 | observationCoverage | 没连上时不能输出“零页面错误/零外联已验证” |

这些是本项目验证器的跨组件边界缺口，先在本项目代码、测试和证据模板中修正；本次不修改共享 Skill 或记忆。浏览器 worker 是为显式环境传播和可终止生命周期引入的最小边界，不扩展成通用任务平台。

## 7. 批准建议

建议先批准 **R0–R3：验证器修复、合成回归及浏览器单独预检**，不启动 DSH、不恢复阶段 C、不提交代码。条件 C 的令牌上下文比较需要单独明确批准。

该批通过后，再根据 peer/Client 证据决定是否需要独立兼容修改；所有前置问题关闭后，才请求 **R4：阶段 B 双模式隔离复验**。不将本计划的批准解释为修改真实 Profile、全局配置或业务依赖的授权。
