# 阶段5关闭隔离及同步重入修复全面复审

日期：2026-10-23，Asia/Shanghai。绑定项目`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD保持`84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：两项原P2及复审补修的直接反例仍被有效阻断，但确认3项本范围P2覆盖遗漏，不能继续沿用上一轮“本范围未遗留已确认P1/P2”的完整收口结论。** 三项均在修复前基线及当前版本复现，未确认本轮两处store修改新引入回归。本轮只审计，未修复产品源码或改正式测试。

正式主包1029/1029（含本轮复审对象17项新增及原14项P2回归）、Mac静态26/26、旧数据补充11/11、配对候选合同9/9、旁置构建与离线120成员包均通过；另加私有边界探针12项，8通过、4个业务断言失败，归并下述3项P2。正式绿灯没有覆盖这四个触发时序。

未启动Desktop/实际DSH，未新增真实模型/API、登录、上传、计费或对话发送；未安装/升级、变更应用/Profile/pin/准入、提交/推送/发布或进入后续批次。本轮没有浏览器或loopback服务。旧AGENTS.md已由用户撤销，未读取或重新套用。

## 1. 已确认发现

### P2 / CI-R1：已移出项目的普通待发或在途保存未纳入关闭排空

位置：`packages/oasis-professional-service/src/client/workbench-store.js:1662–1664`、1675；清理点1683–1696。

关闭捕获`knownWorkspaceIds ∪ v340Queue.keys()`。项目移出且只有普通pendingDraft/drainPromise时，不在捕获集合；已有普通在途RPC也不会被等待。关闭可以立即完成、清掉定时器和草稿、取消共享写入signal，甚至尚未触发原定10ms期限。仅扩大集合仍不够：1675也会跳过非known项目的flush。

本轮真实fixture、实际service/remote/仓库与临时JSON磁盘对照：

| 普通写入状态 | 未移出控制组 | 移出后关闭 |
|---|---|---|
| 防抖待发，saveDelayMs=400 | replace一次，新标题落盘 | 无replace，旧标题，内存与计时器清空 |
| 已派发，响应/写入门闩挂起 | 期限未到signal不取消，释放后落盘 | 期限未触发signal已取消，释放后不能提交，旧标题 |

移出后重新加入再关闭的控制组可以按原revision保存，进一步确认缺口与关闭期间项目身份脱钩有关。基线与当前有同样失败，属于原有生命周期遗漏，非本轮新增。新增正式移出测试仅覆盖V340在途RPC，漏掉普通待发/在途状态。

建议将已接受普通保存的生命周期与可见项目列表分开，捕获并等待其实际待发/在途工作；仍核验原项目身份、路径、revision及共享期限，不能通过放宽Host校验或推迟总期限解决。

### P2 / CI-R2：移出后已入队的后续V340写入仍未落盘

位置：`workbench-store.js:498–501`、894；关闭清理点1694–1696。

第一份V340写入已经提交Host但响应挂起，此时第二份saveV340Draft已被接受进入同项目queueV340。随后移出项目并关闭，在期限内释放第一份。身份并集确实等待该队列，但第二份回调进入runPageOperation时，500行assertKnown拒绝，未派发RPC。最终只有第一份输入落盘，第二份影子随关闭清空。

真实磁盘对照：未移出时两次task/draft均调用，第二份落盘；移出后仅第一份调用，磁盘仍第一份，两份调用者都可能得到known Workspace错误。问题是**第二份已接受内容没有保存或关闭后恢复副本**，不是把第一份已经披露的调用者错误本身当作回归。当前会话没有“移出项目即放弃全部已接受未派发写入”的批准策略。

该执行校验及失败在基线也存在，属于本范围尚未补齐。上一轮补修测试覆盖单个在途写入，没有覆盖已接受但尚未派发的第二份。建议为已接受队列保存绑定项目的执行上下文，同时继续拒绝关闭后的新公共动作；不应简单移除known/路径/revision防护或允许跨项目重定向。

### P2 / CI-R3：同项目交错编辑触发冲突后，关闭清掉“已保留”的本地草稿

位置：`workbench-store.js:519–520`、484–495、1685–1696；UI可达点`src/client/PanelPages.js:131–135`。

V340保存RPC在途时接受renamePage，然后关闭，再于期限内释放RPC。保存响应检测到editGeneration变化，进入preserveDraftConflict；该函数清掉pendingDraft，保留带新标题的内存状态并返回`revision-conflict`，错误称`local draft retained`。随后关闭flush没有pendingDraft可发，最终states/runtimes清空，磁盘仍旧标题，本地修改消失。

未关闭控制组确实保留conflict状态与新标题，可供恢复；关闭组没有磁盘新标题，也没有本地恢复状态。两组V340输入均成功落盘，普通replace均未调用。基线和当前相同。名称输入仅按ready/saving禁用，未按activeOperation禁用，因此不是仅能通过非法内部调用触发的情形。

正式同项目顺序用例只覆盖“普通标题先保存，再两份V340按revision顺序保存”，漏掉“V340在途后接受普通编辑”以及冲突后立即关闭。建议保留或持久化冲突草稿再清理，或完整协调普通保存与V340的已接受顺序；不能取消冲突保护、盲目覆盖Host新版本或把allSettled当作保存成功。

## 2. 用户重点范围复核

