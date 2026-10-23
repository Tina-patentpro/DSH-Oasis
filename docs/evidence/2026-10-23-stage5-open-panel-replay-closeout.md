# 阶段5 openPanel条件建页重放P2修复收口

日期：2026-10-23，Asia/Shanghai。项目 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：RW-A1已修复。openPanel首次实际产生的普通建页效果、稳定ID/时间和后续改名在V340权威响应后保留并实际落盘；无后续编辑不再静默丢页。新增16项正式回归，正式主包全量1073/1073通过。** 新上下文只读复审通过，指定范围未发现可确认P1/P2或其他需修复问题；此修复不代表Desktop、真实宿主或阶段5整体验收。

本轮未启动Desktop/实际DSH、浏览器或loopback服务，未新增真实模型/API/provider、登录、上传、计费或对话发送；未安装/升级依赖，未修改应用/Profile/pin/准入，未提交、推送或发布。真实service/remote/repository只指本地fixture及临时JSON磁盘。旧AGENTS.md已撤销，未读取或恢复。

## 1. 根因及最小实现

起点为 `docs/evidence/2026-10-23-stage5-retained-writes-reaudit.md` 确认的1项P2。普通openPanel在空客户端状态创建页面，但旧重放原样执行条件命令；Host响应已有新任务，原建页条件不成立，普通页被跳过。不再编辑时旧实现仍显示成功/ready；继续改名会unknown page及内部revision冲突。

本轮只修改产品 `packages/oasis-professional-service/src/client/workbench-store.js` 的两处，未修改model、Host、schema或磁盘格式：

1. 每条已接受编辑记录持有有序actions列表。openPanel首次确实建页时记录create-page，再记录set-panel-mode normal；首次未建页时只记录打开面板效果。其他普通动作使用单元素列表。
2. 成功Host权威响应后，按编辑记录及其具体动作顺序重放，使用原每次编辑缓存的ID/时间。每次原始编辑仍只占一条记录，保持context.edits.length与editGeneration的原冲突检查关系。

没有把客户端整份旧快照覆盖到Host，也没有重新生成页ID或时间。真正外部revision冲突仍拒绝覆盖。普通暂停/排空、显式队列owner、公开flush等待、移出后的保留执行资格及共享关闭期限代码均未改。

## 2. 新增正式回归及红绿证明

新增文件 `packages/oasis-professional-service/test/v340-open-panel-replay.test.mjs`，共16项；原28项及所有原正式测试/夹具原字节保持。

| 正式覆盖 | 数量 | 关键断言 |
|---|---:|---|
| openPanel/显式createPage × 无后续编辑/继续改名 × settle/立即关闭/移出后关闭 | 12 | 普通页与Host页真实磁盘共存，操作成功、稳定身份/时间与标题；只分配两次ID；准确revision及一次普通保存 |
| 首次创建后再打开 | 1 | 已有页不再创建，hidden→normal效果按序保存，无重复ID |
| 接受的下一份V340写入 | 1 | task/create revision0→普通replace revision1→task/draft revision2；移出关闭仍按序真实落盘 |
| 重放发布时同步再次改名 | 1 | 更晚标题保留，未被旧重放快照覆盖 |
| 关闭期限后迟到响应 | 1 | 不再派发普通保存/其他RPC，不恢复已清空状态或定时器；不把deadline当作保存成功 |

先写测试后改产品：`red.log` 16项7通过、9个预期业务失败，失败为丢页/unknown page，不是导入、夹具错误、取消或跳过。六项显式建页和一项期限为已存在保护的正向对照。

最小修复后，新16加原28及原关闭隔离/同步重入/原生交接P2共75/75通过；正式全量1073/1073通过。上一轮审计私有7边界探针本轮全部通过，包括两种原丢页反例和公开/旧页面flush所有权检查。

撤回证明：旁置withdraw使用本轮before/src和最终正式测试的相同字节，再运行新16，重新得到同样9业务失败、7对照通过，退出1，取消/跳过0。没有改活跃源码制造红灯，也没有用新绿灯覆盖旧审计FAIL。

## 3. 当前候选的新鲜验证

证据目录：`.local/stage5-open-panel-replay-repair-20261023/`。使用仓库固定Node与现有依赖；命令日志和hash以该目录为准。

