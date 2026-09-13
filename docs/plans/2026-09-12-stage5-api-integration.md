# 阶段5：专业API接入同一权利要求书页面

> 实施采用 superpowers:executing-plans，默认单代理。本文为用户批准的计划制定成果，不是代码实施、真实API、费用、提交、推送或发布授权。

**目标：** 保持已确认界面与四选项卡，让用户仅切换来源，取得可审阅的API权利要求文字，并按与本地结果相同的规则编辑、再审、保存和放入DSH对话草稿。

**架构：** 复用现有API客户端、远程执行记录和统一结果操作；增加权利要求固定映射薄适配，不建设第二套表单、请求调度器或通用Provider框架。远程执行状态仍由现有remoteExecutions管理，结果只发布一次到共同runs，不双重落库。

**基础：** DSH及Desktop内置DSH均0.1.2-rc.1；Desktop2.0.5；Better Sidebar0.18.0；本地flow-2-6/0.2.2保持不变。不调整本地low、16384或重试策略，不升级依赖。

**依据：** D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-05-oasis-unified-workbench-implementation-plan.md 第5阶段及最新AGENTS规则。没有openspec目录，使用本计划作为等价范围、合同、证据与停止点记录，不安装工具。

## 1. 本轮只读核对

- Git HEAD：680a500505feea9f338d406a48c4484bc49ac3e8；存在阶段4与指引维护未提交变更。以下判断基于当前工作树，不把HEAD当作当前候选全部源码；实施前保留并核对受影响文件差异，不吸收无关修改。
- 4F/4G已由用户接受可修改基线，按本地来源范围收口；不等于API来源或发行验收已完成。
- 权威文档：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md。
- 2026-09-12实读SHA256：429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1，与项目基线一致。文档自述静态核对边界，不能视为当前非生产服务可用性证明。
- 本轮未访问业务网络、未读取凭据、未启动Desktop、未执行模型/API请求或代码测试。下面的问题为源码与文档对照结论，不冒充运行复现。

| 证据位置（均在项目根目录下，外部API文档除外） | 已有能力 / 缺口 |
|---|---|
| packages/oasis-professional-service/src/oasis-api-contract.js | 九个legacy端点、Bearer凭据解析、安全响应检查、同步创建和进度观察已实现，复用而非重写 |
| packages/oasis-professional-service/src/oasis-remote-service.js:379–575 | 旧professionalDraft与remoteExecutions；有价格余额、schema、folder、发送前记录和未知保护，但尚非新统一四字段入口 |
| packages/oasis-professional-service/src/generation-contract.js | 当前四字段claims-disclosure-2；isUnifiedRun仅接受unified-fixture/dsh-local，不接受真实API结果 |
| packages/oasis-professional-service/src/client/UnifiedGenerationPage.js:45–58；client/workbench-store.js:1046 | 真实API仍明确禁用；不能仅打开开关宣称接线完成 |
| packages/oasis-professional-service/src/oasis-remote-service.js:233–298 | 旧结果mode=oasis-legacy，可从仅文件URL生成带标题的artifact；不满足本次“真实非空权利要求正文”验收 |
| packages/oasis-professional-service/src/oasis-runtime-config.js；client/OasisSettingsSection.js | 原生设置/凭据origin绑定已有；缺当前Workspace与账户身份共同绑定的专业服务项目配置 |

### 必须先处理的风险

1. **创建后认证错误允许重发的路径**：remote-service.js:553–558将submittedAt清空为null、状态置auth-required；continue的504行允许该组合再进入create。不能认定401/403意味着此前绝未执行。5A先用替身复现，再修复发送标记保留与恢复路径。
2. **账户隔离不足**：assertExecutionEnvironment目前只比较origin。新统一API路径必须冻结origin、非秘密账户ID、凭据修订号、Workspace、folder及服务映射指纹；同origin换账号也必须阻断原运行继续。旧记录不能补造身份或自动解锁。
3. **示例不支持现成绑定**：API文档8.4七字段且描述混有说明书语义，与当前四字段不同；不能将示例id31、patent_generate、价格3或中文名称视为真实绑定。现有detail.name===apiEndpoint要求也不能仅据此改掉，应由同一真实目录项→详情响应建立ID一致性与名称语义证据。

