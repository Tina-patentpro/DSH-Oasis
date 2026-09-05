# P0–P3 执行与原生诊断报告

生成时间：2026-09-03T02:26:29.356Z（UTC）

**状态：STATIC_ONLY**

批准范围内的验证器修复、本地回归、历史证据重放及一次所有者上下文原生采集已执行并归档。此状态保留浏览器/真实 DSH 平台证明缺口，不表示原生采集未运行；也不表示 Edge 启动故障、阶段 B 或产品已经完成。

## 1. 本批变更

- 主验证器：增加 UTF-8 跨分块、完整行解析的限额脱敏日志收集器；明确区分日志 PID 与 OS 创建身份。提取收尾评估函数，输出 unknown/residual 的具体原因，不用日志退出替代完整退出证据。
- worker：仅传递白名单 errorName/elapsedMs 诊断，父侧严格验证；保留启动首错。元数据改为 single-context-run，明确没有 OS 级 Profile/网络监控。
- 独立 Node/PowerShell 探针：固定脚本、隔离环境、15 秒超时、严格 JSON 协议，仅查询自身令牌和四个已知目录；不启动浏览器或 DSH，不提供任意命令参数。
- 三个既有文件修改、两个新诊断文件，其余既有内容保留。原 terminateOwnedProcessTree 和 runRecordedCommand 的函数片段哈希前后一致。
- 通用诊断入口采集 lstat 元数据；本次目录 ACL 由独立只读归档器补充。这不等于为以后每次 CLI 自动提供 ACL 功能。

完整变更/源文件指纹：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\existing-source-changes.patch
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\source-change-manifest.json

## 2. 新鲜验证结果

| 验证 | 结果 | 证明范围 |
|---|---|---|
| 新增聚焦测试 | 18/18，退出 0 | 日志边界、缺证据降级、报告协议、原生 mock/失败路径 |
| 根目录安全回归 | 132/132，退出 0 | 明确排除一个 Windows 原生进程树超时测试 |
| 插件包测试 | 271/271，退出 0 | 本地合同、mock 和本地测试；非真实 DSH Host 验证 |
| Node 语法检查 ×3 | 均退出 0 | 主验证器、worker、原生入口 |
| PowerShell Parser | errors=[]，退出 0 | 仅语法；实际编译由下面唯一一次探针完成 |
| 历史 A 重放 | closure=confirmed，但首错仍为 BROWSER_LAUNCH_FAILED | 不是浏览器通过 |
| 历史 B 重放 | unknown / BROWSER_ROOT_IDENTITY_UNCAPTURED | 不修补缺失创建身份、不操作历史 PID |
| 唯一一次所有者原生采集 | collectionComplete=true，退出 0 | 独立诊断子进程，不是 Edge 线程 |
| 原生收尾归档 | 退出 0；两次匹配进程采样均为空 | 仅所记录 PID/隔离标记的采样范围 |

18 项新增测试包含在根目录回归中，不重复累加为独立的 421 项测试。根回归排除项为 inspection CLI timeout terminates its owned nested process tree on Windows；TAP skipped=0 是过滤后的计数，不代表该项已运行。

红绿证据保留：P1 首次 8 项失败→8 项通过；P2 新入口缺失时失败，首次实现仍有外部路径访问门禁失败，修复后 14 项通过；复核增加的三项防护先失败，最终 18 项通过。失败证据没有被覆盖为绿灯。

最终回归分别在 2026-09-03T02:14:49.770Z、02:14:57.749Z 开始，源码此后到原生采集及收尾保全均未改变。

## 3. 唯一一次原生采集事实

执行身份由 whoami 实测：LAPTOP-THOMASK\TinaD。此为用户所有者上下文，不据此声称管理员权限，也不把身份观测当成授权来源。

原生 PowerShell PID 29784，自身创建时间 2026-09-03T02:20:21.6086579Z，64 位；02:20:21.598Z 开始，02:20:22.532Z 正常退出，未超时、未触发终止。父 Node 也记录正常 close；资源释放标志为 true。

