# 新开发副本 Profile 初始化修复

本记录补充 S0–S2 证据。当前 S0–S2 限定隔离验收状态：PASS_WITH_CONCERNS（2026-09-14 14:38 收口，见末节）；下方等待用户及失败描述保留为当时状态。此结论不代表专业插件升级或发行验收完成。

## 根因与更正

准备脚本排除了 node_modules 所有点号元数据，也没有预置 pnpm-workspace.yaml。固定 Desktop 2.0.9 的 profileDependencyMigrationRequired 要求有效的 hoisted/pnpm>=10/Windows store-length 元数据、禁用自动 peers 的锁文件以及无需调整的 workspace。缺失元数据导致自动迁移并失败。此前仅记录“初始化未完成”不准确；用户截图和日志确认是恢复模式。迁移子进程退出的底层原因仍未证实，不归因网络。

## 修复范围

- 用户确认退出后，核对开发进程为零；日常 PID33784 保持运行。
- 逐文件复核新旧依赖与原 candidate-pin；复核锁文件一致及元数据中的实际安装位置存在。
- 迁移原安装的 .modules.yaml、相对 .package-map.json、workspace state、虚拟存储锁和 .bin。只将旧副本绝对路径改为新副本路径；不重新解析依赖、不执行安装脚本、不改上游程序、不伪造兼容字段。
- pendingBuilds 中 node-pty@1.1.0 原样保留，终端能力未验收。
- 新增 profile-installation-pin.json（43 个文件/控制项）；启动前校验其哈希，元数据缺失或变化即拒绝启动。
- 修正 prepare.py，使后续准备包含 workspace 和安装元数据迁移。
- 第一次迁移脚本因中文路径的 JSON 转义形式不同而在写入前拒绝；修正匹配后退出0，未留下部分元数据，历史错误未清除。

## 新鲜验证

显式执行器 cmd.exe。

1. profile-startup.test.mjs 直接读取固定 app.asar 的迁移判定函数作只读测试：修复前实际判定 true，断言失败/退出1；修复后与已有启动器测试合计4/4、退出0。
2. relocate-profile-metadata.py 退出0；43 个安装控制项，旧元数据未变化。
3. start-development.cmd --check 退出0。
4. 专用入口启动退出0，主 PID13036。2026-09-14 12:58:49（UTC+8），原生日志记录 host-boot、renderer-startup、health-commit 完成，startup.run.completed / rendererStatus=healthy。没有删除旧 error.log，因此其中旧失败仍存在，不代表新一轮失败。
5. 日常 PID33784 监听127.0.0.1:43120；候选 Host PID45764（父PID13036）监听127.0.0.1:43121。不同端口/进程不单独等同于完整业务隔离。

修复证据位于：
`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence`

包括 profile-installation-pin.json、launch-1789361924595.json、after-metadata-repair.json 及对应原生 lifecycle/log。未进行真实模型/API/上传/费用、日常升级、提交或发布。S3业务适配尚未开始。

## 图标区分：待确认的最小方案

新增独立桌面快捷方式“DSH 开发测试”，使用与日常鲸鱼图标明显不同的 Windows 内置工具图标，目标仍为隔离启动器。不覆盖任何既有快捷方式、不修改签名 exe、不改变协议或默认应用。此方法只保证启动入口可区分；任务栏/托盘仍可能由原应用图标及 AppUserModelID 决定，不能声称已区分。本轮未创建快捷方式，待用户确认该方案后实施。

## 2026-09-14 13:44 后续确认与快捷方式实施

用户回复“确认”，确认新窗口正常进入主界面并批准快捷方式方案。已新建 `C:\Users\TinaD\Desktop\DSH 开发测试.lnk`，采用 Windows PowerShell 内置终端图标；TargetPath 为固定 cmd.exe，参数指向候选 start-development.cmd，不直启 Desktop exe。创建后用 COM 重新读取目标、参数、工作目录及图标，逐项一致，命令退出0。日常 `DSH Desktop.lnk` 前后 SHA-256 一致；未重复启动候选，未修改任务栏/托盘标识。记录：候选 evidence/desktop-shortcut-*.json。

上述补充覆盖上一段“待用户确认、未创建”的当前性。仍需候选合成文件保存/重开、正常退出与启动顺序验收；不将主界面确认扩大为完整隔离通过。

