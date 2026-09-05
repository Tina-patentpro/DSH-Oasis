# 所有者上下文浏览器独立预检执行报告

日期：2026-09-03（Asia/Shanghai）
状态：**FAIL**

## 批准范围与实际执行

本轮批准只覆盖浏览器独立预检及监管、清理切换到所有者上下文。实际身份为 LAPTOP-THOMASK\TinaD（执行证据记录 SID）。没有启动 DSH CLI/Host、阶段 B/R4、业务请求或模型调用；没有修改产品/验证器源码、依赖、全局配置，没有提交。只新增本轮证据和一次性辅助脚本，使用新的隔离临时根。

执行 Shell：cmd.exe；工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

记录器执行的实际命令：

~~~bat
node scripts/verify-oasis-api-phase4.mjs --stage browser-preflight --evidence docs/evidence/oasis-api-phase4-browser-remediation-2026-09-03/attempt-001/browser-preflight-owner --offline
~~~

固定 Node 为 C:\Program Files\nodejs\node.exe，v22.19.0。Edge 为 152.0.4191.62；Node、Edge、Playwright coreBundle 哈希在执行前后相同。外层命令退出 1，47.161 秒，首错 BROWSER_LAUNCH_FAILED。源码哈希与上一批冻结值一致。

## 两个条件的结果

| 条件 | 浏览器情况 | 退出/证据 | 判定 |
|---|---|---|---|
| A / persistent | Edge 根 PID 27708，启动请求约 30 秒后失败；context 未连接、页面未就绪 | worker 39440 经精确持有进程树终止；记录创建时间、已观察后代、两次空收尾枚举；closed=true | 启动失败，不是预检通过 |
| B / ephemeral | 日志记录 Edge 根 PID 39672，约 0.95 秒内失败；context 未连接 | Edge 在 CIM 首次捕捉之前退出，日志记录根退出 0；worker 32648 清理完成，但浏览器创建身份未捕捉，closed=false | 保留证据不足，不追认为全树已关闭 |

两种方式均重复出现 0x3F0、非默认 user-data-dir 警告；A 另有 Unable to get local app data path。实际启动命令均包含新的隔离 user-data-dir，因此不能将“补参数”当作修复。日志未截断。没有截图，没有候选方式，没有两次冷启动复验。

所有者上下文消除了本次 CIM 观测权限阻塞，但没有解决浏览器启动。此前普通上下文是在 worker 启动之前停止，故本次不是普通身份与所有者身份之间完整的单变量浏览器因果对照，不能据此确认或排除具体令牌机制。

原始 preflight-result.json 的 identityComparison:not-authorized 为当前实现硬编码遗留字段，与本轮授权范围不一致。本轮实际授权/执行身份以 target-contract.json、execution-context.json 和命令记录为准；未覆盖原始结果或为美化结果修改代码。该字段应在后续验证器修复中改为真实范围描述。

## 独立收尾复核

check-owner-closure.mjs：退出 0。所有者只读 CIM 两次采样（间隔至少 2 秒）中，本轮已记录 PID/隔离命令标记匹配数均为 0；端口 5553、3699 均拒绝连接。没有额外终止进程、没有按名称扫杀、没有删除临时目录。

此证据支持“复核时未发现已记录对象或标记残留”，不能重建 B 未观察到的短命后代，也不能覆盖其原始 closed=false。范围是观察到的进程树及唯一目录标记，不是 OS Job 全树保证。

## 计划内只读失败诊断

read-owner-folder-diagnostic.mjs：退出 0。在 A/B 同一隔离环境下查询 .NET 已知目录字符串、隔离根 ACL、Edge 文件版本，未读取真实浏览器 Profile 内容。

- A/B 隔离根所有者均为 TinaD。
- .NET ApplicationData / LocalApplicationData 返回各自隔离 os-home 路径；UserProfile 返回 C:\Users\TinaD，CommonApplicationData 返回 C:\ProgramData。
- 这证明环境字符串隔离不等于所有 Windows 已知目录 API 的 OS 级隔离；同时不能从单独 PowerShell/.NET 查询推断 Edge 内部相同调用已成功，或认定目录 ACL 是唯一根因。
- 未恢复真实 APPDATA/HOME，没有增加绕过参数、修改注册表、放宽网络或再启动浏览器。

## 保全与证明边界

preservation.json：3,024 个本轮开始前 Git 可见文件内容全部不变；API 权威文档、HEAD、暂存区及三个工具文件哈希不变；许可新证据目录外没有新 Git 可见路径。既有未提交变更完整保留。三个一次性 helper 语法检查均退出 0。

本轮没有重新运行业务/根回归；上批回归结果不冒充本轮结果。没有为真实 DSH/浏览器 Profile 建立强快照，因而不宣称它们或整个系统完全没有后台写入。dead proxy 与页面路由不等于 OS 网络隔离；页面从未连接，页面监听没有覆盖启动期网络。结果中的 realProfileAccessed=false 仅表示验证器没有显式读取真实 DSH Profile，不是整个浏览器无系统路径访问的证明。

## 后续门禁

本轮到此停止。preflightComplete=false、stageComplete=false、phase4Complete=false。R0–R3 尚未整体关闭；正式 DSH RPC/WebSocket 白名单、Client 实际 peer 来源/版本与阶段 B 双模式证据仍待完成。

下一轮应先制定有界修复/诊断方案：补足短生命周期进程身份与缺证据原因、修正授权范围字段；再基于实际证据设计 Windows 已知目录/令牌边界诊断。不能直接重复相同 A/B、扩展真实目录权限、替换浏览器或放开 POST/WS。任何新的浏览器实验及阶段 B 继续执行都应单独明确范围。
