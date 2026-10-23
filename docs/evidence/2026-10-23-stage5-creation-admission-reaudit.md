# 阶段5创建初始通知P2及同根草稿补修全面复审

日期：2026-10-23，Asia/Shanghai。绑定 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`；HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：在本轮三入口及所列验证范围内，未发现未解决P1/P2、可确认的功能遗漏或新增回归，也没有应单列的较低优先级新回归。** OP-A1的创建初始通知同步关闭/移出，以及输入、结果草稿同根补修保持有效；原openPanel建页与改名、写入顺序和关闭期限保持。正式全量1089/1089及新上下文独立137项正式检查、11项实际磁盘探针全部通过。该结论不扩展为阶段5整体、Desktop、真实API、生产或发布验收，也不是所有时序与历史编码的穷尽证明。

本轮仅审计，未修改产品源码或正式测试，未自动增加产品修复。未启动Desktop/实际DSH、浏览器或loopback，未新增真实模型/API/provider、登录、上传、计费或对话发送；未安装升级、修改应用/Profile/pin/准入、提交、推送或发布。所有RPC证据仅为本地fixture/service/remote/repository与临时JSON磁盘。旧AGENTS.md已撤销，未读取或恢复。

## 1. 基线和实际差异

任务基线仅 `.local/stage5-creation-admission-repair-20261023/before/src`，不把既有大量未提交阶段5成果与HEAD的总差异归入本轮。逐文件核对仅workbench-store.js不同，差异只有createV340Task、saveV340Draft、saveV340ResultDraft三入口的队列登记/通知顺序与同job返回。当前源码、新16及原openPanel16/retained28与修复收口hash完全一致。

三个入口在任何初始同步状态通知之前登记既有queueV340 job；登记到通知之间没有await或其他同步发布。订阅者在通知中dispose时，快照已能捕获该job及同项目队列tail；同步移出只改变新公开准入，已接受工作仍持有retained状态。queue、dispose、共享期限、transport取消边界均原字节保持，没有新增后台任务或延长关闭期限。

## 2. 指定重点复核

| 重点 | 源码与当前实际证据 |
|---|---|
| 初始通知同步关闭 | 新16正式覆盖创建提交前/响应后gate，关闭释放前pending、signal未abort、原100ms期限保留；输入/结果草稿提交前关闭也正式覆盖。补充探针覆盖两个草稿入口提交前/响应后四种期限，正常完成或到期行为均符合原合同 |
| 移出重加与busy复位 | 创建移出/移出重加/移出关闭，先前接受创建真实落盘、最终busy=false并可再次创建；新公开调用仍受known/disposePromise拒绝。独立私有创建/输入/结果初始移出后Host明确失败三项均保留错误/草稿、清理忙状态并可重加重试 |
| 队列登记与通知顺序 | 三入口先登记再通知并返回原job；public flush在通知中调用会等待队列；legacy owner保护及同项目revision顺序保持。没有把全部关闭后RPC都当作错误，已接受写入仍在原期限内排空 |
| 嵌套连续草稿保存 | 作者新增私有input→input、input→result、同版本result→result均按接受顺序落盘，后者保留较新正文。独立两项嵌套input/result连续保存也保留newer；before反而最终older，证明本次先登记也修复了该旧顺序变体，不是当前遗留问题 |
| 草稿清理与证据身份 | 输入捕获clone及JSON匹配、结果edit对象身份匹配清理未改；较新本地草稿不被较早成功回调抹掉。所有相关正式/私有磁盘用例保留冻结result/resultVersions |
| openPanel首次建页及后续改名 | 原openPanel16、retained28正式本轮通过；初始创建通知普通建页改名后关闭/移出关闭有新正式用例；独立草稿初始通知建普通页/改名后关闭两项磁盘证实普通页与Host页、ID/创建时间及标题共存 |
| 无操作、重复及同步重入 | 原私有10项重新通过，true no-op不生成ID/额外revision，重复open不建新页，后续hidden与更晚同步编辑保留；重复创建仍busy拒绝且不分配第二ID |
| 关闭期限与迟到回应 | 手动期限未到不提前abort，到期后取消、清理计时器和状态，迟到不新增后续RPC或复活state；Host已提交内容保持，不要求取消回滚。正常排空与到期拒绝分开断言 |
| 容量及旧数据 | Host/schema/repository/路径hash/配额和历史兼容源码未改，全量及独立容量/legacy正式检查通过；文件1MiB、输入快照2MiB、Workspace记录8MiB、固定引用150000字符限制保持 |

没有把subscriber主动抛异常、无效参数等未形成可证实正常用户回归的猜测列为P2，也没有把绿灯延伸为全部legacy异步入口的统一事务保证。

## 3. 新增16项正式回归审计

新文件 `test/v340-creation-admission.test.mjs` 仍原字节：创建初始关闭两gate、移出/重加/移出关闭三项、原期限两gate、重复创建busy、普通建页改名关闭/移出关闭两项、public flush、RPC开始后关闭对照、输入/结果初始通知关闭/移出四项，共16项。

每个关键成功断言使用实际service/remote/repository及临时JSON磁盘，不用假的committed=true替代保存。所有权、busy、准确revision顺序、ID、原创建时间、冻结结果和计时器均有对应断言。初始通知监听在请求前安装，没有再以“等RPC started后监听”替代原窗口。

本轮重新运行同字节正式16的旁置before副本：3通过13个预期业务失败，退出1，取消/跳过0。反例为提前结束关闭、丢已接受资格、busy未清及flush提前完成，证明这些回归对已修缺陷敏感。没有撤回活跃产品或改正式断言。

新16不穷尽全部嵌套与失败组合。本轮额外7项作者和11项独立磁盘探针补证嵌套保存、草稿原期限、普通建页改名关闭和Host明确失败后重试；未找到当前产品仍失败、需要升级为待修发现的业务反例。私有检查不冒充新增正式测试数量。

## 4. 本轮新鲜验证

证据目录 `.local/stage5-creation-admission-reaudit-20261023/`，使用固定仓库Node和已有依赖，不安装。

| 检查 | 结果 | 日志 |
|---|---|---|
| 正式主包全量，含新16及原16/28 | **1089/1089**，退出0，失败/取消/跳过0 | full.log |
| Mac启动/预览/Markdown/Sidebar静态合同 | 26/26，退出0，未启动应用 | mac.log |
| 旧数据/多审核版本/长稿补充 | 11/11，退出0 | compatibility.log |
| 作者新增期限及嵌套保存边界 | 7/7，退出0 | boundary.log、boundary-probes.test.mjs |
| 原openPanel审计补充 | 10/10，退出0 | open-panel-boundary.log |
| 原初始创建反例及正常对照 | 3/3，退出0 | creation-ownership.log |
| 旁置撤回新正式16 | 3通过13预期业务失败，退出1，取消/跳过0 | withdraw.log |
| 旁置构建 | 退出0，候选src115份逐文件相同、map46份项目源码一致 | build.log、build/、package/ |
| 候选src/lib合同 | 9/9，退出0 | contracts.log |
| 离线pack dry-run | 120成员，退出0 | pack.json |
| 新上下文只读独立正式 | 137/137，退出0，失败/取消/跳过0 | fresh-review-formal.log |
| 独立私有实际磁盘 | 11/11，退出0 | fresh-review-private-disk-final.log |
| 独立before正式16及嵌套保存2 | 正式3通过13业务失败；嵌套0通过2业务失败，均退出1、无取消/跳过 | fresh-review-before16-final.log、fresh-review-before-nested.log |

正式命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
```

