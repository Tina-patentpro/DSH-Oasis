# DSH-Oasis 后续推进计划 R9

<!-- oasis-plan:status=planning_only -->

2026-11-12，北京时间。项目 `dsh-oasis`。接续项目 R8、两套 Skills 全量测试准备计划和后发 R2/R3 回执。执行沿现有 DS-01 至 DS-05，由 Codex 单代理在各自批准范围内推进。开始或恢复前按 EXEC-R2 核当时的对象、候选、权限和授权。

**近期目标**　用已有 M06 真实正文走通同版产物闭环。在独立的 DSH NEXT 候选继续扩展本地 Skills，补首批真实失败留下的可观测性缺口。用已对账的专业 API 请求做离线修复准备，为后续具名服务接入建立可验收条件。

**实现边界**　复用 V3.4.0 表单、原生模型与会话、权限、审核和结果合同。原 B 的 R7-03 开发安装与 DSH NEXT 两套 Skills 旁置候选各自固定，按自己的实际 Host 和版本收证。业务来源仍为本地 Skills 与专业 API，两来源沿同一表单与产物规则。 [项目总计划 P1111](2026-10-25-dsh-oasis-master-plan.md#oasis-plan-progress-p1111) · [项目 R8](2026-11-11-dsh-oasis-next-development-plan-r8.md) · [两套 Skills 准备计划](2026-11-12-dsh-dual-skill-test-preparation.md)

## 当前进度

| 工作 | 已取得的证据 | 当前出口 |
| --- | --- | --- |
| M06 原 B 与首发 | 原 B 的 `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d` 有 57,201 字节真实正文，通过原结果合同。另有 rc.5 源码预览公开回执。最近具名只读观察中，活动 run 指向另一条结果。 | 原 B 的当前显式选中、同版保存和未提交稿恢复待证，AR7-G02/G03 为 `UNBOUND`。工程、专业、用户接受和安装版发行分别留证。 [原 B 回执](../evidence/2026-11-11-interface-r2-ar7-host-receipt/host-return.md) |
| Oasis 独立包 | M01、M02、M05、M03、M04、M07 六项具名绑定已走过隔离 Host 离线回放。M05、M01、M02 各真实运行一次，分别因输出触顶、文档组装、文档组装失败，新增模型余额减少 ¥0.20，重发 0 次。R2 已加固离线诊断，R3 的第二组三项已保存并重启读回，定向回归 217/217。 | R2 的修订尚缺真实模型证据，M03 只验过检索策略。公开 M06 独立包 `0.3.0-rc.4` 另验，11 月 11 日内置 Oasis M06 与中国专利权利要求入口的真实正文可作版本明确的控制样例。 [首批真实回执](../evidence/2026-11-12-dsh-next-first-three-live/execution-return.md) · [R2](../evidence/2026-11-12-dsh-skill-prep-r2/execution-return.md) · [R3](../evidence/2026-11-12-dsh-skill-prep-r3/execution-return.md) · [两套 M06 控制回执](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/live-execution-return.md) |
| 中国专利套件 | 固定总路由已在隔离 Host 以本地词项匹配核 12 条主用例和 6 条边界用例，覆盖 9 个子入口，子 Skill 派发 0 次。 | 子 Skill 逐个验证。开放式措辞仍需补样例。CN-OA 的两份 `emit_chart.py` 不一致，影响该工具分支。 [逐项路由回执](../evidence/2026-11-12-dsh-skill-prep-r3/router-verification.json) · [脚本指纹](../evidence/2026-11-12-dsh-skill-prep-r2/material-and-router-verification.json) |
| 专业 API | 八项原请求中，Flow-6-14 审查意见答复与独立附图说明取得同步正文，流水分别扣 ¥3 和 ¥1。后发只读核对厘清六条异步请求，合计扣 ¥0，Flow-1-5 与 Flow-5-13 可从上游日志提取正文。 | 六条原请求沿各自终态和原标识留证。两项上游成功在平台保存前失败，客户端仍不能取回；同材料 Flow-2-6 的双来源验收待证。Fast39 历史正文 `partial`、AR3-G02/G03 `UNBOUND`、G0 `OPEN`。 [原联调](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/live-execution-return.md) · [六条对账](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/async-readonly-reconciliation.md) · [AR3](../evidence/2026-11-11-interface-r2-ar3-named-review/consumer-return.md) |

## 推进顺序与验收

| 顺序 | 工作 | 本阶段交付 |
| --- | --- | --- |
| **P0** | 复用原 B 的 M06 正文，完成 R7-03 工程验收。 | 原稿显式选择、审核版本、保存/预览、固定引用及未提交稿恢复回执，或准确的受阻动作和解除证据。 |
| **P0，可独立准备** | 基于六个专业 API 原请求做跨层故障回放。 | 六行状态和费用映射、失败夹具及两端职责。先交离线回执。 |
| **P1，可独立准备** | 固定 R3 候选，续接 Oasis M08–M10、中国专利首批本地子入口，并准备 M05 新版本的真实验证。 | 每项一份具名回执。以真实验收预算和实际工具准入分别安排后续。 |
| **P2** | 补其余 Skills、逐格式工具、具名专业服务和限定发行。 | 25 个测试入口逐项状态、14 节点双来源能力表、逐项专业/用户决定及同版发行材料。 |

### P0-A 原 B 的 M06 产物闭环 · DS-02／04／05

- [ ] 复用 R8 的原 B Workspace、任务、会话和指定 run。执行时重新读实际 Host/bundle、Profile、revision、活动指针和单 writer 状态。在现有结果入口显式选中原稿，正文必须匹配 SHA-256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`。不同 bundle 的结果页、RPC 或写回差异仅复验受影响接点。 [R8 操作与测试](2026-11-11-dsh-oasis-next-development-plan-r8.md#二主线开发与验收) · [G02/G03 缺件](../evidence/2026-11-11-interface-r2-ar7-g02-g03/adoption-record.md)
- [ ] 在获准的同版环境核编辑使旧审核与旧保存确认失效，新版再审后按准确目标无覆盖保存 Markdown 和配套收据。原生打开后将固定审核版本作为未发送的对话草稿。另留未提交编辑，重启核任务、基准版、草稿字节及已保存文件。原 B 本地工程回验目标新增模型调用 0 次。接点复用结果页、`workbench-rpc.js` 和 `writeback-service.js`。如遇失败先留原证据，按 R8 复验受影响的现有测试。
- [ ] 工程出口记录实际路径、权限、版本/hash、保存与恢复。专业审阅与用户接受分别绑定送审/验收的准确正文和保留警示。发行准备固定实际安装归档、适配 Host、安装/升级/回退与第三方通知，按 RL01–09 交具名决定。Codex 提供技术事实，WorkBuddy 编写面向用户的说明。 [发行材料](../release/m06-public-0.1.0-rc.5/RL-CONTINUATION-R1.md)

### P0-B 专业 API 故障回放 · DS-04／05

- [ ] 从六条原回执提取去凭据夹具，按原请求键分别校验创建受理、运行终态、正文、文件、历史和费用。固定 Flow-2-7 实际异步、Flow-6-14 实际同步，核客户端等待到限与查询返回的语义。将 Flow-6-14 和附图说明现有成功回执作为同步对照。客户端用现有 `oasis-api-contract.test.mjs`、`oasis-remote-service.test.mjs` 验证原键查询、迟到、状态区分、权限及零重复创建。 [六条原请求与正文](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/async-readonly-reconciliation.md)
- [ ] 用本地替身复现目录请求停在加载态，以及切换任务后旧响应与当前草稿 revision 冲突。验目录可重新读取，旧响应仍归原任务且当前草稿可恢复；读取或重载动作产生的创建请求为 0。 [客户端原观察](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/live-execution-return.md)
- [ ] 由实际服务提供方交四组可复现缺件。Flow-1-1 核上游容量 `403` 的映射。Flow-1-2 核 `expected_effect` 与 `target_problems` 的共同字段来源。Flow-2-6 Basic 和 Flow-2-7 核 `Docx_template_file` 的真实必填合同、来源及权限。Flow-1-5 和 Flow-5-13 用附件链接为 `null` 的原响应形状复现故障，验按合同保全可用正文与合法文件、准确报告缺件，以及归档/状态/账务一致。DSH 对确实无法无损映射的来源显示具体禁用理由。
- [ ] 在 AR3 独立续办 Fast39 的现用 C0/Schema 和绑定。先交来源 ID/定位经 Outline 保全、核心锁止特征的有据处置、结构化结果与旧 `output` 兼容三项离线证据。提供方给实际版本和文件/权限/价格，DSH 核 Workspace→folder、当前账户与同版保存。新具名真实校准在以上适用条件和当批授权齐备后安排。旧 Fast39、Basic 与八项批次各自留证。 [Fast39 原复测](../evidence/2026-11-05-fast39-jtti-retest-return.md) · [AR3 消费边界](../evidence/2026-11-11-interface-r2-ar3-named-review/consumer-return.md)

### P1-A 继续装配 Oasis 与验证真实内容 · DS-01／02／05

- [ ] 以 R3 候选源码补丁、实际 Host/bundle 与已完成回执为出发点，固定 M08、M09、M10 的资源、许可、字段、已选规则和预期文件。复用现有 V3.4.0 catalog/preparation、候选确认及写回路径。M08 同时测试原全文与缺全文变体；缺全文须给缺项和后续核对范围。M09 核先后顺序及前置材料，M10 将 F1/F2 已确认内容与 F3/F4 待确认问题分列。
- [ ] 用现有候选测试模式先证未接入或拒绝，再装配。回归受影响的 `v340-native-all-nodes.test.mjs`、`oasis-first-batch.test.mjs` 和 `dsh-next-second-text-and-router.test.mjs`。正例须保存/预览/重启，反例须留可定位的拒绝阶段。正式链路用立即前序的具名结果与固定版本引用，独立用例保留前序缺项。 [冻结用例](../evidence/2026-11-12-dsh-skill-test-prep/cases.json) · [R3 候选](../evidence/2026-11-12-dsh-skill-prep-r3/offline-verification.json)
- [ ] 提议先为 **M05 修订版单项** 准备新批次。确认候选版本、冻结输入、实际发出的请求、输出上限、零工具/零重试与有效报价。真实批次另绑定授权、标识和费用上限，保留原三次失败。M05 审阅四要素、两状态、T1–T3 和原材料缺项。M01、M02 准备带字段级诊断的独立真实样例，分别核事实/检索计划/缺证，以及 P1 与定性预期的对应。各样例按自己的条件入批。失败或未知只观察原运行。
- [ ] M03、M04、M07 复用 R3 的冻结输入与同版离线回执，准备各自的真实正文验收。分别检查策略可复核且无虚构命中、A/B 对称比较及证据不足、权项/交底/标号的对应和缺项。真实正文以当批提供方回执和同版 Host 正文为据。
- [ ] 后续分组装配公开 M06 独立包、M11–M14，另做具名 M05→M06→M07 的连续消费验证。公开 M06 先核与现有内置控制样例的版本差异；M11–M14 复用已准备的 A/B 权项、术语和标号冲突、模拟审查意见。I01 单独交可打开的实际图件及 1–4 标号。M03 的外部检索分支在来源、查询、限流和实际返回边界齐备后独立验。

### P1-B 中国专利从路由走到子 Skill · DS-02／03／05

- [ ] 下一小组建议选 `CN-DISCLOSURE` 发明材料、`CN-READER` 本地合成全文、`CN-APPLICATION-NO-CASE` 缺交底目录。绑定固定源提交、实际路由、资料读取范围及允许的输出。用隔离目录验证只读选路、禁止跨项目、缺件停止、允许的 Markdown/测试库产物及回读。交底/解读若涉及模型，先用替身取得 Host 证据，真实验证另批。
- [ ] 原 12+6 路由探针保留。新增仅针对自然转述、否定点名、引用他项和组合意图的有界变体，核不匹配/冲突进入澄清，分支只访问已授权资料。CN-OA 继续停在脚本差异处，由固定源候选交按权项覆盖逻辑及两副本差异回归。
- [ ] 后续按工具分组。案卷验交底→申请的具名文件和原三轮边界；申请、对照表验实际可打开的 Word、图件及逐项依据；地图先验隔离测试库和 IPC 后备，再验证固定向量模型。CNIPA/海外检索与政策简报分别取得查询/出处、范围和限流留证，按当次权限执行。 [总路由回执](../evidence/2026-11-12-dsh-skill-prep-r3/router-verification.json) · [逐项验收判据](2026-11-12-dsh-dual-skill-test-preparation.md#三逐项验收判据)

### P2 格式、第二 Host 和交付出口 · DS-03／04／05

- [ ] PDF 和 DOCX 各自沿 READY → U1 → D1。PDF 复用已有解析/资源证明，补目标 runtime、parser、launcher、许可及硬限与退出证据；DOCX 独立补 XSL/许可、ABI 与实体控制。原件/提取内容分别留 hash。实际图件、Word 导出和 OCR 按各自合同验证。
- [ ] WorkBuddy 用户入口沿 R3-07 的私有适配候选核实际目标 Host、官方导入、零调用打开、权限和运行差异。内部连接器及公开安装 Skill 的原回执按自己的范围引用。工作流设计和外部 Dify 按同版 Skill/适用规则独立交 DSL 与实例验证，后台消费实际发布合同。 [WorkBuddy 用户入口](../../packages/oasis-workbuddy-user-entry/ADOPTION.md)
- [ ] 复用现有用例表，逐入口记录资源、材料、离线/真实运行、工具、产物、专业/用户接受和费用，保留七个变体。25 个测试入口、14 节点×两来源和 G1 的 29 项产品目标分别核对，T01 单列。具名服务具备真实双来源证据后按原 G0、各组和阶段出口验收。青岛过渡消费与自制后台切换分别沿 P1111，账户/财务页面归 workarea，资金与权限事实归实际后台。BM1 的收费能力与自制替换仍为目标窗口，起算点待确定。 [整体 P1111](../../../docs/superpowers/plans/2026-10-25-independent-projects-and-compatibility.md#oasis-plan-progress-p1111)

## 复核与边界

- **依据**　项目登记与独立索引指向同一项目总计划与 P1111，协同 1.2.2、整体 1.3.1／NS1-R1、BM1-R1/S1、G1 与接口专项 R2。按 `current_entry` 读取两项状态入口，再消费具名后发证据。IC-SKILL/RULES、IC-ARTIFACT、IC-API/ACCOUNT/ENTRY 依实际职责与现有草案效力引用。39 项原字节 SHA-256 和准确路径见[规划依据](../evidence/2026-11-12-dsh-oasis-next-plan-r9/inputs.json)。
- **接续差异**　R8 的 M05 准备起点更新为六项旁置离线和三项真实失败。原接口回执中的六项客户端等待未知由后发只读对账解释，原回执保留。原 B 的 R7-03 与 NEXT 候选分属不同实际组合。费用、当前装机与线上服务状态依据具名回执的观察时点，实际实施前逐项重核。
- **验收边界**　制作可见规则、运行题面与 `evaluation_only` 各沿原权限。源包检查、替身、实际 Host、真实模型/工具、专业接受、用户接受及发行分项留证。原 UNKNOWN、FAIL 及已消费的额度沿原记录。实际写回、收费调用、对外上传、切换与发布按具名授权执行。本轮交付为计划和只读依据核验。
