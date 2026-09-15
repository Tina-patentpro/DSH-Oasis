# S3C Sidebar 安全文件补丁安装记录

当前文件打开 UI 验收状态：PASS。用户截图已显示 workspace-a 原生文件标签、原保存路径及合成 Markdown 正文，纯文本降级符合本批合同；不代表富 Markdown 或网络安全整体验收。

2026-09-15 回传后只读复验 inspect-ui-receipt.py 退出 0：仍为原一次合成运行、approved、一次回写，Markdown/sidecar 哈希与下方记录一致。截图来源 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-46e98687-659a-4379-8c24-0a838ac0e4aa.png。截图中输入框为空，不据此推断发生了发送，也不沿用旧记录宣称草稿仍在。

## 授权与新日常基线

用户确认开发副本已退出，随后告知日常正在升级；期间暂停安装。2026-09-15 用户确认日常 2.0.10 / 0.1.5-rc.2 / Sidebar 0.19.1 升级完成且运行正常后，恢复原批准范围。

实际只读核对上述三个包版本。日常目录仍是 C:\Users\TinaD\AppData\Local\Programs\DSH Desktop，但资源已展开为 resources\app，而非 app.asar。首次沿用旧 ASAR 读取失败发生于任何安装前；改为读取实际展开包，不更改日常布局。日常 web Profile 中 Sidebar 包版本 0.19.1。

新建 22178 项日常完整程序及选定 Profile 元数据哈希基线，安装前后无变化。未读取输出凭据，不把旧 2.0.5 哈希差异当作本轮破坏，也不覆盖旧基线。日常运行健康属于用户回传；本机进程及版本是本轮实测。

开发仍为原固定 2.0.9 / 0.1.5-rc.1 / Sidebar 0.19.1 + safe-native-files-2，未自动跟随日常升级。

## 备份、安装与验证

命令执行器 cmd.exe。以下脚本位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913。

- s3c-daily-preflight.py：退出 0，新基线 evidence\s3c-daily-upgraded-baseline-20260915.json。
- backup-s3c-checkpoint.py：复用精确哈希锁定的原 create-only 算法，新建 backups\s3c-before-sidebar-20260915；13631 文件、1009 目录、407468791 字节，源/副本/最终哈希及文件集一致，前后候选进程不存在，退出 0。
- 原私有 Node launch.mjs --check 安装前通过。24 项原定向测试新鲜重跑全部通过，退出 0：evidence\s3-check-1789426820195335100.json/.log。
- install-s3c-sidebar.py：目标路径、无链接、单硬链接计数、输入/备份/manifest/pin 哈希一致；仅改 11 个 Sidebar 文件及 candidate-pin 对应 11 项哈希。第一次检查发现 Windows pin 键为反斜杠而提前退出，未写目标；规范化为实际 Path 键后再次执行成功，退出 0。
- 原包元数据、锁文件、安装 metadata pin、其他依赖及 checkpoint 其余文件哈希/用户态文件集不变；日常新基线哈希及程序文件集不变。记录 evidence\s3c-sidebar-install-20260915.json。旧备份和 r1/r2 离线清单不改写。
- 安装后私有 Node launch.mjs --check 退出 0，再通过原 launch.mjs 启动，退出 0。未改 Desktop/DSH 二进制，不安装 Markdown 核心补丁，仍纯文本降级。
- inspect-restart-receipt.py：退出 0，新启动 run e0adfa6f-7e22-4a00-8672-74c1cc251293，renderer healthy。开发主 PID13244/Host42016/127.0.0.1:43121；日常 PID29776/Host1136/127.0.0.1:43120。**两者端口与前次顺序相反，身份以可执行路径为准，不以固定端口推断。**
- inspect-ui-receipt.py：退出 0，workspace-a 仍一项原合成运行、approved、一次回写。Markdown SHA-256 66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74，sidecar eaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187，均不变。

## 人工验收

在“DSH 开发测试”窗口，进入 workspace-a → 绿洲工作台 → 已有权利要求任务 → 结果 → 打开当前文件。返回能否显示原 Markdown 的文字内容及截图。不要重新生成、发送草稿或编辑保存；纯文本显示是本批有意降级，不算富预览完成。

本轮单代理自检；函数级/模拟 hooks 测试不替代真实 Desktop 点击。无真实模型、API、上传、费用或发送；S3 整体、富 Markdown、完整 Desktop 跨版本回滚及发布未完成。
