# S5 固定候选业务恢复克隆

## 授权和范围

用户确认日常 DSH 设置及快捷方式符合预期后，继续已批准 V2。三项历史控制差异仍保留，不把 36618 项复核的退出 1 改写为通过；未改日常文件。方法为 executing-plans → 项目 DSH Skill → verification-before-completion，出现启动等待时按 systematic-debugging 只读排查；单代理自审，不是独立审计。

具体切片计划：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-15-s5-desktop-clone-recovery.md。

克隆目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s5-desktop-recovery-20260915。

## 准备和静态证明

- cmd.exe 执行 prepare-s5-desktop-recovery.py，2026-09-15T03:37:08Z 退出 0，13829 文件、1012478984 字节。拒绝已存在目标、链接/junction、源指纹不符、空间不足及仍运行的原开发/克隆进程。源/目标文件逐项哈希校验，结束时复验来源未变。应用和依赖字节不变，无依赖解析或安装脚本。
- 来源为刚完成的 s5-before-desktop-rehearsal-20260915 一致快照，以及 pin 对应的候选应用/私有 Node。只在新目标重定位安装元数据/锁文件中的路径并生成克隆 pins；有意变化文件的输入/输出哈希见克隆 evidence\preparation.json。
- A/B Workspace ID 保持，路径改指克隆内部。原候选外 .dsh-test 注册映射到克隆 workspace-legacy-placeholder 空目录，未复制整个项目。全部工作区路径在克隆内。
- 业务 JSON 字节完全保持，SHA-256 为 51292c6bd48eee9f777a71575efd5f4bee0066ecf3fcaa74882923b35fadb715。原任务仍一次 completed/synthetic 运行，审核/回写记录未改；Markdown/sidecar 哈希仍为 66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74 / eaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187。
- 未复制凭据；未激活旧 sessions/session_projcache/userData/浏览器缓存，在克隆注册中清空对应会话索引，原始记录完整保留于快照。新窗口状态避免直接恢复旧文件标签；不声称聊天/未发送草稿跨路径恢复。
- 原业务包内 fixture Home 硬限制未改，不为克隆新增生成许可。本轮只读验收已保存业务，不生成、发送、上传或回写。
- verify-s5-recovery.py 首次及启动等待期间复验均退出 0，记录为克隆 evidence\offline-recovery-verification.json、recovery-content-after-wizard.json。原候选和克隆业务字节、两份文件都保持。
- 克隆私有 Node 执行 launch.mjs --check，退出 0；启动器与原已验证脚本字节相同，使用从自身位置解析的克隆根。

## 实际启动：尚待人工向导/UI

cmd.exe 执行克隆私有 Node + launch.mjs，退出 0，主进程 13480 已确认；记录 evidence\launch-1789443468886.json。这里只证明进程存在。

inspect-s5-recovery-runtime.py 退出 1，因为当前无 Host 监听端口，不宣称运行健康。最新 startup run 15f46da2-4b9c-4f30-b6d7-dd7096fdbf05 已完成 Electron ready、环境、runtime bootstrap、Profile 选择，停在 profile-composition，尚无完成或失败事件。

只读核对固定 app.asar 的 lib/main.js 约 4244–4350 行：全新 userData 没有向导完成记录及使用历史时，会 await DesktopSetupWizardWindow.run()，在完成/跳过前不启动 Host。当前现象符合该条件，具体窗口待用户截图确认；不根据单次无端口断言产品故障，也不伪造完成标记绕过向导。

已请求新恢复窗口截图，先不点击安装/升级/生成。确认向导后通过必要人工操作继续，再核对端口/Home/renderer 健康与 A/B 业务恢复 UI。未操作日常或原候选实例。

当前切片状态：BLOCKED_WAITING_FOR_USER。固定候选业务恢复 UI、聊天缓存迁移和跨版本 Desktop 回滚是不同证明边界；本切片尚未完成前者，也不替代后两者。

## 主界面回传与运行复核（覆盖上方向导等待状态）

用户截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-d4c8e1e9-ffdc-462e-880c-55122d5a3a64.png 显示 Desktop 2.0.9 主界面、workspace-b 新会话与“研发 / 专利”入口，已经离开启动向导；不推定用户具体选择了完成或跳过。

cmd.exe 执行 inspect-s5-recovery-runtime.py，2026-09-15T04:08:05Z 退出 0。克隆主进程 13480、Host 29444/127.0.0.1:43120，原 startup run 已完成且 renderer healthy；日常主进程 48704、Host 49052/43121。原候选与克隆业务存储及两份保存文件字节均保持，证据为克隆 evidence\runtime-recovery-verification.json。

下一人工动作：在 B 打开“研发 / 专利”确认不出现 A 的原任务/结果；切到 A，在新会话打开同入口，选择原任务，检查结果、审核和保存路径。只读验收，不生成/发送/回写。当前仍 BLOCKED_WAITING_FOR_USER，等待业务恢复 UI，不再等待向导。

## 业务恢复 UI 验收完成

用户明确确认“B 独立，A 结果、审核、路径保留”。cmd.exe 执行 accept-s5-recovery-ui.py，2026-09-15T04:10:31Z 退出 0：原候选、快照及克隆的原运行记录完全相同，review=approved、一次回写、两份文件哈希相同；B 无生成运行。克隆同一 startup run 仍 renderer healthy，日常实例与端口仍独立。

原始记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s5-desktop-recovery-20260915\evidence\ui-recovery-acceptance.json。

本切片“固定候选业务恢复（全新 Desktop 状态）”最终状态：PASS，覆盖上方等待 UI 状态。未取得或声称聊天缓存跨路径迁移、跨版本 Desktop 回滚或整个 S5 完成。下一步先由用户正常退出当前恢复验收克隆，不结束日常实例，再继续旧/新安装组合匹配的只读核对及获准演练准备。

## 正常退出及跨版本基线范围核对

用户确认已经关闭窗口。2026-09-15T04:20:43Z inspect-s5-closed-combinations.py 退出 0，原候选与恢复克隆相关 Desktop/private Node 均不存在，日常安装进程仍存在。记录 evidence\s5-closed-combinations-20260915.json（在 isolated-dev-20260913 内）。未启动其他版本。

固定 ASAR 包元数据核对：stage3-desktop-app 是 Desktop 2.0.5 / DSH 0.1.2-rc.1；sidebar-native-20260913 和当前隔离候选均是 2.0.9 / 0.1.5-rc.1。前者对应 stage2-desktop Profile 使用 Sidebar 0.18.0，业务包通过 link 指向主项目；sidebar-native 的 Profile 无业务包依赖。因此不能将同版本旁路恢复或 sidebar-native 的历史存储解析，称为跨版本业务回滚。

04:21:39Z inspect-s5-old-links.py 退出 0：旧 Profile 依赖目录有 13313 个普通文件，唯一链接为 oasis-professional-service 指向主项目 packages\oasis-professional-service；主项目该包的 157 个快照文件全匹配，没有改写源文件。记录 evidence\s5-old-link-inventory-20260915.json。

2.0.5 跨版本演练须新建物理独立的旧版应用/依赖/业务包组合，消除原链接及所有安装元数据回指，再用合成数据检验旧→新→旁路恢复。该旧版来源不同于 V2 明列的 sidebar-native 旧副本，不静默将范围扩大或绕过无链接边界；等待用户决定是否开展这项追加演练。已完成的固定候选恢复验收不撤销，跨版本回滚仍未验证。
