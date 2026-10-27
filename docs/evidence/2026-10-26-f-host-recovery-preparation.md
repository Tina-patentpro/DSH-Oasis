# F 当前固定Host旁置恢复准备

此批按后续计划F的“API未就绪可先验证本地/合成部分”接续。目的为恢复精确Desktop2.0.17与本次已审源码/client配对的无模型GUI核验；旧`Invalid Mac admission`及8路径漂移/缺失保留。不会把新配对的指纹写回旧准入、替换日常2.0.18或移入旧凭据。

来源为[官方固定发布v2.0.17](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.17)，release399328686、commit `838ba60fd79362087c0a0d134efee671c284786a`、资产598706871。DMG498514462字节，SHA256 `55680cfbfc903b5cc4b2f23ecdfb3812d36e1fdaa3663b4112b329ad1622737f`，与GitHub资产digest及发布者SHA256SUMS均匹配。实际只读挂载包内Desktop2.0.17/DSH0.2.0-rc.2；旧准入7个应用成员全部字节一致。`codesign --verify --deep --strict --verbose=2`退出0，签名有效；未自行重签。

准备范围：

- App只使用`.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app`只读挂载副本；主安装不动。来源及下载验证见`2026-10-26-desktop217-recovery-source.json`和旁置`download-verification.json`。
- Host/client使用`.local/oasis-follow-up-20261026/candidate`，117份源码与本次实际主包一致，manifest相同；client为此前已审旁置产物，固定依赖锁复制原字节，用固定pnpm11.8.0离线/冻结锁/ignore-scripts物化，不手写node_modules元数据。
- 新隔离根`.dsh-test/followup-20261026`，只建本次私有HOME、DSH_HOME、userdata/cache/temp/evidence和公开合成Workspace。UI/Sidebar仍引用原已审本地补丁，不从日常签名app取补缺。
- Profile只用具名本地link；新路径的权威manifest先由固定pnpm离线生成锁，冻结该新锁后再离线/冻结锁物化。它与旧Profile分别保留；不升级版本、复制认证/数据库或手写链接元数据。
- 所有模型/账户/联网搜索/标题生成/调度适配器及自动更新、会话遥测关闭；使用已有`makeLaunchSpec`的干净环境、阻断代理/loopback及独立端口57519。它不是内核资源隔离证明，不进入U1或真实生成。
- 本次业务候选的开发合成开关按其原始严格路径校验，不通过迁移路径或修改开关来强制启用。新版来源台账保持禁用；无额外模型/API/文件上传/费用授权，网站一次预算已经消费。

任何新旁置准入只绑定此次准确文件、来源及模式，并单列未验事项；不以重算旧hash绕过旧失败。实际GUI、原生打开/引用和退出恢复需后续操作证据后逐项登记，准备本身不算F通过。