| API 项 | HRESULT | 注入值对照 | 返回路径的采集后元数据 |
|---|---|---|---|
| LocalAppData | 0x00000000 | different | 隔离 os-home 下 AppData\Local：ENOENT |
| RoamingAppData | 0x00000000 | different | 隔离 os-home 下 AppData\Roaming：目录存在；只读 ACL 已归档 |
| Profile | 0x00000000 | different | C:\Users\TinaD；根外，仅记录路径字符串，不遍历 |
| ProgramData | 0x00000000 | different | C:\ProgramData；根外，仅记录路径字符串，不遍历 |

完整隔离根：
C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-native-UJI3rO\tmp\oasis-dsh-p4-native-iPTvct

进程令牌打开成功；TokenType=1、TokenElevationType=3、TokenIntegrityLevel=8192、TokenSessionId=3、TokenIsAppContainer=0。OpenThreadToken 返回 error=1008，没有线程令牌信息数组；与“打开被拒”分开保存。

1008（0x3F0）的系统含义为 ERROR_NO_TOKEN，而非业务 JWT/API Key 错误。四个目录 API 在同一独立探针中成功，因此不能仅凭该数值与历史 Edge 错误相同就确认因果。[Microsoft 系统错误定义](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1000-1299-)

**不能推出：** DONT_VERIFY 返回成功不证明目录存在或可访问；本次采集后 LocalAppData 缺失与 RoamingAppData 存在，也不证明历史 Edge 启动时的目录状态。没有观测是谁创建了 RoamingAppData，没有自动补建目录、修改环境/注册表/ACL或切换令牌。[Microsoft SHGetKnownFolderPath 契约](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath)

收尾两次只读 CIM 采样完成于 02:22:02.4836346Z、02:22:04.7923221Z，匹配行均为 0；没有使用历史 PID 清理，没有按名称终止进程。这不恢复未观察到的完整后代生存期。

## 4. 保全与限制

- 原始清单 3056 个 Git 可见文件中，只有 3 个批准目标改变；其余 3053 个哈希一致。
- 新增源码仅两个批准诊断文件；其他新增仅在本批证据目录。
- API 权威文档、Node/Edge/Playwright 安装文件哈希一致；HEAD 仍为 3c2bd5a469b67ed4070b0b9beacc30212cd038e3，暂存区仍为空。未提交。
- API 权威：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md；SHA-256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。本批不调整九接口、鉴权或收费行为。
- git diff --check 退出 2：仅指出既有、未修改的 client.js 第 2082/2090/2125/2133 行尾随空白。本批五个目标文件独立空白检查均无异常，未顺手修复业务产物。
- 没有执行浏览器、真实 DSH CLI/Host、业务 API；没有启动阶段 B。没有 OS 级 Profile/网络监控，不能声称系统不存在任何间接读取/写入。根外路径没有进行后续目录遍历或内容读取。
- API 采集成功只证明本探针结果完整；浏览器启动根因仍未确认。原生调用返回值、文件元数据和历史浏览器证据必须分开解释。

## 5. 命令与可复核证据

Shell：cmd.exe。完整实际 executable/argv/cwd、生成时间、退出码和对应输入/结果文件在：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\commands.json

核心固定入口：

~~~bat
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\regression-runner.mjs" root-safe
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\regression-runner.mjs" package
"C:\Program Files\nodejs\node.exe" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-phase4-windows.mjs" --evidence "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\native-probe" --offline
~~~

原生命令已执行一次，以上为归档，不是重跑指令。其外层监管器限定一次尝试、核验源码/工具哈希及所有者身份。后续归档器仅查询新根内 ACL 与进程退出采样，不再次调用原生探针。

总证据账本：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\evidence-ledger.json

原生结果：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\native-probe\native-result.json

最终保全：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\post-native-preservation.json

## 6. 停止点

停在归档，不自动进入新的 Edge 条件、身份切换、目录布局实验或阶段 B。后续浏览器实验须另立单变量验证计划并获得批准；阶段 B 还需要当次真实 DSH 写入暂停的重新确认。
