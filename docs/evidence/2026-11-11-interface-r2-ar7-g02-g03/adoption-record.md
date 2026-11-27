# AR7 原 B 任务实际采用核对记录

2026-11-11T12:20:29+08:00。接口标准专项 Codex，INTERFACE-R2-AR7-G02-G03-20261111。执行 R2 首项，项目 dsh-oasis，接口边 ARTIFACT-7，原工作包 DS-02/04/05（提供）和 DS-03/04/05（消费），对象为同一 Workspace 的 M06／Flow-2-6 本地 Skills 正文。按 EXEC-R2 复核 P1110、R2、IC-ARTIFACT V0.3 和 DSH 原 R7-03。入口、版本、完整字节 SHA256 与差异见 [执行复核](execution-preflight.json)。

**实际采用状态为 UNBOUND。** 已核对磁盘装机、原 B 正文和资源、项目根及候选保存路径。仍缺所选装机上对原稿的权威选择与同版复核，以及 Host 最终目标、权限和确认。

- **原 B 身份。** Workspace 11e1a348-0248-42a1-8141-bcb6306caccc，任务 d8d762fe-36ae-49dd-b275-b7ffff04fda7，会话 session-be573ee0-ae7a-4d40-99d5-d607f6106786，指定 run v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d。原正文 57201 字节，SHA256 76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442，交付复读时为 not-reviewed。三份公开 Markdown 原字节与原输入收据分别一致，四段文本随原冻结输入快照绑定。两安装件上的原 M06 资源包、清单、8 项制作可见资源及 2 项仅供操作员的成员原字节对应。
- **活动运行变化。** 首读 B revision 86，存储哈希与 R7-02 收尾相同。核验中观察到 revision 88 的活动 run v340-6f0f9e0f-0f0e-42cf-93cc-b95e051e7935。执行复核观察为 revision 89，交付复读为 revision 90，活动 run 为 v340-f56b9fb7-1cf4-4915-8fdc-955c31afaa78，存储 SHA256 为 aaebeba9fcefc9c630457e6c21d442b0f4ea50ad3ba906347830a2f48727ac3c。当前活动运行与指定原稿是两个对象。本轮按指定 ID 复核原稿，后发运行的授权与业务效力沿原责任和具名回执。
- **当前装机。** 历史运行 bundle a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b。活动安装 bundle 2339cca5a2711bf7851443af5ec144312c0eff84372094e8b6f456e91dedf0e4，组件版本仍为 0.1.0-rc.5，活动 Profile 的插件链接解析至该安装。安装收据比对有 32 个程序成员和 14 个 Profile 成员差异，涉及界面、结果合同、工作台服务及写回实现。程序差异文件按本版收据核对哈希，具体成员见执行复核。旧装机回执按原范围使用。
- **候选路径。** 原运行绑定的项目根为 /Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1/data/workspace-b，实际目录解析一致。原结果名 claims_20261110114450_89dd69c1.md 符合新本地 Skills Markdown 无来源标记规则。交付复读时该路径无文件或符号链接。当前系统用户对根目录的读、写、搜索权限检查均可。Host 最终路径、应用权限和保存确认待证。

| 缺件 | 责任方 | 受阻动作与最晚消费点 | 解除证据 |
| --- | --- | --- | --- |
| G02 原 run 的当前选中关系 | DSH AR7-P／Host，AR7-C 核同一用途 | 当前组合绑定及进入原稿工程操作前 | 具名 Host 回执固定当前 Workspace、任务、会话、当时 revision 与指定 run，正文和冻结输入、资源哈希对应同一对象，保全其他活动运行。 |
| G02 所选装机的同版采用依据 | DSH AR7-P 与 AR7-C／Host | 按 R7-03 操作或声明采用前 | 固定完整 bundle、活动 Profile、组件和控制器。对实际受影响的编辑失效、再审、保存、安全打开、固定引用及恢复接点做有界复核，附适用的原 U1/D1/Host 证据。 |
| G03 Host 实际保存目标、生命周期及权限 | DSH AR7-C／Host | 实际写入及安全打开前 | 在同一原 B 选中状态下给权威根和最终路径，核读写权限、新旧或同名与无覆盖处理。若遇既有文件，核原路径、版本和哈希。 |
| G03 审核与保存确认 | DSH AR7-C／Host 与原确认责任方 | 确认保存前 | 交确切审核版本、正文哈希、实际目标及保存确认。编辑后按原合同再审。写后另交文件字节、版本/hash、无覆盖结果及适用的安全打开、引用证据。 |
| ARN-11／12 适用分支 | DSH AR7-P/C／Host | 对应命名、导入或写入前 | 本用途为新本地 Skills 保存候选。若实际选用旧快照，按原合同绑定版本、来源、新旧身份、权限及确认，保留原待核职责格。 |

G01 引用两职责二十项具名文档意见。R7-03 工程链、专业审阅、用户接受和发布沿原准入及各自同版回执。旧 R01 首次 FAIL 与限定 PASS、原 42/42、R03 首次保全 FAIL、原九项缺件及 R7-02 原收据均按原范围引用。原 R7-02 单次授权余量为 0。本次交付为只读核对和文档留证。

[原 R7-02 回执](../2026-11-10-r7-02-live-16384-r1/execution-return.md) · [R03 限定核收](../../../../docs/coordination/execution/2026-11-11-interface-r03-ar7-review/closeout.md)

执行复核冻结观察后的并行字节变化如下。

- oasis_workbench.json · 59a620cf59578764a5ced11b98ad0bbe0fe707070cdacb55b3870dca4cdbb8b3 → aaebeba9fcefc9c630457e6c21d442b0f4ea50ad3ba906347830a2f48727ac3c
