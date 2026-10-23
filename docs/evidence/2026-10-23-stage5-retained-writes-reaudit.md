# 阶段5三项P2修复及复审补修全面复审

日期：2026-10-23，Asia/Shanghai。绑定项目 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：确认1项P2（RW-A1），包含一个新增静默成功丢页回归和同根的CI-R3覆盖遗漏。不能维持上一轮“本轮明确范围未遗留已确认P1/P2”的收口结论。** 原项目移出排空、公开及旧页面flush、同步重入、关闭期限的指定正式回归通过，未确认第二项独立问题；这不抵消条件建页反例。阶段5整体未完成。

本轮仅审计，未修产品源码或正式测试。未启动Desktop/实际DSH、浏览器或loopback服务，未新增真实模型/API/provider、登录、上传、计费或对话发送；未安装/升级依赖、修改Profile/pin/应用/准入，未提交、推送或发布。旧AGENTS.md已被用户撤销，未读取或恢复。所有RPC证据均为本地fixture/service/remote与临时JSON磁盘，不代表真实宿主或用户验收。

## 1. 已确认发现

### [P2] RW-A1：原始open-panel命令重放跳过已接受的普通建页效果

**位置：** `packages/oasis-professional-service/src/client/workbench-store.js:491–496`；动作记录 `:591–599`。条件来源 `src/client/workbench-model.js:161–163`。V340任务创建在store `:1008` 调用权威状态替换并重放。

触发：空项目接受首个V340任务创建，Host已提交但响应暂未回到store；此时普通 `openPanel` 看到客户端没有页面，实际创建普通页并返回稳定pageId。响应到达后权威状态已有新Host任务，重放原始 `open-panel` 再次判断 `pages.length === 0`，因此跳过先前已接受的普通建页。保留ID和时间不足以保留条件命令第一次执行产生的效果。

| 变体 | 当前实现的实际结果 | 本轮修复前store对照 | 判断 |
|---|---|---|---|
| openPanel建普通页，不再编辑 | V340调用成功，普通replace `committed=true`；客户端ready，普通页立即消失；关闭后磁盘仅Host任务 | 调用拒绝revision-conflict，客户端仍保留普通页并标记conflict；关闭后普通页未落盘 | **新增回归：由可见冲突变为静默报告成功且丢页** |
| openPanel建普通页后改名 | 重放rename抛unknown page；旧revision普通replace被拒绝；客户端暂保留冲突页，关闭后未落盘 | revision-conflict，关闭后同样未落盘 | **CI-R3覆盖遗漏**，不能把原有关闭丢失全算新增 |
| 显式createPage，无改名/有改名 | 两项均成功，Host页与普通页、标题真实落盘，各ID只生成一次 | 两项均revision-conflict | 正向对照，证明修复部分有效，条件建页另有遗漏 |

两个失败变体属于一个根因，合计1项P2。Host创建的V340任务没有被删除，未发现其冻结结果证据受损。该问题没有外部writer、容量拒绝或磁盘失败，不能归入原收口报告的排除范围。

**入口可达性：** 关闭最后普通页后，`PanelChrome.js:178` 的功能中心入口仍存在，`PanelPages.js:117` 在无page时仍呈现V340创建入口；创建在途期间，standalone的 `WorkbenchEntry.js:59` 仍可调用openPanel，其 `:66` 禁用条件未含v340Creating；`PanelPages.js:131` 在ready/saving时允许改名。此处为源码入口核对，未运行Desktop。

**正式回归遗漏：** 新28项的 `v340-retained-writes.test.mjs:193` 使用显式createPage，不涉及条件变化；`:207` 的V340任务创建起始已有任务，仅重命名已有页。二者都没有覆盖“空列表→Host建页在途→openPanel隐式建页”的语义变化。现有撤回证据证明已测路径有敏感性，不能证明该未测边界正确。

**后续修复要求（本轮未实施）：** 保留第一次执行open-panel实际产生的建页效果和稳定身份，再按序重放依赖编辑；不能只原样重放条件命令。补正式无后续编辑、后续改名及显式建页对照，要求真实磁盘包含普通页和Host页，并保持CAS、配额、旧数据及关闭期限保护。

## 2. 指定范围逐项核对

| 范围 | 源码与当前证据 | 有限结论 |
|---|---|---|
| 移出后的普通保存 | dispose捕获known/runtimes/queue身份并集；内部使用保留状态；正式防抖、在途、水合、移出重加及晚响应回归通过 | 未确认此原修复新增问题 |
| 已入队V340移出 | 公共新动作仍要求当前known，接受队列保留执行资格与revision；输入/结果草稿、任务创建、读取取消正式回归通过 | 保留执行和新准入分离保持 |
| 同项目交错编辑 | 普通防抖暂停，成功Host响应后重放，下一V340前普通排空；显式创建及重命名对照通过 | **条件建页RW-A1未闭合** |
| 公开flush | 等待队列后再内部flush；新增同tick立即public flush私有用例实际磁盘通过 | 未发现抢先发送旧revision或自等待 |
| 旧页面flush | 队列Map整个生命周期检查显式owner；正式忙碌拒绝/重试、同tick窗口通过；私有最终普通排空期间仍busy且public flush等待，之后旧material操作重试落盘 | 本轮补修支持保护覆盖至最终排空 |
| 跨项目独立性 | 原正式并行期限用例通过；私有B旧material操作在A V340响应受阻期间独立成功并落盘 | 未确认新增跨项目串行阻塞 |
| 同步重入 | 普通保存、权威重放、水合发布后使用getCurrent；正式更晚编辑、失败路径及移出关闭用例通过 | 未确认另一个已复现覆盖遗漏 |
| 关闭期限 | 单一disposePromise/总期限，接受写入独立等待，期限后取消与清理；正式晚响应/无新RPC/引用打开重入取消通过 | 仅证明本地合成边界；不推断Host忽略abort会回滚 |
| 容量与历史兼容 | Host路径、schema、repository/迁移、配额代码字节未变；正式全量及兼容补充通过 | 没有发现放宽保护或迁移旧证据 |

