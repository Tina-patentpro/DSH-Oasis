# N3 一次所有者原生采集 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在严格一次、隔离环境和有界收尾条件下，采集 LocalAppData 三种固定 API 契约的对照结果。

**Architecture:** 仅在新 N3 监管证据目录增加固定用途的监管器与 mock 检查；复用当前 parity 入口，保护所有既有源码和证据。先做本地红绿测试，门禁全部成立后才进行一次所有者原生采集；不重用旧监管脚本。

**Tech Stack:** 当前固定 Node、Windows whoami、PowerShell/C# PInvoke；不增加依赖、配置或工作树。单代理，不提交。

**状态：STATIC_ONLY。本轮仅规划与只读核对；下述执行含原生采集，须用户明确批准 N3。**

## 当前证据与修正原因
- 本轮重新读取并比对 58 项输入、修正运行器、固定输入清单：无漂移；HEAD=3c2bd5a469b67ed4070b0b9beacc30212cd038e3，暂存区为空。上一轮 8/8、156/156（含 parity 25 项）、271/271 是已归档结果，本轮未重跑。
- native-once 与 n3-supervision-001 当前均不存在，已观察的父路径链未见链接。执行时必须再次检查。
- 旧 runRecordedCommand 在 done 内等待 termination，且树终止返回成功后未必收到 close；不能把 timeoutMs=60000 视为 60 秒严格总时限。**不得用它执行本次外层原生入口。**
- 当前内层 parity 探针有 15 秒主超时及 30 秒看门狗，但不能替代外层监管。只修复新监管器，不改旧通用函数。
- Git 全局 ignore 文件读取限制、旧四处行尾空白和上轮越界记录继续保留。

## 允许新增的路径
1. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001
   仅新增 owner-once.mjs、owner-once.test.mjs、test-runner.mjs，以及 baseline、inputs、attempt、command、result、preservation、report 等本次证据。
2. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\native-once
   仅由当前 parity CLI 排他创建，用于 context.json 和 parity-result.json。

不修改任何既有文件，包括回归运行器、三个 parity 文件及旧诊断测试。两个新目录如已存在则停止，不复用、不自动换号、不清理。临时根仍由现有 createInspectionNativeContext 排他分配；保留失败根，不补建返回的 Local 目录。

## N3.1 — 冻结与一次性监管器准备
1. 比对本规划 readonly-findings.json 的 58 项固定输入、运行器/清单以及历史所有者参考。再冻结全部当前 Git 可见文件、证据树（不跟随链接）、HEAD/暂存区；漂移停止，不自动接受新 hash。
2. 只读参考历史 owner-execution-context.json 的准确用户名和 SID，作为固定匹配值；它不是本轮身份或授权证据。未来以 whoami /user /fo csv /nh 新鲜结果核对，不切换用户/令牌，不因管理员身份扩大权限。
3. 在 n3-supervision-001 中新增固定入口，CLI 不接受 executable、API、PID、env、目录等自定义参数；导入无副作用。仅提供固定 identity/parity 两种私有执行分支，测试可替换 OS 边界，正式入口不可注入替身。
4. 固定使用 Node 与 SystemRoot 下 whoami；shell=false、windowsHide=true；安全白名单环境来自全新隔离上下文。身份输出严格解析为用户名/SID，拒绝额外内容；不落盘任意异常正文或原始 malformed 输出。
5. 在准备任何真实身份/采集子进程前，以 wx 创建 owner-native-attempt.json；该标记在失败后保留。输入/身份不符、标记复用、目录复用均阻断；一次逻辑调用最多一次 whoami 和一次 parity CLI，无重试、无换身份重试。

