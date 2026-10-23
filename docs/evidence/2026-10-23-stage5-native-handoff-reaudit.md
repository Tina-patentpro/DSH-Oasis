# 阶段5第1批原生操作接续全面复审

日期：2026-10-23，Asia/Shanghai。项目根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：发现2项P2，不能确认本批没有遗漏或回归。** 原有正式回归998/998、Mac26/26、配对候选合同9/9及Chrome组件3/3在本轮重新通过；16项私有补充探针11通过、5个业务断言失败，归并为以下2项缺陷。未修改产品源码或正式测试，未修复这两项；原收口报告保留为历史证据，由本报告更新其“未遗留已知P1/P2”结论。

本轮为单代理源码复审、正式测试复跑和定点反例验证，不是第三方独立审计或真实宿主验收。遵守用户明确范围：未启动Desktop/实际DSH，未新增真实模型/API调用，未登录、上传、计费或发送对话，未安装依赖、变更Profile/应用/准入、提交、推送或发布。用户此前已撤销旧AGENTS.md，本轮不重新施用。

## 1. 已确认发现

### NH-R1 / P2：文件路径与哈希可能来自不同的项目根目录，导致错误的一致提示

位置：`packages/oasis-professional-service/src/v340-result-service.js:82–86`，重点为83–84行。

`resolveV340SavedFile`依次调用writeback manager定位路径、material manager按Workspace重新查根并检查文件、writeback manager再次定位路径。末端只比较第一次和第三次的绝对路径；没有证明中间哈希检查使用的根目录与它们相同。

复现条件：同一Workspace的根绑定在这三个异步读取边界依次为A→B→A；A和B有同名Markdown，A内容已经被人工修改，B仍保存审核原文。使用真实材料读取器、真实安全路径解析及两份稳定的临时磁盘文件，只由可变registry在三个get时分别提供对应根目录；没有伪造inspect哈希，也没有在文件读取中改动内容。

实际结果：首末都定位A，因此末端检查通过；`currentSha256`来自B，等于审核原文hash，返回`absolutePath=A`、`matchesReviewed=true`。实际A文件hash不同。该响应内部的hash/布尔值相互一致，所以现有响应schema也会接受。补充端到端探针经真实RPC handler、remote schema、store走到合成native open，反馈确为：

> 已打开当前文件；读取时与固定审核版本一致。

这不是“核验之后文件被外部修改”的既知限制，而是**核验本身读取了另一根目录的文件**。固定版本仓库正文没有被改写，也未复现任意越界路径打开；受影响的是当前文件身份与审核一致性的提示。

建议修复边界：让路径定位和有界hash检查共享不可变的根目录/绑定代际及确切文件身份，或让材料读取返回可核对的根目录/绝对路径证据；拒绝中途重绑定。保留软链接、hardlink、容量、revision及历史回执保护，不通过取消hash提示来掩盖错配。正式回归应包含稳定根、A→B、A→B→A，以及客户端不会显示错误一致提示。

证据：私有探针`root ABA during material verification…`和`root ABA response passes real RPC schemas…`，两项业务断言失败；完整诊断含实际路径hash、返回hash、matchesReviewed和客户端反馈，见`probes-final.log`。选中反例连续三轮重复，结果一致。

### NH-R2 / P2：交接等待普通保存时，关闭取消未覆盖flush等待，绕过排空期限

位置：`packages/oasis-professional-service/src/client/workbench-store.js:89–101`及`1645–1657`，重点为92行。

新交接只在进入队列时检查一次handoff abort，随后直接等待`flushWorkspace`；abort监听直到flush之后才注册。`dispose()`先取消handoff，但在设置closing、建立disposePromise和启动disposeDrainMs期限之前，等待整个v340队列结束。于是队列中的只读交接若正等待普通Workspace保存，关闭无法进入原有有界排空流程。

