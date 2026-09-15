# DSH S3B / S4 离线候选记录

## 范围

已批准 V2 的同范围延续。只改变新隔离候选的源码/构建目录，未安装到运行中的开发 Profile，未修改日常 DSH、旧副本或主仓业务源码。单代理自审，不是独立审计。没有真实模型、API、上传或费用调用。

候选根：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913

## 实施与证据

1. 隔离业务包的 DSH peer/dev 依赖固定为 0.1.5-rc.1。禁用自动 peer 安装及安装脚本，pnpm 11.25.0 由私有 Node 24.19.0 执行，缓存/临时目录/Home 独立。新 Host 包实际运行导入需要 dsh-scope、dsh-storage，已固定为同版开发依赖。移除探索时新增、最终未使用的 sidebar-right 直接依赖，不额外构造宿主适配框架。
2. Connection 改为公开 exact Fetch 注册：25 条 /api/oasis-workbench/ 下 POST 路由，保留请求关联、既有业务校验/响应合同、注销和不自动重试。未占用全局 interceptor。真实目标 Cordis + HostConnectionService 的无监听器测试确认调用方不需 webServer 注入；HTTP Host/Origin/browser-auth 实际运行验收仍待后续。
3. Better Sidebar 0.19.1 原有公开 registerTab 已经把外部描述符投影到 DSH 的 sidebarRightTabs 和 keyed sidebar.right.pane.tab。复用该投影，不增加另一套注册 owner。旧入口的占位 path 会在新版被当作文件资源；移除该 path，只传 kind 和明确 sessionId。使用未改动的目标 Sidebar service 源码构建测试，确认进入 native openTab 而非 openResource。
4. 合成环境许可只绑定新候选的精确 Home；旧 stage2 相对路径不再误指向源快照的不存在目录。开关仍默认关闭，拒绝日常 Home。候选包不是便携/正式发行。
5. 更新受影响测试的运输层夹具：通过实际 Request/Response 与本次路由进入原业务 handler；没有删除业务断言来取得绿色结果。

## 新鲜验证

命令执行器：cmd.exe；测试/构建进程由候选 run-source-check.py 使用私有 Node 和隔离环境启动。

- Connection/Host/入口定向测试：19 项通过，退出 0。
- 受影响业务连续性、Host 及版本合同回归：36 项通过，退出 0。
- 实际目标 Connection 注册测试：1 项通过，退出 0。
- 实际目标 Better Sidebar 页面路由测试：1 项通过，退出 0。
- 包级全量测试：428 项，426 通过、0 失败、2 跳过，退出 0。两项跳过是旧相对 Home 下的 native-offline 条件测试；不把它们作为新安装包或真实模型证据。
- 客户端 tsdown 构建退出 0；npm pack --dry-run --json --ignore-scripts 退出 0；实际离线 pack 退出 0，93 个文件。按三个等价步骤验证，没有声称执行了字面上的 npm run verify。
- 测试早期发现旧路由夹具/版本断言、旧合成 Home 和缺失开发 peer，失败日志保留，修正后重跑相关套件。

主要原始记录（候选 evidence 下）：

- s3-check-1789370240967993200.json：19 项定向。
- s3-check-1789370656577185000.json：36 项回归。
- s3-check-1789370737768944600.json：真实目标 Connection。
- s3-check-1789370476636589800.json：实际 Sidebar service。
- s3-check-1789370805284335500.json：全量 428 项。
- s3-check-1789370282953355800.json：客户端构建。
- s3-check-1789370892497927400.json：pack dry-run。
- s3-check-1789370983809603800.json：实际 pack。
- s3b-artifact-verification.json：归档逐文件对比、主业务源/保护指纹及包哈希。

## 尚未完成，禁止扩大结论

- 当前是离线候选证据，不是 Desktop 业务界面验收、S3 整体完成或 S5 发行完成。
- 新宿主原生 Markdown 尚无已验证的 resourcePolicyVersion=1，Better 0.19.1 尚无 safeFilePreview；不直接套用 0.1.2/0.18 补丁。依据批准方案保留纯文本预览，绿洲“打开已保存文件”动作保持禁用。审核、无覆盖保存和对话草稿的离线合同仍在；完整富文本/原生安全文件打开仍是待恢复能力。
- 不把正常 Sidebar 文件编辑等同于绿洲受控安全预览；不伪造 capability。
- 安装前必须由用户正常退出开发副本，并确认实例消失，再备份其 Profile/元数据、装入本地包、刷新对应安装与启动 pin，重新核对迁移判定及保护基线后启动。日常实例不退出、不升级。
- 随后才做真实候选的合成界面、会话/项目隔离、附件阻断、保存/重启等验收；真实调用许可不续期。