## N3.2 — 严格外层期限及先红后绿验证
- 监管器直接持有 ChildProcess，不能用 Promise.race 包装旧 runRecordedCommand 来冒充已终止子进程。只复用现有 terminateOwnedProcessTree 的精确目标动作，不修改它。
- stdout 上限 64 KiB、stderr 上限 8 KiB，按 UTF-8 字节流计算；超限不继续积累。只保存白名单结果、字节数/hash、固定失败码；不保存任意 stderr。
- identity：5 秒主期限；超时仅回收持有的 whoami 根进程，再等最多 2 秒 close；10 秒终结看门狗。身份阶段异常或关闭未知时，不启动 parity。
- parity 外层：45 秒主期限，为收尾留出预算；超时/超限仅请求一次持有 Node ChildProcess 的树终止，等待最多 7 秒，随后 close 等待最多 5 秒；仍未关闭则只回收持有的根进程，再等 2 秒。独立 60 秒看门狗保证终结记录，取消全部 timer，关闭管道/解除未关闭根的事件循环占用。未知后代退出只记未知，不宣称全树关闭、不追加 PID/进程名清理。
- 内层保持现有 15 秒超时、30 秒看门狗不变。正常外层关闭也必须核验内层 report/commandResult 的 PID、时间、exitCode、closed、资源释放和 collectionComplete，不把外层 exit=0 单独作为完成。
- 先用假时钟/假子进程/内存文件系统运行失败断言，再实现最小代码；至少覆盖：导入无启动、标记/目录复用、hash/身份不符、身份失败禁止采集、精确 argv、一次调用、超限、编译失败、晚到 close、树终止不返回、树终止成功但没有 close、60 秒看门狗、证据写失败、没有真实浏览器/DSH/原生调用。
- mock 测试和 Node --check 的输出只新增在 n3-supervision-001；不运行旧固定输出位置的测试运行器，不新增 root/package 全套重跑；其已归档结果仅在输入 hash 仍匹配时作为前置证据。出现未预期失败先停止，不带失败进入原生阶段。

## N3.3 — 获批后的一次真实采集
本计划获明确 N3 批准后，N3.1/N3.2 全部成功才允许本步骤；本地 mock 通过不自行构成授权。

1. 再核对源码/工具与保护基线、真实 native-once 不存在、监管器无真实 attempt 标记。由当前工具支持的所有者执行上下文启动固定监管器；若沙箱仍返回其他身份，停止而不是自行提权/换身份。必要的平台权限审批必须正常通过。
2. 监管器创建 wx 标记、新隔离环境，执行一次固定 whoami，并与冻结的批准所有者用户名和 SID 完全匹配。然后执行下列固定子命令（Shell=cmd.exe；由监管器 shell=false 调用，不要求用户手工运行）：

~~~bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs" --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\native-once" --offline
~~~

3. 原生探针只按顺序调用：
   - SHGetKnownFolderPath(LocalAppData GUID F1B32785-6FBA-4FCF-9D55-7B8E7F157091, flags=0x4000, hToken=NULL)。
   - SHGetFolderPathW(NULL, CSIDL=0x001c, NULL, flags=0, wchar[260])。
   - SHGetKnownFolderPath(相同 GUID, flags=0, hToken=NULL)。
4. 首项非 S_OK、返回路径不是本次隔离根下 os-home\AppData\Local、链接/元数据门禁失败，后两项必须跳过；不创建目录、不改标志、不再执行第二次探针。编译失败、超时、输出/协议失败、未知关闭也立即停止。
5. 不额外引入 WMI/CIM/ETW 或历史 PID 采样；本轮依据持有的父子 close 与已校验报告限定结论，不宣称所有后代生命周期已证明。

## N3.4 — 验收与收尾
- 重新比对所有保护基线，允许的变化仅上述两个新目录和新隔离临时根；历史越界记录、真实 Profile、API 权威说明、业务源码、工具、HEAD/暂存区不得改变。
- 完整三项返回、缓冲释放及父子关闭均确认时，可以报告 collectionComplete；第 2/3 项 HRESULT 失败允许作为有效对照结果，不伪装为 API 成功。首项安全跳过或运行/保全异常时不形成对照结论。
- DONT_VERIFY 成功而验证式失败只支持独立探针的 H1，不是 Edge 根因证明；三项均成功也不代表浏览器修复。
- 最终报告保存准确调用/flags/HRESULT、身份核验、输入 hash、命令/退出/关闭、前后路径元数据、保全和未验证边界。不修改旧报告、不删除失败证据。
- 不启动浏览器、真实 DSH、业务 API，不读取真实 Profile，不修复或测写 LocalAppData，不改全局策略/权限/依赖，不提交。阶段 B 继续冻结，另行批准并确认 DSH 写入暂停后才讨论复验。

## 本轮只读规划证据
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-n3-plan-2026-09-03\attempt-001\readonly-findings.json
业务权威仍为 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA-256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。
