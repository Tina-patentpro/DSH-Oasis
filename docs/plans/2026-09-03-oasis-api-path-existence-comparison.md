# 隔离 LocalAppData 叶目录存在性对照 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在同一个全新隔离根内，仅切换 Local 叶目录存在性，检验 N3 的两种验证式路径调用失败是否随之改变。

**Architecture:** 新增一次性所有者监管器和成对采集 worker；只读复用现有 collectPathParity(context)，两组各使用新 PowerShell 进程。先固定 AppData 父目录，采集缺失组，门禁通过后仅创建 Local，再采集存在组；不修改旧验证器或业务插件。

**Tech Stack:** 固定 Node、Windows whoami、现有 PowerShell/C# PInvoke 探针；内存文件系统、假时钟和假子进程测试。单代理，不安装依赖、不建工作树、不提交。

**状态：STATIC_ONLY。本轮仅规划和只读核对；没有创建实验目录/临时根，没有执行身份或原生采集。执行以下 E0–E4 须用户另行明确批准。**

## 1. 当前证据与选择

- N3 原始结果及收尾清单已重新读取；本轮核对 90 项输入/证据指纹，无漂移。HEAD 为 3c2bd5a469b67ed4070b0b9beacc30212cd038e3，暂存区为空；既有业务改动保留。
- N3 的三项 HRESULT 按顺序为 0x00000000、0x80070003、0x80070003，目标前后均 missing。它是既有原生证据，不是本轮重跑结果，也不是 Edge 根因证明。
- 当前 createInspectionNativeContext 只创建 os-home，不创建其 AppData/Local。若在两组之间递归创建 AppData/Local，会同时改变父目录与叶目录，不能严称只改变 Local。
- 因此先在新根创建空 AppData，作为两组共同条件。若此时缺失组无法复现 N3，立即停止；不把父目录效应混入叶目录结论。
- 方案比较：推荐同根、有序的缺失/存在两组；沿用 N3 作历史对照会混入根路径/时间差；两个独立根也引入根差异。反向删除/反复交叉实验扩大写入与次数，本轮不做。
- 这是受控输入的单变量前后对照，不是随机化实验；进程、时序、OS 缓存和原生编译临时产物仍可能不同。禁止表述为“全系统只有一个文件系统变化”或“已证明 Edge 根因”。

官方语义：DONT_VERIFY=0x4000 跳过存在性校验，未设置时目录不存在或不可访问可导致失败；CREATE 是独立标记，本实验禁止使用。[Microsoft KNOWN_FOLDER_FLAG](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/ne-shlobj_core-known_folder_flag)

旧 SHGetFolderPathW 是 KnownFolder 包装接口，不把两种验证式调用当成互相独立的两套系统实现。[Microsoft SHGetFolderPathW](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetfolderpathw)

## 2. 目标契约及写入白名单

执行阶段唯一新增工作区根：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001

其父目录也仅在执行批准后排他新建。若该日期目录或 attempt-001 已存在，停止；不自动换号、不复用、无清理/回滚旧证据。

新增源码仅四个文件：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001\owner-once.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001\comparison-worker.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001\comparison.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001\test-runner.mjs

新增证据仅在同一根：baseline.json、inputs.json、red-tests.json、green-tests.json、syntax.json、ready.json、owner-native-attempt.json、owner-dispatch.json、worker-attempt.json、owner-context.json、worker-context.json、parent-setup.json、control-result.json、intervention-intent.json、intervention-result.json、treatment-result.json、comparison-result.json、owner-command-result.json、owner-result.json、commands.json、evidence-ledger.json、source-hashes.json、preservation.json、report.md、closing-check.json。使用 wx；失败记录保留。正常红绿步骤之外的失败先停下审查，不自动增加原生尝试或覆盖失败记录。

临时写入仅限现有 createInspectionNativeContext 排他分配的全新 ASCII 根及其新子根：外层监管用一个根；worker 在其 TEMP 下创建一个内层根。不得复用 N3 的任何临时根。记录分配后解析的真实绝对路径，不能预先猜测随机后缀。

在内层根，除原有隔离上下文基础目录、npm 空配置和原生工具自身临时产物外，仅新增两项受控目录：
1. 采集前的共同准备：该内层根下 os-home\AppData；
2. 缺失组验收后的唯一干预：该内层根下 os-home\AppData\Local。

