# DSH-Oasis 后续推进计划 R10

<!-- oasis-plan:status=planning_only -->

2026-11-12，北京时间。R10 按新增回执更新 R9 的任务起点，沿现有 DS-01 至 DS-05 由 Codex 单代理推进。先让两份已有真实正文进入各自的验收，再扩大 Skills 的运行覆盖。专业 API 首先处理已定位的结果保存问题。 [R9](2026-11-12-dsh-oasis-next-development-plan-r9.md) · [项目总计划 P1111](2026-10-25-dsh-oasis-master-plan.md#oasis-plan-progress-p1111)

## 当前进度

| 工作 | 已取得的证据 | 剩余缺件 |
| --- | --- | --- |
| 原 B M06 | 实际安装版 SDK/RPC 已对原稿完成工程审核，无覆盖保存 Markdown 与配套收据，安全解析文件路径并准备固定版引用。另一进程恢复了已保存文件与临时未提交草稿，revision 90→94。 | 桌面显式选中、原生预览、固定引用与重启回读待核。工程回执可用于 AR7 后续采用核对，专业审阅、用户接受和安装发行各待相应回执。 [执行回执](../evidence/2026-11-12-dsh-field-diagnostics-and-m06/execution-return.md) |
| 修订版 M05 | 在独立 DSH NEXT 一次真实生成成功。Host 为 `completed`，文档为 `completed_with_warnings`，核心 859 字符，T1/T2/T3 分别 1/4/1 行。提供方用量折算 ¥0.01099768，余额实减 ¥0.01，逐笔流水未取得。 | 待核两种状态的主体和材料缺项，形成确切审核版本并保存。原输出触顶失败与本次成功分别留证。本次单次许可已消费。 [运行回执](../evidence/2026-11-12-dsh-m05-single-live/execution-return.md) · [原正文](../evidence/2026-11-12-dsh-m05-single-live/M05-技术交底正文.md) |
| 字段诊断和 Oasis 独立包 | 六项已走过隔离 Host 离线回放。候选已补安全字段路径与拒绝码，3 条正例、7 条反例及冷读通过，定向回归 80/80。 | M01、M02 各有一次真实组装失败，历史触发字段未知。M03、M04、M07 已完成替身验证，M03 限检索策略。 [字段诊断](../evidence/2026-11-12-dsh-field-diagnostics-and-m06/execution-return.md) · [第二组回执](../evidence/2026-11-12-dsh-skill-prep-r3/execution-return.md) |
| 中国专利套件 | 总路由在隔离 Host 完成 12 条主探针和 6 条边界探针，覆盖 9 个子入口，子 Skill 派发 0 次。 | 子入口运行和产物待逐个验证。CN-OA 的两份 `emit_chart.py` 仍有差异。 [路由回执](../evidence/2026-11-12-dsh-skill-prep-r3/router-verification.json) |
| 专业 API | 八项旧请求中，两项同步返回正文，实际扣 ¥3 和 ¥1。六项异步请求已按原标识对账，合计扣 ¥0，其中两项上游正文已从日志取回。 | Flow-1-5、Flow-5-13 的平台保存和客户端取回待修，附件可用性待证。其余四项按实际拒绝原因处理。Fast39 原结果为 `partial`，AR3-G02/G03 为 `UNBOUND`，G0 为 `OPEN`。 [六项对账](../evidence/2026-11-11-dsh-next-live-m06-preflight-r1/async-readonly-reconciliation.md) · [AR3](../evidence/2026-11-11-interface-r2-ar3-named-review/consumer-return.md) |

## 第一批 · 完成已有正文的验收准备

- [ ] **M05 审核、保存与交接，DS-02/05。** 固定 NEXT 2.0.22-next 的 M05 资源 `0.3.0-rc.4`、运行 `v340-106a5570-735a-4451-b98d-0a8d63e73505` 与原结果指纹。用原交底、标号文本和访谈核四项部件、两种状态及 T1–T3。建议修订为“锁止件处于允许状态时，滑块可沿导向槽在第一方向移动。处于限制状态时，滑块移动受限。” 保留 F3/F4、接触、驱动方式、结构及实测数据等缺项。编辑形成新版本，重新审核后无覆盖保存并预览，分别固定原版、修订版与保存文件的哈希。以审核后的准确版本作为后续链路输入。 [结果与用量核对](../evidence/2026-11-12-dsh-m05-single-live/verification.json)
- [ ] **M06 桌面与 AR7，DS-02/04/05。** 复用原 B 运行 `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d`、原稿 SHA-256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`、现存 `claims_20261110114450_89dd69c1.md` 和配套收据。复核当时装机、Workspace 与单 writer 后，在桌面显式选中原稿，核原生预览、安全打开、固定版引用草稿及重启回读。引用草稿由用户决定是否发送。若仍缺编辑使审核失效的界面证据，用临时草稿定向验证，保全已存文件和原审核。将 SDK/RPC 保存与冷恢复回执关联到原 AR7-G02/G03 采用核对，由原责任方确认剩余项。另交同版专业与用户验收材料。 [原稿审核](../evidence/2026-11-12-dsh-field-diagnostics-and-m06/m06-intent.json) · [保存](../evidence/2026-11-12-dsh-field-diagnostics-and-m06/m06-save.json) · [恢复](../evidence/2026-11-12-dsh-field-diagnostics-and-m06/m06-restore.json) · [AR7 原缺件](../evidence/2026-11-11-interface-r2-ar7-g02-g03/adoption-record.md)
- [ ] **专业 API 离线修复首项，DS-04/05。** 由实际后台负责处理 Flow-1-5、Flow-5-13 的空附件链接。DSH 用两种原响应形状构造去凭据夹具，校验正文可按原作业键读取、缺件明确、合法附件按权限保全，以及状态、归档与账务一致。用本地替身补验目录加载和切换后迟到响应归属。随后按 R9 逐项处理 Flow-1-1 容量错误、Flow-1-2 效果字段、Flow-2-6/2-7 的 `Docx_template_file` 合同。六条原请求保持只读。 [R9 API 回放与责任](2026-11-12-dsh-oasis-next-development-plan-r9.md#p0-b-专业-api-故障回放--ds-0405)

第一批的交付物是 M05 同版审核记录及产物、M06 同版桌面回执或具体缺件、API 离线夹具与实际责任方缺件表。三个工作项可各自核收，目标新增模型生成、专业 API 创建及费用均为 0。

## 第二批 · 扩大两套 Skills 测试

- [ ] **下一项具名真实验证建议选 M01。** 复用冻结公开材料和字段诊断候选，核来源哈希与定位、可追溯事实、检索计划和缺证。先选 M01 是为了验证范围较窄的来源映射和组装约束。提交前固定受测包、Host/Profile、输入指纹、请求标识、目的地、调用次数和当时费用，由该项新授权覆盖。真实验收需有 Host 正文、用量和费用核对，正文中的事实、计划与缺项须可区分。随后独立准备 M02，重点核 P1、两状态与定性预期的对应。失败或未知仅观察原标识。 [首批真实回执](../evidence/2026-11-12-dsh-next-first-three-live/execution-return.md) · [冻结用例及判据](2026-11-12-dsh-dual-skill-test-preparation.md)
- [ ] **扩装 Oasis M08–M10，分批验证 M03、M04、M07。** R3 基线上跑完整材料与缺项变体，核 M08 缺全文行为、M09 顺序、M10 的 F1/F2 与 F3/F4 分界，逐项留下保存、预览和重启证据。M03、M04、M07 复用原离线用例，分别安排策略、方案比较和说明书的真实内容检查。公开 M06 独立包另作身份与入口验证。具名链路先用审核过的 M05 版本及固定哈希验证 M05→公开 M06→M07 的消费边界，真实生成按当批授权进行。原 B 继续供自己的 R7-03 验收。 [R9 Oasis 装配](2026-11-12-dsh-oasis-next-development-plan-r9.md#p1-a-继续装配-oasis-与验证真实内容--ds-010205)
- [ ] **中国专利先跑三个子入口。** 先验 `CN-DISCLOSURE` 的公开合成发明交底、`CN-READER` 的本地合成全文、`CN-APPLICATION-NO-CASE` 的缺交底目录。固定实际路由、可读材料和写入权限，用隔离 Host 留下子入口运行、受控输出或明确拒绝的证据。CN-OA 核准脚本身份后验证对应分支。其余按工具、文件或外部查询权限分组。 [R9 中国专利装配](2026-11-12-dsh-oasis-next-development-plan-r9.md#p1-b-中国专利从路由走到子-skill--ds-020305)

每批沿冻结表逐项记录离线运行、真实运行、可读产物、专业与用户验收、实际费用与未覆盖项。25 个测试入口及 7 个变体、V3.4.0 的 14 节点双来源能力、G1 的 29 项产品目标分别核对，T01 单列。 [两套 Skills 全量准备](2026-11-12-dsh-dual-skill-test-preparation.md)

## 第三批 · 双来源服务、格式和交付

- [ ] 按 R9 续办 Fast39 与 AR3。实际提供方交具名启用服务、C0/Schema、权限、回调和文件/账务合同，DSH 再验证 Workspace 到账户及项目的绑定、同一表单的无损映射与同版保存。实际不可映射的来源给字段级原因。账户和财务入口沿 workarea，作业及账务事实沿实际后台。 [AR3 消费回执](../evidence/2026-11-11-interface-r2-ar3-named-review/consumer-return.md)
- [ ] M11–M14、I01、PDF/DOCX 与 WorkBuddy 用户入口沿 R9 的格式、目标 Host 及各自用例推进。M06 可用安装发行走原 RL01–09，分别留目标版安装、升级/回退、专业审阅、用户接受和发行决定。Codex 提供技术事实，WorkBuddy 据同版事实编写面向用户的材料。 [发行续接](../release/m06-public-0.1.0-rc.5/RL-CONTINUATION-R1.md) · [R9 交付出口](2026-11-12-dsh-oasis-next-development-plan-r9.md#p2-格式第二-host-和交付出口--ds-030405)

## 规划依据

整体与本项目 P1111、接口专项 R2、BM1-R1/S1、G1 按项目登记和独立索引解析。两个登记状态入口沿其原职责读取。P1111/R9 关于原 B 工程保存、M05 待真实运行、诊断待补的起点，由本次具名回执接续。正式采用、专业/用户接受、其他运行和发布仍按原任务取证。适用 IC-SKILL、IC-RULES、IC-ARTIFACT、IC-API 和账户相关合同，`evaluation_only` 保持隔离。 [版本、SHA-256 与差异](../evidence/2026-11-12-dsh-oasis-next-plan-r10/inputs.json)

本轮交付为规划文档。执行前按 EXEC-R2 核实际版本、材料、权限与授权，费用以当次服务证据为准。旧请求、失败、未知和已消费授权沿各自回执管理。
