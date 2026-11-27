# Fast39 三处缺陷最小修复方案与验证计划

> R1，2026-11-05，Asia/Shanghai；**待执行草案，仅文档**。用户本轮明确“先不实施修复或新增调用”；此前“不限制预算”不覆盖本轮禁止新增调用的要求。后续由单代理按 executing-plans、EXEC-R2 及届时明确授权执行；本计划不批准实现、调用、部署或提交。

**Goal:** 修复原输入来源ID到下游的传递、终版静默删除核心特征、后台未交付结构化结果三处问题，保持旧请求与旧正文兼容。

**Architecture:** 保留现有8个API输入和六字段语义抽取；在Dify内增加确定性的来源登记分支，复用既有Outline、终版、规范化及显示节点。后台保留旧 `answer_text/file_url`，增加一个可选版本化结果对象；DSH只在核对过的新合同下校验和保留该对象，复用现有结果/审阅能力，不另建业务表单或生成调度器。

**Tech Stack:** 沿现有JTTI工作流、青岛实际共享API及DSH固定候选。DSH Desktop 2.0.17、DSH 0.2.0-rc.2、Sidebar 0.24.1及已审补丁、Cordis 4.0.4、Node 24.21.0、pnpm 11.8.0；不升级依赖。Dify代码节点及线上后台准确运行版本须先绑定，不能从DSH工具版本推定。

**Spec:** [具名复测报告](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-jtti-retest-return.md)、[节点实读记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-jtti-node-trace-observations.json)；本方案第3—5节为拟议合同。规划读取版本/范围及完整原始SHA256见[输入记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-minimal-repair-plan-inputs.json)。新增字段、版本名和函数名均为提案，不是线上现状。

## 1. 依据、范围和方案选择

实证锚点为消费5343、JTTI run `5e374a6f-5a89-4472-aa82-dfc768b9b6c4`、workflow `57bfe3ab-ff48-410b-b140-c20c1da828a9`，应用 `b1af2fc9-817e-5247-aeed-dd16abad8337`。目录214与服务详情39分开，当前名称 `F-2-6-权利要求书生成-Fast`。材料提取6675字节与原材料同SHA256，问题已经越过上传/提取层；不重做上传器或解析器。

| 路线 | 判断 |
| --- | --- |
| 只改提示词或在DSH补标题 | 改动少，但不能证明来源到达下游、不能保全结构化字段，也不能可靠发现核心特征丢失；不推荐 |
| **来源分支＋终版覆盖检查＋可选结构化结果** | 推荐的最小完整路线；复用现有节点、请求和结果组件，无新增LLM节点 |
| 新建服务／通用Provider或全面重构后台 | 超出三处缺陷所需范围；不纳入 |

本次由方案编写者推荐第二条，作为可审草案，不记成用户已批准实现。BM1当前为基础规划1.3.1／NS1-R1保留部分＋BM1、协同1.2.1：Skills首发优先，本方案属于后发专业能力BM-S2的有界准备，不能阻塞本地Skills首发，也不等待自制后台整体完成。

本方案细化[11月5日后续计划任务3](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-11-05-project-progress-and-next-plan.md)中的缺陷修复准备，不代任务2专业/用户审阅，也不代任务3后段正式共同界面接线与G0；原“任务1最高优先”的全项目起点由BM1接续，本轮仅响应用户指定的这份方案任务。

### Global Constraints