两项均为一次非递归 mkdir，拒绝 EEXIST；不从 API 返回值拼接写路径。每次先确认解析目标在本次根内，逐层 lstat，拒绝文件/链接/junction、无法核实的路径与 realpath 不一致，再创建并复查。原有探针还会检查 FileAttributes.ReparsePoint。路径检查不构成对恶意并发替换的原子防护保证；发现并发变化即停止，不修 ACL、不删路径。

所有既有文件均只读，尤其：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-path-parity-probe.ps1
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\owner-once.mjs 及 N3/native-once 全部证据
- D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md

业务 API 文档仍是唯一业务契约权威，SHA256=429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1；本实验不发业务 API 请求、不重新解释或修改该契约。

## 3. E0 — 冻结与前置门禁

1. 校验本规划证据 readonly-findings.json 中全部冻结输入；重新冻结所有 Git 可见既有文件、证据树（不跟随链接）、HEAD、暂存区和工作区 diff。任何内容漂移先报告，不自动采纳新 hash。root 无 OpenSpec，本次用本计划和证据台账，不额外建立框架。
2. 只读核对 N3 report、parity-result、closing-check；旧原生 attempt 已消耗，禁止再次运行旧 owner-once、parity CLI 或任何旧回归入口。
3. 确认新实验根不存在、祖先路径安全；记录固定 Node、whoami、PowerShell、taskkill 的绝对位置及文件 hash。Node 保持当前冻结 hash，系统工具如无法读取则停止。已冻结 Edge/Playwright 只核 hash，不启动。
4. 将固定输入与 N3 批准所有者用户名/SID 写入新 inputs.json；其精确 hash 固定到新入口。历史身份仅作匹配参考，不代替新鲜身份或授权。无需读取真实 DSH Profile、DSH 版本或运行 dump-config。

## 4. E1 — 先红后绿实现四个新文件

### 4.1 成对采集 worker

导入原有 collectPathParity、parseParityReport、createInspectionNativeContext、inspectDiagnosticPath；禁止调用 runPathParity CLI，因为它自己重建根且固定旧证据入口。禁止在进程间序列化/重建上下文：terminateOwnedProcessTree 要求本进程 WeakSet 注册的原对象。

worker CLI 不接受目录/可执行文件/env/API/PID 等参数；导入无启动副作用。直接运行须检查固定 owner-dispatch：父进程 PID、预期外层 cwd、冻结输入和 readiness 一致，再排他写 worker-attempt；它是误调用门禁，不宣称防恶意同用户篡改。worker 必须自己调用 createInspectionNativeContext 一次，保存原对象并用于两组 collectPathParity；验证新 cwd 严格在本次外层 TEMP 之下。

固定流程伪代码（每个 save 均 wx 且失败阻断下一动作）：

~~~text
assertFixedDispatchAndInputs(); claimWorkerAttemptOnce()
context = createInspectionNativeContext(process.env) // 本进程注册，不重建
assertFreshDescendantContext(context); save(worker-context)
assertMissing(AppData); assertMissing(Local)
mkdir(AppData, recursive=false); verifyEmptyParent(); save(parent-setup)
freezeSharedInputs(context.env, cwd, probeHash, executableHash, argv)
control = collectPathParity(context) // 第一个新的 PowerShell
save(control-result); validateAndReReadControl()
require control before/after Local=missing, all calls executed, guard=null,
        HR=[0x00000000,0x80070003,0x80070003], closed/exit/cleanup valid
require os-home subtree exactly AppData, empty; inputs unchanged
save(intervention-intent); recheckParentsAndMissingLocal()
mkdir(Local, recursive=false) // 唯一组间受控干预，最多一次
verifyDirectoryAndUnchangedParentIdentity(); save(intervention-result)
treatment = collectPathParity(context) // 第二个新的 PowerShell
save(treatment-result); validatePair(); save(comparison-result)
~~~

不存在组必须先保存并重新校验，再允许 mkdir；创建失败或证据写入失败就不启动存在组。两组的 target 必须是同一个由内层 cwd 计算的绝对路径。保持 USERPROFILE、HOME、APPDATA、LOCALAPPDATA、TEMP 等安全环境全部不变，不把 env.LOCALAPPDATA 改成该目标；比较 canonical 安全环境摘要，固定同一 probe/可执行文件/cwd/argv/64 位。

