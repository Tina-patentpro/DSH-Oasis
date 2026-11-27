# AR7／M06 的 R02 用途包

2026-11-11，Asia/Shanghai。编制者为接口标准专项牵头 Codex。材料状态为**可交审**，拟执行的审核、保存与引用组合为 **UNBOUND**。所列历史运行身份取自 R7-02 回执。提供与消费职责的本轮技术意见均待具名返回。

原工作包为 DS-02/04/05 提供职责和 DS-03/04/05 消费职责，双方均属于 DSH-Oasis。原合同为 IC-ARTIFACT §3 文件交付及 Host 职责，清点边为 ARTIFACT-7。现行草案 V0.3 的原字节 SHA256 为 `35382445972163d35541920dbce6df6037a3948b22516a7c783da2d2e23a8b29`，试填为 `repair-trials-v0.3.md`。原映射中合同 SHA256 `2f04f96b62610e80563ebbb7769726694ce3687d8d6fd4f4ba111dc8a809b67b` 按其成文时点保留，当前合同与本包身份另列于本轮预检和绑定记录。 [专项计划](/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-11-10-interface-standards-followup-plan.md) · [原逐边映射](/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/2026-10-28-interface-static-review-v0.3.json) · [本轮预检](/Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r02-first-batch/execution-preflight.json)

## 拟用对象与已取得身份

