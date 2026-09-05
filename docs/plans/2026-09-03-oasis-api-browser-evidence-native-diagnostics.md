# 浏览器证据修复与原生 Windows 诊断 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 解释短生命周期浏览器的证据缺口，修复误导性结果字段，并在不启动浏览器/DSH 的条件下取得原生已知文件夹与当前诊断进程令牌元数据；不预设启动根因。

**Architecture:** 保留当前 worker、CIM、精确树终止及失败关闭策略；增加流式日志摘要和显式收尾判据。原生诊断采用独立 Node 入口 + 固定 PowerShell/C# PInvoke 子进程，继承新建隔离环境，输出白名单 JSON，不把第三方源码 hook 或系统监控服务混入本批。

**Tech Stack:** Node v22.19.0、Node test runner、Windows PowerShell、现有 Playwright 1.62.1/Edge 152.0.4191.62 只读基线。

**当前状态：STATIC_ONLY。** 本文为待批准实施方案。用户“同意进行下一步”承接制定方案；本轮仅只读检查并新增计划/证据，没有修改实现、运行回归、执行原生探针、启动浏览器或 DSH。单代理执行；不创建工作树、不暂存/提交、不修改共享 Skill/记忆。

## 1. 当前事实及不能推出的结论

- HEAD：3c2bd5a469b67ed4070b0b9beacc30212cd038e3；暂存区空，既有脏工作树全部保护。工作区根未提供 OpenSpec，本批采用本计划、目标契约、证据账本及停止条件。
- 主验证器 SHA-256：022CCE3A9F47858E7F64EE970BC5D87BB278BCF98244A6ADD5F83EC24E600DDF。
- worker SHA-256：9E35CBC8F3666C1928394BF1663F0B3FBC584515A5DEBF5D43C81BFDCDE5FDF9。
- 合同测试 SHA-256：495B93DE0B2C3209E74603C4DFD4D6C3CCE042C7F141ED750E34FF20D5A2E41A。
- Playwright coreBundle SHA-256：9393FA79E1C67C74EDC26B610D65A4F7ED73D345A762465CC88340A33A2454AC。
- Edge SHA-256：D26CC5367000F94F05664F33D7118B1BEDA5A4633CFF019D13CC113449B71B0C；Node SHA-256：995A3FB3CEFAD590CD3F4B321532A4B9582FB9C6575320ED2E3E894CAAC3E362。
- API 唯一业务权威仍是 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA-256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。九接口、鉴权和收费行为均不调整。本次系统错误不是业务 JWT/API Key 诊断。

最近运行证据：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\browser-preflight-owner

对应执行报告/只读诊断：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\owner-preflight-approval-001

| 已证实事实 | 正确解释 |
|---|---|
| A 请求启动后约 30 秒失败，CIM 捕获根及若干后代；收尾两次空采样 | 本次观察范围内退出确认，不是浏览器成功或 OS 全树保证 |
| B 日志 00:29:07.890Z 记录根 PID 39672；00:29:08.784Z 记录根 close；CIM 未捕获其创建身份 | 根进程确实启动过，Playwright 记录根已退出；不能补写创建时间或宣称所有后代退出 |
| 每次 census 新启 PowerShell；750ms 定时器会跳过重叠查询 | 定时器间隔不是有效采样间隔，提高频率不能保证捕获短命进程 |
| B 的 cleanupFailures 为空，但 closed=false | “执行清理动作无错误”与“退出证明齐全”是两回事；当前未给缺证据原因专门字段 |
| 所有者身份 CIM 可用，A/B 仍报 0x3F0/非默认数据目录警告 | 不能以提升执行上下文作为已修复；此前普通上下文没有实际启动 Edge，不构成完整身份单变量实验 |
| .NET 返回的 AppData 路径与 APPDATA/LOCALAPPDATA 环境值不同 | 必须分别记录，不能等同；本轮只读 lstat 发现旧根中的两套目录当前均存在，不能据此推断启动时存在情况或根因 |
| identityComparison 固定写 not-authorized | 权限描述与真实批准不符，且比较是否执行和是否授权混为一谈 |

