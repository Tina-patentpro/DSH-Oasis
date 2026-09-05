# Windows 路径 API 契约对照 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不启动浏览器/DSH、不补建原生返回的 LocalAppData 目标目录的条件下，比较三种固定路径 API 调用，确认上一批 DONT_VERIFY 成功是否掩盖了验证式调用失败。

**Architecture:** 新建一个独立固定入口与 PowerShell/C# 探针，复用已有隔离环境、排他证据目录、精确树终止和安全路径元数据函数；不修改已完成的五个文件或既有浏览器预检。先完成本地 mock/失败路径测试，再由独立批准的一次所有者上下文采集获得结果。

**Tech Stack:** 当前 Node v22.19.0、Windows PowerShell、固定 C# PInvoke、Node test runner。Edge/Playwright 仅作为只读版本/哈希背景，绝不导入或启动。

**当前状态：STATIC_ONLY。** 本轮只有只读分析、官方契约核对和本计划/证据新增，没有实现、测试运行、原生调用、浏览器或 DSH 启动。默认执行批准仅覆盖 N0–N2；N3 所有者原生调用必须另行明确批准。

## 1. 当前事实及假设

已重新核对 HEAD=3c2bd5a469b67ed4070b0b9beacc30212cd038e3，暂存区为空；上一批五个目标源码、API 权威文档、Node/Edge/Playwright 文件哈希均未漂移。既有业务脏工作树继续保护。git 只读命令提示用户全局 ignore 文件无读取权限；本轮没有修改权限/配置，也不把这一观察称为全工作树审计通过。

本轮依据：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\report.md
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\native-probe\native-result.json
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\source-change-manifest.json

