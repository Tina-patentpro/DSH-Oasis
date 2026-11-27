# 同版已安装布局与 writer 零生成接续完成

2026-11-06，Asia/Shanghai。项目 R2/P1—P2 的本轮限定离线出口完成；没有启动应用、真实调用或发布。

新隔离安装根为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-zero-installed-20261106-r1`。沿原 F controller 实际完成固定签名 App 校验、程序复制、固定 pnpm 离线先锁后冻结物化及状态/快照/回执生成。新 bundle SHA256 为 `db673f66ad8a0a84b93f421faf923dce4d0fbfa823d5317e2d8c51691c2989d3`，不是对旧 bundle 改 hash；Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及 checkpoint3 保持。

业务包仍为 c07f2120a42e1a9d8110901eb35ed314eb5dd7225b1b35234c5b8d770fb03494，安装组件134成员与该实际归档逐字节匹配。604项链接均落在本次 release，App/Profile 两个解析锚点、Host/客户端及业务 bundle 命中同一组件。实际 Desktop 配置准备得唯一 M06受控 Host、普通入口禁用、57619/loopback、无需依赖迁移、warnings为空；再次准备不改变五项 Profile 配置及锁。没有实际监听或保留端口。

本次控制器小改动及合同见 [contract-addendum.md](contract-addendum.md)：新策略校验四项零预算及 guard，在封存前准备配置；`withInstalledLaunchSpec` 与后续启动共用真实 installed writer。实际新根采用 `root/data/home`，双层 lease 生效，provider gate 通过；第二 Node 进程的 writer 被拒绝为 F_INSTALL_BUSY，存储所有权被拒绝为 DSH_STORAGE_ROOT_BUSY，释放后均可重取，过期租约再验失败，最终双锁不存在。仅产生所有权 SQLite metadata，未打开业务后端或搬迁会话/认证/客户数据。

新鲜验证：19项 controller/bundle/lease 定向测试通过，另从已安装组件执行3项零生成 guard 测试通过；52个非白名单注册 endpoint 拒绝，凭据/模型准备/adapter/Fetch计数0，业务记录不变。单元外部边界有明确替身；实际配置/租约核验未 boot/apply/spawn 应用，不将这些计数当真实 App/Host运行接受。[installed-observation.json](installed-observation.json)、[installed-guard-observation.json](installed-guard-observation.json)与 [verification.json](verification.json)分别保存准确范围。

[新 installed 准入候选](admission-candidate.json)的 runtime_ready=true **仅指离线装配、真实租约及启动规格就绪**，app_start_authorized_this_task=false，Host/UI未验。原 P1/P2 ordinary-root 候选仍为 false，旧原件与接受保持；不交给原 private-profile launcher。后续实际应用启动、渲染、正常退出/再启动，产品内结构修订、专业/用户接受、最终安装发行及许可采用仍分别开放。旧 F bundle 继续绑定其冻结控制器，不能拿新源码替代旧包的版本证明。

首次安装脚本路径及两次核验脚本断言问题的失败日志均保留，处理说明见 [self-review.md](self-review.md)。最终实际安装、规格核验及独立 installed controller `--check`均 exit0；没有修改安装状态/快照来迎合检查，也未改 P1业务 guard 源码、重 pack、生成正文、提交/推送、调用源CI/B/A、投递 WorkBuddy 或发布。