本机 Playwright coreBundle.js 8934/8948 行分别从内部 ChildProcess 的 pid/close 生成日志。可将这些格式化行为作为固定版本的诊断来源，但它们不提供 OS 创建时间、完整后代或稳定公共进程 API。禁止使用私有 browser._process、替换 spawn、改已安装包来取得句柄。

## 2. 方案选择

**选择最小方案：证据分层 + 无浏览器原生探针。** 优先关闭可确定的报告缺陷，再决定下一次真实浏览器实验。

- 不选“更密集 CIM / 只用日志退出就 closed”：前者仍有窗口，后者降低安全标准。
- 暂不选 WMI/ETW 长期订阅或 Windows Job：范围涉及事件丢失、权限、就绪握手或进程启动托管，当前没有必须立即引入的证据；尤其不能将事件时间伪装为进程创建时间。若后续确实需要完整短命后代证据，另立方案和批准。
- 本批**不承诺补回历史缺失的创建身份，也不让历史 B 变绿**；短命日志与 OS 身份必须继续分栏，证明不足时继续阻止后续启动。

## 3. 修改边界

实施批准后仅允许修改这三个既有目标文件：
1. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
2. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-browser-worker.mjs
3. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

允许新增两个诊断文件：
4. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-phase4-windows.mjs
5. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-windows-probe.ps1

新实施证据/一次性 runner：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001

新 ASCII 临时目录只由现有 createInspectionNativeContext 创建，校验原路径、祖先及 realpath；不存在才排他创建，保留失败目录。禁止复用旧 A/B 目录运行。上列目标以外的业务源码/产物、package/lockfile、真实 Profile、API 文档、第三方安装包、全局配置和远端均排除。发现必须扩围时先停下。

## 4. P0 — 冻结与证据契约

1. 实施开始重新运行只读 Git HEAD/stage/status，枚举 Git 可见文件并哈希；复核上述源码/API/工具 hash。漂移则重审，不将本轮快照直接当未来基线。
2. 新证据目录保存 target-contract.json、baseline.json、commands.json、evidence-ledger.json；每条证据含生成时间、精确命令、输入 hash、执行上下文和证明层。
3. 明确分开 P1/P2 实现与普通权限本地测试，以及 P3 所有者上下文的原生诊断。旧浏览器所有者批准不自动升级为任意原生代码批准。
4. 本方案的默认 CLI、测试 import 均不得触发浏览器、DSH、安装、网络或真实 Profile 读取。

## 5. P1 — 可重放的进程证据与报告修复

**修改：上述主验证器、worker 和合同测试。先红后绿，每个改动由新测试证明。**

### P1.1 流式日志证据

在主验证器增加可独立测试的流式解析器，接在现有 worker stderr 管道；不新增浏览器启动入口。

- 固定识别完整行：ISO 时间 + pw:browser + 顶层 <launched> pid=数值；顶层 [pid=数值] <process did exit: exitCode=整数或 null, signal=允许信号或 null>。
- [pid][err]/[out] 内嵌类似字符串不识别为启动/退出；任意未匹配输出只进入脱敏诊断。
- 使用 StringDecoder 处理 UTF-8 分块，完整行后解析/脱敏；记录 source=playwright-debug、receivedAt、logAt、pid、事件类型、exitCode/signal。不得把 logAt 转成 created。
- 单行缓冲最多 16KiB，单通道保存最多 256KiB（按 UTF-8 字节，不按字符串长度），最多 64 个结构化进程事件；超限丢弃超限部分、写 overflow/truncated 标记并阻止完整证据判定，不以增大日志上限绕过。
- 启动/退出事件在单个 worker 生命周期内配对；重复/不匹配事件标明 ambiguous，不修补 PID 世代。流结束的半行只作为截断诊断，不作为可接受生命周期事件。
- 脱敏覆盖跨 chunk 的授权/令牌/cookie canary；不保存任意错误对象、全量环境、浏览器 Profile 内容或业务载荷。记录解析器契约版本及 Playwright bundle hash；实际格式变化时降为 unknown。

