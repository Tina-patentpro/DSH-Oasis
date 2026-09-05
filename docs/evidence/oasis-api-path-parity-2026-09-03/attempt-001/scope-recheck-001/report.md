# 回归运行器范围修正与受限复验

状态：**STATIC_ONLY**。用户批准的运行器修正及本地受限复验已完成；N3 仍未授权、未执行。

## 本轮结论
- 仅修改获批文件：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\regression-runner.mjs
- 红灯检查确认旧过滤器没有排除历史证据写失败用例；修正后的实际运行器在 VM 中通过 8/8 检查。
- 根回归 156/156，通过的集合包含全部 25 项 parity 测试；包回归 271/271。两次实际 Node 测试子进程 exitCode=0、closed=true、timedOut=false。
- 本轮历史证据没有新增或改写；上轮越界产生的文件及目录、事件记录和原始报告均保留。没有删除事实或把上轮失败改写成成功。

## 精确修改
1. root-safe 仅排除两个完整测试名称，使用锚定正则；package 不增加排除项：
   - inspection CLI timeout terminates its owned nested process tree on Windows
   - native diagnostic evidence write failure cannot return collection success
2. 固定输入清单绑定 SHA-256；在创建隔离上下文、申请输出目录、启动子进程前，比较本次显式测试集合及 58 项输入文件。集合/内容/清单漂移或非法参数直接拒绝，不自动更新期望指纹。
3. 运行器输出转到本次排他的 scope-recheck-001 下；每次运行记录排除理由、旧测试 hash、输入校验结果、实际 argv/cwd 和退出结果。结果只有严格布尔 closed=true 才能接受。
4. 未修改历史诊断测试或三个 parity 源码；这是本次受限运行器的范围修正，不是对历史测试写入行为的全局修复。

运行器前 SHA-256：0A0299809BC210B725856E08D050670CDBDAEC035EF8FAF4E6EC638E9D667670
运行器后 SHA-256：E9EF09D37303B9F63127595767268C04FB04283DCEE9B8639B9FA63659FDD959
固定清单 SHA-256：BD04B07013B5D8557C4AA519BD7B930B6F81A1A28311ED265E0820C85392E119
原始及修正后的运行器快照保存在本目录 runner-before.mjs / runner-after.mjs。

## 验证记录
| 项目 | 新鲜结果 | 退出码 |
|---|---|---:|
| VM 运行器检查 red-filter | 8 项中 1 通过、7 失败；首项准确命中旧用例未排除 | 1 |
| VM 运行器检查 green | 8/8 通过；含精确过滤、输出位置、输入漂移与失败状态处理 | 0 |
| Node --check 运行器 | 无语法错误 | 0 |
| root-safe | 156/156；parity 子集 25/25 | 0 |
| package | 271/271 | 0 |

VM 检查执行的是实际运行器源码，文件系统与 recorded-command 边界使用固定替身，不启动被测回归子进程；Node 对 VM Modules 发出 ExperimentalWarning，已记录，不安装依赖或修改配置。真正的 root-safe/package 复验随后分别执行，完整输出保存在各自新子目录 result.json。TAP skipped=0 不代表没有过滤：上面两个用例由名称模式排除，不能声称全量根测试通过。新的 parity 写失败用例没有被过滤，但不代替被排除旧用例的运行证明。

Shell：cmd.exe。完整固定 Node executable、argv、cwd、时间和退出码见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\scope-recheck-001\commands.json。主要调用为本运行器的 root-safe、package，以及 runner-check.mjs 的 red-filter/green 和 --check。所有输入 hash 在结束后重新比对，58/58 未变。

## 输出目的地与保全
只读审查已覆盖显式枚举的 48 个测试文件。历史证据写失败用例被精确过滤；历史目录复用拒绝用例在写入前失败；当前 parity 测试只新增 PID/序号命名的独立 fixture 子目录；其余文件操作限定在隔离 TEMP 的临时 fixture。根回归包含 Node、假 CLI、tar/cmd 和 loopback fixture 行为，不是实际 DSH、浏览器或业务服务运行。

- 冻结的 3161 个既有 Git 可见文件中，仅批准的运行器发生变化，其余 3160 个不变；原有 3118 文件亦未变。
- 对执行前 3424 个证据树条目做不跟随链接的前后核对，除允许的运行器字节变更外无变动；新条目全部属于本次复验目录或当前批次新 fixture 目录，历史证据根无新增。
- 九项原有源码/API/工具指纹、三个 parity 源码、HEAD、空暂存区均未变化。没有 stage、commit、reset，也没有真实 Profile 操作。
- 权威业务 API 文档 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md 保持 SHA-256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1；本轮没有修改业务接口契约。
- git diff --check 仍退出 2，原因是既有 client.js 第 2082、2090、2125、2133 行行尾空白；对应文件未变。Git 全局 ignore 文件仍无读取权限，保全结论不扩大到全部文件系统。

详细保全：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\scope-recheck-001\preservation.json
范围事件原记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\scope-incident.json

## 未验证与下一步
- 本轮未执行 PowerShell 探针、Add-Type、PInvoke 原生 API、Edge、真实 DSH CLI/Host 或业务 API；未读真实 DSH Profile。
- C# 编译、真实路径 API 返回值、原生资源释放与关闭证据仍缺失；H1 和 Edge 根因仍未验证。
- 当前两项根回归排除是明确覆盖缺口；没有 OS 级文件/网络监控，不推断系统不存在间接访问。
- 本轮停在 N3 独立授权点。若另行批准 N3，必须先重新核对当前输入、身份与新采集目录，且批准不包含浏览器或阶段 B。现在不启动任何原生采集。