- 上一批原生探针只测 SHGetKnownFolderPath(hToken=NULL, flags=0x4000)，四项 HRESULT=0；LocalAppData 返回路径在采集后 lstat 为 ENOENT。它证明的是该调用取得了字符串。微软标志文档明确：未设置 DONT_VERIFY 时会尝试验证目录是否存在，缺失或不可访问会导致失败。[标志契约](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/ne-shlobj_core-known_folder_flag)
- 历史 Edge 日志同时出现 PathService key=112、无法取得 local app data、非默认数据目录警告；日志已有独立 --user-data-dir，不能再次把“补上该参数”当成修复。
- 本轮读到的 Chromium 上游 main：base_paths_win.h 的 DIR_LOCAL_APP_DATA 枚举值为 112；base_paths_win.cc 的对应分支调用 SHGetFolderPath(NULL, CSIDL_LOCAL_APPDATA, NULL, SHGFP_TYPE_CURRENT, buffer)。**这是上游调用线索，不是 Edge 152.0.4191.62 私有实现的匹配源码证明。** [上游路径实现](https://raw.githubusercontent.com/chromium/chromium/main/base/base_paths_win.cc)、[枚举定义](https://raw.githubusercontent.com/chromium/chromium/main/base/base_paths_win.h)
- 微软文档明确 SHGetFolderPathW 返回 HRESULT，输出缓冲为 MAX_PATH；Vista 以后它包装 Known Folder API，但标志/验证语义不能省略。新代码通常应使用 Known Folder API；这里保留旧 API 仅为诊断调用对照。[官方契约](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetfolderpathw)
- Chromium main 的 helper.cc 已与历史日志中的报错结构不同；不据此推断本机 Edge 已包含该上游改动，不升级 Edge、不改安装包。Google 官方默认数据目录限制仅用作背景，不能代替本机失败链证据。[官方说明](https://developer.chrome.com/blog/remote-debugging-port)

**唯一待验证假设 H1：** 在同一新隔离环境中，不验证目录存在性的调用可能成功，而验证式/旧接口调用失败。即使 H1 成立，也只定位到独立诊断进程的 API 契约差异，不宣布 Edge 根因，更不直接补目录。

## 2. 方案选择及范围

| 选择 | 本轮决定 | 原因 |
|---|---|---|
| 固定原生 API 契约对照 | 推荐 | 新证据直接指出原探针与上游调用不同；无需浏览器或目录干预 |
| 直接做浏览器补目录对照 | 暂缓 | 尚未验证最接近上游的调用；短命进程身份可能再次缺失，且涉及新的浏览器副作用 |
| 立刻引入 WMI/ETW/Job | 暂缓 | 属于进程观测/托管架构扩围，不能为本次路径假设顺带实施 |

**允许新增且仅新增三个实现文件：**
1. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs
2. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-path-parity-probe.ps1
3. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-path-parity.test.mjs

实现/运行证据只允许新建在：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001

该目录当前必须不存在；已存在则停止，不复用/覆盖、不自动选 attempt-002。所有临时根由已有 createInspectionNativeContext 排他分配在 ASCII 临时目录，保留失败根，不删除旧输出。实现只复用公共导出，不为复用重构现有验证器。

**不做：** 修改上一批源码/诊断协议、业务源码、API 文档、package/lockfile、安装包、Skill/记忆、全局权限/策略；不启动浏览器、DSH、HTTP 服务；不发业务请求；不重放旧 PID；不提交；不补建、重定向或测写 LocalAppData；不读真实 Profile 内容。

业务权威仍为：
D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md
SHA-256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。九接口、鉴权、收费边界不变；本次操作系统路径诊断与业务接口实现分开。

## 3. N0 — 冻结与契约（本地，无原生调用）

1. 读取本计划及项目 Skill，复核本轮九项源码/API/工具指纹、HEAD、暂存区；发生漂移先停，不自动更新“期望值”。本轮指纹见：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-plan-2026-09-03\attempt-001\baseline.json。
2. 重新枚举、哈希全部可见既有文件，建立实施 baseline.json；本批没有允许修改的既有文件。保存 target-contract.json，标明 N0–N2 授权与 N3 未授权。
3. 独立新建上面的实现证据根；保存 commands.json、evidence-ledger.json、source-hashes.json。每条结果记录时间、实际 executable/argv/cwd、输入指纹、层级和退出码。
4. 定义 parseParityArgs、parseParityReport、collectPathParity、runPathParity 四个导出。CLI 只接收 --evidence 与 --offline，重复/未知/缺失参数拒绝；没有 API/flags/PID/executable/env/URL 自定义参数。导入模块不执行任何进程。
5. 所有来源都是数据，不执行网页/历史日志中的命令。上游 main 只用作假设依据，记录 URL、取证时间和相关符号；当前未取得 Edge 精确源码，不写版本匹配结论。

## 4. N1 — 固定探针与 fail-closed 协议（先红后绿）

### 4.1 执行链

- Node 创建全新隔离 cwd/env；保存安全白名单环境，拒绝 Node 注入/凭据变量。只额外注入 OASIS_PATH_PARITY_ROOT=cwd。
- 固定运行 SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe，argv 为 -NoProfile -NonInteractive -File 加固定本地 probe 路径；不使用 ExecutionPolicy Bypass。
- PowerShell 校验当前目录与标记根一致，Add-Type 固定 C#；临时编译沿用隔离 TEMP。不下载/安装、不修改策略。
- 本入口内部新增固定用途的 executeParityCommand：只 spawn 固定探针（shell=false、windowsHide=true），15 秒超时，保留持有的 ChildProcess。超时/输出超限只触发一次已有 terminateOwnedProcessTree(child, context)，最多等待该动作 7 秒，再等待 close 最多 5 秒；仍未确认则仅对持有的 ChildProcess 做根级回收并再等 2 秒，记录 closed=false/未知后代，不声明全树退出。总计受 30 秒终结看门狗约束；排空或关闭管道，所有 timer 取消，不挂起等待。原生入口与精确树终止代码保持单一固定进程目标，不提供通用任意命令执行器。任何编译/超时/未知退出均记录后停止，不重试。

### 4.2 三个固定调用，顺序不变

仅 LocalAppData，GUID=F1B32785-6FBA-4FCF-9D55-7B8E7F157091；不重复其他三个目录或令牌采集。

| 顺序/id | 固定调用 | 用途 |
|---|---|---|
| 1 known-dont-verify | SHGetKnownFolderPath(ref LocalAppData, 0x4000, NULL, out pointer) | 记录字符串并做路径安全前置门禁 |
| 2 legacy-current | SHGetFolderPathW(NULL, 0x001c, NULL, 0, wchar[MAX_PATH]) | CSIDL_LOCAL_APPDATA + SHGFP_TYPE_CURRENT；没有 CSIDL_FLAG_CREATE/DONT_VERIFY |
| 3 known-verify | SHGetKnownFolderPath(ref LocalAppData, 0, NULL, out pointer) | 与第 1 项仅验证标志不同的对照 |

**安全门禁：** 第 1 项必须返回 S_OK 且字符串归一化后精确等于本次 cwd 下 os-home\AppData\Local；根及存在的祖先无重解析、真实路径未逃逸。缺失路径只记 missing，不创建。根外、UNC、不匹配、链接、元数据不可读或第 1 项失败时，第 2/3 项记录 skipped-safety-guard，退出 1，不继续验证式调用。不能从 API 返回值取得任意文件访问授权。

第 2 项输出 StringBuilder 容量固定 260，显式 Unicode/ExactSpelling；固定 HRESULT 为成功判据。S_FALSE/空串不得伪装为成功路径；非 S_OK 保存原始十六进制 HRESULT，path=null。第 3 项无 CREATE 标志。已执行的第 2 项失败仍要采集第 3 项，除非出现安全门禁/托管异常；这不是重试同一调用。

所有非零 Known Folder 输出指针无论 HRESULT 均在 finally FreeCoTaskMem；释放标志单独记录。不要调用 GetLastError/Marshal.GetLastWin32Error 解释这些 HRESULT 调用，也不加入 SetLastError 或线程令牌操作来制造 0x3F0。固定 stage 失败码区分 SETUP/COMPILE/CALL；不落盘任意异常 message/stack。

### 4.3 报告协议

顶层固定：schemaVersion=1、kind=path-api-contract-parity、generatedAt、pid、createdAt、bitness、calls（恰好上述三项）、resourceCleanupComplete。calls 每行固定 id/api/参数、执行时间、status=executed 或 skipped-safety-guard、hresult、path、guardCode；不得接受未知键、重复顺序、未授权 flags/GUID 或任意路径。

- 时间、PID、位数和值域严格验证；报告 PID 必须与持有子进程记录匹配，创建时间处于父进程记录的本次 startedAt/finishedAt 时间范围（允许最多 2 秒精度误差，不用第一项 API 调用时间代替进程启动时间）。
- 成功路径必须是本次受限路径，最大 32767 字符且无控制字符；legacy 成功路径长度必须小于 MAX_PATH。HRESULT 统一大写 8 位；skipped 项 hresult/path/time 均为 null，guardCode 必须来自固定枚举。
- executeParityCommand 流式收集 stdout<=64KiB、stderr<=8KiB（UTF-8 字节）；超限丢弃后续数据并触发上述一次受管收尾。只落盘合法白名单 JSON 或输出大小/hash和固定错误码，不保存任意 stderr/原始 malformed payload。固定 stage 错误码只接受整行精确匹配。旧 runRecordedCommand 无流式限额，因此本探针不把它用作原生 stdout 采集器；不修改它。
- 合法完整三项执行且句柄/缓冲释放和进程 close 均确认：collectionComplete=true/退出 0，允许第 2/3 项记录 HRESULT 失败。调用未完成、安全阻断、schema/编译/超时/证据错误：collectionComplete=false/退出 1。
- 始终 browserStarted=false、dshStarted=false、preflightComplete=false、stageComplete=false、phase4Complete=false；不输出自动修复建议开关。
- Node 在前后仅对本次 expected Local 路径做安全 lstat 元数据；根外仅记录字符串不遍历。不复制 Profile、读文件内容、ACL 授权或补建目录。文件元数据是采集前后快照，不推断 OS 内部无访问或缓存行为。

## 5. N2 — 本地回归及实施交接（仍不执行真实原生调用）

1. 新测试必须先红灯：入口缺失/契约不成立，再实现最小代码、再绿灯。不得恢复旧源码制造红灯。
2. 必须覆盖：import 无启动；参数/证据复用/链接/根外拒绝；三项调用顺序与 flags；首项失败后禁止后两项；外部路径 fs 访问为 0；HRESULT 失败但完整采集与采集失败分层；S_FALSE/空缓冲/溢出/畸形 JSON；PID/创建时间失配；非零退出/编译失败/超时/closed=false；缓冲释放失败；证据写失败；停止后不得二次启动；禁止 browser/DSH/任意命令。
3. 用 fake 执行器和固定 canary 验证 Node 输出大小/分块脱敏，不把真实 native 放进普通测试。PowerShell 仅 Parser.ParseFile 语法检查，不执行 Add-Type。
4. 精确命令（未来执行；Shell=cmd.exe）：

~~~bat
"C:\Program Files\nodejs\node.exe" --check "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs"
"C:\Program Files\nodejs\node.exe" --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-path-parity.test.mjs"
~~~

5. 在新证据根新建 regression-runner.mjs，仅 root-safe/package 两种固定选择；显式枚举文件、隔离环境、项目根 cwd、120 秒上限并保存实际 argv/退出码。参考上一批 runner 但不能原地运行去写旧目录。根回归继续排除 inspection CLI timeout terminates its owned nested process tree on Windows，精确报告新计数；旧 132/271 只作历史参考，不能充当本轮结果。
6. 前后全部既有文件、API/工具、HEAD/stage 保全；输出 N0–N2 本地交付报告和新的输入指纹，**在此停止，请求 N3 的单独批准**。不因 mock 通过就启动探针。

## 6. N3 — 后续独立批准的一次所有者采集（不含浏览器）

前置条件：用户明确授权新增三种固定路径调用；N0–N2 最新测试、源码/工具指纹及保全全部成立。旧 P0–P3 的一次原生批准不覆盖本次。

1. 新证据子目录 native-once 不存在、所有父路径安全；所有者监管器先写排他 attempt 标志、复核源码/工具 hash，再在隔离 cwd/env 以固定 whoami /user /fo csv /nh 记录身份。只验证当前身份，不切换用户/令牌；身份未知或非已批准所有者停止。
2. 固定 Node 命令执行一次，不换身份重试：

~~~bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs" --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\native-once" --offline
~~~

3. 仅新子进程获得所有者上下文；外层监管 60 秒上限，探针 15 秒。父/子 close、退出码、是否超时、完整三项返回、资源释放和安全路径元数据逐项保存。
4. 收尾可在同一批准范围做两次间隔至少 2 秒的只读 PID/创建身份/本次随机根标记采样，不依据历史 PID 或进程名杀进程；任何未知退出不启动第二次探针。再次比较全部保护基线后归档停止。
5. 本批不读真实 DSH Profile、不运行任何 DSH CLI；不要求用户为本原生调用恢复 DSH。未来阶段 B 仍需独立批准并重新确认当次真实 DSH 写入暂停。

## 7. 结果解释与停止条件

| 观测 | 允许结论 | 下一步（不自动执行） |
|---|---|---|
| DONT_VERIFY 成功，legacy/verify 失败 | 记录同一探针的契约差异与准确 HRESULT；H1 有支持 | 再制定仅改变目标目录存在性的单变量计划 |
| 三项均成功 | 本次未复现验证式路径失败 | 不补目录；回到 Edge 精确版本/启动链分析 |
| legacy 与 known-verify 不一致 | 两调用需进一步核对，保留顺序/状态 | 不将包装关系误当结果必相同 |
| 首项路径根外、API 异常、协议错误或未知收尾 | 无可接受的对照结论 | 停止，不重跑、不扩大路径访问 |
| 保护基线漂移 | 无法验收 | 停止并报告实际漂移；不恢复/覆盖 |

本方案不把全新独立 PowerShell 进程的结果替代 Edge 线程行为；不跨进程复用缓存/令牌推断。没有 OS 级文件/网络监控，不声称系统绝无间接访问。两条 API 同时失败也不能直接解释 DevTools 拒绝原因。没有浏览器证明就保留 STATIC_ONLY；阶段 B 不会由本报告自动解锁。

## 8. 本轮规划证据

D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-plan-2026-09-03\attempt-001\baseline.json
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-plan-2026-09-03\attempt-001\readonly-findings.json
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-plan-2026-09-03\attempt-001\validation.json

规划只新增本文和上述新规划证据根。没有创建新工作树、子代理或提交；现有五个源码文件和上一批原始证据均只读。