| 范围 | 结果 |
|---|---|
| 跨项目排空 | 原A挂起+B普通草稿用例通过；新补A挂起+B已接受V340写入、B水合期间已接受普通动作的期限内/后对照通过。失败项目不阻挡独立项目的原正式用例通过。 |
| 项目移出后已接受写入 | 原单个V340在途写入期限内/到期用例通过。普通待发/在途遗漏CI-R1，已入队第二份V340遗漏CI-R2，不能称所有已接受写入均完整排空。 |
| 同步重入取消 | 固定引用和native open在同步订阅者dispose后无新读取RPC；同回调已接受写入继续排空。原迟到响应、排队取消及关闭后拒新动作均通过。未确认该保护新回归。 |
| 同项目顺序 | 普通先、两份V340后的连续revision通过；V340在途后的普通编辑冲突闭环存在CI-R3。移出后的队列次序还受CI-R2影响。 |
| 关闭期限 | 单一期限、重复dispose同Promise、0ms、flush/队列/读取/摘要迟到及独立B水合迟到不复活状态通过。CI-R1表现为尚未到期就遗漏并取消普通在途工作，不是总期限变长。 |
| 容量保护 | Host/材料/快照/结果/schema源码保持；文件1MiB、输入快照2MiB、Workspace8MiB及150000字符引用边界未放宽。正式容量/UTF-8/长稿退路通过。 |
| 旧数据兼容 | 原legacy、empty-upstream、compact、旧草稿及11项补充兼容通过。旧单/分版本/core共存、审核版本/回执/Markdown导出/重开保持；未迁移或覆盖历史数据。不等于遍历所有历史磁盘版本或旧包读取新编码。 |
| 新增17项正式回归 | 全量实际执行，字节与上一轮及撤回副本一致；能够阻断原两项及单个移出V340补修反例，但没有上述4个时序。私有失败探针尚未纳入正式回归，本轮不冒称补齐。 |

未确认其他本范围P1/P2，也未确认本轮两处修改引入新的回归；这不抵销已确认的三项原有遗漏。

## 3. 新鲜证据与复现

证据目录：`.local/stage5-native-close-isolation-reaudit-20261023/`。

| 核验 | 本轮结果 | 日志 |
|---|---|---|
| 正式主包全量 | 1029/1029，失败/取消/跳过0，退出0 | full.log |
| Mac静态合同 | 26/26，退出0，未启动应用 | mac.log |
| 旧数据/多版本补充 | 11/11，退出0 | compatibility.log |
| 新边界及控制探针 | 12项：8通过、4业务失败，归并3项P2；取消/跳过0，退出1 | boundary-probes.log、removal-probes.test.mjs |
| 修复前基线对照 | 9项：5控制通过、相同4项失败，退出1 | baseline-boundary-probes.log、baseline-package/ |
| 当前四反例连续重复 | 每轮4项全部业务失败，三轮退出1 | counterexamples-1/2/3.log、repeat-exits.json |
| 原修复三组旁置撤回重跑 | 队列13项9通过4失败；signal4项全失败；移出身份2项全失败，三组退出1 | withdraw-queue/signal/membership.log |
| 旁置构建 | 退出0 | build.log、build/ |
| 配对候选合同 | 9/9，退出0 | contracts.log、package/ |
| 离线pack dry-run | 120成员，退出0，无测试/依赖/本地状态夹带 | pack.json |
| 一次新上下文只读复审 | 独立确认相同3项遗漏；定点31/31及兼容/容量/冲突25/25通过 | fresh-review.md |

基线9项采用与当前相同fixture/控制和探针代码，仅store导入切为上一轮修复前src快照。未用旧HEAD替换含未提交阶段5功能的基线。新增独立跨项目正向用例是当前修复效果核验，不混入上述基线9项。

主要命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 .local/stage5-native-close-isolation-reaudit-20261023/removal-probes.test.mjs
```

原撤回测试新鲜重跑仍能阻断原问题，只证明其对应保护有效，不能据此推导未覆盖时序无缺陷。没有把导入/初始化失败、超时取消或缺文件算作本轮缺陷复现。

## 4. 保全与结论限制

起点3303份已跟踪或非忽略文件SHA256及当前src冻结。产品源码、17项新增正式测试/原测试/夹具、既往计划/收口/审计/FAIL、Host容量/兼容代码、资源/锁/pin及活跃lib保持；本轮只给current-state前置新复审摘要，并新增本报告。旧状态原文作为精确字节后缀保留，HEAD不变。机械清单见preservation.json、audit-summary.json。

store SHA256保持`3b7fad1a786d3ecfb6b5dbb8704a6461f71ddecaa788b5b8878895bf37502fe3`；旁置client保持`c99aaf1c38064ce72f8dbd3913b1adb9f06e1112183804c32ec591e5a12fa55a`。候选src逐文件等于当前源码，source map中46份项目源码原文相同。没有用更新活跃lib或放宽准入绕过验证。

审查未将以下事项冒充通过：入队前同步通知的接受边界、忽略abort的Host后续提交是否回滚、检查到原生打开之间所有文件系统变化、全部历史数据编码、真实Desktop AbortSignal/native/composer和阶段5整体验收。第一份移出V340的known调用者错误单独不算新增缺陷；取消不能证明Host回滚。新上下文审查不等同第三方正式审计。

后续应先修复三项遗漏并补正式红绿回归，再复审关闭闭环；本轮未自动执行修复或后续批次。阶段5整体仍未完成。