### P1.2 收尾判据与失败分层

将现有布尔判定提取为纯函数 assessBrowserClosure(input)，返回：

~~~text
{ status: not-started | confirmed | unknown | residual,
  reasonCodes: [...], workerClosed,
  observedRoots: [{pid, created}],
  logOnlyRoots: [{pid, launchLogged, exitLogged}],
  finalSnapshots: [...], scope: observed-tree-and-marker }
~~~

- 只保留当前或更严格的确认条件。相关 owned row 的 created 空值/非法值不可用；不因全系统无关行缺字段误报本次进程归属。
- log-only 根没有 OS 身份，即使记录退出且两次快照为空，仍为 unknown / BROWSER_ROOT_IDENTITY_UNCAPTURED。
- 另列 WORKER_EXIT_UNCONFIRMED、PROCESS_CENSUS_UNAVAILABLE、LOG_TRUNCATED、PID_GENERATION_AMBIGUOUS、OWNED_PROCESS_REMAINS 等必要原因；每个 unknown/residual 至少一个具体原因。
- launch 未请求且确定未创建 worker 可为 not-started；不能从无 context 推导 not-started。
- closed/terminationConfirmed 仍由可靠退出证据推导；证据缺口不伪装成杀进程失败。primaryFailure 不被 closureAssessment、cleanupFailures 或 evidenceFailures 覆盖。
- 每次 census 同时保存 requestedAt/completedAt/durationMs，显示采样窗口。已知 PID 不得脱离创建身份用于新增终止操作；本批不改变现有精确树终止函数。
- worker 的 failure IPC 仅补充白名单诊断：errorName（TimeoutError/Error/other）、elapsedMs、phase、固定 code；不发送原始 message/stack。父进程须验证大小、类型和值域。

### P1.3 授权与完成语义

- 删除硬编码 identityComparison:not-authorized，替换为 identityComparison:{performed:false,reason:single-context-run}。单次调用本来不比较身份；授权来自外部人工记录，不能从 whoami 或 CLI 标记自动授予。
- 外层 target-contract/execution-context 单独记批准范围与实际身份；没有观测身份时写 unknown，不猜 owner。
- browser-preflight 结果增加 proofCoverage，声明没有 OS 级 Profile/网络监控；保留旧 realProfileAccessed 字段兼容，但明确仅指显式 DSH Profile 读取，不覆盖浏览器系统访问。
- preflightComplete、stageComplete、phase4Complete 继续独立；所有新测试禁止提升阶段 B。未知收尾必须停止下一 case。
- 旧原始证据只读。历史重放只在新 replay 目录生成新评估，不回写旧 closed 或授权字段。

## 6. P2 — 独立原生诊断（先实现和 mock 测试）

**新增：上述 Node 诊断入口、固定 PowerShell probe；测试放入既有合同测试文件。**

### 输入、进程与输出协议

- Node CLI 只接受 --evidence 与 --offline，无任意 executable/script/URL/PID/env 参数；导入模块无副作用。输出路径限定本节新证据父目录，排他创建。
- 只启动固定 SystemRoot 下 WindowsPowerShell/v1.0/powershell.exe，-NoProfile -NonInteractive -File 固定 probe 路径；不使用 ExecutionPolicy Bypass，不修改策略。策略阻止即报告，不重试绕过。
- 使用 createInspectionNativeContext 的全新 cwd/env；环境仅增加带固定含义的隔离根标记，不继承凭据/Node 注入变量。父级不导入 Playwright，不开 HTTP 端口。
- PowerShell 中 Add-Type 的 C# 源码固定在本地脚本内，必要编译临时输出只允许该新隔离 TEMP；不下载/安装编译器，不写全局程序集或注册表。Add-Type 失败即停。
- 单次 probe 超时 15 秒；复用现有持有 ChildProcess 的记录/超时树终止机制，终止及退出复核有界。清理未知时不再启动第二个 probe。所有者上下文只作用于本诊断及其监管，不升级整个阶段 B。
- 单次 JSON 最多 64KiB，固定 schemaVersion/时间/进程 PID/自身创建时间/位数；各 API 调用单独保存结果和失败，不得吞掉前项。系统调用 HRESULT 与 GetLastError 分开，不使用陈旧 LastError 解释成功调用。