| 对象 | 本包填写值 | 证据及适用范围 |
| --- | --- | --- |
| 业务用途 | M06／Flow-2-6 的原 B 正文审核、编辑再审、保存 Markdown、安全打开和固定审核版本普通引用 | R7-03 的原工程范围，后发结果分别补入 |
| Workspace | `11e1a348-0248-42a1-8141-bcb6306caccc` | R7-02 原候选及确认回执 |
| 任务／会话 | `d8d762fe-36ae-49dd-b275-b7ffff04fda7`／`session-be573ee0-ae7a-4d40-99d5-d607f6106786` | 原任务归属 |
| 运行 | `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d` | 既有运行，requestKey 与输入指纹见绑定记录 |
| 运行后 revision | 86 | 原候选84、派发85、结束86分别按原事件解释 |
| 安装件 | rc.5，bundle `a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b` | 原安装及运行回执；本轮未现场检查安装 |
| 控制器 | `8338fec253a916eb780a8fc739f6d973ba22475772db98698543758a408ad405` | 原安装及运行回执 |
| 输入快照 | `b563a98036bbb94e3ff835944f5c36a7c69f20b4b6d35f0a6bd8ba8c366895b5` | 原派发回执 |
| 业务资源 | `e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d` | 原三份公开 Markdown、四段文本、八项制作可见资源沿原清单 |
| 正文 | UTF-8 SHA256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`，57201字节 | 原结果合同接受，reviewStatus 为 `not-reviewed` |
| 运行中的文件名字段 | `claims_20261110114450_89dd69c1.md` | 原 resultFileName 字段；原回执明确尚无独立保存文件 |
| 拟消费 Host／当前 Workspace 状态 | UNBOUND | DSH 提供职责在实际采用前核安装、Workspace、当前 revision、资源与正文版本 |
| 保存目标／文件生命周期／权限及确认 | UNBOUND | DSH 消费职责在写入前核实际项目根、目标路径、文件新旧、权限、确认及同名情况 |

以上来源为原预检、派发回执、结果合同和收尾核验。本轮只读这些文档身份和相关字段，原正文及业务存储仍由 DSH 按原权限保管。实际扣费金额沿原未知值，原真实调用余额为0。 [R7-02 回执](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-10-r7-02-live-16384-r1/execution-return.md) · [派发身份](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-10-r7-02-live-16384-r1/dispatch-receipt.json) · [结果核验](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-10-r7-02-live-16384-r1/result-contract-verification.json)

## 要求、原试填与本用途判据

| 要求／原试填 | 本用途的核对内容及失败判据 | 当前证据与负责职责 |
| --- | --- | --- |
| AR-REQ01／AR-T01 | 仅固定上述本地审核、保存、引用用途。自动上传本地编辑稿或按角色集合推全互联即不符合。 | 本包已列用途；实际采用待双方核 |
| AR-REQ02／AR-T02 | 正文 UTF-8 hash、原材料 raw hash、提取内容及 UTF-16 定位分别保留。以原件 hash 代正文或重算旧收据即不符合。 | 原正文身份已据回执固定；材料读取/提取沿原 D1 证据，DSH 提供职责补采用范围 |
| AR-REQ03／AR-T03 | 显式历史快照选用时核 Host 协议2的原字段、版本、严格解析、ID与缺省。普通正文保存按其本地合同。 | 本次用途未选择历史快照；原分支仍待选用时核，不改原映射的适用结论 |
| AR-REQ04／AR-T04 | D1、格式容量和快照限值各沿自己的合同。裁原件、抬限或以本正文证明 PDF/DOCX 全格式准入即不符合。 | 复用原材料/结果回执；U1/D1 及格式准入继续按原门 |
| AR-REQ05／AR-T05 | 预览后编辑使旧审核失效，再审绑定新正文。当前文件与 Workspace 归属需同时核对。 | 当前正文待审核；编辑、再审及当前文件证据待 DSH 双方职责 |
| AR-REQ06／AR-T06 | 写入/读取前核本地权限及原归属。若另取远端原件，逐文件核原授权。URL、相同 hash 不单独证明读取权。 | 当前用途为既有本地正文；本地目标权限待核，远端分支按实际选用 |
| AR-REQ07／AR-T07 | 新 Skills 产物存当前项目根且无来源标记；新 API 产物扩展名前加 _OIW。旧文件保留原名原位。目标存在则保护原件。保存失败再次生成或二次收费即不符合。 | 本次为 Skills 新保存候选，目标和新旧身份待 DSH 消费职责核。实际保存、冲突与无覆盖结果待证 |
| AR-REQ08／AR-T08 | 显式快照的关联、partial、解绑按原状态核。将 partial 写成全保存、编辑自动回传即不符合。 | 本次未选该快照分支，保留其原合同及 G03 条件 |
| AR-REQ09／AR-T09 | 普通引用须有准确文件/审核版本与权限，只准备资料或未发送的对话草稿。自动发送或由引用触发费用即不符合。 | 普通引用和安全打开待 R7-03 证据 |
| AR-REQ10／AR-T10 | U1/D1、Host、工程、专业、用户与发布按各自范围给证据。将本包或旧静态 PASS 用作原门关闭即不符合。 | 本包限文档交审，原 R01 结项与本轮拟采用分别引用 |

原试填全文、逐边预期和失败判据保持原引用。机器绑定记录按 ARTIFACT-7 保留十项原映射及本次用途状态。 [IC-ARTIFACT V0.3](/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/IC-ARTIFACT-v0.3.md) · [原试填](/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/examples/IC-ARTIFACT/repair-trials-v0.3.md) · [本轮绑定](/Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r02-first-batch/bindings.json)

## 缺件、责任和最晚消费点

| 原缺件 | 本轮补充 | 剩余责任与解除证据 |
| --- | --- | --- |
| AR7-G01 | R01 指派及 RAF 修正意见沿原回执满足其限定范围 | R03 前由 AR7-P、AR7-C 对本用途同版标准、组合与判据分别返回具名意见 |
| AR7-G02 | 历史 Workspace、任务、会话、输入、资源、安装及正文身份已从原回执摘录 | DSH 提供职责在实际采用/运行前核当前 Host、Workspace 和 revision 一致性及所选资源/输入，确认实际消费组合；当前保存组合 UNBOUND |
| AR7-G03 | 已列 Skills 新保存、旧文件和显式快照的条件判据 | DSH 消费职责在消费快照或写入前交目标路径、新旧/同名、权限及确认依据，再交实际写入结果 |
| ARN-11/12 的 AR7 四个职责格 | 原应用判据继续待实际证明 | 两角色分别绑定实际命名/生命周期和适用导入/保存证据；R01 的文档同意仅沿原范围引用 |
| R7-03 未提交编辑稿恢复 | 已单列，已保存版本与对话草稿各有自身证据 | 原本地测试范围内固定一次正常重启、编辑 revision、归属和审核状态的恢复回执 |
| 专业／用户接受 | 当前正文仍待审核 | 原具名专业审阅者和用户分别对准确版本、保留警示作结论 |

本轮编制者仅形成上述材料。两个技术职责的本轮返回身份、返回轮次、意见原件和结论均待取得。R7-03 可沿其原授权独立形成证据，再补入本包。 [R7-03 原计划](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-11-08-project-summary-and-next-plan-r7.md) · [R01 原结项](/Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-10-30-interface-stage1-closeout/closeout.md)
