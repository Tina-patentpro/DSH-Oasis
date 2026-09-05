# 阶段 B 执行审计（停止于环境保护门禁）

- 生成时间：2026-09-02T12:21:31.441Z
- 汇总状态：FAIL
- stageComplete: false；phase4Complete: false。
- 用户批准的是阶段 B；本轮已实现探测代码并运行本地合成测试，未取得真实 DSH Host / Client / 浏览器 Slot 契约。不能进入 C 或完整 integration。

## 目标与变更边界

业务合同继续唯一依据 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。未扩展九端点、调用业务 API 或处理真实凭据/材料。

批准的既有改动仅验证器 scripts/verify-oasis-api-phase4.mjs、合同测试 tests/scripts/oasis-api-phase4-contract.test.mjs；新增源文件仅 tests/fixtures/oasis-api-phase4-slot-probe 下 package.json、cordis.patch.yml、src/index.js。路径均相对于本项目根 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。本报告与证据仅新增于 attempt-004，不覆盖旧 attempt。

实现：显式 inspect 调度、按物理位置保留多版本依赖的副本校验、按次序离线安装命令、独立 Profile/Host 生命周期、全树及六个精确 Slot 查询、只读 loopback 探针、浏览器探测与资源退出记录。默认与 integration 仍拒绝。没有修改业务插件源码/生成文件、锁文件或权威文档。

## 首要发现与处置

[P1] Windows 原生命令运行环境不完整，保护后检发现 4 个缓存文件意外新增于工作区字面量 %SystemDrive%/ProgramData/Microsoft/Windows/Caches。环境投影显示 SystemDrive、ProgramData、ALLUSERSPROFILE 缺失；现有 isolatedEnvironment 也未保留这些变量。缓存出生时间在本轮原生命令测试/诊断期间。环境展开错误是有证据支持的推断，但没有独立复现实验确定究竟由 CIM 还是 taskkill 等具体调用创建，不能宣称精确归因。

四文件完整路径、时间、大小、SHA256 与链接属性保存在 unexpected-native-cache.json；停止后再次哈希见 final-preservation-summary.json。文件保留，未删除或移动。由于新增范围越界，本轮保护门禁失败，即使测试通过也不能接受阶段 B。

已在 inspect 最前端加入 assertInspectionNativeEnvironment：缺少完整可信 Windows 基础环境则立即拒绝。当前隔离环境会被此门禁拦截；这只是止损，不是环境修复。后续实际运行必须先修复/验证环境，而非删除门禁或改为警告。

## 验证证据与新鲜度

| 范围 | 结果 | 证据与边界 |
| --- | --- | --- |
| 根脚本测试 | 92/92，退出 0 | root-tests-post-review.txt；包含 56 项 phase4 合同测试；最后环境门禁补丁之前运行 |
| 业务包测试 | 271/271，退出 0 | package-tests-post-review.txt；本地/进程内证据，不是平台集成 |
| 最后环境门禁定向测试 | 1/1，退出 0 | 工具输出 chunk 04b8f6；此前 RED chunk ae364e；完整根回归未在最后补丁后重跑 |
| inspect 实际入口止损检查 | 退出 1，INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE | blocked-inspect-preflight.txt；attempt-005 不存在；未进入 Profile、DSH CLI、Host 或浏览器 |
| 源码空白检查 | 5 个源文件均无行尾空白 | final-source-review.json，包含最后补丁哈希 |
| 原文件保护 | 2804 个冻结文件：仅批准的 2 个变化，其他 2802 个不变，读取错误 0 | final-preservation-summary.json；权威 API 哈希不变 |
| HEAD/暂存区 | 与本轮基线不变 | preservation-after-failed.json；停止整理阶段未重新运行 Git |
| 新增保护 | 失败，4 个非白名单缓存文件 | preservation-after-failed.json；最终仅重新哈希已发现四项，未将其冒充一次新的全盘列举 |