## 2026-09-14 14:13 合成文件写回与重开

用户明确确认“已保存并重开”。只读磁盘核对合成文件中“编辑验证：已保存”存在；SHA-256 从 d3926303d8719648e8f10714f19abaadc096f1e5280375fc37d154272cf58ce0 变为 1612312a05aa67635881ba268b685cc5913cb63f114f3d54dc68c2b29aa3eeaa。目标路径及父目录无符号链接/junction，解析后仍位于候选 workspace-a。

当前日常主 PID33784 / 端口43120保持不变；候选主PID19512，其Host子PID5176监听43121。候选最新原生启动记录为13:52:28开始、13:52:32完成，rendererStatus=healthy；这证明另一次启动成功，但不能推定用户此前采用何种退出方式。

本轮显式 cmd.exe 下的文件/进程检查和保护基线比对均退出0。选定日常/旧候选控制文件、两套受保护应用树及修复后的安装元数据，变化列表均为空。证据：候选 evidence/after-user-save-20260914T061349Z.json、parallel-processes-after-user-save.json。

已覆盖单个合成 Markdown 的编辑保存、磁盘读取与用户重开确认；不外推到任意文件/跨项目权限。完整S2仍为BLOCKED_WAITING_FOR_USER：待明确的候选正常退出不影响日常、重启恢复及反向启动顺序。未启停任何实例、未调用模型/API、未进入S3。

## 2026-09-14 14:18 正常退出与重启恢复

用户确认“开发副本已退出，日常正常”。重启前实际进程枚举仅有日常主PID33784及其子进程，候选进程为零，日常仍监听43120。随后只执行候选 start-development.cmd，退出0，候选主PID45220，Host子PID14628监听43121；日常PID/端口未变化。

本次原生启动记录14:17:58开始、14:18:02完成，rendererStatus=healthy。已保存合成文件哈希仍为1612312a05aa67635881ba268b685cc5913cb63f114f3d54dc68c2b29aa3eeaa。选定保护控制文件、日常与旧候选完整应用树、候选安装元数据比对变化列表均为空；命令退出0。证据：候选 evidence/normal-exit-restart.json、normal-exit-restart-processes.json、launch-1789366677966.json。

已取得候选正常退出不影响日常的用户与进程证据，以及候选重启健康/磁盘文件保留证据。尚缺本次重启后的界面恢复确认及反向启动顺序；完整S2继续BLOCKED_WAITING_FOR_USER，不进入S3。反向顺序由用户在日常无任务时自行正常退出并通过原日常入口重新打开，助手不关闭日常实例。

## 2026-09-14 14:38 反向启动与 S2 收口

用户确认“反向启动正常，文件保留”。现场进程证据：候选主PID45220及Host子PID14628持续存在；日常主进程从33784变为8880，新进程创建时间晚于候选。日常监听43120、候选Host监听43121，分别属于各自程序路径。用户确认两边可操作及重启后的已保存文件保留。

文件 SHA-256 仍为1612312a05aa67635881ba268b685cc5913cb63f114f3d54dc68c2b29aa3eeaa。最终选定受保护控制文件、日常/旧候选完整应用树和候选安装元数据比对变化列表全部为空，退出0。4项启动边界/固定宿主迁移合同测试新鲜执行4/4、退出0。原始证据：候选 evidence/reverse-order-final.json、reverse-order-processes.json。

当前目标状态：**PASS_WITH_CONCERNS**，仅覆盖 Desktop2.0.9/DSH0.1.5-rc.1/BetterSidebar0.19.1 的专用开发副本与当前日常组合，在专用入口、独立Profile/userData及合成Workspace下的正常双顺序启动、重复入口拒绝、单个Markdown保存重开与正常退出/重启。S0–S2门禁完成，可进入已批准的S3离线正式适配；本轮未修改业务代码或装载业务插件。

非阻塞边界：这是同一Windows账户的操作隔离，不是强安全沙箱；未证明任意文件/真实项目/插件/格式、崩溃恢复、协议注册、自动更新或高负载并发。node-pty仍待构建，不宣称终端能力。日常日志/缓存/会话自然自写不属于不变性承诺；桌面快捷方式已区分，任务栏/托盘仍可能相同。没有真实调用/上传/费用、全局或日常升级、提交/推送/发布。改变版本、补丁或装配后须复验受影响边界。
