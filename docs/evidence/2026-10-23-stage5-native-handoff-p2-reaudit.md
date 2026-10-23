# 阶段5两项P2修复全面复审

日期：2026-10-23，Asia/Shanghai。项目 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD保持`84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：原A→B→A路径/hash绑定及关闭后迟到编辑续写保护保持有效，但关闭排空与取消仍有2项已确认P2，不能沿用上一轮“未遗留本范围已确认P1/P2”的完整收口结论。** 本轮正式主包1012/1012（含新增14项）、Mac26/26、旁置候选合同9/9、兼容探针11/11通过；新边界探针10项7通过、3项业务断言失败，归并为下述2项P2。

本轮只复审，不修复产品源码或改正式测试。一次新上下文只读审查独立复现两处问题，作者再以真实RPC/仓库/临时磁盘验证；均为代码及本地合成证据。未启动Desktop/实际DSH，未新增真实模型/API、登录、上传、计费或对话发送，未安装/升级依赖、变更Profile/应用/准入或提交/推送/发布，未进入B批。此前旧AGENTS.md已被用户撤销，本轮不恢复其规则。

## 1. 已确认发现

### P2 / NHP2-R1：全局队列阻挡独立项目的已接受保存，期限清理后丢失本地修改

位置：`packages/oasis-professional-service/src/client/workbench-store.js:1667–1669`；清理点为1680行。

关闭先等待所有Workspace的`queuedDrains`，之后才启动所有Workspace的普通保存flush。A的V340写入响应若挂起，B的普通保存也被全局屏障挡住。若B仍处于防抖期间、关闭期限先到，B从未获得保存尝试就被清理pendingDraft和客户端状态。

本轮使用真实同一磁盘仓库内的a/b记录、两个已注册临时项目、真实service/remote/store进行对照。两分支均采用受支持的`saveDelayMs=400`、`disposeDrainMs=10`及手动期限调度：先接受A写入，再接受B重命名，随后关闭；只改变A的响应是否挂起。无A挂起时，B可以立即flush并保存；有A挂起时，到期限结束B没有replace调用，缓存和实际JSON磁盘仍为旧标题，客户端已清空：

| A响应 | B保存调用 | 仓库/磁盘B标题 | 关闭后客户端 |
|---|---|---|---|
| 正常完成（控制组） | `['b']` | B已接受的独立标题 | 已清空 |
| 挂起（失败反例） | `[]` | B原始标题 | 已清空 |

这与A自身未确认写入无法被强制结束不同：B本可保存，实际没有得到尝试。该问题不依赖放宽容量或丢失历史Host证据，但会丢掉尚未写盘的B修改。配置均为现有公开可用值；不声称每个默认配置的关闭都会触发同样丢失。

建议修复：按Workspace保持其内部队列顺序、独立推进其普通排空，共享整个关闭期限；不能让某个Workspace的挂起队列抑制其他Workspace的可完成保存。保留对同一Workspace的revision/冲突保护、到期取消及失败不伪记成功。正式回归应补A挂起+B可写的控制与反例，包含防抖窗口、独立写入失败及同项目顺序。

证据：`matrix-probes.test.mjs`的`independent B draft…`两分支、`boundary-probes-final.log`、连续三轮`counterexamples-*.log`。新上下文审查的独立内存仓库对照与上述实际磁盘结果一致。

### P2 / NHP2-R2：状态通知同步重入关闭后，仍发起已取消的交接读取调用

位置：`packages/oasis-professional-service/src/client/workbench-store.js:101–102`；调用边界检查在128–132行。

`updatePageOperation(...activeOperation:'v340-handoff')`同步通知订阅者。若订阅者在该通知中调用dispose，handoff signal立即aborted，但内部closing为了排空已接受写入而仍为false。下一行callV340只检查closing/disposed，没有再检查这个交接signal，因此仍调用remote.v340。

真实fixture/RPC/store分别验证固定引用和文件打开，两种情况都记录一次取消后调用：

```json
{"kind":"reference","calls":[{"action":"result/conversation-draft","aborted":true}],"disposed":true}
{"kind":"open","calls":[{"action":"result/saved-file","aborted":true}],"disposed":true}
```

两次交接最终都返回false，composer和native open没有副作用，仓库磁盘未变，关闭也已完成。本发现证明的是**已取消后的读取调用仍被发起**；不证明实际网络传输或真实模型/API执行。现有remote继续把signal传给connection.rpc.call，具体传输层可能拒绝已取消signal，但store未满足取消后不再派发的本层约定。

建议在可同步重入的状态发布之后、读取调用前复核交接取消状态，或在适当调用边界拒绝已取消signal。不能简单把disposePromise非空当作所有旧写入的拒绝条件，否则会破坏已接受写入的期限内排空。正式回归应补引用/打开两个同步重入触发点，并继续验证没有native副作用、无晚到回填及重复dispose保持同一Promise。

证据：`reentrant-probes.test.mjs`、`boundary-probes-final.log`，两项预期业务断言失败；连续三轮相同。新上下文审查另用内存探针独立确认固定引用的同一缺口。

## 2. 用户重点范围逐项复核

| 范围 | 本轮结果 |
|---|---|
| A→B→A路径/hash绑定 | 新正式双来源用例通过；另用真实inspect前后切根而非依赖get调用次数，双来源均正确拒绝，未修改固定版本或磁盘记录。核验成功后持续换根仍由末端路径检查拒绝。 |
| 关闭期限与已接受排空 | 单项目排队/flush/RPC阶段、重复dispose及新动作拒绝的正式用例通过；零毫秒期限补充探针通过。跨项目已接受普通草稿发现NHP2-R1，不能称排空全面完成。 |
| 迟到编辑续写 | 正式摘要在期限后完成用例通过；新增相反方向探针确认期限内完成的已接受编辑仍能创建一个待审核修订，原已审核版本及回执保持。未复现关闭期限后编辑写RPC。 |
| 取消读取与迟到响应 | 原正式用例通过；同步通知回调重入dispose发现NHP2-R2。无composer、native open或关闭后状态回填。 |
| 新增14项正式回归 | 本轮全量实际执行14项，全部通过；核对原红绿/撤回证据及当前测试hash保持。14项仅使用单一Workspace a，关闭发生在turn/门闩等异步边界，遗漏跨Workspace隔离及状态发布中的同步重入；3个失败私有探针明确显示盲区。未把私有失败探针算成正式回归已补齐。 |
| 容量保护 | 原文件1MiB、材料/快照2MiB、Workspace8MiB及150000字符引用边界源码未改，正式容量/长稿用例通过；新磁盘探针确认正好1MiB可读取并给实际hash，中文UTF-8超限拒绝且不改冻结记录。 |
| 旧数据兼容 | 原正式legacy/values-v1/unknown/草稿/审核/无覆盖保存测试及11项补充兼容探针通过。旧单草稿/按版本旧稿/core共存、三份empty-upstream prepared/unknown/failed新读取路由拒绝无重放/写盘并重开保持，未分版本completed仍需明确审核，原版/修订版及各自回执保持。未放宽数据准入或迁移历史记录；不外推为旧包读取新编码。 |

未发现其他已确认P1/P2。未测时序和真实宿主不在“全部无问题”承诺内。

## 3. 本轮新鲜证据

目录：`.local/stage5-native-handoff-p2-reaudit-20261023/`。使用固定仓库Node24.21.0/npm；所有运行均为合成执行器、临时磁盘或静态合同。

| 核验 | 结果 | 日志 |
|---|---|---|
| 正式主包全量 | 1012/1012，失败/取消/跳过0，退出0；含14项新回归 | full.log |
| Mac启动/Markdown/Sidebar安全预览静态合同 | 26/26，退出0；未启动应用 | mac.log |
| 本轮边界探针 | 10项：7通过、3个业务断言失败，归并2项P2；取消/跳过0，退出1 | boundary-probes-final.log |
| 定点重复及控制 | 每轮4项：控制组1通过、3项失败，三轮均退出1 | counterexamples-1/2/3.log、repeat-exits.json |
| 旧数据及多版本兼容补充 | 11/11，退出0 | compatibility.log |
| 旁置构建 | 退出0，client SHA256 `0287c4b8e86f4a4e42e1609c55493bf3d716f3b601c1e1f7d51da296f0eb8116` | build.log、build/ |
| src/lib配对候选合同 | 9/9，退出0 | contracts.log、package/ |
| 离线pack dry-run | 120成员，退出0，无测试/依赖/本地状态/归档 | pack.json |
| 新上下文只读代码审查 | 独立确认同样2项P2；不等于第三方正式审计 | fresh-review.md |

主要命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 .local/stage5-native-handoff-p2-reaudit-20261023/reentrant-probes.test.mjs .local/stage5-native-handoff-p2-reaudit-20261023/matrix-probes.test.mjs
```

