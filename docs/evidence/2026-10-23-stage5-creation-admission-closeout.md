# 阶段5创建初始通知P2修复及同根补修收口

日期：2026-10-23，Asia/Shanghai。项目 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：OP-A1已修复。创建任务在首次同步通知前登记队列，初始通知中的关闭不再提前取消；移出项目后已接受创建继续执行并最终清除busy，重加可再次创建。复审发现输入/结果草稿保存同根遗漏，已在本轮先补正式红测再修复。最终新增16项正式回归，正式全量1089/1089通过，独立新上下文复审最终133项正式及12项私有通过，指定范围未确认未解决P1/P2。** 这不代表阶段5整体、Desktop或真实API验收完成。

本轮未启动Desktop/实际DSH、浏览器或loopback，未新增真实模型/API/provider、登录、上传、计费或对话发送；未安装/升级依赖、修改应用/Profile/pin/准入、提交、推送或发布。所有service/remote/repository及RPC证据均为本地合成fixture和临时磁盘。旧AGENTS.md已撤销，未读取或恢复。

## 1. 根因与最终实现

起点 `docs/evidence/2026-10-23-stage5-open-panel-replay-reaudit.md` 的OP-A1：创建初始v340Creating通知先于queueV340。订阅者同步关闭时dispose捕获不到该创建；期限未触发便结束关闭并abort已经开始的任务。同步移出导致queue.assertKnown拒绝且没有进入finally，重加后busy未复位。

产品只修改 `packages/oasis-professional-service/src/client/workbench-store.js`。三入口统一使用既有队列的同一顺序：先创建并登记job，再同步发布本地状态，最后返回同一job：

- createV340Task：先登记创建，再发布v340Creating=true。重复创建仍busy拒绝，不重复分配ID；已接受任务可以在移出后完成，并由原finally清除busy。
- saveV340Draft：先登记输入草稿写入，再发布v340InputDraft。
- saveV340ResultDraft：先登记结果草稿写入，再发布v340Edits。

后两项由本轮作者正式4红与审查者独立磁盘反例确认，并非仅凭相似代码扩大修改：原先初始通知同步关闭也会未到期限提前abort，草稿没有保存；同步移出也会拒绝先前已接受的保存。两入口同样只调整登记/通知顺序及保留原job返回，不改变草稿清理条件。

没有新增队列、自动重试或另一套期限。原queueV340、保留身份、同项目串行、public flush等待及legacy owner、dispose快照/共享期限/transport取消边界未改。openPanel实际效果记录及一编辑一记录、稳定ID/时间、后续改名重放代码原字节保持；Host、schema、repository和磁盘格式未改。

## 2. 正式红绿与复审补修

新建 `packages/oasis-professional-service/test/v340-creation-admission.test.mjs` 共16项；原openPanel16、原retained28及其他正式测试/夹具字节不变。

| 新正式覆盖 | 数量 | 实际断言 |
|---|---:|---|
| 创建初始通知同步关闭，提交前/提交后响应gate | 2 | 释放前关闭pending、signal未abort、原100ms期限保持；释放后创建成功且Host任务真实落盘 |
| 同步移出、移出重加、移出关闭 | 3 | 已接受创建完成、busy最终false，未关闭时重加可再创建；不是放开移出后的新公开动作 |
| 初始关闭的原期限，提交前/提交后gate | 2 | 手动到期才取消，迟到不新增RPC或复活状态；已提交Host任务保留，不要求回滚 |
| 初始通知重复创建 | 1 | busy拒绝，不生成第二ID |
| 初始通知openPanel建页/改名后关闭或移出关闭 | 2 | 普通replace revision0→task/create revision1→最终普通replace revision2；普通页/标题/创建时间与Host页实际共存 |
| 初始通知public flush | 1 | 先等已登记创建，再报告ready |
| RPC开始后正常关闭对照 | 1 | 保持同一排空期限并真实落盘 |
| 输入/结果草稿初始通知同步关闭/移出 | 4 | 关闭保留期限，移出仍保存已接受草稿；原冻结结果证据保持 |

第一步在未修产品运行原12项：**3通过、9个业务失败**，退出1，取消/跳过0。创建入口最小修复后相关87/87与中间全量1085/1085通过。

同一次新上下文复审及作者检查确认两个相邻保存入口仍有同根漏洞；新增related4先运行得到**4个业务失败**，随后最小补修，最终相关91/91、全量1089/1089通过。独立审查者也在最终源码及最终16上重跑，不将中间候选绿灯冒充最终结果。

旁置撤回使用本轮before/src和最终正式16相同字节，重新观察**3通过、13个预期业务失败**，退出1、取消/跳过0。所有失败是丢失接受资格、提前结束关闭、未清busy或public flush提前完成等业务断言，不是导入或夹具错误。

## 3. 最终候选新鲜验证

证据目录 `.local/stage5-creation-admission-repair-20261023/`。固定仓库Node及现有依赖，无安装。

