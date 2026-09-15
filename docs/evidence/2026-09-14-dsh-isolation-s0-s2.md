# DSH 隔离开发升级：S0/S1 与 S2 起点

当前目标状态：**BLOCKED_WAITING_FOR_USER**。

目标是限定双实例隔离验收，不是业务升级完成。用户已批准 V2，并确认日常窗口已打开、无运行任务。本轮单代理执行/自审，无独立审计。

## 已执行

- 确认日常主进程 PID 33784，安装目录 `C:\Users\TinaD\AppData\Local\Programs\DSH Desktop`，Desktop 2.0.5 / DSH 0.1.2-rc.1。活动 Profile 是 `C:\Users\TinaD\.dsh\profiles\web`，Better Sidebar 0.18.0；Profile 路径哈希与现有偏好记录匹配。
- 新建 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913`。独立 app、私有 Node 24.19.0、home、userdata、系统目录环境、缓存、临时目录、两个合成 Workspace。
- 从旧开发副本复制固定应用与依赖普通文件，逐文件 SHA 核验。不复制旧 Profile 状态、凭据、会话、探针或生成的包路径映射；未执行依赖安装脚本。Better Sidebar 0.19.1 的 terminal/node-pty 能力不在本次验收。
- 保存 HEAD a370c2c 对应的 2,892 个当前跟踪源文件快照；未重置、提交、推送或覆盖业务源码。主目录新增方案/OpenSpec/本证据，候选位于已忽略目录。
- 环境过滤、链接/路径逃逸拒绝、原子启动锁测试先红 0/3（退出1），修复后绿 3/3（退出0）。启动器保留原生单实例锁并按精确 exe 查询重复实例；不是跨账户安全沙箱。
- 首次候选启动返回主进程 PID 33144（退出0）；重复专用入口被拒绝（预期退出1），未发起第二次 spawn。

## 运行证据边界

日常 PID 33784 继续监听 127.0.0.1:43120。新候选 PID 33144 及其 Electron 子进程存在，所有已观察到的 userData 参数指向新候选 userdata，未观察到候选 Host 监听。

候选 lifecycle 记录已完成 runtime-bootstrap、profile-selection，进入 profile-composition；没有 host-boot 完成证据。不能据此声称两个 Host 已正常工作或文件写回验收通过。需要用户返回新窗口截图，确认当前初始化/设置界面；不猜测并绕过初始化步骤。

2026-09-14 12:00（UTC+8）启动后核验：选定日常配置/凭据文件（只哈希、不输出值）、两个 Profile 控制文件、快捷方式、全局 DSH manifest、旧副本控制文件及日常/旧候选完整应用树，变化列表为空。该证明不涵盖操作系统所有写入；日常日志、缓存、会话活动及窗口状态不属于不变性承诺。

## 命令与结果

均使用显式 cmd.exe。

| 命令 | 退出码 / 结果 |
| --- | --- |
| python .dsh-test\isolated-dev-20260913\prepare.py | 0；2,892 源文件，受保护控制文件及两应用树不变 |
| 私有/固定 Node --test .dsh-test\isolated-dev-20260913\launch.test.mjs | 红1，绿0；3/3 |
| start-development.cmd --check | 0；仅预检，不启动 Desktop |
| start-development.cmd | 0；PID33144，仅证明进程存在 |
| 再次 start-development.cmd | 1；Development copy already running，预期拒绝 |
| 固定 Node + 已安装 OpenSpec validate isolate-dsh-development --strict --no-interactive | 0；change valid |
| 启动后 SHA 比对 | 0；protected_changes=[] |

完整证据位于候选 evidence：protected-before.json、preparation-result.json、source-snapshot.json、candidate-pin.json、launch-1789358329807.json、parallel-processes-first.json、after-first-launch.json。保留既有失败记录，未重写旧报告。

## 下一步人工证据

先提供新候选当前窗口截图；不要导入日常 Profile、填密钥或发送消息。随后依界面确定如何只进入新测试 Workspace，完成合成 Markdown 保存/重开、候选正常退出/重启与反向启动顺序。合成文件：

`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a\isolation-20260914-a.md`

初始 SHA-256：d3926303d8719648e8f10714f19abaadc096f1e5280375fc37d154272cf58ce0。

S2 尚未完成，S3–S6 未启动；没有真实模型/API/上传/费用、日常升级或发布。本次没有结束日常或候选进程。