### 原生 API 白名单

1. SHGetKnownFolderPath：固定 hToken=NULL、flags=KF_FLAG_DONT_VERIFY(0x4000)，仅四个已知目录。只取得路径字符串；不传 KF_FLAG_CREATE/INIT，不调用 SHSetKnownFolderPath。
   - LocalAppData：F1B32785-6FBA-4FCF-9D55-7B8E7F157091
   - RoamingAppData：3EB685DB-65F9-4CF6-A03A-E3EF65729F3D
   - Profile：5E6C858F-0E22-4760-9AFE-EA3317B67173
   - ProgramData：62AB5D82-FDC1-4DC3-A9DD-070D1D495D97
2. 每项保存 GUID、flags、hTokenMode=current-user、HRESULT 十六进制、成功路径。finally 按官方契约释放 ppszPath（成功或失败均处理非零指针）。
3. OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY)；OpenThreadToken(GetCurrentThread(), TOKEN_QUERY, OpenAsSelf=TRUE)。只查询当前 PowerShell 探针自身，不打开 Edge、用户应用或其他用户令牌。
4. GetTokenInformation 仅返回 TokenType、TokenElevationType、TokenIntegrityLevel、TokenSessionId、TokenIsAppContainer；不输出 token 句柄、原始缓冲、权限/组全集、凭据或登录秘密。GetTokenInformation 两阶段缓冲按实际指针大小处理；成功句柄 finally CloseHandle、分配内存 finally 释放。
5. 线程令牌不存在与 API 访问被拒必须分开记录；不存在不能直接解释 Edge 的 0x3F0。不得调用 DuplicateTokenEx、Impersonate、SetThreadToken、AdjustTokenPrivileges、LoadUserProfile、注册表写 API 或切换用户。

### 数据解释与文件访问边界

- Node 将返回路径与注入 env 逐项对照，输出 same/different/unknown。仅对明确位于本次新根内、祖先无重解析且实际路径安全的返回路径做 lstat/目录 ACL 只读元数据检查；根外或 UNC 路径只记录字符串与 outside-scope，不遍历、不测写、不读取其 Profile 内容。
- 不补建“看起来应该存在”的目录，不改 env 去迎合返回路径。需要目录布局对照实验时另批，避免同时改变多个变量。
- DONT_VERIFY 成功只证明取得字符串，不证明目录存在/可访问；独立 PowerShell 子进程结果也不等价于 Edge 内部线程调用结果。[SHGetKnownFolderPath](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath)、[KNOWN_FOLDER_FLAG](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/ne-shlobj_core-known_folder_flag)。
- 四个 GUID 来自 [KNOWNFOLDERID](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid)。当前 token 的读取边界依据 [OpenProcessToken](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocesstoken)、[OpenThreadToken](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openthreadtoken)、[GetTokenInformation](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-gettokeninformation)。官方页面核对日期：2026-09-03。
- 采集完整且字段校验通过时 collectionComplete=true/退出0，即使记录某 API HRESULT 失败；该退出码不表示 API 全部成功、Windows 配置正确或浏览器已修复。采集缺失、超时、编译/证据错误退出1。固定 browserStarted=false、dshStarted=false、preflightComplete=false。

## 7. P3 — 测试、历史重放与一次原生采集

按以下顺序执行；先新测试红灯，再最小实现、绿灯、全套本地回归。不要为制造红灯恢复旧工作树文件。

### 必须覆盖的测试