| 检查 | 最终结果 | 证据 |
|---|---|---|
| 新16与原相关正式定点 | 91/91，退出0，失败/取消/跳过0 | focused-final.log |
| 正式主包全量 | **1089/1089**，退出0，失败/取消/跳过0 | full-final.log |
| Mac启动/预览/Markdown/Sidebar静态合同 | 26/26，退出0，未启动应用 | mac-final.log |
| 旧数据、多审核版本、长稿补充 | 11/11，退出0 | compatibility-final.log |
| 原openPanel审计补充边界 | 10/10，退出0 | boundary-final.log |
| OP-A1原反例及正常对照，适配完成gate | 3/3，退出0 | ownership-current-final.log |
| 旁置撤回最终新16 | 3通过13预期业务失败，退出1，取消/跳过0 | withdraw-final.log |
| 旁置构建 | 退出0；115份候选src逐文件等于当前，map46份项目源码一致 | build-final.log、build-final/、package-final/ |
| 候选src/lib合同 | 9/9，退出0 | contracts-final.log |
| 离线pack dry-run | 120成员，退出0，无测试/依赖/本地状态夹带 | pack-final.json |
| 新上下文最终独立复审 | 正式112+21=133/133，私有10+2=12/12；before16同13业务红 | fresh-review.md及fresh-review-*.log |

正式主包命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
```

兼容补充选择既定11项正向用例，涵盖多审核版本各自回执、旧单/分版本/core草稿、Markdown确认/碰撞、长UTF-8、硬链接/删除拒绝、普通期限、旧empty-upstream prepared/unknown/failed不重放不写盘、未分版本completed需明确审核及重开；选择式记录于verification-summary.json。

未将私有反例或审查者检查计入新正式16扩增。原私有移出探针原先等待同步拒绝才释放gate，修复后变为合法的异步接受完成，首次复跑因此等待；该旧脚本停止并保留pre-adaptation日志，改为先释放gate再等待创建后3/3通过，不把脚本等待误报为产品失败或绿灯。

中间full.log、focused-green.log、build/、package/等保留；最终以带-final的日志/候选、下列hash和final源码为准。旧红测/审计/FAIL未覆盖或删除。

## 4. 独立复审与补修核验

完整审查者原文保留于fresh-review.md，SHA256 `3a4310d2bcd8f93f2e665fa0ec2851516077eb1ad6dbb619d54f9c293922e3de`。基线仅本轮before/src，而非包含既有大量未提交阶段5工作的HEAD总差异。作者读取并保全其实际日志。

审查者独立复现相邻输入/结果草稿初始通知漏洞，before与中间候选同现；正常RPC开始后关闭对照4/4支持根因。补修后邻近10/10真实落盘。额外两项证明：初始移出后Host明确失败会清busy，重加显示错误并可重试；已有输入写入→创建→初始通知关闭按原revision顺序真实落盘。

最终审查者正式112项覆盖新16、原openPanel16、retained28、workbench-store、关闭隔离/重入/P2；另21项容量/旧输入兼容。未知pageId的同步错误控制探针另1/1，未确认未处理拒绝问题，不算上述12项私有成功数。

考虑但未列为最终发现的重复创建、public/legacy flush、原关闭期限、正常排空、late reply、同步普通编辑、busy失败复位及容量旧数据，均已有源码或实际测试证据。没有未处理重要发现或延后minor。不以规格未列为由忽略已证实草稿损失；同根邻近问题已补修。

## 5. 容量、历史兼容与保全

最终store SHA256：`c0e6251f4129d8b6ea1639c84d9f7a00adf336d55868295b7ad4685fdab55cfe`。

本轮新16测试SHA256：`a3abf72fc53affc514f4be3bda0ecaf9fc03e3a2ff1c94901c9f208d360bea8c`。

原openPanel16保持 `ea2691a77bba3058d3f76d8520c8aa959337035b86a5625e94daba6855d2203a`；原retained28保持 `58e6737a44847dfaf73c5f229263c17944189c2a0ccefd64bad4a9e7b69978c7`。

旁置client SHA256：`3974f732041405c626c04a3fd3414336a9d55f5880f57b82c5642a25530edb35`。活跃lib原字节不变，未切换Desktop加载物。

文件1MiB、输入快照2MiB、Workspace记录8MiB及固定引用150000字符限制未改；Host材料/文档/结果/schema/repository/迁移/路径hash/配额源码保持。正式全量继续覆盖长稿保存后相邻节点实际准入、超限拒绝及旧结果编码，不新增自动迁移或旧证据覆盖。

本轮冻结3312份已跟踪/非忽略文件。仅修改旧store与project-current-state前置摘要，其余3310份保持；新增本计划、新16正式文件及本收口报告。旧状态精确字节后缀保留；原产品其他源码、旧正式测试/夹具、计划/报告/FAIL、锁/资源/pin、活跃lib及HEAD保持，详见preservation.json与verification-summary.json。

不新增所有legacy异步入口统一事务、外部writer/磁盘/配额失败后跨关闭恢复、超时Host回滚、所有历史编码/文件系统时序穷尽保证。不把关闭后RPC必须为零作为准则；已接受写入仍可在原期限内按序排空。本轮三入口及同根补修完成，阶段5整体仍未完成，未进入后续批次或真实验收。