测试范围的复验命令：cmd 中在项目根运行 node --test tests/scripts/*.test.mjs；在 packages/oasis-professional-service 运行 node --test test/*.test.mjs。这里的 TAP 文件保留了结果，但没有完整的 executable/argv/cwd 调用封套；不得将这些合成测试日志当成已完成的正式 inspect 命令台账。最后定向命令为 node --test --test-name-pattern=inspection.native.environment tests/scripts/oasis-api-phase4-contract.test.mjs。

实际被拦截命令（项目根，cmd）：

    node scripts/verify-oasis-api-phase4.mjs --stage inspect --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-005 --modes standalone,better-sidebar --offline

红绿记录保留在 red-inspect-contract.txt、green-inspect-contract-2.txt、red-inspect-lifecycle.txt、green-inspect-lifecycle.txt、red-inspect-cli-tree.txt 等；早期失败不覆盖。一次受限权限的进程树清理测试挂起并导致 Node REPL 重置，没有保存成功日志；不得补造。随后经狭窄提权运行的自有进程树测试退出 0，并验证持有的父/叶 PID 均结束；一次提权只读 CIM 未返回匹配的遗留测试 Node 进程。未按进程名称杀进程，未绕过 PowerShell 执行策略。一个错误引用的名称筛选命令未匹配目标测试，不计入有效测试证据。

## 静态合同与未验证内容

- 本机官方 DSH 0.1.1-rc.2 源码只读检查：29503 文件、3148 目录、0 链接；没有运行其 CLI。Better Sidebar 0.15.2 选中 165 个物理依赖包，7 个包名存在多版本，因此不采用全局版本覆盖。见 dependency-preflight.json。
- 公共 Slot、Settings、Credentials 类型/源码见 public-contract-static.json（live:false）。settingsScope 是逐字段 set；未发现可据以声称多字段原子保存的 setMany。凭据 set 响应与通知需按公开协议分别处理；不得以旧 configured 状态替代本次成功证明。
- 两模式实际安装、Host/Client 加载、浏览器选择器、Slot 占用/参数、实际依赖解析、实际资源收尾全部尚未验证。当前代码不是已验收的集成实现。
- 本轮没有真实 Profile 的完整三次快照，因此不能声称已经取得本轮真实 Profile 全量不变证明。没有主动写入真实 Profile；只读依赖元数据/源码不等于全量保护证明。
- 开始时已要求重新确认真实 DSH 写入仍暂停，尚未获得回复。上一阶段曾允许恢复，不能沿用旧暂停授权。

## 定界修复建议（尚未执行）

1. 先只读核验可信 Windows 安装位置、原生环境来源和当前环境过滤逻辑；明确父进程与所有子进程的 SystemDrive、SystemRoot、WINDIR、ProgramData、ALLUSERSPROFILE、TEMP/TMP。不得猜值、临时把 SystemDrive 指向工作区，或更改用户/机器永久环境。
2. 对 PowerShell/taskkill 等原生辅助进程使用全新 ASCII 隔离临时 cwd 与显式完整环境；保存执行前后该隔离根和工作区的边界证据。仅修复本阶段验证器/合同测试，不扩展业务文件或真实 Profile。
3. 先做缺失环境、未知/含百分号变量、启动/清理失败的纯逻辑 RED/GREEN；完成环境核验后，才在受控新根运行有界原生进程树测试与全量回归，确认工作区不再生成字面量 %SystemDrive% 目录。
4. 清理这四个本轮新增缓存文件需另获用户批准。清理前重新解析绝对字面量路径并证明位于工作区内、各级目录无链接、枚举仅预期四项且哈希一致；任何差异停止。仅删除逐项核准文件及其已空的本轮目录，不递归删除未知内容，不使用百分号环境展开，不删除失败证据。
5. 环境修复复审通过后，重新确认 DSH 写入暂停，执行真实 Profile 静止/强保护门禁，再在全新 attempt-005 和独立临时根进行两模式正式探测。任何合同缺失、越界、Profile 漂移或收尾失败立即停止。B 合同验收之前不进入 C。

## 当前停止条件

暂停原生命令测试和一切实际 DSH 启动，保留所有现场。后续需要批准上述环境定界修复，以及单独确认四文件的受控清理范围。本轮未提交、推送、发布、安装联网依赖或调用真实 API。