文件1MiB、输入快照2MiB、Workspace记录8MiB和固定引用150000字符限制保持；相关定义见 `src/v340-runtime-contract.js:5–6`。旧empty-upstream prepared/unknown/failed、旧单/分版本结果与core草稿、明确审核要求、Markdown确认/碰撞、长UTF-8及硬链接/删除拒绝均获得本轮正式或补充验证支持。不声称历史磁盘编码和文件系统时序已穷尽。

## 3. 新鲜验证与反例证据

目录：`.local/stage5-retained-writes-reaudit-20261023/`。使用仓库固定Node和现有依赖；未安装。下列作者验证均在当前冻结store与正式新28测试hash上执行。

| 检查 | 结果 | 证据 |
|---|---|---|
| 正式主包全量，含新增28项 | **1057/1057**，失败/取消/跳过0，退出0 | full.log |
| Mac启动/Markdown/Sidebar静态合同 | 26/26，退出0，未启动应用 | mac.log |
| 旧数据及多审核版本补充 | 11/11，退出0 | compatibility.log、compatibility-probes.test.mjs |
| 新边界探针 | **7项5通过2业务失败**，退出1，取消/跳过0 | boundary-final.log、replay-boundary-probes.test.mjs、owner-boundary-probes.test.mjs |
| 修复前同4个建页变体 | 4项均业务失败、revision-conflict；退出1 | baseline-replay-final.log、baseline-package/ |
| 两个openPanel变体连续三轮 | 每轮2项均业务失败，退出1，取消/跳过0 | repeat-open-panel-{1,2,3}.log、repeat-exits.json |
| 独立审查者的另一套探针，作者复跑当前/旧store | 各2个业务失败；捕获关闭前client状态，区分新增静默成功与原有冲突 | independent-current.log、independent-before.log、independent-replay-probe.mjs |
| 旁置构建 | 退出0；115份候选src逐文件相等；map中46份项目源码相等 | build.log、build/、package/ |
| 候选src/lib合同 | 9/9，退出0 | contracts.log |
| 离线pack dry-run | 120成员，退出0 | pack.json、pack.stderr.log |
| 新上下文只读复审 | 报告59项指定正式及29项容量/旧结果正式均通过，独立确认同一P2 | fresh-review.md；其反例由作者另行复跑 |

不将私有反例算作正式28项扩增，不把预期失败计为绿灯。基线来自 `.local/stage5-retained-writes-repair-20261023/before/src/`，旧store原hash为 `3b7fad1a786d3ecfb6b5dbb8704a6461f71ddecaa788b5b8878895bf37502fe3`；原源码未动。独立before临时模块只改import指向同字节依赖；未覆盖原证据。旧八组撤回16个业务失败日志及正式测试均原字节保留，本轮未将历史撤回冒充新鲜执行。

主要正式命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
```

补充兼容只选择既定11个正向用例，不运行该历史探针文件中属于已知旧问题的其他用例；具体选择见audit-summary.json。新反例使用实际service、remote、repository及临时磁盘，仅在响应/调度边界控制时序。全部失败为业务断言，不是导入、取消或夹具失败。

## 4. 冻结、保全与结论边界

- store SHA256：`e74a4d2609ff8e7ddb3ff8414d9c9a8ed69442376078fa6fbab1ccc162323638`。
- 新28正式测试SHA256：`58e6737a44847dfaf73c5f229263c17944189c2a0ccefd64bad4a9e7b69978c7`。
- 当前旁置client SHA256：`15012604380e66344e4d157157b437ce7987f0c2d14cddb730e24cb1d83c5d8a`。
- 作者最终建页探针SHA256：`f5d102d65b32ab0e1d958cd5dd3532fc678b6dc98de5dcb7bd8dc5f79b1209e3`。

起点冻结3307份已跟踪/非忽略文件。3306份保持原字节；唯一旧文件变更为 `docs/project-current-state.md` 的前置复审摘要，旧全文保持精确字节后缀。唯一新增非忽略文件为本报告。产品源码、正式测试/夹具、新28项、旧计划/收口/审计/FAIL、Host容量与历史编码、锁/资源/pin、活跃lib及HEAD均保持。详见preservation.json和audit-summary.json；不修改上一轮报告，使用本报告及当前状态前置摘要明确收窄其结论。

本轮没有自动修复RW-A1，未扩展为入队前全部legacy操作统一事务、外部冲突/磁盘/配额失败跨关闭恢复、真实Desktop/native/composer或阶段5整体验收。当前候选仍有1项确认P2，应修复并补正式回归后再复审。
