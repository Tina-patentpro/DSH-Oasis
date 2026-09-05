# 路径 API 契约对照 N0–N2 执行报告

状态：**FAIL**（新增输出范围门禁未通过；证据仅限本地实现/静态与 mock/fixture 测试）。

## 结果摘要
- N0 已冻结，N1 三个新增文件已实现；N2 的测试与语法检查已执行，但不能验收为完成。N3 未授权、未执行。
- 所有者原生调用、C# Add-Type 编译、浏览器、DSH Host、业务 API 均未运行。PowerShell 仅执行 Parser.ParseFile。旧/新诊断测试的进程执行依赖为替身。根回归中的本地 fixture 行为不代表业务服务或生产运行。
- 本轮发现回归测试输出越界，已停止后续执行，仅只读调查并新增本报告和事件证据；不删除越界文件、不修改旧测试、不重跑探针。

## 已交付的三个新增文件
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\diagnose-oasis-api-path-parity.mjs
  SHA-256 50FE80AEFA9158B44B5C32079F026DEB37A545130BBC69F06D20A46D11A12ED5
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-path-parity-probe.ps1
  SHA-256 5D7695250C70E08EB5DFF8FBE1E35E9AF12B367BD8024A0F7C98A15C70AAEF39
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-path-parity.test.mjs
  SHA-256 EA83B6447C249F5D33015B4B19318273B3DD8D8C39B89AF00FE22EFC21CB9EC5

入口提供四个固定导出、严格三调用协议、PID/时间/类型校验、有限输出、一次受管收尾及排他证据目录。固定探针加入首项路径门禁与指针 finally 释放；控制字符/非法参数、HRESULT 强制转换、非布尔关闭证据、缺失隔离根均拒绝。前后元数据只针对预计的隔离路径，缺失 Local 不补建。

## 新鲜验证
| 证据 | 结果 | 退出码 |
|---|---:|---:|
| contract-red | 14 项：0 通过 / 14 失败，入口缺失 | 1 |
| executor-red | 20 项：0 通过 / 20 失败，入口缺失 | 1 |
| first-green | 20/20 通过 | 0 |
| review-red | 25 项：23 通过 / 2 失败，类型与根目录门禁 | 1 |
| review-green | 25/25 通过 | 0 |
| 根回归 root-safe | 157/157 通过，但发生下述输出越界 | 0 |
| 包回归 package | 271/271 通过 | 0 |
| Node --check（入口与测试） | 两次语法检查通过 | 均 0 |
| PowerShell Parser.ParseFile | errorCount=0 | 0 |

根回归明确排除了 inspection CLI timeout terminates its owned nested process tree on Windows；TAP 的 skipped=0 不意味着未排除。当前结果不是全量 Windows 生命周期证明。58 项最终测试/语法输入指纹重新核对无漂移。三个新增文件无行尾空白且以换行结尾。

执行 Shell=cmd.exe。完整 executable/argv/cwd、时间、退出码与输入证据路径见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\commands.json。主要调用为固定 Node 对本轮 focused-runner、regression-runner（root-safe/package）及 syntax-runner 的调用；语法子命令只含 --check 或 Parser.ParseFile，没有 -File 探针执行。

## 范围偏差（本轮验收阻断）
我在执行根回归前未识别旧测试的硬编码历史输出目录，导致以下旧用例生成越界新文件：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs，第 212–218 行，native diagnostic evidence write failure cannot return collection success。

新增路径：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\save-failure-1788405155446（directory）
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\save-failure-1788405155446\context.json（file）
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-browser-diagnostics-2026-09-03\attempt-001\save-failure-1788405155446\native-result.json（directory）

context.json 于 2026-09-03T03:12:35.459Z 创建，位于本轮根回归 2026-09-03T03:12:34.990Z 至 2026-09-03T03:12:41.896Z 的时间窗口内，路径与源码的 Date.now() 命名匹配。文件 SHA-256：0D02EFA00ADB51AB8F1061E9898D5C223296F1D4CDF5948F900636807D1BBD60。该用例传入 fake execute，不能把该 context.json 当成原生 API 执行证明。

范围偏差是本轮新增问题，不能由测试 exit=0 掩盖，也不能删除记录后宣称未发生。现已保留以上一个文件、两个目录；完整事件见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\scope-incident.json。

## 保全与既有问题
- 原先冻结的 3118 个 Git 可见文件内容/链接文本全部未变；九项源码/API/工具指纹未变，HEAD 与空暂存区未变。没有提交、暂存或修改旧源码。
- API 权威文档 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md 未改动；业务九接口、鉴权与收费边界没有变更。
- Git 全局 ignore 文件读取受限，清单只覆盖 Git 可见范围，不称为全文件系统审计。
- git diff --check 退出 2：既有 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js 第 2082、2090、2125、2133 行行尾空白；该文件 hash 未变，未进行无关修复。

## 证据边界与下一步
C# 仅作为固定源码被 PowerShell 解析器识别为字符串，尚未编译；PInvoke 绑定、三项真实 HRESULT、资源释放/原生关闭尚无本轮运行证明。Mock 的 collectionComplete=true 不支持 H1 或 Edge 根因结论，也不解锁浏览器预检、阶段 B 或 phase4。未进行 OS 文件/网络监控，不声称系统不存在间接访问。

下一步建议仅修正本轮新增回归运行器的过滤与输出范围并受限复验，保持旧测试和越界事实不变；完整待批准方案见：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\follow-up-plan.md

当前不得进入 N3。修正与复验后，原生采集仍需另行明确批准。