## 2. 字段映射裁决

| 共同输入（唯一草稿） | 长度上限 | 文档8.4示例 | 本次结论 |
|---|---:|---|---|
| disclosure_text 技术交底，必填 | 20000 | technical_field / background_art_TD / technical_solutions / beneficial_effects_TD / embodiments_TD | 无可直接证明的无损一一映射，不拆猜交底、不调用模型提取、不把全文塞某字段绕过 |
| drawings_text 附图说明 | 12000 | drawings_explain_TD，类型string | 仅语义候选，需真实详情确认长度、含义及空值规则 |
| claim_requirements_text 撰写要求 | 8000 | 无明确独立对应字段 | 不合并丢失边界，不编造默认值 |
| user_input 用户指令 | 4000 | User_input | 大小写有别，且示例描述为说明书任务；尚非确认映射 |

首个API验收仍是“技术交底→权利要求”，不要求先生成具体实施方式，不回退七字段旧表单。映射需覆盖所有可填写共同字段，不只是必填字段。后端若字段名不同但语义等价，可固定逐字段改名；其他转换须先证明无损并明确确认，不增加任意映射脚本。

上游文件：本批真实验收零附件、无上游；若用户已有非空上游选择，未证明API能接收同等正文前禁用提交并说明原因，不静默忽略或清空该选择。本地上游能力不改。

**推荐路线：5A最小离线安全修复→5B只读服务确认→5C接线→5D隔离闭环→5E唯一真实验收。** 不选择先完成大规模通用映射再找服务，也不扩展后端Dify或改变已确认UI。

## 3. 5A：最小离线安全修复（建议下一批，仅此批可单独批准）

2026-09-12执行更新：用户“同意实施”批准本批，已完成一处发送标记保留修复及定向红绿验证；45项与补充既有32项回归退出0。证据见docs/evidence/2026-09-12-stage5a-api-no-resubmit.md。以下为原实施清单，未授权5B真实请求。

目标：即使创建返回认证错误，刷新凭据、重复继续或重启恢复也不能重发同一请求。与真实服务字段无关，优先消除已有发送风险。

文件：
- 修改 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js。
- 扩展 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-remote-service.test.mjs。
- 只有现有持久化合同不能表达保留submittedAt的auth-required时才定向改同包src/workbench-contract.js及相应合同测试，不新增状态框架。

- [ ] 读取当前测试工厂，使用同一替身客户端，createWorkflow记录计数后抛AUTH_REQUIRED；首次continue后保存存储，再调用continue以及用同一repository重建service后continue；修复前确认create计数大于1是失败原因。真实fetch禁止。
- [ ] 最小修改：create已尝试后的AUTH_REQUIRED保留原submittedAt和requestKey；auth-required仍提示配置凭据，但后续只能观察原key，不再create。发送前凭据不可用的校验仍允许用户配置后首次发送，不混同两阶段。
- [ ] 增加对照：正常成功只create一次；一般断连保持unknown；等待认证失效不清发送标记；stop/restart不解锁；前置认证失败create为0；不同Workspace/同Workspace未决互斥保持原边界。
- [ ] 运行以下定向命令，记录退出码和断言，不在此批运行整包verify或Desktop：

```bat
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service
node --test test/oasis-remote-service.test.mjs test/oasis-api-contract.test.mjs test/workbench-remote.test.mjs
```

关键断言（嵌入现有测试工厂，不新建验证器）：
```js
assert.equal(createCalls, 1) // 首次发送、再次continue、service重建之后均保持1
assert.equal(execution.submittedAt, firstSubmittedAt)
assert.equal(execution.requestKey, firstRequestKey)
assert.equal(preDispatchCreateCalls, 0)
```

- [ ] 更新本批证据到docs/evidence/2026-09-12-stage5a-api-no-resubmit.md和当前状态索引。旧unknown、旧任务与旧哈希不迁移。无自动commit。

交付：消除当前代码路径的认证重发风险；仍不开放API按钮，不宣称双来源交付。

## 4. 5B：真实非生产服务只读确认（单独授权）