复现：真实fixture/store/普通replace路径，将重命名触发的普通保存响应暂停；调用固定版本引用或保存文件打开，待它进入flush后关闭。配置`disposeDrainMs=10`ms，60ms观察时dispose仍未完成，必须释放普通保存才能结束。没有V340交接的同一普通保存控制组可按关闭期限结束。固定引用、原生文件打开各有一项反例，均失败；控制组通过。

另一个关联探针证明：在关闭期间释放flush后，代码仍调用一次`remote.v340`，此时signal已经aborted，因为缺少flush后的取消检查、取消事件又不会对晚注册监听器重放。此处只证明本地remote方法仍被调用；实际Connection/fetch可能拒绝已取消signal，本报告**不据此声称已传输网络请求**。本轮未观察到关闭后写入composer或打开文件，已有副作用末端守卫仍生效。

建议修复边界：只读交接的排队/flush/响应等待均纳入取消；关闭请求立即成为禁止新动作的边界，并让期限覆盖整个关闭过程。既有待保存草稿仍按原有最佳努力排空及失败保留规则处理，不擅自清除写队列或把未保存内容当成功。正式回归应分别覆盖引用和文件打开在排队、flush、RPC三个阶段的关闭，以及普通草稿、重复dispose和晚到响应。

证据：`handoff disposal while flushing…`、`native open while flushing…`、`closing during flush…`三项业务断言失败；`control: ordinary pending workspace persistence…`通过。选中反例连续三轮重复一致。原正式disposed用例只在RPC结果已取得、等待门闩期间关闭，未覆盖flush阶段。

## 2. 重点范围复审矩阵

| 范围 | 新鲜验证与结论 |
|---|---|
| 固定审核版本引用 | 双来源各自原版/修订版都审核并保存，分别按run/version/hash/receipt读取；正文来自所选仓库版本，物理文件改动不污染固定引用；跨版本回执拒绝。原17项覆盖项目、revision、未审核、未决、脏结果草稿、会话/输入/选择变化和重复插入。已确认NH-R2关闭等待遗漏。 |
| 当前文件变化提示 | 稳定根目录下，原文件一致、人工编辑后变化、另一已保存版本仍一致均正确；响应矛盾、错误身份、异来回执、软链接、hardlink和删除拒绝；固定引用在物理文件缺失时仍可读。已确认NH-R1往返根变化会错误提示一致。 |
| Markdown导出 | 原版/修订版正文和元数据中的execution.versionId精确；双来源_OIW命名、单次token、旧revision及预存同名文件无覆盖保持；失败后不产生版本回执或改变已有文件。没有添加第二套导出或宣称支持DOCX/PDF。 |
| 长稿退路 | 现有正式150000字符全稿通过、150001拒绝在本轮全量实际执行；浏览器验证完整只读textarea值等于累计全文，按钮禁用、未截断说明及保存/打开/变化提示保持。私有中文/emoji长稿按UTF-8限制完整导出并可有界核验；物理文件增长到1MiB+1后拒绝，容量保护未放宽。原生固定文件引用芯片仍未支持。 |
| 旧数据兼容 | 未标格式单草稿、按版本旧草稿和新core草稿共存；原旧稿/原审核与回执保留，原版交接受锁，新修订版明确审核后可引用/保存/打开。未分版本旧completed记录仍需明确审核，原结果保持。三份旧empty-upstream prepared/unknown/failed原夹具经新读取路由拒绝，无重放、无写盘，重开完全一致。新values-v1与旧完整快照的正式回归在本轮全量执行；不外推为旧安装包能读取新记录。 |

未发现其他已确认P1/P2，不等于所有未测时序、平台或真实宿主路径无问题。长稿原生文件芯片及实际Sidebar/composer仍为明确未验证范围，不作为新增回归发现重复计数。

## 3. 本轮验证与原始证据

私有证据目录：`.local/stage5-native-handoff-reaudit-20261023/`。固定工具为仓库`tools/bin/node`（Node24.21.0）及`tools/bin/npm`；全部fixture与文件为临时公开合成数据。

