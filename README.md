# DSH-Oasis · 绿洲慧写专业作业入口

> 当前传播工作线：[BM1-R1／S2-R1](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-public-channels-s2-r1>)；落地页复用Frontpage，公众号由WorkBuddy运营，workarea保留作业及账户财务职责。

> 当前测试集资产用途：[BM1-R1／S1](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-test-assets-s1>)；规则用于Skills/Dify制作输入，样例用于开发测试及公众号/网站素材，评价答案保持隔离。

> 当前执行分工以 [BM1-R1](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-roles-r1>) 为准：WorkBuddy采集与内容运营，Codex全部开发及Skills/工作流制作；旧阶段目标和历史证据保持。

> 当前商业方向／优先级：[BM1（2026-11-05）](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md>)；本文件旧目标、起点和排程与BM1冲突时由本次明确接续，原状态、合同、接受与历史证据保持。

<!-- oasis-coordination:start -->
<!-- oasis-coordination:project=dsh-oasis -->
## 跨项目协同入口

项目ID：`dsh-oasis`。先读[统一协同约定](../docs/coordination/README.md)及[项目登记表](../docs/coordination/projects.json)，再按本项目规则与实际状态执行。当前协同版本以中心为准；本入口建立于2026-10-25。

本项目职责：由Codex开发主要用户作业入口，提供Skills与经后台衔接Dify的专业服务；全部用户账户管理与财务页面归workarea，GitHub说明由WorkBuddy撰写。

进度仍以本项目原状态入口和具名证据为准；本挂接不启动业务任务、不改变历史结论或原有运行/验收边界。

当前独立总计划（规划稿，未执行）：[本项目总计划](docs/plans/2026-10-25-dsh-oasis-master-plan.md)；[跨项目兼容目标](../docs/coordination/compatibility/2026-10-25-project-compatibility.md)。
<!-- oasis-coordination:end -->

当前执行状态读取 `docs/project-current-state.md` 及其明确引用的证据；下文阶段0说明是历史迁移范围，不能替代当前阶段与本次用户授权，也不能据旧记录宣称当前Desktop或双来源已通过。


当前开发根目录是 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，Git 分支为 `mac/continuity-v2`。2026-10-24按用户指示由 `dsh-lab` 更名，旧目录保留为兼容符号链接；提交历史和既有未提交内容保留。

**项目定位（2026-10-24原基线，执行者按2026-11-05 BM1-R1接续）：** DSH-Oasis是两个用户前端中的主要作业入口，提供Skills与来自Dify服务器的专业服务；远程专业服务经 `绿洲慧写-后台4.0` 的API接入。`workarea` 同时提供远程专业服务，并承载全部用户账户管理和财务服务。DSH所需Skills由 `专利知识库/patent-distillery` 负责蒸馏制作（执行者Codex）；Dify工作流在Skills基础上制作。`测试集库` 为两类执行提供测试基础和可复用规则。完整协作约定见[开发项目目录约定](../AGENTS.md)。这些是职责基线，实际完成状态仍以各项目证据为准。

绿洲是 DSH Desktop 内的专业业务插件。首模板为 Flow-2-6 权利要求初稿，两种来源共用输入、结果、审核、保存和对话草稿流程。完整14节点、实用新型、全部文件通道、当前真实双来源和正式发行仍需后续验收。

先阅读：

- [AGENTS.md](AGENTS.md)：当前约束及末尾 Mac/root 补充。
- [项目说明](项目说明.md)：固定组合、构建命令和当前验证边界。
- [开发目录与恢复映射](docs/development-layout.md)：活跃开发、归档、依赖和回退的位置。
- [原开发路线与阶段条件](docs/plans/2026-10-13-oasis-development-roadmap.md)：历史顺序和已确认局部条件保留；当前独立规划见上方总计划。
- [阶段0证据](docs/evidence/2026-10-13-stage0-root-relocation.md)：保全、目录提升、离线依赖准备和本轮验证。
- [当前状态](docs/project-current-state.md)、[2026-10-11收口](docs/evidence/2026-10-11-program-functional-closeout.md)、[单次调用结果](openspec/changes/upgrade-dsh-test-20261007/local-model-test.md)：流超时追溯入口。
- [当前业务基准](docs/business-baseline/ACTIVE-BASELINE.md)、[V3.4.0差距](docs/business-baseline/COMPATIBILITY-GAPS.md)。

实际业务包在 `packages/oasis-professional-service`。固定组合为 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及已审本地补丁；不自动升级。

阶段0不包含 Desktop 启动、账号认证、真实模型/API调用或发布。`--check` 只核对准入，不代表 GUI 或提供方运行通过。

