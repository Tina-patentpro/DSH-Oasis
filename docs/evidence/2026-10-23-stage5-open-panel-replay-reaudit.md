# 阶段5 openPanel建页P2修复全面复审

日期：2026-10-23，Asia/Shanghai。绑定项目 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：RW-A1的首次建页效果与依赖改名修复保持，未确认该两处修改引入新回归；本轮全面复审另确认1项原有P2（OP-A1）：创建初始状态发布先于队列登记，导致同步关闭漏排空，以及同步移出后重新加入一直busy。** 当前候选不能就相关同步重入、关闭及移出范围声明“无P2”。新增16项与正式全量1073项均通过，但没有覆盖该初始通知窗口。

本轮仅审计，未修改产品源码或正式测试、未自动修复OP-A1。未启动Desktop/实际DSH、浏览器或loopback，未新增真实模型/API/provider、登录、上传、计费或对话发送；未安装/升级、改应用/Profile/pin/准入、提交、推送或发布。所有RPC均指本地fixture/service/remote和临时JSON磁盘。旧AGENTS.md已撤销，未读取或恢复。阶段5整体未完成，未进入后续批次。

## 1. 已确认P2

### OP-A1：初始创建通知中的同步重入先于队列所有权登记

**定位：** `packages/oasis-professional-service/src/client/workbench-store.js:1004–1005`。`setState(v340Creating:true)` 同步通知订阅者，随后才调用queueV340；队列登记与其内部try/finally尚未建立。dispose在 `:1710–1712` 只捕获当时队列快照；queueV340入口仍执行assertKnown，而创建busy清理只在队列回调的 `:1023–1024`。

| 同根变体 | 实际观察 | 对照及影响 |
|---|---|---|
| 初始v340Creating通知中同步dispose | task/create已经开始但在Host写入前gate挂住；100ms手动期限从未触发，关闭却已完成、signal已abort、期限计时器已清空；释放gate后AbortError，磁盘无任务 | 改为等RPC started后再dispose，关闭保持pending，signal未abort、计时器[100]；释放gate后成功写入id-1。初始窗口令已开始创建提前失去有界排空资格 |
| 同一通知中同步syncWorkspaces([]) | queueV340.assertKnown同步抛出；重新加入b后v340Creating仍true；再次创建一直报“新版任务正在创建”，RPC=0、磁盘空 | 队列回调及finally从未进入，当前store生命周期内创建资格不恢复。FunctionCenter.js:43会据该标记禁用创建按钮 |

两变体在本轮修复前before-store与当前store完全同现，合并为1项**原有覆盖遗漏**，不计为openPanel具体效果记录新引入回归。

主证据 `ownership-probes.test.mjs`：current与before各一个初始关闭反例、一个移出重加反例、一个RPC开始后关闭正向对照；共6项2通过4个业务失败，退出1、取消/跳过0。当前两反例连续三轮各2项均业务失败。作者和新上下文审查者分别使用真实本地磁盘确认。

额外 `admission-current.log` / `admission-before.log` 3变体均同现：Host已提交但响应挂起时关闭也提前完成；Host提交前gate时提前取消；移出后busy。Host已提交的变体只是时序补充，不将其磁盘落盘解释成取消必须回滚。

**判定边界：** 已接受写入本就允许在关闭请求后按序排空，所以“关闭请求后RPC必须为零”是过强断言，未作为发现。P2依据是未到期限便取消实际已开始创建，以及重加后无法重试。上一轮报告把入队前同步通知列为未新增保证；本轮用户明确要求全面检查同步重入及关闭，不能以这一排除项代替真实用户影响判断。

**正式回归缺口：** 新16项辅助firstCreation先发创建并等待started才返回，后续订阅或关闭均发生在RPC已经开始后。即便其重放通知同步关闭路径通过，也不覆盖createV340Task初始setState之前安装订阅者的情况。需要分别正式验证初始通知同步关闭的准入/排空，以及同步移出重加后的busy复位，并保留RPC开始后关闭的正向对照。

**后续修复方向（本轮未实施）：** 在可重入通知前原子登记创建接受资格及队列所有权，或一致地取消并清理未接受操作；避免新任务在dispose捕获之后成为未纳管任务。同步准入失败必须复位busy，保留已接受写入顺序及原关闭期限，不能简单拒绝全部关闭期间排空。

## 2. 原RW-A1及指定重点复核

| 检查 | 当前证据与结论 |
|---|---|
| 首次建页效果及后续改名 | store:602–606按首次实际页面差异记录create-page及normal效果；原ID/时间缓存保留。无后续编辑/继续改名、settle/关闭/移出关闭12项真实磁盘通过；原静默丢页没有再现 |
| 无操作、重复及非建页打开 | next===current提前返回；非创建只记panel mode。新正式重复打开以及私有true no-op、已有页不分配ID通过，未发现多造页/额外revision |
| 同项目写入顺序 | 一次编辑仍只有一个context.edits记录，内部actions顺序重放；普通replace revision1先于后续V340 revision2，正式真实磁盘通过。未改CAS/owner保护 |
| 同步重放期间再次编辑 | 正式晚改名和私有同步额外建页/改名保留，发布后的getCurrent用于保存；非法改名拒绝不污染计数，随后合法改名可落盘 |
| 建页关闭再打开及后续隐藏 | 私有独立ID、删除前页、保留后页及创建时间通过；后续hidden动作仍最后生效，Host页未丢失 |
| 同步关闭/移出 | 权威重放发布时关闭、移出或移出后关闭均保留已接受普通页和标题；**初始创建发布窗口OP-A1未闭合** |
| 关闭期限 | RPC开始后正常关闭及超时迟到保护通过，期限后无普通RPC/状态复活。该绿灯不覆盖初始队列登记遗漏 |
| Host明确提交前失败 | 私有无改名/有改名两项均排空普通页，保留ID及创建时间；不会制造Host页。未知提交状态不冒充明确失败 |
| 容量和旧数据 | Host/schema/repository/迁移/路径hash/配额源码原字节保持，正式全量、兼容补充及审查者独立检查通过，无发现保护放宽或自动迁移 |

