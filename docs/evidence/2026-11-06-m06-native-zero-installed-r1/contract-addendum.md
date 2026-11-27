# 已安装布局与零生成 writer 接续 R1

2026-11-06，Asia/Shanghai；接续项目总结 R2/P1—P2 与原零生成合同。本轮准确授权为同版已安装数据布局及 writer 的离线接续，不启动应用、真实调用或发布。

沿用现有 F 安装控制器，新增可选 `profile-template.nativeZeroGeneration` 策略：固定 schema/policy、四项零预算、归档身份和两项 guard 的原始 hash；非零预算和错 guard 在创建安装根前拒绝。无此策略的旧模板保留原模式。新策略只进入本次另版 bundle，不修改旧 bundle/安装回执或 expected hash。

安装仍经 `installFBundle`，由其验证固定签名 App、复制程序、以固定 Node24.21.0/pnpm11.8.0离线先锁后冻结物化、生成实际安装状态及封存回执。新策略在封存前通过固定 Node 调用实际 Desktop `prepareDesktopProfile`，只准备配置；不调用 Host boot、plugin apply 或 App。固定 Desktop 的实际根配置名是 `cordis.yml`，既有控制器本已创建该文件；新增准备步骤不声称修复原件缺文件。

`withInstalledLaunchSpec(root, callback)` 复用原 `withInstalledWriter`：取得并保持 root 与 data 的双层租约，核实际安装/当前 release/数据路径，再向回调给出启动规格。新策略携带 `OASIS_NATIVE_ZERO_GENERATION=1`、无 fixture、仅 loopback 代理例外；DSH_HOME 为 root/data/home，cwd 为当前 release。实际存储 gate 再核租约身份；回调成功或异常退出均释放。后续 `startFInstallation` 使用同一规格路径，本轮只检查规格，不执行真实启动。

本次新根为项目 `.dsh-test/m06-native-zero-installed-20261106-r1`，程序在 releases、可写数据在 data；仅存储所有权 SQLite metadata 试验，没有业务数据库、认证或会话搬迁。原 `root/home` 准入候选继续保留 runtime_ready=false。新 installed 候选的 runtime_ready 只表示本轮已核的装配/规格就绪，不授予启动，也不等 Host/UI、专业/用户或发布接受。不可将它交给旧 private-profile launcher；准确 owner 是本版 F controller。

租约只约束合作控制器/已安装 provider；不宣称对任意外部 writer 的 OS 强制隔离或完整断网。未消费真实模型/API/上传/支付预算。旧 F bundle 仍绑定各自冻结控制器；新源码控制器不冒充可验证所有旧包，应使用各自冻结版本，不重签旧证据。