每组固定三项 API 各调用一次，顺序与 N3 不变：KnownFolder LocalAppData GUID F1B32785-6FBA-4FCF-9D55-7B8E7F157091、flags=0x4000；SHGetFolderPathW CSIDL=0x001c、flags=0；同 GUID KnownFolder flags=0。hToken 都为 NULL，legacy hwnd 为 NULL。无 CREATE、SHSetKnownFolderPath、注册表/ACL/token 修改。

### 4.2 所有者监管器

以 N3 的有界监管设计为只读参考，在新 owner-once 中实现固定 identity/comparison 两分支；不修改或调用 N3 的固定 parity 分支，不用旧 runRecordedCommand。

- 先排他写 owner-native-attempt，再核输入/readiness，再建立外层隔离根；每个真实尝试最多一次 whoami、一次 worker、两次 PowerShell 探针，无重试。
- 一次 whoami /user /fo csv /nh 新鲜输出必须精确匹配冻结用户名/SID；异常、多余输出或身份不符，禁止 worker。不切换身份/令牌。沙箱若不提供批准所有者身份，走正常平台审批；拒绝则停，不绕过。
- shell=false、windowsHide=true；只持有本次 ChildProcess。身份主期限 5 秒，根级回收后最多等 2 秒 close，独立终结看门狗 10 秒。
- worker 主期限 90 秒；异常/超限/超时请求一次持有 worker 的树终止，等待最多 7 秒，随后 close 等待最多 5 秒，仍未知则持有根级回收后最多等 2 秒；独立 105 秒终结看门狗。不得按进程名或旧 PID 清理。
- 内层现有每组主期限 15 秒、独立看门狗 30 秒保持不变。正常仅顺序启动，无并行采集。
- 每个命令 stdout 上限 64 KiB、stderr 8 KiB，按字节计数，白名单结构化落盘；任意 malformed/stdout/stderr 正文不保存，保留长度/hash/固定错误码。
- 超时后即使晚到 close=0，也不能恢复为成功。终结取消 timer，管道关闭/unref；未知后代仍记未知，不声称全树已关闭。期限是 Node 事件循环可响应前提下的应用层监管，不是 OS 级强实时终止保证。
- worker 输出只含 comparisonComplete、exitCode、conclusion、failure 的固定摘要；父层必须独立读取校验上下文、两组报告和干预记录，不能只接受 worker exit=0。

### 4.3 验收检查和测试

comparison.test.mjs 全部使用假进程/假时钟/内存文件系统，禁止原生 API、真实 mkdir 干预或 browser/DSH 启动。至少逐项覆盖：
1. 导入无启动；参数/目录/attempt 重用被拒绝；inputs/readiness 漂移禁止执行。
2. owner 不匹配或身份输出异常，worker 调用数为零；固定 argv/env/隐藏窗口。
3. 同一进程创建一个真实上下文对象并传入两组，不能 JSON 重建；环境/目标相同。
4. AppData 在 control 前创建，Local 只在合格 control 后创建；mkdir 非递归且至多一次。
5. control 任一 HR 不符、元数据非 missing、guard/exit/cleanup/close 异常或写入失败，干预/treatment 次数均为零。
6. EEXIST、越界、祖先链接/文件、realpath 不符、读失败、父身份变化，停止而不删除/重试。
7. treatment 全成功与失败/混合 HR 都准确保留；后者不是采集器故障，也不是修复成功。
8. 伪造成功摘要、不同 target/env/probe、错 PID/时间窗口/位数、旧报告重放均拒绝。
9. 输出超限、spawn 异常、编译失败、晚到 close、终止不返回、终止成功但没有 close、105 秒看门狗都 fail-closed。
10. 任意证据写失败禁止后续动作；收尾未知不提升；timer/管道收尾；原生采集数最多两组且顺序执行。