原 README 的第三周 Windows 开发说明已完整保全于 `.archive/pre-root-20261013/candidate-source/README.md`，作为历史参考。


<!-- oasis-business-mode:BM1 -->
## 当前业务方向与阶段（2026-11-05，BM1）

[整体BM1](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md>)／[本项目总计划BM1](<docs/plans/2026-10-25-dsh-oasis-master-plan.md#oasis-business-mode-bm1>)为当前商业方向和优先级接续；原进度仍由登记current_entry及具名证据维护，文档更新不等产品已上线。

以DSH插件优先交付可用业务Skills，保留后发收费专业服务入口；与WorkBuddy用户插件共享业务合同，后者的机制/目录/实现归属待绑定。

Skills优先上线；收费专业能力约1—2个月、全自制开源后台替换约2—3个月为目标窗口，准确起算点/日期待确定，不默认采用此前助手提出的Skills上线日T0。近期复用阿里云青岛第三方开发版；旧按次/充值/余额暂保留降优先级。 GitHub、落地页与公众号用于传播，咨询及专利所/大型企业私有部署为盈利方向；用户WorkBuddy插件与连接器分别交付，连接器同时用于内部效率、专业展示和GitHub Star/咨询转化。

复用与边界：复用已交工程闭环和F限定接受、11月5日Fast39/JTTI复测记录；原记录记调用/提取通过、内容partial，来源ID/锁止件/输出投影问题已定位，原R1/R2 FAIL与正式绑定/G0 OPEN保留。不重取已得回执/提取证据，不由BM1新增调用或修复。 本次只修规划/导航，不更业务状态、公开仓库、恢复测试或启动实施；开源许可/第三方范围及插件机制等未核项沿BM1，不宣称全量已开源或已部署。


<!-- oasis-business-roles:BM1-R1 -->
<a id="oasis-business-roles-bm1-r1"></a>
## 当前执行分工接续（BM1-R1，2026-11-05）

WorkBuddy负责从微信公众号、腾讯IMA和大型专利所定期采集信息并保存源知识库，基于已有知识库撰写并发布公众号/网站推文，撰写各项目GitHub说明；Codex负责所有项目开发、知识蒸馏、Skills及工作流制作。

**本项目：** Codex复用现有DSH工程，优先装配和交付首批Skills，后发收费服务按原API/权限/费用合同接入；WorkBuddy依据同版技术事实撰写安装、使用和版本说明。WorkBuddy用户插件的开发执行者已明确为Codex，机制与具体实现目录仍待核。

**协同链路：** WorkBuddy交具名来源包→Codex按适用规则制作/验证Skill及工作流→提供同版技术事实包→WorkBuddy撰写说明和推文并按实际范围发布。已有知识可先消费，说明草稿可先交；不要求新采集/宣传/Star先完成才开发，也不把未完成开发全部设为内容选题前置。

采集/发布周期、渠道账号、来源许可和实际发布范围按对应运营计划绑定，本轮不新建定时任务、不投递、不采集或发布。技术事实、API/规则/验证与AGENTS由Codex维护，WorkBuddy据同版事实撰写GitHub面向用户说明；本轮用户明确授权的README治理同步由Codex完成，不代未来运营文稿生产。

**兼容与历史：** BM1的全面开源、DSH/WorkBuddy插件入口、Skills优先、收费能力约1—2个月、青岛第三方后台过渡与自制替换约2—3个月、旧财务保留及连接器双重定位保持；起算点/准确日期未定。WorkBuddy用户插件开发执行者已明确为Codex，具体机制/实现项目和目录待核。当前协同1.2.2，基础规划1.3.1／NS1-R1＋BM1-R1；旧执行者分工冲突由本节接续，原阶段、来源/许可/资金/接受/FAIL/UNKNOWN不重置。

读取入口：[BM1整体职责补充](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-roles-r1>)／[简洁总计划](<../docs/coordination/plans/2026-11-05-overall-plan-brief-bm1-r1.md>)；准确读取/原始完整字节hash、差异及修改前证据见[本轮记录](<../docs/coordination/execution/2026-11-05-bm1-roles-r1/修订说明.md>)。每次规划/开始或恢复执行仍按R1/EXEC-R2解析登记当前followup，不仅凭本链接或旧摘要。本轮仅文档和必要治理结构核验，不制作产品、不采集发文、不投递、不部署/收费、不安装/构建/提交/推送/发布。


<!-- oasis-test-assets:BM1-R1-S1 -->
<a id="oasis-test-assets-bm1-r1-s1"></a>
## 测试集规则与样例用途补充（BM1-R1／S1，2026-11-05）

用途补充接续BM1-R1；协同仍1.2.2，原角色和业务阶段不变。详见[整体用途补充](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-test-assets-s1>)。

- 测试集规则中适用且制作可见的部分，作为Codex制作Skills和Dify工作流的信息输入与规则基础，记录准确版本/原始SHA256、效力/用途、采用落点、条件及例外；不将全部规则自动生效或全部样例自动纳入生成。
- 样例用于各项目开发过程中的适配测试，也作为WorkBuddy撰写公众号、网站推文的素材；Codex负责全部开发、测试及技术事实校核，WorkBuddy负责选材、撰稿和按实际范围发布。样例/测试结果/已发布文章分别留证。
- 制作可见规则与题面、评价专用答案/评分材料、可公开宣传素材分开。evaluation_only答案不进入Skill正文/提示词、Dify生成上下文或对外素材；宣传仅引用可公开部分或有来源的演示派生稿，不改原可见性/原件/收据，不把已暴露答案的评价称独立盲测。
- 复用原规则、样例、验收与测试证据，仅在选用时沿原记录补用途/映射和真实缺件；规则/素材可先交，测试与宣传不互等完成，不新增素材库、发布系统或第二套业务状态台账。
- 本项目适用：Codex按所选业务Skill的规则采用范围与目标Host合同复用样例做开发测试，固定Skill/规则/输入/结果版本；本地Skills与远程专业服务分别验证。测试材料不自动变成首发包或产品生成输入，宣传只引用同版已核事实，不新增模板或调用。
- 本次仅文档维护，不选择/制作新规则或样例，不运行产品/业务测试、调用模型/API/Dify/数据库/支付、投递WorkBuddy、撰写或发布推文；原FAIL/UNKNOWN、冻结与接受保持。

实际读取/完整原始字节hash、差异及修改前原件见[本轮修订记录](<../docs/coordination/execution/2026-11-05-bm1-r1-test-assets-s1/修订说明.md>)；这些文档不证明其他会话已经加载新要求。


<!-- oasis-public-channels:BM1-R1-S2 -->
<a id="oasis-public-channels-bm1-r1-s2"></a>
<a id="oasis-public-channels-bm1-r1-s2-r1"></a>
## 网站落地页与微信公众号工作线（BM1-R1／S2）

落地页复用现有Frontpage工程；微信公众号为内容运营工作线。详见[整体S2](<../docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md#bm1-public-channels-s2>)、[落地页总计划](<../Frontpage/docs/plans/2026-11-05-frontpage-master-plan.md>)及[公众号总计划](<../docs/coordination/plans/2026-11-05-wechat-official-account-workstream-plan.md>)。

- Codex负责网站/必要工具开发、集成、获准技术动作与事实校核；WorkBuddy负责选题、文案、稿件、GitHub说明及公众号/网站内容发布。静态部署可同时形成一次公开事件，两角色分别引用同一回执，不要求重复发布；原仅人工激活及专业/法律审核门不因分工被替代。
- Frontpage承担品牌/开源产品/案例/文章/咨询与私有部署入口；workarea承担用户作业、专业服务、账户与财务。复用现有页面/路由及内容机制，源码存在不等当前线上部署或发布接口已验证，不复制网站、账户、钱包、CMS或后台。
- 本项目任务：提供Skills/插件安装使用、准确入口、版本和真实能力事实供落地页/公众号引用；不在插件另建宣传网站或账户财务。
- 沿原技术事实/稿件交接绑定版本、原始hash、公开范围与实际渠道回执；S1评价答案隔离及原来源/许可/专业/用户/发布门保持。文稿可先准备，不以全平台、全部案例或连接器闭环为共同前置。
- 本轮仅文档维护，未建设网站、生成推文、投递、登录公众号、配置定时发布、运行业务测试、调用模型/API/数据库/支付、部署、提交/推送或发布。旧计划/收据/FAIL/UNKNOWN及历史字节保持。

修改前原件、版本/hash、差异与本轮验证见[修订记录](<../docs/coordination/execution/2026-11-05-bm1-r1-public-channels-s2/修订说明.md>)；不推定其他会话或WorkBuddy已经加载。

S2-R1审计接续：静态公开事件只发生一次，LP-03准备/事后核验分开，原人工激活及专业/法律门保持；版本/hash、差异和修改前字节见[本轮审计](<../docs/coordination/execution/2026-11-05-bm1-r1-s2-audit-r1/审计与修订记录.md>)。原S2交付记录保持原字节，本段不宣称业务运行或其他会话已加载。
