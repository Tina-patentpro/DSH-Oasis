# 阶段5原生接续两项P2修复及复审

日期：2026-10-23，Asia/Shanghai。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持`84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：NH-R1项目根目录往返导致的路径/hash错配、NH-R2交接等待保存时关闭期限失效已修复；新上下文复审发现的关联迟到编辑续写也已补正式红绿回归并修复。最终新增14项正式回归，主包1012/1012、Mac26/26、配对候选合同9/9及组件3/3通过。最终作者复核未遗留本范围已确认P1/P2。** 这仅是代码及本地合成范围收口，不代表真实Desktop验收或阶段5整体完成。

依据：[全面复审报告](2026-10-23-stage5-native-handoff-reaudit.md)、[修复计划](../plans/2026-10-23-stage5-native-handoff-p2-repair.md)及用户本轮明确修复指令。旧审计、失败证据及旧状态原文均保留。未启动Desktop/实际DSH，未新增真实模型/API调用、认证、上传、计费或对话发送；无依赖安装/升级、Profile/应用/准入变化、提交/推送/发布。旧AGENTS.md已被用户撤销，本轮不恢复。

## 1. 最终行为

### NH-R1：在读取边界绑定已定位文件

`workspace-materials.js`的`inspect(workspaceId, inputPath, policy, expectedAbsolutePath?)`增加可选确切路径前置条件。材料读者仍自行验证当前Workspace根、相对路径、重定向及文件类型；安全解析所得绝对路径必须与调用方之前定位的路径完全相同，然后才执行有界hash读取。不匹配以`WORKSPACE_ROOT_CHANGED`拒绝。

`v340-result-service.js`将writeback manager已安全定位的路径传给inspect，并继续保留末端路径和revision复核。A→B→A在中间读取B时就会拒绝，不再返回A路径配B哈希，客户端不会调用native open或显示错误的一致反馈。根稳定时仍可打开已改动的当前文件，返回它自己的hash和`matchesReviewed=false`；固定版本资料继续读取仓库不可变原文。

旧inspect三参数调用和返回证据形状不变，没有把绝对路径添加到持久化材料、旧版本或保存回执。只增加调用期条件，不迁移/重写旧数据。文件1MiB、材料合计2MiB、输入快照2MiB、Workspace8MiB、引用150000字符及原软链接/hardlink/指纹/无覆盖保护保持。

### NH-R2：整个关闭过程有界，取消覆盖队列、flush及RPC

关闭请求即建立唯一dispose Promise和原有期限；不先无界等待V340队列。公开动作入口从请求时拒绝新增动作，同时内部已接受队列仍可在期限内正常排空；之后排空普通Workspace保存。期限到后沿用原有controller abort和清理。普通读取订阅及公开配置对象保持原有形状，正常动作直接返回原返回值/原Promise，关闭后保持原同步抛错或异步拒绝的调用约定。

交接在入队前登记独立取消监听，返回给调用方的等待也可取消；正在flush或等待RPC的交接均可退出。取消后再次检查状态，不调用新的读取RPC，不插入composer、不打开文件，晚到响应不能恢复已清理状态。已接受输入/核心结果草稿可继续在期限内写入Host并重开保留；失败写入仍拒绝给原调用方，不冒充已保存。

新上下文复审发现，编辑回调在异步摘要完成后可能越过已结束的关闭期限再调用写RPC。正式反例确认`result/edit`被调用（signal已取消）；新增`callV340`在store所有V340 RPC的实际调用边界复用`assertOpen`，阻止摘要等本地异步步骤迟到后的新派发，同时允许期限内的已接受写入。该发现已在本轮处理，不作为遗留项。

## 2. 正式回归、红绿及复审

新增`packages/oasis-professional-service/test/v340-native-handoff-p2.test.mjs`共14项，原正式测试及夹具无改动。

| 新正式测试 | 数量 | 行为证据 |
|---|---:|---|
| 双来源A→B→A及稳定根 | 3 | 真实RPC/schema/store/磁盘；错配拒绝且无native调用/错误反馈/写盘；固定原文保持；旧inspect形状及1MiB超限拒绝 |
| 两种交接在普通保存flush中关闭 | 2 | 手动期限调度器；唯一Promise、期限立即登记、新同步/异步动作拒绝、到期结束、晚到不回填 |
| flush在期限前完成 | 2 | 已接受普通保存成功排空，取消后的新读取RPC调用为0 |
| 排队在忽略取消的V340写入后 | 2 | 读取调用方立即取消，关闭到期可结束，已完成Host写入证据保持，迟到响应不恢复状态 |
| RPC结果晚到 | 2 | 引用/打开均不产生native副作用或状态回填 |
| 已接受写入及失败 | 2 | 输入和结果草稿依次排空，审核/原结果/保存回执与仓库重开保留；失败不伪记成功 |
| 关闭后摘要才完成的结果编辑 | 1 | 不得调用`result/edit`，原Host草稿及磁盘字节不变 |

最初13项正式测试4通过、9项业务断言失败（无取消/跳过）：双来源根错配及错误路径均未拒绝、flush关闭未登记期限、取消后仍调用读取、排队读取未取消。根修复后3/3通过。首轮store动作入口包装误把非函数公开属性当作函数，初始化失败；补类型判定后，新13项及关联测试通过，但原专业服务流程因额外async Promise包装引入的调度改变而失败。保持原断言，改成正常返回原Promise后55/55通过。这些中间失败日志保留，不将初始化失败冒充缺陷有效红测。

随后只读新上下文审查比较本轮起点副本和当前源码，确认原两项复现已解决，并发现1项P2迟到摘要续写。作者按receiving-code-review核实：新增第14项正式回归先出现`actual ['result/edit']`、`expected []`失败，再加统一RPC调用边界检查，关联56/56及最终全量1012/1012通过。复审原报告保存于`fresh-review.md`，其结论为“需修复关联问题”；最后这处修复由作者TDD及全量验证收口，未再次派发审查，也不把前一版审查伪记为最终版获独立批准。

6组私有源码副本分别撤去Host路径传递、材料读者确切路径判断、读取全阶段取消、关闭期限建立顺序、公开动作关闭屏障及RPC末端关闭检查。12个选中正式用例均触发业务断言失败，6组均退出1，无取消/跳过或导入/初始化失败。原工作区未为反例撤回修复。

## 3. 兼容性与最终核验

证据目录：`.local/stage5-native-handoff-p2-repair-20261023/`。固定仓库Node24.21.0与npm，无新依赖。正式测试均为合成Host/transport或临时磁盘。

| 核验 | 新鲜结果 | 证据 |
|---|---|---|
| 新正式14项及原native/store关联 | 56/56，退出0 | review-green.log；最终full-final.log实际执行 |
| 主包正式全量 | **1012/1012**；失败/取消/跳过0，退出0 | full-final.log |
| Mac启动/Markdown/Sidebar安全预览静态合同 | 26/26，退出0；不启动应用 | mac.log |
| 旧数据/多版本补充探针 | 11/11，退出0 | compatibility-probes.log |
| 最终旁置构建 | 退出0，client SHA256 `0287c4b8e86f4a4e42e1609c55493bf3d716f3b601c1e1f7d51da296f0eb8116` | build-final.log、build/ |
| 最终src/lib配对候选合同 | 9/9，退出0 | contracts-final.log、package/ |
| 最终离线pack dry-run | 120成员，退出0，无测试/依赖/本地状态/归档夹带 | pack-final.json |
| 最终Chrome ReactDOM/StrictMode组件 | 双来源及长稿3/3，真实RPC/store/临时磁盘；native open/composer接口合成 | browser-results.json、最终组件截图 |
| 私有撤回反例 | 6组/12项业务断言预期失败，均退出1 | mutation-final-*.log、mutation-final-exits.json |

11项兼容补充探针复用上一轮已通过的正向范围：双来源原版/修订版审核和各自固定资料/保存回执、当前文件更改与另一版本独立、旧单草稿/按版本草稿/core共存、无覆盖和token、中文/emoji长稿、hardlink与删除；三份旧empty-upstream prepared/unknown/failed经新只读路由拒绝且不写盘/不重放/重开保持，以及未分版本旧completed结果需明确审核。values-v1/旧完整快照、旧unknown/FAIL和容量保护由本轮全量中的原正式测试继续验证，不外推为旧安装包能够读取新编码。

主要复跑命令：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/v340-native-handoff-p2.test.mjs packages/oasis-professional-service/test/v340-native-handoff.test.mjs packages/oasis-professional-service/test/workbench-store.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test tests/macos-development-launch.test.mjs tests/macos-safe-preview.test.mjs tests/native-markdown-policy.test.mjs tests/sidebar-safe-file.test.mjs tests/web-markdown-policy.test.mjs
```