新增边界探针先分别执行，再统一运行；补强B项目注册及实际磁盘标题核对后，最终日志与三轮重复使用最终探针版本，失败均为业务断言。没有以初始化、导入、超时取消或文件缺失作为缺陷复现。

本轮未另开浏览器或新建loopback服务；此前组件3/3仅属上一轮历史证据，不在本轮表中冒充新鲜结果，也不能抵销本次发现。真实Sidebar/composer仍未验。

## 4. 保全、审查边界与后续

起点3298份Git已跟踪或非忽略文件SHA256及当前src快照已冻结。本轮产品源码、正式测试/夹具、原修复计划/收口与审计/FAIL、锁/资源/pin及活跃lib全部保持；仅给project-current-state前置本次复审摘要，旧状态全文作为精确字节后缀保留，另新增本报告。HEAD不变。最终候选src与当前源码逐文件一致，源映射含当前项目源码原文。清单见preservation.json及audit-summary.json。

新上下文审查仅将真实Desktop/DSH、真实provider/网络传输，以及阶段5整体批准/用户验收/部署留作本次范围外：作者确认这些确实未执行。若把本轮调用探针当作真实外传验收，或把代码/合成结果当作实机与整体阶段批准，将超出证据。除此没有隐藏或延期的审查发现。

后续应先修复跨项目排空隔离和同步重入取消，补入正式回归，再复审关闭收口；本轮未自动修复或执行后续批次。阶段5整体未完成。