输入门禁：用户提供非秘密非生产origin，并确认账号及测试项目；JWT仅在隔离DSH原生设置中填写。不得默认复用127.0.0.1:6326合成服务、真实Profile凭据或阶段4的DeepSeek授权。

- [ ] 先确认目标是非生产、接收方及账户；批准以下业务只读调用，不包含create/upload。设置保存如会触发bootstrap读取，必须在此授权范围内启动；不凭“只读”绕过账户数据授权。
- [ ] 通过现有客户端读取GET /api/user/detail、GET /api/apicategories/detail、POST /api/apicategories/apidetail（仅选中候选的{name}）、GET /api/user/user/folderlist、GET /api/user/user/folderdetail/{id}。不扫描所有服务、不猜URL、不开账单/流水查询。
- [ ] 只保留经白名单挑选的非秘密证据：账户ID（不含姓名手机号）、origin、服务id/endpoint/名称、api_process、is_async、价格、输入输出schema、目标folder ID/归属。若意外含凭据字段，现有合同拒绝，禁止原样日志/截图/保存响应。
- [ ] 匹配Workflow、is_async=0、实际权利要求文字输出、四字段语义/长度/空值/必填要求；文档未明确的信息要求服务方提供非秘密合同说明，不能以未标required推断全部可省。
- [ ] 生成经确认的绑定表与schema/映射指纹，保存docs/evidence/2026-09-12-stage5b-api-binding.md；仅在服务确实匹配后形成5C字段级执行清单。

失败分支：没有同义服务、接口只接受七字段/先有实施方式、只出文件、异步或缺关键合同，则API来源继续禁用。输出准确缺项，交用户选择服务方调整或另行设计；不自行改后端、换模板、换来源或实现转换Agent。

本阶段是获取实施前提，不是功能完成。当前真实服务id/字段尚无证据，因此不编造“立即可执行的5C绑定”；5C必须使用5B产出的实际合同再批准。

## 5. 5C：固定映射与统一接线（5B满足后）

沿用主计划的src/oasis-generation-adapter.js薄模块：读取已批准固定绑定和同一formValues，调用既有remoteService.start/continue；不增加第二个网络client、runner或数据库。专业API请求仍仅五个顶层字段：id、key、inputs、api_process、folder_id；不发送本地Skill正文/内部结构、账户快照或DSH凭据。

实施顺序与文件职责（包根D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service）：

1. **项目绑定与确认快照**：src/workbench-contract.js、workbench-domain.js、oasis-runtime-config.js、workbench-rpc.js、client/OasisSettingsSection.js、client/oasis-connection-settings.js。原生设置显示当前权威Workspace，绑定origin+非秘密账户ID+folder+服务+映射版本；设置仅调用既有RPC写Domain，不存第二份业务草稿。每次显式更新凭据递增非秘密credentialRevision，无JWT哈希/副本。origin/账户/凭据revision/服务/schema/价格/输入/上游变化使确认失效；有未决创建时不允许切配置后继续创建。旧记录缺身份仅历史可读，禁止自动补写身份。
2. **接线与发送**：新增上述薄adapter，定向修改src/oasis-remote-service.js、workbench-service.js、workbench-rpc.js、index.js及client/workbench-store.js。由Host权威Workspace定位任务，要求source=oasis-api、schema=claims-disclosure-2、当前revision及有效确认。API adapter从四字段映射，不创建用户可编辑的professionalDraft副本；映射后的不可变inputs只入执行快照。发送前持久化key/时间和绑定，保留一个Workspace最多一个活跃运行。全链有限等待、单次create、不自动重试；停止只是本地停止等待。
3. **统一产物合同**：src/generation-contract.js、workbench-contract.js、oasis-remote-service.js、unified-generation-service.js。新运行mode=oasis-api、source=oasis-api、evidenceKind=non-production-api；旧oasis-legacy与合成记录原样保留。remoteExecutions是执行状态唯一owner，完成后以executionId关联只发布一条共同run。复用artifact、parentRunId、审核、写回、固定版本引用；扩展isUnifiedRun及共同状态判断覆盖新mode，不强制API返回本地累计JSON。
4. **结果成功规则**：同步响应的answer_text必须trim后非空才形成文本可审产物；仅文件/空文/100%无正文保留原执行和安全回执、显示“未取得文字”，不靠标题或URL拼出假正文，不自动下载/重跑。file_url仅按既有安全来源策略保留为未下载未验证附件。queryprocess仅观察原key，不承诺恢复同步正文。401/403不清发送标记，配置或账号改变不能继续观察到其他账户。
5. **共同UI**：client/UnifiedGenerationPage.js、GenerationSourceSwitch.js、UnifiedResultPanel.js、workbench-store.js及现有WritebackPanel。继续四选项卡与同一分段开关，开关本身零网络、零草稿丢失；费用与外传摘要复用当前确认位置，包含服务、项目、输入量、参考费用、目的地；API状态不同不增加第二套结果页。移除新路径中“原生模型生成/合成验收”错误来源标签，保留历史标签。只在原生设置配置连接，网站处理充值/流水。

