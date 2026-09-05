# 阶段 B 正式探测审计

生成时间：2026-09-02T13:36:19.166Z

**状态：FAIL**。阶段 B 未完成，phase4Complete=false。已完成 standalone 的副本构建、离线安装及官方 Host 启动；Edge 建立连接失败，未取得 live Slot 契约；Better Sidebar 模式未运行。

## 授权与执行范围

用户本轮明确要求继续 B，并确认真实 DSH 写入暂停。沿用已批准计划：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-02-oasis-api-follow-up.md。

本轮不修改代码、真实 Profile、业务地址或凭据，不提交、不升级依赖、不调用真实业务 API。只新增 attempt-005/006 证据和全新隔离临时目录。API 依据仍为 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md；SHA256 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。

## 两次执行及权限处理

1. attempt-005：cmd 执行 inspect，外层退出 1；首个只读 git rev-parse HEAD 返回 128。隔离 HOME 不继承原信任配置，沙箱用户 CodexSandboxOffline 与仓库所有者 TinaD 不同，触发 dubious ownership。未开始真实 Profile 快照或 DSH。没有照日志建议更改全局 safe.directory。
2. 用相同隔离环境，在获批权限上下文只运行 git rev-parse HEAD，退出 0；见 attempt-005/owner-context-probe.json。
3. 不覆盖 attempt-005；获批后用全新 attempt-006 执行相同 inspect。外层退出 1，真正失败点是浏览器启动 180 秒超时，而非 Git、构建、安装或 Host 启动。

正式命令（cmd，项目根）：

    node scripts/verify-oasis-api-phase4.mjs --stage inspect --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-006 --modes standalone,better-sidebar --offline

15 个被记录的子命令均退出 0 且 closed=true；外层浏览器调用失败，不能用这 15 个退出码宣称整个探测成功。完整 executable/argv/cwd/PID/时间/退出码见 commands.json。resources.json 的 commands=12 是资源检查当时的数量，后续三个 Git 后检命令使最终台账为 15。

## 新取得的实际证据

- 真实 C:\Users\TinaD\.dsh 三次强快照均为 15,218 项、内容相同，相邻完成时间相隔约九秒。执行后的正式比较及进程退出后的独立复核均不变。
- 新根 C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-tkV7sm。standalone 副本标准构建、source map 内容核验、dry pack 与实际 tarball 均通过，包内 43 文件。
- tarball SHA256：58C4FC11EB0C12468C13E41372E482DA7888E878C5C0D0FC9EC90804AF573423，与阶段 A 相同。
- 官方运行时 29,503 文件复制与源/目标核验完成；从副本实际运行 CLI，版本 0.1.1-rc.2。
- 官方 CLI 在隔离 Profile 离线安装 Oasis 与最小只读探针，两个安装均退出 0；四个 Bundle 顺序准确。检查 1,079 个链接，均限定在本模式内。安装日志仍有 peer dependency 警告，不能据此宣称依赖完全兼容；pnpm 的 downloaded 计数伴随的是显式 file: 本地 tarball，不把计数本身解释成网络下载证据。
- 官方 Host 于 13:27:23 UTC 启动，监听 127.0.0.1:5151；公开 workspace/session 创建和重命名调用已越过错误检查，之后才进入浏览器启动。但本轮没有独立保存这些 RPC 的原始响应，证据粒度仅为控制流及隔离状态，不夸大为完整 RPC 合同验收。
- 六份匹配安装版本的公开类型/源码已重新哈希，见 public-contract-static.json；live=false，不代替真实槽树。

## 失败与审计发现

### 1. 浏览器连接失败：阻断阶段 B

Edge 进程 PID 20844 被启动，但 launchPersistentContext 在 180000ms 超时；未获得可用浏览器上下文、未打开 DSH 页面，未产生截图或 live 槽树。