构建均使用已确认存在的配置及明确私有输出目录；活跃lib在本轮未被改写，最终哈希也与起点一致。浏览器前后两次均仅使用本轮自建loopback和公开临时项目；最终截图及结果取自最后修复后的构建。两次测试页和本轮两次自建服务均已按确切PID/命令关闭，清理各自临时项目。

## 4. 复审边界的逐项处理

以下是新上下文审查列出的“Declined to judge”，由作者逐项判定；未隐去，也不改称全部已验证。

| 审查保留项 | 作者判定与依据 | 若外推的代价 |
|---|---|---|
| 完成核验后文件又被替换 | 保持“读取时”的current-file语义；指纹/链接检查仍在；真实打开不冻结内容 | 不可将一次匹配当作打开时或未来审核保证 |
| 自定义manager忽略第四参数 | 可信依赖替换须遵守接口；本轮证明随包真实reader，旧三参数消费保持 | 换用不兼容实现需要单独接入验证 |
| 迟到调用是否真实传输或改Host | 正式红测及审查先证明本地调用；最终在调用前拒绝 | 不把合成探针说成真实网络/外传验收 |
| 远端写永远忽略取消时原写调用方仍等待 | 关闭本身有期限，排队读取可取消；无法强迫外部写结束 | 不能把关闭结束当作远端写已失败或已保存 |
| 已关闭后的迟到写确认 | 维持原不回填/不弹成功反馈行为，已实际写入的Host证据重开可见 | 保存结果不确定时需重新核对原记录，不能自动重试 |
| facade函数名/身份等元信息改变 | 未找到支持按函数名/身份反射的消费合同；公开数据属性、同步/异步错误及正常Promise时序保持 | 不承诺未登记的外部反射接线；原正式合同及浏览器验证覆盖已知消费 |
| 真实Desktop/Sidebar/composer、安装、跨进程及真实生成 | 遵守用户不执行边界，保持待验 | 本轮不能替代真实宿主及业务验收 |
| 审查者未独立执行全量 | 作者随后执行并读取最终1012/1012日志，审查者独立执行55项 | 不把作者全量记为第三方或审查者独立全量证明 |

没有确认后延期的P3或其他小项；本轮没有进入后续B批，也没有解禁新版真实run/create。

## 5. 文件保全与收口范围

起点3295份Git已跟踪或非忽略文件冻结于baseline.json，并保留src/lib及旧状态原文副本。最终既有文件仅修改`src/workspace-materials.js`、`src/v340-result-service.js`、`src/client/workbench-store.js`和本轮状态前置摘要；新增修复计划、正式测试及本报告。旧状态全文作为精确字节后缀保留，其他原测试/夹具、既有计划/审计/FAIL、锁/资源/pin、活跃lib和HEAD不变。最终候选src逐文件与当前源码一致，源映射内容与当前项目源码匹配。详见preservation.json及final-summary.json。

新上下文审查与最终作者验证均限定本轮改动，没有将整个预存未提交工作区冒充本轮diff。当前实际Desktop装配、Sidebar/native动作、正常重启、跨进程排他和安装/升级/降级仍未验；阶段5整体未完成。