| 核验 | 结果 | 证据 |
|---|---|---|
| 主包正式全量 | 998/998，失败/取消/跳过均0，退出0 | full.log |
| Mac启动/Markdown/Sidebar安全预览静态合同 | 26/26，退出0；未启动应用 | mac.log |
| 旁置新构建 | 退出0，client SHA256 `457f7d68ee652a05e90cdcb0143bd73fab986dfe1b536eb6d9f8e2890fa332f4` | build.log、build/ |
| 新src/lib配对候选合同 | 9/9，退出0 | contracts.log、package/ |
| 离线pack dry-run | 120成员，退出0，无测试/依赖/本地状态/归档夹带 | pack.json |
| Chrome ReactDOM/StrictMode→真实RPC/store→临时磁盘 | local-skill、oasis-api、long共3/3；native文件动作及composer动作接口为合成 | browser-results.json、组件核验截图 |
| 私有补充探针 | 16项：11通过、5个业务断言失败，失败归并2项P2；取消/跳过0，退出1 | probes.test.mjs、probes-final.log |
| 定点反例重复 | 每轮6项：控制组1通过、5项失败；三轮均退出1 | counterexamples-final-1/2/3.log、repeat-final-exits.json |

关键命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test tests/macos-development-launch.test.mjs tests/macos-safe-preview.test.mjs tests/native-markdown-policy.test.mjs tests/sidebar-safe-file.test.mjs tests/web-markdown-policy.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 .local/stage5-native-handoff-reaudit-20261023/probes.test.mjs
```

旁置构建从业务包目录运行固定node/tsdown，并显式指定`--out-dir ../../.local/stage5-native-handoff-reaudit-20261023/build`。pack仅对旁置配对候选使用offline/ignore-scripts和空独立配置，不安装或发布。

### 工具操作与夹具错误单列

初始多版本探针假定元数据名为`.meta.json`，两项因ENOENT失败；改为直接读取真实manifest的application/json路径后通过。`probes-initial.log`保留，不将其计为产品缺陷。

浏览器核验准备时，复制脚本工作目录错误，未创建预期浏览器配置；随后的tsdown在缺失配置路径下回退到业务默认配置，将活跃lib/client.js及map重建。本轮立即检测，按baseline SHA256从此前已有完整备份逐字恢复，两文件分别为`2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`及`620de0b77787200e2055b7d7ef5c82fbb7f23f56b3d536437d58dd81f0afce54`。误操作日志及恢复前后hash/原件路径保存在`browser-build-misdirected.log`、`lib-restoration.json`；不将该次构建当作旁置构建证据，也不隐称活跃lib从未被写入。恢复后的最终字节与本轮起点一致。

首次pack工具相对路径多一层导致退出127，没有执行npm；纠正路径后离线dry-run退出0。该工具定位错误不计入产品发现。后续浏览器构建使用已存在的明确配置，产物仅进入私有browser目录；3场景新鲜执行完毕。临时页关闭，仅向已核对命令身份的本轮自建loopback PID发送SIGTERM，服务退出0并清理自身临时项目。

## 4. 保全、限制及后续

起点3294份Git已跟踪或非忽略文件的SHA256记录于baseline.json。最终只对`docs/project-current-state.md`前置本轮审计摘要，原状态全文为精确字节后缀；新增本报告。原产品源码、正式测试/夹具、计划、既有收口/FAIL证据、锁/资源/pin及恢复后的活跃lib均与起点相同；HEAD不变。旁置候选源码与当前src逐文件一致，源映射与当前客户端源码匹配。最终清单见preservation.json、audit-summary.json。

公开新版生成入口仍关闭，新增路由仍只有54条中的两个只读交接路由。所有新增私有探针未迁入正式测试，避免把本轮失败反例伪记为正式回归已补齐。两项P2需要下一轮修复并补正式回归后再复审；本轮没有进入B批或其他后续实施。

真实Desktop、Sidebar安全打开、真实composer、正常重启、跨进程排他及安装/升级/降级均未执行。本轮代码/合成证据不替代这些验收，也不代表阶段5整体完成。