- B 型：完整 launch/close 日志但无 CIM 创建身份，判为 unknown，首错保留；不得触发新的 browser/DSH。
- A 型：有效创建身份、观察范围退出齐全，但 launch 失败，closed 可确认且 ok/preflightComplete 仍 false。
- UTF-8/敏感 canary 任意 chunk 切分、超长行、字节上限、半行、日志伪造、重复/乱序事件、不匹配 PID；日志不可用于新终止授权。
- 空创建时间、PID 复用、同 PID 不同世代、无法完成两次采样、残留、worker 未退出：理由准确且继续失败关闭。
- 首错+清理错+证据写错并存，字段不会互相覆盖；单一上下文没有虚构身份比较或批准。
- 原生入口 import/未知参数/重复路径/链接/根外目录/UNC/畸形 JSON/超时/编译失败均关闭；模拟 API 返回外部路径时没有后续 fs 访问。
- probe 值域/句柄释放、HRESULT/LastError、无线程 token、非零失败项与 collectionComplete 分层；静态断言危险 API 不出现不能代替真实原生调用结果。
- 进程启动函数以 fake 执行器测试：不能调用浏览器、DSH、任意 shell 或网络；真实 native 仅下面的独立显式命令执行，不藏在普通单测内。

### 运行命令与记录

Shell：cmd.exe。工作目录固定为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。以下是批准后未来命令，本轮未执行。

~~~bat
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs"
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-browser-worker.mjs"
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-phase4-windows.mjs"
"C:\Program Files\nodejs\node.exe" --test --test-skip-pattern="inspection CLI timeout terminates its owned nested process tree on Windows" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs"
~~~

固定实际可执行文件为 C:\Program Files\nodejs\node.exe。实施目录新增一次性 regression-runner.mjs，只支持 root-safe/package 两种固定选择；复用已检查旧 runner 的显式文件枚举、隔离 env、超时及命令落盘，不修改/运行旧证据 runner 去写旧目录。根回归 cwd 必须项目根。记录准确通过/失败/跳过计数，原生树终止旧单项明确排除，不能宣称同上下文全量通过；本批不修改该函数，因此不为复用历史绿灯额外提升执行此单项。

~~~bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\regression-runner.mjs" root-safe
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\regression-runner.mjs" package
~~~

普通回归通过后，用测试直接读取旧 A/B lifecycle、stderr、runtime 作为只读输入，运行纯解析/评估函数，将带输入 hash 的结果写新 evidence/replay；不执行日志内命令，不使用历史 PID 做当前清理。

只有用户明确批准 P0–P3（包含所有者原生探针）后，才运行下面的固定命令一次；拒绝/失败后停止，不自动改身份重试：

~~~bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-phase4-windows.mjs" --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\native-probe" --offline
~~~

收尾重新比较所有非目标 Git 可见文件、API 文档、HEAD、暂存区、工具 hash；核对只有白名单源码变化及允许路径新增。报告完整命令、退出码、生成时间、输入 hash、日志缺口、采集边界和残余风险。旧业务产物尾随空白属于既有问题，不能顺手修复。

## 8. 最终验收与后续停止点

P0–P3 交付要求：缺证据原因可机器读取；B 重放仍 unknown；日志/授权字段不误导；新探针的正常/失败路径受控、未接触业务；本地回归与保全证据齐全。**本批完成不代表 R0–R3 原总计划、阶段 B 或产品完成。**

原生采集后的唯一动作是归档并提交诊断结论：
- 原生目录 API 失败：报告精确调用/HRESULT；设计下一次单变量验证，不直接修注册表/令牌。
- 原生目录 API 成功且目录变量不一致：记录差异，不宣布根因，也不自动补目录。
- 原生 API 正常但 Edge 故障仍无解释：承认只验证了独立探针；如需 Edge 进程事件/完整生存期跟踪，另批 WMI/ETW/Job 等专门方案，不能默认升级。
- 任一身份/退出未知、保护漂移、日志/证据异常：停止，不进入另一个条件。

新的 Edge 实验、浏览器条件 C、恢复真实目录变量、换浏览器、扩权、进程托管机制，以及正式 DSH RPC/WebSocket 与 Client peer 修复均不属于本批。阶段 B 仍要求独立批准和当次真实 DSH 写入暂停的重新确认。