| 检查 | 结果 | 证据 |
|---|---|---|
| 新正式16与相关原正式 | 75/75，退出0，失败/取消/跳过0 | focused-green.log |
| 正式主包全量 | **1073/1073**，退出0，失败/取消/跳过0 | full.log |
| Mac启动/安全预览/Markdown/Sidebar静态合同 | 21+5=26/26，均退出0，未启动应用 | mac.log、mac-preview.log |
| 旧数据/固定多审核版本/长稿等补充 | 11/11，退出0 | compatibility.log |
| 上一轮审计边界探针 | 7/7，退出0 | audit-boundary-green.log |
| 旁置撤回新正式回归 | 16项7通过9业务失败，退出1，取消/跳过0 | withdraw.log、withdraw-exit.json |
| 旁置构建 | 退出0；115份候选src与当前逐文件相同；map中46份项目源码正文一致 | build.log、build/、package/ |
| 候选src/lib合同 | 9/9，退出0 | contracts.log |
| 离线pack dry-run | 120成员，退出0，不夹带测试/依赖/本地状态 | pack.json、pack.stderr.log |
| 新上下文只读复审 | 独立71项相关正式+29项容量/旧结果正式通过；4个额外私有探针通过 | fresh-review-formal.log、fresh-review-compat.log、fresh-review-probes.log |

正式全量命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
```

兼容补充仅选取已定义11项正向用例：多审核版本及各自回执、旧单/分版本和core草稿共存、Markdown单次确认/旧revision/碰撞、长UTF-8、硬链接/删除、普通期限、旧empty-upstream prepared/unknown/failed拒绝且无重放写盘、未分版本completed明确审核及重开。未将该历史文件中无关旧反例纳入本轮绿灯计数。选择表达式记于verification-summary.json。

最终store SHA256：`c44d8a48d1e7d29c1536ecb7dc59c4f3b913f3d5a29a024f7ac78d6c934ed88e`。

新16正式测试SHA256：`ea2691a77bba3058d3f76d8520c8aa959337035b86a5625e94daba6855d2203a`。

原28正式测试SHA256仍为：`58e6737a44847dfaf73c5f229263c17944189c2a0ccefd64bad4a9e7b69978c7`。

旁置client SHA256：`b74029adcf7347546c43beb5b4ea938173400c46895051ab0d995a166881ab90`。活跃lib原字节未改，没有切换Desktop加载物。

## 4. 新上下文复审

复审记录归档于本目录fresh-review.md，指定差异复审通过，没有需修复发现或延后minor。审查者以本轮before/src为差异起点，未用包含大量既有未提交阶段5变更的HEAD差异冒充本轮范围；只读源码与正式测试，并独立执行检查。作者读取并保全其实际日志，不仅依赖口头结论。审查者另独立对照before-store，新16项得到7通过、9业务失败（fresh-review-before.log），与作者红测/撤回一致。

额外4项私有探针覆盖true no-op重复打开不分配ID/不增加保存、建页关闭后重开使用不同身份且保持顺序、重放发布时同步新建并改名、已有页的noncreating open不分配ID。所有用例用真实本地磁盘，不属于新增正式16项。

## 5. 容量、旧数据与保全

Host材料、输入快照、文档、结果服务、schema、repository/迁移、路径/hash绑定、权限与配额源码均未改。文件1MiB、输入快照2MiB、Workspace记录8MiB、固定引用150000字符保护保持。正式全量覆盖长稿保存后相邻节点实际准入、超限拒绝、旧结果及兼容边界；独立复审另跑29项容量/旧结果正式通过。没有增加旧记录迁移或放宽读写准入。

本轮冻结3308份已跟踪/非忽略文件。最终仅改原有store与project-current-state前置摘要；新增本计划、新正式16项文件及本收口报告。旧状态全文作为精确字节后缀保留；其余3306份既有文件保持，包括原正式28项、其他产品源码/正式测试/夹具、旧计划/报告/FAIL、锁/资源/pin及活跃lib。HEAD不变。详见preservation.json与verification-summary.json。

本轮不新增外部writer/磁盘失败/容量拒绝后的跨关闭恢复、先于V340入队启动的全部legacy异步操作统一事务、超时Host回滚、所有历史编码或文件系统时序穷尽保证。未进行Desktop/native/composer/真实API验收，阶段5整体仍未完成，未进入后续批次。
