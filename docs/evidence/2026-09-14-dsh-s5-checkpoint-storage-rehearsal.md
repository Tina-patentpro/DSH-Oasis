# S5 一致备份与原生存储层克隆演练

## 授权和边界

用户确认“开发副本已退出”后，延续已批准 V2。只新建备份、离线数据克隆、检查助手/生成测试模块及证据；不覆盖开发/旧副本的数据，不修改安装包、业务实现或日常 DSH。单代理自审。全部命令由 cmd.exe 执行；JS 检查通过既有 run-source-check.py 使用私有 Node 与隔离环境。

## 一致备份

backup-s5-checkpoint.py 首先确认候选目录相关 DSH Desktop.exe/private node.exe 进程均不存在，拒绝链接/junction及已存在目标；校验安装元数据 pin 和剩余空间后才创建备份。

备份目录：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\s5-before-rehearsal-20260914

- 范围：home、userdata、workspace-a、workspace-b，包括空目录；另含启动脚本、候选/安装 pin 及当前 tgz。
- 13629 个文件、1007 个目录、407452014 字节。
- 每文件源读前/目标/源读后 SHA-256 相同；全部复制后再次检查源与备份哈希、源目录/文件集合及进程退出状态。
- 2026-09-14T12:02:44.181265Z 完成，退出 0；完成清单为 checkpoint.json。包含本次审核产物和桌面草稿状态，不把安装前缺少业务状态的旧备份当成当前回滚点。
- 备份可能包含候选自身敏感状态，仅留本地，不打印/上传；没有复制日常数据或凭据。应用二进制仍保留在原候选且由 pin 锁定，本备份不是独立可启动发行包。

## 原生存储层演练

从已固定 ASAR 中无修改提取 @deepseek-ai/dsh-storage-json 0.1.5-rc.1 backend 到候选源码 test/.s5-native-storage/backend.mjs，仅作测试模块，不进入业务归档。ASAR SHA-256 校验为 f0bb5e285039adf18819c1026d9dabd6a6f604ca4f0d40cef45654aff684b0d1，提取文件哈希为 293b76e38e9dd64017dae9503218b5120058ce0087b06dffa058512dcb6ee771。

旧 0.1.2-rc.1 JSON backend/domain 仅从已存在的 stage3-desktop-app 包路径只读导入；新 domain 来自候选固定开发依赖。前后核对模块哈希保持。没有启动旧 Desktop 或修改该旧目录。

rehearse-s5-native-storage.mjs 在新目录中顺序执行：

1. 两组输入分别是旧 sidebar-native/home-a 的 2 个工作区及新一致备份的 1 个工作区。仅复制 oasis_workbench.json，不加载 Profile、凭据、Workspace 注册或网络服务。
2. 旧 backend/domain + 当前业务 repository 读取，语义记录一致且不改写文件。
3. 关闭旧句柄后，新 backend/domain 读取并在克隆中只更改一个任务标题，产生实际持久化写入/revision 增量；运行正文、审核、回写记录保持，其他工作区不变。重复打开同一 Domain 被拒绝，不把它扩大成跨进程互斥证明。
4. 关闭新句柄后，旧 backend/domain 能读取新版写出的克隆。
5. 从原始输入恢复至另一个全新旁路目录，旧 backend/domain 再读，源/恢复文件字节哈希一致；保留修改后的克隆，不覆盖原输入。
6. 从新备份还原两份已保存产物至全新路径，Markdown 与 oasis.json 哈希分别为 66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74、eaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187，均一致。

演练目录：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\rehearsal-s5-storage-20260914

该目录放置 DO-NOT-LAUNCH.txt：业务记录原路径未重绑定，这些数据克隆不是 DSH Home，禁止拿它们启动 Host。真实模块是 JSON backend、domain 和当前 repository；仅 backend 路由及事件/日志 context 为测试接线。没有旧业务插件整体兼容或 Desktop UI 的证明。

初次执行在动态 import Windows 绝对路径时失败，尚未创建克隆；改为 file URL 后退出 0，2026-09-14T12:04:32.586Z。保留两次日志，不记为产品数据故障。

原始证据（候选 evidence）：
- s5-storage-backend-extraction.json
- s5-native-storage-rehearsal.json
- s3-check-1789387463796376400.json/.log（助手路径错误）
- s3-check-1789387472431827100.json/.log（修正后）

本次“一致备份 + 原生存储层克隆顺序读写/旁路恢复”目标：PASS。完整 S5 仍未完成：Desktop 安装组合切换/回滚、克隆路径重绑定后的启动证据与安全预览恢复不能由本次结果替代。

## 继续 S4 工作区隔离 UI 检查

没有安装或替换任何包。经原有 pin 校验启动器重开当前候选，退出 0：launch-1789387528832.json，主进程 44080，Host 35924，127.0.0.1:43120；2026-09-14T12:05:39.797249Z 检查新 startup run 3bfec756-94c7-4fe6-b692-32cc8da9b46c 为 renderer healthy。日常进程 29972 保持在其原安装路径/127.0.0.1:43121。

再次只读检查原工作区仍只有一次 completed/synthetic 运行、approved、一次回写，两份保存文件哈希一致。下一步人工在候选内添加/选择独立 workspace-b 并新建会话，打开“研发 / 专利”确认不出现 A 的任务/产物/草稿；切回 A 原会话确认原任务与未发送草稿保留。不生成、不复制材料、不回写、不发送。该跨工作区 UI 证据当前尚未取得，不冒充整项 S4 完成。
