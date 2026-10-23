# 阶段5第1批：已审核版本原生操作接续及复审

日期：2026-10-23，Asia/Shanghai。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：已完成本批原生文件打开、固定审核版本资料准备及Markdown导出接续的代码和合成验证。新增17项正式回归、主包998/998、Mac26/26、配对候选合同9/9通过，作者复审未遗留本范围已知P1/P2。** 实际Sidebar/对话宿主动作由合成接口承接，未启动Desktop；本结论不代替真实宿主验收或阶段5整体完成。

依据：[后续计划A批](../plans/2026-10-23-stage5-follow-up-plan.md)及用户本次明确执行指令。此前AGENTS.md已由用户撤销，本次不恢复其约束或授权；继续遵守用户明确的无Desktop、无新增真实模型/API范围。

## 1. 最终行为和接口

两种来源共用同一结果页及操作。新增两个只读RPC：`workflow/v340/result/conversation-draft`与`workflow/v340/result/saved-file`，分别调用`prepareV340ConversationDraft`、`resolveV340SavedFile`。请求精确绑定workspace/task/run/version/resultSha256/expectedRevision；保存文件另绑定writebackId。路由由52条增加到54条，不开放run/create或真实执行器。

### 固定审核版本引用

Host从仓库所选不可变版本取得完整累计Markdown，添加资料说明、runId/versionId和SHA256后准备对话草稿。未审核、脏草稿、旧revision、版本/项目不匹配、有未决运行均拒绝；不从当前物理文件回读正文，不改变审核、运行或保存记录。客户端再次检查当前任务/版本/草稿及revision，并通过既有conversation bridge向同项目Session的空composer写入；不发送，不覆盖用户输入，不重复插入。响应身份或artifactId不一致拒绝。

现有公开InputActions有setDraft等文本动作，但没有可直接接入并保证冻结内容的文件引用动作；实现中的私有addFiles不被调用。本批固定引用为**完整固定版本文本草稿**，不是原生文件引用芯片，也不把动态当前文件冒充固定版本。

桥接与响应上限保持150000字符，包含资料说明/标识。正式测试验证正好150000字符完整通过、150001字符拒绝；不提高上限或截断。超长版本页面明确提示限制，展示完整只读“固定审核版本全文（可复制）”，保留Markdown导出和文件打开退路。超长稿的完整原生文件引用仍需后续宿主能力及实际验收，不能以本批退路宣称已支持。

### 打开当前文件

只允许从所选审核版本自己的保存回执定位Markdown。复用writeback manager的根目录、软链接、hardlink及安全路径检查，再通过Workspace材料读者作有界文件hash核验，末端重新解析路径/复核revision，防止校验期间Workspace根目录重绑定返回旧项目路径。

响应明确`kind=current-file`，包含读取时currentSha256及matchesReviewed；后者必须与实际hash比较结果一致，否则客户端拒绝。当前文件与审核版本一致时说明仅在读取时匹配；变化后仍可安全打开当前文件，但明确提示“原审核结论不适用于当前文件”。固定版本文本引用继续使用仓库原件，不受当前文件内容替换影响。

客户端复用coordinator的captureSavedFileTarget/openSavedFile，实际接线保持safePreview及Session/项目上下文检查。浏览器验证中的原生打开接口为合成记录，不声称已在真实Sidebar打开文件。物理文件在核验后仍可能被外部编辑，因此所有打开动作都标为当前文件，不能把一次hash匹配当作未来不变承诺。

### Markdown导出接续

继续使用现有prepare-save→明确核对项目/固定版本/文件名→单次token commit-save，将完整审核Markdown及现有元数据无覆盖保存到当前项目。API物理文件按既有_OIW规则；不新建下载目录、第二套导出服务或DOCX/PDF生成器。结果页解释“Markdown导出”，保存后提供对应回执的当前文件打开操作。双来源和长稿在浏览器真实RPC/临时磁盘上走完保存及打开接续。

## 2. 正式回归及复审过程

新增`test/v340-native-handoff.test.mjs`共17项和浏览器场景`test/v340-native-handoff.browser.mjs`。原正式测试仅三份路由断言文件的计数从52改54，其他原断言和测试/夹具逐字保留。

| 回归范围 | 结果/说明 |
|---|---|
| 双来源固定版本及保存文件RPC | 临时磁盘正文/hash/_OIW、完整引用、只读不写盘及重开保持 |
| 审核/项目/版本/未决保护 | 拒绝未审核、旧revision、外来项目/任务/版本/同hash跨项目选择、未处理草稿及未完成运行，不凭内容hash查找其他项目记录 |
| 当前文件变化/回执/重定向 | 不沿用审核结论，固定原文不变；外来writeback及软链接拒绝 |
| 客户端和异步边界 | Session变化、晚到用户输入、版本选择变化、脏草稿、dispose和晚到文件打开均不产生错误副作用；原composer不覆盖，不发送 |
| 150000字符及长稿退路 | 上限内全稿/多一字符拒绝；只读复制全文与原保存流程保持 |
| RPC身份、状态及Workspace根变化 | 错误身份/矛盾matchesReviewed拒绝；根变化拒绝返回旧项目路径 |

