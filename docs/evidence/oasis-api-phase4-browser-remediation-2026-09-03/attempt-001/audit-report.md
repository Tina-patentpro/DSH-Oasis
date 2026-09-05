# R0–R3 执行报告（尚未全部完成）

日期：2026-09-03（Asia/Shanghai）

状态：**BLOCKED_WAITING_FOR_USER**

## 范围与本地结果

本次按批准范围开展验证器修复及独立预检；没有启动 DSH CLI/Host、真实 Edge、阶段 B 或条件 C，没有提交，没有修改真实 Profile、业务源码/产物/依赖或全局配置。

- R0：冻结 2,936 个既有 Git 可见文件，核对 HEAD、暂存区、API 权威文档和工具版本。
- R1：新增独立浏览器 worker，主验证器不再直接导入 Playwright；显式隔离环境/cwd、状态机、首错/清理错/证据错分层、受控超时、PID/创建时间与退出门禁已实现。新增 16 项定向测试进入最终根回归。
- R2：实际独立预检在进程观测前置条件失败，未启动 worker/Edge；没有进行 B 条件或两次冷启动复验。
- R3：已接线“新鲜预检先于 runtime 复制/DSH 启动”、观察者环境分离、peer 清单和完成门禁，并运行回归；正式 Client 通信放行及真实浏览器证明仍不完整。

修改的既有文件仅为：

- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs`

新增源码仅为：

- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\oasis-api-phase4-browser-worker.mjs`

其余新增为本证据目录中的报告、失败/成功运行记录及一次性验证 helper。临时目录保留，不执行批量清理。

## 独立预检的真实结果

执行命令（cmd.exe）：

```bat
node scripts/verify-oasis-api-phase4.mjs --stage browser-preflight --evidence docs/evidence/oasis-api-phase4-browser-remediation-2026-09-03/attempt-001/browser-preflight --offline
```

命令在 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研` 执行，退出码 1，错误 `BROWSER_PROCESS_CENSUS_UNAVAILABLE`。当前 sandbox 身份为 CodexSandboxOffline；先前只读 CIM 查询明确返回 `0x80041003` 权限错误。

本次 `workerSpawned=false`、`launchRequested=false`、`contextConnected=false`。`closed=true` 的依据是确定未创建 worker，不是“缺少 browser 对象就假定关闭”。本地静态页监听的 14740 端口已关闭。真实 Profile 未被预检访问；没有声称真实 Profile 当前没有其他写入。

此预检结果发生在最终门禁/收尾接线修改之前；没有将其冒充最终源码的真实浏览器通过证据。由于同一身份仍不能取得进程归属证据，没有重复启动，也没有自动转到所有者浏览器上下文。

## 回归证据

一次性入口：

`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\regression-runner.mjs`

| 参数 / 记录前缀 | 结果 | 证明边界 |
|---|---|---|
| `focused r1-red` | 预期新增缺陷红灯；另有既有原生终止测试权限失败 | 保留失败，不当作实现回归绿灯 |
| `focused-safe r1-driver-red` / `r1-driver-green` | 先 2 失败，再 14/14 | 配置错配与 observer 缺失红绿闭环 |
| `focused-safe r3-gate-red` / `r3-gate-green` | 先 1 失败，再 16/16 | 新鲜预检接线门禁红绿闭环 |
| `root-safe root-accepted-scope` | 114/114，退出 0 | 普通权限；显式排除单项原生树终止测试 |
| `native r1-native-owner` | 1/1，退出 0 | 单独批准的所有者上下文；只启动/终止合成 Node 父子进程 |
| `package package-regression` | 271/271，退出 0 | 业务包本地回归，无业务 API 外联 |
| `syntax syntax-accepted-scope` | 两源码检查退出 0 | 语法层 |

上述 114 项与单独 1 项不是“同一权限上下文全部通过”。原生终止函数在最终代码中的正文与该单项执行时一致，但不能从合成 Node 树证明 Edge 全树生命周期。

第一次根回归 helper 使用了临时 cwd，31 个旧测试依赖项目 cwd 因此失败，另 1 个是原生权限问题。修正的是本次一次性 helper，不改旧测试去迎合错误环境。最初用否定 name-pattern 排除原生测试没有生效，后改为本机 Node `--help` 已确认的 `--test-skip-pattern`；历史 TAP 为准，不能把早期 excluded-test 意图文件当作实际排除证明。所有失败输出均保留。

## 进程收尾

- 最初红灯后，单独批准的所有者只读查询未发现对应临时根的 Node 残留。
- 后续记录的合成 PID 中 5 个检查为不存在；19368 的普通检查返回 EPERM，因此没有按 PID 直接清理。
- 所有者只读查询证明 19368 已被较晚启动的 `MpCmdRun.exe` 复用，父 PID 2848，创建时间 `2026-09-02T23:47:25.0485000Z`，不含本次测试标记。没有终止该无关进程。
- 原生所有者单项中的父/子 PID 35844/40344 已由测试及后续检查证明退出。

## 保全与差异检查

- 2,934 个非目标既有文件哈希不变；只有上述两个批准文件变化。
- HEAD、暂存区、API 权威文档哈希不变；未发现许可目录外新增 Git 可见路径。
- 工作区字面 `%SystemDrive%` 路径不存在。
- 三个目标源码无尾随空白。
- `git diff --check` 退出 2，原因是本次之前已有的业务 `lib/client.js` 第 2082、2090、2125、2133 行空白；该文件与本次开始基线完全相同，没有顺手格式化。
- 没有重新做真实 Profile 强快照，因此不引用昨天的 Profile 保全结果充当今天证明。

## 未完成及风险

1. **权限前置条件：** sandbox 不能使用当前 CIM 观察器，故无法安全启动真实浏览器。需要另外批准具备观测/终止权限的独立预检执行上下文，或先设计不依赖该权限的观察器；不能偷偷放宽门禁。
2. **真实运行证明：** worker 的真实 IPC、Edge 启动、异常关闭、后代进程退出、A/B 条件和候选两次冷启动均没有完成。
3. **正式 DSH 传输门禁：** 已读本机公开源码，确认只读 unary 也走 POST，事件走下行 WebSocket。目前新 guard 对静态预检采用保守的 POST/WS 拒绝策略；尚不能用它宣称正式 DSH UI 可用。R4 前必须补齐来源明确的只读 RPC、下行事件及 Slot 查询应答白名单与测试，不能简单放行所有 POST/WS。
4. **Client peer：** 对保留 attempt-006 的只读清单再次验证了 React 18.3.1 / React DOM 19.2.8 与精确声明 18.2.0 的物理差异。Host 必需 peer 就绪，但 Client 实际装载版本未知，`compatibilityComplete=false`。未改依赖声明或 overrides。
5. **网络证明：** dead proxy/页面路由不是 OS 网络沙箱；没有系统级零外联证明。

R0–R3 尚未整体完成，`stageComplete=false`、`phase4Complete=false`。阶段 B 继续保留独立人工批准门禁，不进入阶段 C。