新增16项包含建页两种×改名两种×settle/close/removed-close共12项，以及重复打开、下一V340顺序、同步晚改名和期限四项。测试依赖真实fixture/service/remote/repository并读盘，没有用假的成功响应替代业务断言。正式断言和原28项未修改。

## 3. 新鲜验证

证据目录 `.local/stage5-open-panel-replay-reaudit-20261023/`。固定仓库Node与现有依赖，本轮没有安装。

| 检查 | 结果 | 日志 |
|---|---|---|
| 正式主包全量（含新16） | **1073/1073**，退出0，失败/取消/跳过0 | full.log |
| Mac启动/预览/Markdown/Sidebar静态合同 | 26/26，退出0，未启动应用 | mac.log |
| 兼容/多审核版本/长UTF-8等补充 | 11/11，退出0 | compatibility.log |
| 作者10项补充边界 | 10/10，退出0 | boundary.log |
| 权威重放发布时关闭/移出/移出后关闭 | 3/3，退出0 | publication-positive.log |
| OP-A1当前及before与正常对照 | **6项2通过4业务失败**，退出1，取消/跳过0 | ownership.log |
| 当前两反例连续三轮 | 每轮0通过2业务失败，退出1，取消/跳过0 | repeat-ownership-{1,2,3}.log |
| 新16修复撤回 | 7通过9预期业务失败，退出1，取消/跳过0 | withdraw.log |
| 旁置构建 | 退出0；115份候选src逐文件等于当前；map中46份项目源码相等 | build.log、build/、package/ |
| 候选src/lib合同 | 9/9，退出0 | contracts.log |
| 离线pack dry-run | 120成员，退出0 | pack.json |
| 新上下文只读复审 | 独立正式75+21+10=106/106；独立OP-A1同现，before16同9业务红 | fresh-review-*.log、fresh-review.md |

撤回使用上一轮before/src的旁置副本及与当前相同字节的正式新16测试，本轮重新运行，不修改历史withdraw或原红测；证据不依赖历史绿灯。私有探针及before对照不算正式测试扩增，预期红灯不计为通过。

主要正式命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
```

兼容补充按既定name pattern选择11个正向用例，覆盖多审核版本各自回执、旧单/分版本/core草稿、Markdown确认与碰撞、长UTF-8、硬链接/删除拒绝、普通期限、旧empty-upstream prepared/unknown/failed无重放写盘，以及未分版本completed的明确审核及重开。选择式记于audit-summary.json。

独立审查最早探针的calls=[]断言已废弃，保留文件供溯源，最终发现只用有正常排空对照的ownership证据。作者首次before探针缺少zod定位的导入失败另存admission-before-import-error.log；修正为私有before-package及现有node_modules链接后重跑，最终before日志均为业务断言失败，没有以导入错误冒充发现。

## 4. 容量、历史兼容、冻结及保全

store SHA256保持 `c44d8a48d1e7d29c1536ecb7dc59c4f3b913f3d5a29a024f7ac78d6c934ed88e`。

新16正式测试SHA256保持 `ea2691a77bba3058d3f76d8520c8aa959337035b86a5625e94daba6855d2203a`；原28保持 `58e6737a44847dfaf73c5f229263c17944189c2a0ccefd64bad4a9e7b69978c7`。

旁置client SHA256为 `b74029adcf7347546c43beb5b4ea938173400c46895051ab0d995a166881ab90`，与修复候选相同；活跃lib不变。

before-store为 `e74a4d2609ff8e7ddb3ff8414d9c9a8ed69442376078fa6fbab1ccc162323638`。镜像其完整src并链接现有依赖，仅store内容与当前产品不同，未对原快照写入。

文件1MiB、输入快照2MiB、Workspace记录8MiB和固定引用150000字符限制未放宽；正式全量继续覆盖长稿保存后相邻节点实际准入与超限拒绝。未新增旧编码迁移/覆盖；不声称所有历史编码或文件系统时序穷尽，也不声称外部writer/磁盘或配额失败跨关闭恢复、先于队列的全部legacy事务、超时Host回滚、Desktop/native/composer或真实API验收。

本轮起点冻结3311份已跟踪/非忽略文件。3310份保持原字节；唯一旧文件变更为project-current-state前置复审摘要，旧全文精确字节后缀保留；唯一新增非忽略文件为本报告。所有产品源码、正式测试/夹具、新16及原28、旧计划/报告/FAIL、Host保护、锁/资源/pin、活跃lib及HEAD原样。详见preservation.json、audit-summary.json。

RW-A1修复本身通过本轮复核；OP-A1仍待修复，本轮不自动修改产品或正式测试。