观测到：PathService key 112 / 0x3F0（引用不存在的令牌）、Unable to get local app data path、DevTools 要求非默认数据目录等。实际命令已经带有独立 user-data-dir，所以不能简单诊断为“忘了传用户目录”。Windows 令牌/用户目录解析与严格环境重定向的相互作用只是待验证假设；尚未单变量复现，不能声称根因已确定。

诊断摘录及出处见 browser-failure-observed.json；原始完整报错在本轮工具输出 chunk eb29d3。现有验证器没有把完整启动异常保存到文件，只有通用 VERIFICATION_FAILED；摘录明确不是伪造的完整 stderr 文件。

Edge 背景组件尝试访问 Microsoft 地址，但代理连接失败。没有真实业务 API 调用；也不能把 browser-lifecycle 中 blockedRequests=[] 称为零联网尝试，因为 page route 在 launch 成功后才注册。

### 2. 启动失败的收尾记录过强

D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs 第 643 行，在 launch 抛错、browser 对象未赋值时也把 state.closed 置为 true。因此原始 browser-lifecycle 的 started=false/closed=true 并非 Edge 进程已退出的独立证明；pageErrors 空也不代表页面健康。

本轮另做只读后检：Host PID 5108 和日志中的 Edge PID 20844 均返回 ESRCH，端口 5151 拒绝连接。见 process-closure-check.json。Host 生命周期也记录 SIGTERM 后 close 与端口关闭。浏览器完整子进程树未由当前启动器采集，不能把仅主 PID 消失外推为完整子进程树退出证明。

### 3. 尚缺的契约与兼容证据

standalone 完整槽树及 settings.section、settings.plugins.tab、settings.plugin.item、conversation.input.right、shell.overlay、details 六个精确查询均未执行；Better Sidebar 模式未开始。配置 UI、业务 mock 矩阵、真实非生产联调均不在本轮完成范围内。peer 警告的逐项影响需后续只读核验，不能用 Host 能启动替代 Client 依赖验证。

## 最终保护结论

进程后检之后独立重做保护复核：真实 Profile 15,218 项不变；2,885 个保护文件全数不变、读取错误 0；权威 API 哈希不变。最后 Git 后检确认 HEAD、暂存区不变，attempt-006 之外没有新增文件；工作区字面量 %SystemDrive% 目录没有复发。

证据：independent-preservation.json、closing-git-check.json、profile-preservation.json、existing-files-after.json。Git 全局 ignore 读取警告仍存在，检查采用 Git 清单与既有冻结集合，不宣称完整磁盘审计。上一轮 99/99 和 271/271 未在本轮重跑；本轮核验输入哈希相同，并实际运行了上述集成尝试，不把旧测试数包装成本轮结果。

## 下一步建议与停止点

本轮停止，不重试 Host 或开始 C。建议先单独批准一个不启动 DSH 的浏览器诊断/收尾小批次：

1. 在全新 ASCII 临时根使用当前 Edge 和 Playwright，about:blank、独立 user-data-dir、禁用凭据/扩展/同步、保持外网阻断；先建立有界的 browser-only 启动实验，不重复复制官方运行时。
2. 首先补齐启动前/后及失败期的进程所有权、超时、完整脱敏错误和真实退出证据；状态区分进程已创建、浏览器已连接、页面已就绪，禁止“未获得 browser 对象即 closed=true”。先写失败测试，再修复现有验证器与同一合同测试文件。
3. 用单变量实验定位 Windows 用户目录重定向或启动权限上下文的影响；不修改真实 Edge 用户目录/机器策略、不复制浏览器登录状态、不连接用户现有浏览器、不扩大外网权限。如果只能依靠用户交互式启动解决，先给出人工作业门禁，不自动改变隔离模型。
4. 对成功候选做至少两次独立冷启动与失败/超时收尾复验，复核保护范围后，再提交准确的环境补丁方案和阶段 B 重试入口；未查明原因前不扩大修改范围或延长超时掩盖失败。

这些后续诊断/修复尚未执行。失败 attempt 与临时根保留，未删除或覆盖现场。