首轮5项正式测试全部失败，原因是新版方法缺失；UI两项亦先失败，再补接线。Host/客户端初次4/5，重复调用守卫同步throw与Promise接口不一致，改为async后通过，未弱化“不能覆盖”断言。

作者复审补齐三处边界：

1. matchesReviewed布尔值必须与currentSha256/resultSha256一致，先得到Missing expected rejection，再加响应schema校验。
2. 根目录重绑定后不能返回旧路径；初始审计夹具遗漏材料manager接口，产生初始化失败；补完整真实manager后`root-red.log`准确复现Missing expected rejection，再加入末端路径复核。初始化失败与有效红测分开保留，不将前者算缺陷复现。
3. 原dispose先等待v340队列排空，晚到只读交接会在关闭请求后写composer，正式断言出现true≠false。新增独立handoff AbortController及读等待中断；关闭先取消只读副作用，既有草稿写队列仍按原方式排空。关闭、选择/Session变化等正式回归通过。

6组私有副本分别撤去审核保护、上限保护、版本选择复核、dispose读取消、响应一致性和根目录复核；8个选中用例全部触发预期业务断言失败，6组均退出1。没有以导入/初始化失败冒充反例有效性。原工作区不为反例改写。

## 3. 新鲜验证

账本与原始日志：`.local/stage5-native-handoff-20261023/`，固定仓库Node及zsh执行，无依赖安装或真实服务调用。

| 验证 | 新鲜结果 | 证据 |
|---|---|---|
| 新增正式回归 | 17/17，失败0/跳过0，退出0 | final-targeted.log；最终full.log实际执行 |
| 受影响V340/B1/结果/bridge/composer/路由 | 131/131，退出0；为新增16项时执行，之后字符边界第17项由最终全量覆盖 | affected.log |
| 主包全量 | **998/998，失败0/跳过0，退出0** | full.log |
| Mac Markdown/Sidebar/安全预览/启动合同 | 26/26，退出0，未启动应用 | mac.log |
| 配对候选client/包/装配合同 | 9/9，退出0 | contracts.log |
| Chrome React DOM/StrictMode→RPC/store→临时磁盘 | 3/3：两种来源标签及长稿复制/导出/打开/变化提示；原生动作接口合成 | browser-results.json、组件核验截图 |
| 旁置构建 | 退出0；client SHA256 `457f7d68ee652a05e90cdcb0143bd73fab986dfe1b536eb6d9f8e2890fa332f4` | build.log、build/ |
| 候选包dry-run | 120成员，退出0；src与当前源码配对，无测试/依赖/本地状态/归档 | pack.json、package/ |
| 私有撤回反例 | 6组/8项预期失败，各退出1 | mutation-*.log |

主包：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。受影响组为v340全部测试加conversation-draft-bridge、native-composer-input及workbench-connection。旁置构建在业务包执行`../../tools/bin/node node_modules/tsdown/dist/run.mjs --config tsdown.config.mjs --out-dir ../../.local/stage5-native-handoff-20261023/build`；npm pack使用固定tools/bin/npm、offline/ignore-scripts、独立空配置及私有cache。

浏览器IAB不可用，改用现有Chrome完成3个组件场景，没有启动Desktop。测试页及仅本轮自建的loopback服务已关闭，服务退出0并清理自身临时项目。截图为本批组件场景结果，不是实际Sidebar打开或用户业务验收。

## 4. 保全、限制与下一步

起点3291份文件冻结于baseline.json，旧src和状态原文保存。范围内仅运行/响应/RPC/共同页面接线及三份路由计数测试修改；活跃lib、固定依赖/锁/资源/pin、Profile/应用/准入、旧证据和其他原测试保持。旧状态全文作为本次摘要精确字节后缀保留；最终路径及SHA256清单见preservation.json、final-summary.json。

未启动Desktop/实际DSH，未新增真实模型/API、认证/登录、上传/费用或对话发送，未安装/升级依赖、改应用/Profile/准入、提交/推送/发布。生产来源和真实run/create仍禁用，旧unknown、历史草稿、原审核/保存及values-v1兼容保持。

本批为单代理作者复审，未遗留本范围已知P1/P2，不代替第三方独立审计或未测路径保证。原生动作接线与合成场景完成；实际Desktop的安全打开、真实composer、正常重启、跨进程排他和安装升级仍待后续F验收。长稿原生固定文件引用能力仍明确未支持，当前采用完整复制/Markdown保存/当前文件打开退路。

建议按后续计划进入B批，只读核对14节点本地资源与API映射，不自动执行B、C或真实调用。阶段5整体未完成。