兼容补充按既定name pattern选择11个正向用例，涉及多审核版本及各自回执、旧单/分版本与core草稿、Markdown单次确认/旧revision/碰撞、长UTF-8、硬链接/删除、普通期限、旧empty-upstream prepared/unknown/failed无重放写盘、未分版本completed需明确审核及重开。选择式记于audit-summary.json，不把历史文件中无关旧反例当成本轮绿灯。

独立审查原文fresh-review.md及全部有效日志已原字节保存，审查者报告SHA256 `b5357e8458ea8279a7d7d69385dbeac8fe3b521307690b7b539bcf90ff31440c`。作者读取实际日志及hash，不只依赖结论；独立137不含作者全量/构建计数。

审查者首轮私有helper缺optional chaining、最初before依赖链接错误，以及before私有全矩阵等待已同步拒绝请求的gate造成中断，均保留诊断记录而不计产品反例或成功。最终私有11完整重跑、before正式16及嵌套2完整退出，最终结论仅用有效业务证据。所有预期红灯不计通过数。

## 5. 冻结及保全

当前store SHA256：`c0e6251f4129d8b6ea1639c84d9f7a00adf336d55868295b7ad4685fdab55cfe`。

本轮修复新增16保持 `a3abf72fc53affc514f4be3bda0ecaf9fc03e3a2ff1c94901c9f208d360bea8c`；原openPanel16保持 `ea2691a77bba3058d3f76d8520c8aa959337035b86a5625e94daba6855d2203a`；原retained28保持 `58e6737a44847dfaf73c5f229263c17944189c2a0ccefd64bad4a9e7b69978c7`。

旁置client保持 `3974f732041405c626c04a3fd3414336a9d55f5880f57b82c5642a25530edb35`，未切换活跃lib。before store为 `c44d8a48d1e7d29c1536ecb7dc59c4f3b913f3d5a29a024f7ac78d6c934ed88e`。

起点冻结3315份已跟踪/非忽略文件；3314份原字节保持，仅project-current-state增加前置复审摘要，旧全文精确字节后缀保留。唯一新增非忽略文件为本报告。全部产品源码、正式测试/夹具、新16及原16/28、旧计划/报告/FAIL、锁/资源/pin、Host容量/历史编码、活跃lib与HEAD不改，详见preservation.json及audit-summary.json。

本轮没有产品修复或正式测试修改，没有未处理确认发现或延后minor；阶段5整体仍未完成。外部writer/磁盘或配额失败的跨关闭恢复、Host忽略abort回滚、所有历史编码/文件系统时序及真实Desktop/native/composer/API验收均未扩展为本次保证。