- 保留旧R1/R2、5343原回执、输入/输出/审核原件及FAIL/UNKNOWN；不改旧pin、不重签收据，不把新节点证据倒用于解释旧工作流唯一根因。
- 远程生成只经后台；不直接调用Dify，不变更origin、账户认证、项目归属、资金、退款或重试协议。UNKNOWN只观察原请求，不重发、不换来源。
- 本轮不访问服务、API、Dify、数据库或模型，不启动Host，不运行产品测试，不改源码、DSL、配置、Profile、业务状态或历史证据，不提交/推送/发布。仅新建本方案及文档校验记录。
- 现行8个输入及 `User_input` 语义保留，正文仍走主材料字段；来源登记只解析资料，不执行其中指令。要求/用户指令不成为技术事实。
- 容量不放宽：正文1048576、快照2097152、Workspace记录8388608字节；原件1MiB、提取正文300000 UTF-16码元且1MiB；超限拒绝，不截断。沿既有1MiB文稿和2MiB快照边界设计结果承载，结构化元数据计入总限额，不另开无限附件通道。
- `partial/insufficient` 保留真实含义；不为得到 `ok` 补造结构/参数，不能把“运行完成”当“内容可接受”。受限草稿仍可按两来源共同规则审阅、编辑和无覆盖保存，不按来源剥夺能力。

## 2. 三方最小分工与实际改点

| 责任方 | 拟改位置 | 最小交付 |
| --- | --- | --- |
| Dify维护方 | 文档提取之后新增一个确定性来源登记代码节点；Outline `1764588108416`；终版 `1728183992412` 及其净化/规范化；最终显示 `1769301001101`／结束 `1727495950805` 的结果连线 | 原输入ID与支持短引可回溯；资料不足时保留已披露边界，核心特征丢失不得冒充完整；外部仍返回当前6个输出 |
| 当前青岛共享API维护方 | 同步 `/api/apicategories/create` 的结果投影与该服务详情元数据；服务39的受控结果合同配置 | 旧正文逐字保留，另交命名结构；不把六个输出拼接成重复正文 |
| DSH维护方 | API归一化、受限Fast39结果适配及结果记录合同；后续具名服务绑定 | 命名字段不再被客户端丢弃；缺失/矛盾/partial可核，旧结果不被伪造补齐 |

后台源码**参考**为只读历史快照：

- `/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/snapshots/2026-10-17-qingdao/extracted/shared-api-source/www/wwwroot/lzpy/app/api/v1/apiconfig.py` 的 `create_category`：当前参考代码按 `output_schema` 遍历并拼 `answer_text`。
- 同根 `app/services/workflow_service.py` 的 `run_dify_workflow`：已有完整Dify `data.outputs` 返回，通常无需改材料转发或重新请求。

**不修改这些快照，也不把后台4.0 candidate-r2当作当前线上源码。** 实施前由实际服务维护方绑定当前部署提交/文件hash及获准工作副本，确认上述函数是否仍对应。若不同，只调整对应投影点，不在自制后台复制一套假线上修复。