必要断言：每个四字段的独特标记均抵达批准映射目标；未知/额外必需字段禁用；来源切换零fetch；过期确认零create；同origin换账户/folder或credentialRevision变化零create；未知恢复create计数保持1；两来源同等审核、编辑失效、保存及引用权限；旧运行/哈希不变。测试扩展既有API、remote、unified、设置和迁移文件，新增主计划约定test/generation-provider-parity.test.mjs，不扩展诊断链。

## 6. 5D：隔离Desktop闭环（无真实业务网络）

- [ ] 采用同一候选构建及原生设置，复用现有本机合成服务基础；仅替换此次明确标为测试的数据，不冒充5B真实服务响应证据。不启用真实模型、不读取真实JWT。
- [ ] 一次候选npm run verify，之后实际Desktop检查同页两来源切换/四字段保留/价格确认/正常正文/编辑再审/新目录保存/原生打开/重启恢复/正确Workspace对话草稿（不发送）。只运行受影响定向回归，不按UI步骤反复整包验证。
- [ ] 用已有测试完成断连、401、返回仅文件、进度100%无正文、重复继续、跨Workspace与旧历史合同；不为每种异常重复人工窗口验收。
- [ ] 核对真实Profile内容基线、旧任务及4F原稿哈希，关闭候选并清理本次临时钩子。UI窄宽适配沿用V3.1，不重做原型。

结果仅为隔离合成接线证据，不能宣称G-API真实完成。

## 7. 5E：唯一真实API业务验收（另行明确批准）

发送前明确origin、账户/项目、服务身份/价格、四字段合成内容及实际接收方、最多一次create、零上传、费用上限。阶段4的10元不是API新增授权；已有余额不是扣费许可。冻结5B绑定和5D构建，任何必需变更先停止，不自动换服务。

- [ ] 由正常确认UI发送唯一一次，持久化key/执行快照后发出；无自动重试。出现未知即止于原记录，不解锁不换key重发。
- [ ] 真实返回正文人工评阅：确为权利要求初稿，技术关系/依据/缺项诚实；无需与本地字句或章节一致，不能以HTTP200代替质量。用户确认可修改基线。
- [ ] 复用同次API结果完成编辑再审、无覆盖Markdown保存、原生打开、重启恢复和DSH草稿引用（不发送），不再花一次调用预算做阶段6。
- [ ] 完成候选关闭、Profile及历史保全、有限费用结果记录。记录实扣需用户/网站证据；不把参考价格、余额差或同key流水候选当已确认结算。

验收G-API仅在上述真实业务、同等结果操作及人工确认齐备后通过。范围为单模板、同步文字、非生产API；异步、文件上传/下载、第二模板、真实Profile安装、发行升级和发布另列，未交付部分不消失。

## 8. 本次交付与下一动作

本计划已依据本地文档和当前源码完成单代理自审：不倒置专利流程、不编造映射、不续用费用授权、不新增诊断平台，保护现有dirty工作树。无独立审计或真实API证据。

建议下一步只批准5A离线安全修复；5B须先确认非生产地址及只读账户访问范围。5C的字段级计划必须以5B实际绑定为输入，不能在缺真实服务证据时批准硬编码实施。按docs/project-current-state.md记录进度，不向AGENTS追加阶段流水，不自动提交推送。