test-runner 只运行该新增测试文件并收集退出码，红灯因目标实现缺失，绿灯 fail=0/exit=0；再对四个新增文件 Node --check。所有测试输出仅在新实验根，不复用会写旧证据的测试。通过后冻结四文件 hash 到 ready.json，并在实际运行与收尾复核。旧 root/package 156/271 只是历史结果，本轮不重跑、不重新标注新鲜通过。

## 5. E2 — 明确获批后，仅一次真实成对采集

本计划批准应包含 E0–E4；若用户只批准本地实现，则做到 E1 停止，不隐含批准本步骤。

再次核验基线、新源码/工具 hash、attempt 未消耗且准备门禁通过。Shell=cmd.exe，工作目录为项目根；短路径先 realpath/hash 证明与固定 Node 相同，命令：

~~~bat
C:\Progra~1\nodejs\node.exe "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-2026-09-03\attempt-001\owner-once.mjs"
~~~

除这个固定入口外，不直接运行 worker 或旧 N3 入口。平台如要求额外运行权限，照常审批；不扩大到 browser/DSH/业务 API。一次逻辑尝试失败即保留证据停止，不换目录、换身份、调 flags 或重复采集。

## 6. E3 — 结果分层判定

每组须 commandResult.closed=true、exitCode=0、无 signal/超时/错误/强制回收、stderr=0，report cleanup=true；PID/创建时间/调用窗口通过 parseParityReport，三项都 executed 且无 guard。两组 ChildProcess 必须新建且串行，(PID, createdAt) 不得复用同一过程证据；位数为 64。所有成功 path 规范化后精确等于计算目标，不能以字符串前缀通过。

| 观察 | 结论/处理 |
|---|---|
| control 无法复现 [0, 80070003, 80070003] | control-not-reproduced；comparisonComplete=false，exit=1；不创建 Local、不启动第二组 |
| control 合格，treatment 元数据前后 directory，三项 HR 均 0 | comparisonComplete=true，conclusion=supported-in-paired-run，exit=0；仅支持本次受控目录存在性假设 |
| 两组有效，treatment 仍失败或混合 | comparisonComplete=true，conclusion=not-supported 或 mixed（按是否两种验证式调用均非 0/仅一项非 0），exit=0；假设未获支持/证据混合，不是修复完成 |
| treatment 第一项失败触发 safety guard，或协议/收尾/保存异常 | comparisonComplete=false，exit=1；保留原因，不强行按负结果接受不完整采集 |

两组间 os-home 子树只允许多出空 Local，父目录 mtime 变化是预期元数据，不算独立输入干预。记录基础临时目录/编译临时产物的证据边界，不声称 OS 无其他间接访问。

无论何种结果，browserStarted、dshStarted、preflightComplete、stageComplete、phase4Complete 都为 false；项目仍用 STATIC_ONLY。不得宣布 Edge/DevTools 修复、阶段 B 完成或解锁真实 DSH 写入。

## 7. E4 — 保全与停止边界

1. 报告中保留两组原始白名单数据、共同环境摘要、目录创建前后元数据、PID/时间/退出、资源释放、命令及源码 hash、前后保全差异。记录测试红/绿和真实采集分层，不用退出码掩盖阴性结果。
2. 与 E0 基线比较所有受保护文件/证据、HEAD、暂存区、原 dirty diff；允许新增仅在批准根。已有历史越界证据、N3 attempt、业务 dirty 文件必须原样保留。Git ignore 读取限制继续作为清单覆盖局限。
3. git diff --check 原有四处 client.js 行尾空白不修；如有新增错误单独报告。没有后代 OS 监控或完整系统资源追踪，不作越界证明。
4. 不删除任何临时根、证据或标记，不发布、安装、提交、改全局策略/权限/注册表、读真实 Profile，不启动浏览器/DSH，不发网络业务请求。
5. 若支持假设，下一步仅提出“是否将最小目录准备纳入独立浏览器预检”的新计划；浏览器及阶段 B 仍需另行批准。若不支持/混合/不完整，先基于新证据重新规划，不自动扩大枚举。

## 本规划证据

D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-plan-2026-09-03\attempt-001\readonly-findings.json
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-plan-2026-09-03\attempt-001\baseline.json
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-existence-plan-2026-09-03\attempt-001\closing-check.json

本规划本身只新增上述规划证据及本文，不创建未来实验根。执行前必须再次验证规划时观察到的事实。