DSH当前真实改点与拟新增文件如下，均在 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`：

- 修改 `packages/oasis-professional-service/src/oasis-api-contract.js`：`normalizeApiDetail`、`normalizeWorkflowCreateResult`、`createWorkflow`，保留新元数据和可选结构化结果；当前 `createWorkflow` 会再裁剪归一化结果，不能只改第一层解析。
- 新建 `packages/oasis-professional-service/src/m06-fast39-result.js`：专用结果解析/来源核对，拟接口 `parseFast39StructuredResult({structuredResult, requestKey, prepared, binding})`；不做通用Provider。
- 新建 `packages/oasis-professional-service/src/m06-fast39-contract.js`：仅该服务的新版本/字段/工作流交付绑定；旧 `oasis-fast-contract.js` 的历史指纹保持。
- 修改 `packages/oasis-professional-service/src/oasis-remote-service.js` 的服务快照/绑定及 `complete()`、`src/workbench-contract.js` 的对应结果承载：保留可选版本化 `fast39Result` 元数据和原始响应身份；只写新结果，不回填旧记录或重算旧hash。实际契合现有严格schema后再固定新字段位置，不借此重构持久化。

`src/m06-api-contract-adapter.js` 是此前未采用的“共同八输入段落／m06_output_json七字段”提案，**本轮不启用、不改其hash冒充新绑定**。`src/index.js` 的受控M06入口仍禁专业生成，`v340-runtime-service.js` 仍有本地执行门；本次三处技术修复不等于这些门或G0已通过，不无条件删除它们。正式共同界面接线另沿DS-04 E/G0补真实合同与共同流程验证。

## 3. Dify：来源ID完整传递

### Task F1：增加确定性来源登记，保留六字段语义抽取

- [ ] 在固定DSL副本增加“来源登记”代码节点（新ID由实际DSL分配，不在本方案虚构），输入为文档提取节点 `1770000100002.text`；不新增模型调用。
- [ ] 识别当前 `m06-workarea-material-packet-2`，从 `materialValues`、`roles`、`receipts` 建 `source_registry`。保存原输入ID、原文、原文hash、角色、缺失状态；逐份核对可计算的正文hash。包内 `inputHash` 是来源声明，不冒充身份/归属或服务器重新验证的完整共同输入hash。
- [ ] 原手动指令收据与附加校准约束后的 `User_input` 属于不同字节对象，分别保留；不将两者哈希混为一致，不重算旧收据来消除差异。非技术指令不进入技术特征来源。
- [ ] 角色由已知字段合同约束：`claim_requirements_*` 只能为要求，手动指令只能为指令；不信任资料自称“技术事实”的改角色声明。`not_provided` 仍是缺项，不能当空材料或已接受。
- [ ] 普通旧交底文件保持旧解析路径，增强来源状态为 `legacy_unmapped`，不伪造M06原输入ID；识别为本包但hash/版本非法时明确合同错误，不静默降级成普通文件绕过校验。
- [ ] 保留语义节点 `1770000100005` 的六字段输出及合并节点 `1770000100003`；将 `source_registry` 作为独立变量送入Outline，避免要求LLM重新抄写收据或靠六字段承载元数据。
- [ ] Outline增加 `source_map`、`critical_feature_ids` 的结构化约束，既有实体/特征ID不重编号；每个拟入权项的技术特征关联来源。既有核心/整合/终版节点按需引用该侧信息，不批量重写无关提示。

拟议来源分支版本为 `flow26-source-trace-1`。`source_map` 单项含 `claim_id`、`feature_id`、`input_id`、`source_sha256`、`start_utf16`、`end_utf16`、`quote`。Outline阶段的claim_id为计划权项ID；规范化后显式映射到最终权项ID，不把规划ID冒充终稿编号。定位单位固定为**解码原文的UTF-16码元区间**，不先归一化换行；UTF-8原文hash与定位单位分开。验证ID存在、角色允许、原文hash一致、区间短引完全相同。引用准确只证明引文存在，特征是否被充分支持仍须逐项审阅，不由模型自报通过。

**离线出口：** 原R2包的已提供材料ID/角色与缺项均到达Outline；缺前序保持；要求文件不能支撑机械特征。合法非BMP字符/CRLF的定位可核；哈希错、伪造角色、越界短引均拒绝。测试针对来源分支，不重做已证的文件提取。

## 4. Dify：终版核心特征保留与不足行为

### Task F2：修订终版优先级，并检查核心特征覆盖

- [ ] 终版 `1728183992412` 取消“为去功能/效果描述而静默删除已披露核心关系”的路径；资料未给实现时不得补造实现，也不得把删成普通骨架当作完成。允许形成明确标为待确认的受限草稿，正式权项表达由专业审阅裁定。
- [ ] 终版仍使用该现有LLM节点；拟改其内部结构输出为 `claims_text`、`feature_dispositions`。后者逐特征记录 `feature_id`、`action`（`kept/rephrased/blocked_missing_support`）、`output_quote`、`output_start_utf16`、`output_end_utf16`、原因；这里的区间相对本稿claims_text，与source_map的原文区间分开。该内部变化不新增外部API输入或外部第七输出。
- [ ] 相邻终版净化节点 `1769301001008` 从新内部对象提取正文，不对整段JSON做旧Markdown清洗；`1769301001100` 规范化后复核最终区间。既有Outline来源信息作为旁路继续可用。
- [ ] 在既有最终显示节点 `1769301001101` 增加确定性覆盖检查：上游有来源的核心特征ID不能消失；声明保留却没有有效正文定位、缺失处置或无法核实时，`quality_status=insufficient`，列明丢失ID和影响。只给出一般警示不算关闭该缺陷；不硬编码“锁止件”作为通用判据。
- [ ] 失败候选原文保留为证据，不能自动替换成上游稿并伪装终版成功；若人工选择上游受限稿，另记版本与来源、重新审核。
- [ ] 规范化之后重新核算最终权项ID与正文处置定位，原文来源定位保持原字节依据，不能沿用清洗前的正文偏移。最终6输出中的 `quality_report` 拟增加 `contract_version="flow26-quality-1"`、`source_map`、`feature_dispositions`、`feature_coverage`；后者至少含 `status=complete/incomplete/unverified`、`missing_core_feature_ids`。`output` 内给出可读来源及未完成原因，避免旧用户只见骨架。

**离线出口：** 以本次“核心/整合含锁止件、终版仅导向槽/滑块”的真实文本构造负例，必须判核心特征丢失且不得为 `ok/完整通过`。正例保留原已披露关系及缺实现警示，不增加旋转、螺栓、角度等。允许正常改写，但等价/支持关系不由ID自报或关键词计数自动确认，人工来源核对仍开放。原样例资料不足，合理结果可以继续是 `partial`，不以强求 `ok` 验收。

## 5. 后台API：兼容地交付结构化结果

### Task B1：仅增加一个可选版本化结果对象

拟议响应保留旧 `answer_text`、`file_url` 的值和类型，**另加**：

```text
structured_result = {
  contract_version: "flow26-fast-result-1",   // 拟议新合同
  request_key: 服务端本次request.key,
  workflow_run_id: 同一次Dify响应的run_id,
  outputs: {
    output, claims_text, dependency_tree,
    pending_confirmation, quality_report, quality_status
  }
}
```

六个值先保持当前实际字符串类型；`quality_report` 仍为JSON字符串，提供方与消费方按其新内层版本校验。除白名单字段外不透传完整Dify响应、提示、凭据或任意URL。字段名与版本须在实现前冻结，不声称现有API已经支持。

- [ ] 在实际同步create结果投影处，从**同一次** `data.outputs` 复制白名单字段，形成上述对象；不再请求Dify、不追加save/deduct或任何消费动作。request_key来自服务端请求，不信任模型回填。
- [ ] 保持 `output_schema` 的旧正文投影逻辑；不要只把六字段全加入配置，否则参考实现会把正文、依赖树、警示和JSON报告重复拼入 `answer_text`。
- [ ] `/api/apicategories/apidetail` 响应拟增加可选 `result_contract_version`，从服务39受控发布配置派生，供调用前核对。无此能力仍明示未提供；不猜版本、不为本修复强制新增数据库表。
- [ ] 对增强合同缺字段、非法类型、质量JSON矛盾等，保留实际响应/终态并给内容合同错误；不得伪造空数组或 `ok`。已取得正文的内容验证失败与执行结果未知分开，均不得自动重发。
- [ ] 保留同一次原始outputs及其运行关联；已有保存/扣款次数不变。后台4.0未来迁移可消费该合同，当前不重建candidate-r2、不变更现有资金权限实现。

**离线出口：** mock一次Dify响应，断言旧 `answer_text/file_url` 逐值兼容、`output` 不重复拼接，六字段及quality JSON逐值完整；工作流请求1次、原保存/扣款调用不增次；其他服务、旧单字段结果、旧字符串响应仍可按旧合同消费。网站旧调用兼容测试由其维护方用固定消费者/夹具核对，不以“理论上忽略新增字段”代验。

## 6. DSH：不再丢字段，不从正文猜质量

### Task S1：保全结果并建立专用校验

- [ ] 修改API归一化的两个返回层，使 `structured_result` 经解析后仍留在 `createWorkflow().result`，原 `answerText/fileUrls/key` 行为保持。
- [ ] 新专用适配器只接受已冻结的新合同及服务绑定：origin、账户/Workspace/项目、目录/详情ID、服务名、输入schema、输出合同、工作流版本及DSL/交付指纹。版本/身份不符不开放新来源，不能只把旧expected hash改为当前值。
- [ ] 校验request_key、run_id和六字段类型/容量；`quality_report`只作有界JSON解析，不执行内容。检查其版本、quality_status与外层一致，来源映射回本次prepared原材料，要求/指令不支撑技术特征，最终特征覆盖状态不能与完成声明矛盾。
- [ ] 在 `complete()` 与对应结果schema保留原始正文、命名输出和验证状态；内容校验失败仍保留“本次创建已发生”的事实。`partial/insufficient` 不自动审核或标为完整交付；缺 `risks/questions/source_updates/tables/terms/model_completions` 继续记未评估，不能用空数组凑成旧七字段结果。
- [ ] 复用当前结果、编辑再审和无覆盖保存规则。新增结构数据只补现有结果元信息；若必须改共同表单/大改UI或V3.4.0文档schema才能承载，停止该扩项，另列设计，不把它伪装成本次最小字段修复。
- [ ] 新增版本化结果记录仅用于新结果；历史响应无结构化对象时保留旧行为/未评估，历史partial不回填为已通过。受控M06正式派发门继续关闭，直到独立的共同界面接线/接受具备。

**离线出口：** 新响应经transport→专用adapter→结果存储不丢字段，重读仍一致；旧记录/原API正文hash不变。字段缺失、异常JSON、伪造source/quote、request_key错、跨项目同hash、质量矛盾均拒绝新合同确认，但不创建第二个请求。人工审核与来源一致性结论分别记录。

## 7. 实施前置、验证顺序与停止条件

### Task 0：先固定可改对象，再写代码

- [ ] 取得与上述实际应用/版本对应的脱敏DSL及代码节点正文，冻结hash，保存修改前原件；当前只有节点摘录/指纹，未取得完整本地节点/提示包，不据此伪造完整DSL。
- [ ] 绑定实际青岛部署与获准工作副本，填入后台测试文件的准确绝对位置；当前只有只读10月17日快照，不能原地编辑。
- [ ] 按IC-DESIGN/SKILL/RULES固定此次实际采用的规则/Skill与节点差异，旧试用范围不自动扩大；若涉及本地工作流设计工程，先读其原规则、办理自身事务，不扫描“5、存档”。
- [ ] 冻结本方案所提source_map/feature_dispositions/quality_report内层版本、外层structured_result及服务交付指纹；评审通过只批准该具体范围，不自动发布。

**顺序：** Task0 → F1/F2的离线候选 → B1的mock投影 → S1的录制响应/合成新合同测试 → 离线贯通复核 → 届时获准的一次真实复测。B1/S1可先用明确标合成的新响应并行准备，不需要先付费取得新结果；源码候选、线上部署及消费接受分开。

### 最小验证矩阵（未来，全部尚未运行）

| 编号 | 输入或触发 | 必须证明的行为 |
| --- | --- | --- |
| V1 | 原6675字节R2材料、缺upstream | 提取不重做；registry到Outline保留原ID/角色/hash，缺项仍open；每个最终特征可定位到本次原文 |
| V2 | 要求材料伪装技术角色、源hash错、UTF-16越界/非BMP/CRLF | 非技术角色不能入事实来源；错误引用拒绝，合法定位准确；不归一化后冒用旧hash |
| V3 | 本次真实“有锁止→终版无锁止”文本；另一个合法改写 | 负例显式核心缺失/insufficient；正例保留已披露边界，不补造实现；语义支持仍人工核对 |
| V4 | 同一次Dify六输出与旧output单字段 | 增强结果六字段完整、旧正文不重复，模型请求/保存/扣款次数不因投影增加 |
| V5 | quality JSON非法、缺字段、内外status矛盾、空source_map却自称完整 | 原响应和已创建事实保留；内容合同不通过，不填默认评估、不自动重试 |
| V6 | 旧客户端/旧字符串响应/旧R1/R2结果和存档 | 旧行为、旧hash与FAIL/UNKNOWN保持；新能力缺失明示未评估，不反向改旧审核 |
| V7 | request_key错、服务/版本变、账户/项目变、迟到旧run | 新绑定拒绝或确认失效；不能跨任务写入或沿用费用确认，UNKNOWN不新建 |
| V8 | 新响应落盘重读、编辑后再审、容量到界/超限 | 命名结果和验证状态不丢；旧审核不沿用；总量受现有限制，无覆盖保存、不因失败再生成 |

### 未来定向命令与文件

DSH新增测试建议：`packages/oasis-professional-service/test/m06-fast39-result.test.mjs`、`m06-fast39-contract.test.mjs`；扩展已有 `oasis-api-contract.test.mjs`、`oasis-remote-service.test.mjs`。全部路径相对前述DSH根；后续按具体修改选择，不整库刷测试。

在该根用固定工具运行以下**未来命令**，本轮不执行：

```zsh
tools/bin/node --test packages/oasis-professional-service/test/m06-fast39-result.test.mjs packages/oasis-professional-service/test/m06-fast39-contract.test.mjs packages/oasis-professional-service/test/oasis-api-contract.test.mjs packages/oasis-professional-service/test/oasis-remote-service.test.mjs
```

实施时每项先加入可复现负例，确认旧实现失败，再最小改动并确认通过。Dify新代码分支及后台投影用各自**已绑定**代码/运行时做无模型单元测试（后台拟 `tests/test_fast39_result_contract.py`，准确工作副本路径在Task0填写）；不得猜不存在的脚本或启动真实服务。schema/持久化受影响才补对应原测试，集成候选再按原verify，不另建审计工具链。

### 后续真实验收（本轮禁止）

离线出口通过后，需另有明确的实现/部署与新增调用决定，冻结新版本、目的地、输入、账户/项目、报价和停止条件。先只做一个原公开R2范围的请求，最多上传1、create 1、重试0；未知停止新增请求，观察原run。沿已验证的输入事实，旧三节格式偏好与新版结构合同的差异须显式说明并冻结新验收要求，不能篡改原R2或放宽旧FAIL。

同一run核对：开始inputs→原文提取→来源登记→Outline来源→终版特征处置→最终六输出→后台结构化对象→DSH结果记录。须有原文hash、关键节点实际提示/输出、工作流/后台/客户端版本、费用及结果身份；缺可合法取得的完整节点原件时注明证据限制，不绕过浏览器下载限制。

三项技术修复退出标准：来源到达且引用核验通过；没有静默丢核心特征或补造实现；结构字段端到端保全、旧客户端兼容。资料不足时仍可为partial，**不要求伪造完整申请稿**。只有对应专业/用户接受、共同界面及原G0门都完成才谈正式接入；本计划不关闭这些门，也不安排追加付费调参或切换Basic。

### 回退与本轮文档验证

候选与旧DSL/服务合同/DSH绑定分别保存。未通过时保持新来源关闭；旧正文路径及原资金/任务事实不改。部署回退不得重放历史请求，旧安装包若不识别新结果元数据按原兼容规则明确拒绝/只读，不静默丢数据或重算hash。

本轮只新增本计划、输入记录及[文档验证记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-minimal-repair-plan-verification.json)；不改总计划/BM1、状态入口或任何业务资产。定稿核对33项输入身份、预存工作区文件、链接及范围声明。代码节点/后端部署身份、提供方交付和专业/用户决定仍为实施前缺件，本文不冒充已取得。

## Review Focus

1. 来源ID贯通却引文不支持特征：V1/V2核定位与角色，专业逐特征支持审阅不由机器hash代替。
2. 为消除功能表述删去核心方案：V3保留真实负例和新候选两端，不只比警示是否存在。
3. 六输出重复拼正文或客户端二次裁剪：V4/V5同时核后台响应与DSH第二归一化返回层。
4. 缺字段被空数组或 `ok` 掩盖：V5/V6区分未评估、资料不足、内容合同错误及创建结果未知。
5. 新合同误开旧来源或写坏历史记录：V6—V8核版本/归属、迟到结果及容量/恢复；正式M06门与旧七字段提案均不由本方案自动放开。
