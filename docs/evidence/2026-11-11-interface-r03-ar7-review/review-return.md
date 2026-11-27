# ARTIFACT-7／M06：R03 具名文档技术复核返回

任务 `INTERFACE-R03-AR7-20261111-R1`，2026-11-11，北京时间。执行者：DSH-Oasis 项目 Codex。实际返回聊天 `01a177c0-e0a2-7841-ab7b-634f0bacc752`，轮次 `01a1c89e-ce91-7f23-9c29-76fd78a37314`，由 Codex 应用只读查询本聊天取得；该轮含本次请求接收及本轮取证命令。[授权记录][dispatch] · [固定请求][request] · [本轮 EXEC-R2、读取时点及完整字节身份](execution-preflight.json)

**AR7-P（DS-02/04/05）与 AR7-C（DS-03/04/05）各自同意下列十项有界文档判据。** 两个职责均由用户指定的同一项目 Codex 履行，分别判断本端责任。提供端同意以具名历史生成回执作为待审核输入；消费端同意以当前归属、权限、审核版本、目标及确认作为实际接续条件。两项意见均不代表专业审阅、用户接受或实际版本组合已签收。

## 绑定对象和证据层次

- [IC-ARTIFACT V0.3-draft][standard] 原字节 SHA256：`35382445972163d35541920dbce6df6037a3948b22516a7c783da2d2e23a8b29`；[原试填 AR-T01—10][trials]：`720b56b8068c7557215748982582cb985767616150f4794c8cdeebcd3f36f0a5`；[逐边映射 ARTIFACT-7][matrix]：`238949e82c2021df1bbd952886bfaef59b76196063b659a05d9e091ee42b8cea`。[当前原合同 §3][contracts] 采用协同 1.2.2，SHA256 `12193ba8eb42f54c1f6146c82ed7c500aa87ce046e81e815650712725666c6f3`；R01/旧映射仍绑定其成文时合同。
- [R02 用途包][handoff] 原字节 SHA256：`ba30bf4d5f6d4a7d1338e8de8c18954e4be73c62cc8c39c902ffdf9d70b1bea7`；[R02 机器绑定 AR7-M06][binding]：`d6195c1a2a27a66d245fb9ec733409eb7dc3ab0eaa5c47a173afe5feeac5a108`。选定原 B 的 M06／Flow-2-6 本地 Skills 正文。[R01 结项][r01]只复用 RAF-0306-01/02 的原限定文档意见。
- 实读项目 Git 根 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`、分支 `codex/pdf-m06-minimal-20261029`、HEAD `30031b589d4ff7108ed5df16b698351ad4a45f37`。项目总计划（局部 P1108）SHA256 `566f665829e04c675c7bb4334d0ea0e1b52f92231009de88b51631e8fb5a560d`；[R7-03 原计划][r7] SHA256 `107a0ab769751fce16c0d5412fd0c9740190ff78f1b477e6b13e8ee7721db368`。整体 P1110、接口专项 R1 和后发具名 R7-02 接续局部旧起点；BM1-R1/S1 的角色和材料隔离适用。工作区的既有未提交身份逐条列于 EXEC-R2，不用 Git HEAD 代替装机身份。
- **历史提供版本已识别。** R7-02 原 B Workspace `11e1a348-0248-42a1-8141-bcb6306caccc`、任务 `d8d762fe-36ae-49dd-b275-b7ffff04fda7`、会话 `session-be573ee0-ae7a-4d40-99d5-d607f6106786`、run `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d`；运行后 revision 86，区别于原候选 84 和派发 85。rc.5 历史 bundle `a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b`，控制器 `8338fec253a916eb780a8fc739f6d973ba22475772db98698543758a408ad405`，输入快照 `b563a98036bbb94e3ff835944f5c36a7c69f20b4b6d35f0a6bd8ba8c366895b5`，资源 `e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d`。其他原输入和安装摘要由 R02 绑定保留。
- **生成已有证据。** [原回执][live]、[派发字段][dispatchrun]和[原收尾核验][liveverify]确认 `completed / stop`。原结果核验记录正文 UTF-8 SHA256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`、57,201 字节，V3.4.0 结果合同通过，`reviewStatus=not-reviewed`。本轮仅核回执字段，未打开业务存储或重算正文。历史 `resultFileName=claims_20261110114450_89dd69c1.md` 是运行记录字段，原回执不证明曾单独保存，本轮也未检查现时磁盘目标。
- **拟消费版本及实际采用组合：UNBOUND。** 当前 Host、Workspace、revision、拟保存目标和权限确认尚未重核。R7-03 对这份正文的工程、专业和用户证据未在已核入口取得；限定源码预览、旧受控 F 和旧稿接受不移授。实际扣费沿原未知，原真实调用剩余 0。

## AR7-P：本地提供职责

| 要求／试填 | 结论 | 同版依据及保留条件 |
|---|---|---|
| AR-REQ01／AR-T01 | 同意：原 B 可作为本地待审核输入 | 草案 §1/3、原合同 §3 与 [R02][handoff]、[R7-02][live]一致。交付只涵盖同一 Workspace 的本地材料、结果及版本身份，不触发上传、API、Dify 或跨项目共享。当前实际读取资格沿 G02。 |
| AR-REQ02／AR-T02 | 同意：原件、正文和提取证据分别绑定 | 草案 §2/7 与 [结果核验][result]只支持该生成正文的 UTF-8 hash。材料原件 rawSHA256 与文件值的 SHA256(UTF8(body)) 分开；若选提取分支，再绑定源、正文、parser/policy、extractionSHA256 与起含终不含的 UTF-16 定位（不切代理对、全覆盖）。不以生成正文 hash 补认材料提取或重签旧证据。 |
| AR-REQ03／AR-T03 | 同意分支判据；本用途未选快照 | 草案 §2/9.1 的协议 2 是 Host 显式导入：strict 操作、UUID token、适用正安全整数 ID、keys/versions 一一对应、原缺省与 null 分开。不得把它套给普通本地保存或当后台统一协议。选用时才交准确远端选择及版本来源。 |
| AR-REQ04／AR-T04 | 同意：沿各自格式和单位限值 | 草案 §2/9.1、[R02][handoff]：原公开 Markdown／文本历史输入仅证原次范围；D1 原件/正文、UTF-8/UTF-16 等并行界限不得相互替换。不得以 57,201 字节输出或导入 32 MiB 上限证明 PDF/DOCX 已准入。 |
| AR-REQ05／AR-T05 | 同意：待审核输入与后发审核分离 | 草案 §7、[结果核验][result]、[R7-03][r7]。本版 B 为 not-reviewed；若后来编辑已审核版本，旧审核不覆盖新稿。提供方要交原任务、编辑 revision、新正文 hash 与具名复审对应；不把旧稿接受或结果合同通过当本次审核。 |
| AR-REQ06／AR-T06 | 同意：提供原任务和允许读取的证据 | 草案 §4/7、[R02][binding]的 B 归属可作历史起点。提供方还须绑定当前授权范围；同 hash/同名/URL 均不授予读取权。本用途未选远端取件，后选则另核逐文件授权、时效与实际字节。 |
| AR-REQ07／AR-T07 | 同意：按来源及新旧身份交接 | 草案 §7.1、项目 AGENTS §7/8、[命名原件][naming]。新本地 Skills Markdown 无来源标记；旧文件不迁名，原始输入不套新产物命名。历史 resultFileName 只能作原运行字段。ARN-11/12 待核；碰撞或写入失败只处理保存，不再生成或收费。 |
| AR-REQ08／AR-T08 | 同意原语义；本用途未选快照 | 草案 §2/5 与原合同 §3。显式导入才提供绑定的记录/版本与逐项结果；associationStatus=saved 仅是关联已存，partial 不写全成，解绑不宣称远端擦除或本地回传。无本轮选定快照或操作回执。 |
| AR-REQ09／AR-T09 | 同意：只交准确可引用版本 | 草案 §4/7、[R7-03][r7]。待审核 B 原稿不能作为固定审核版本；提供方需交复审后准确内容和来源链。普通引用只供资料或待发草稿；已保存件、未提交结果编辑稿、原生对话草稿各保留自己的身份。无模型已读、P4 或发送证据。 |
| AR-REQ10／AR-T10 | 同意：生成证据仅沿原层复用 | 草案 §9、[R7-02][liveverify]和 [R7-03][r7]。原生成结果合同可引用；相应 U1/D1、当前 Host、工程接续、专业和用户接受各有原门。没有以本次文档、旧安装测试或源码预览关闭其他出口。 |

## AR7-C：本地消费职责

| 要求／试填 | 结论 | 同版依据及保留条件 |
|---|---|---|
| AR-REQ01／AR-T01 | 同意：仅消费同一项目、同一用途 | 草案 §1/3、[R02][handoff]与 AGENTS §7。用权威 Workspace/Session 复核当前 B 任务、run 及 revision，再读、审、存或引用；晚到或切项目不得转归属。没有跨 Workspace 或自动上传权。 |
| AR-REQ02／AR-T02 | 同意：预览、保存、引用各核实际版本 | 草案 §2/7、[结果核验][result]。原 hash 只标识原 B 正文；消费端核实际读取内容、路径与审核版本，编辑后用新正文 hash，独立保存后核实存字节。若消费提取定位则同时查 source/raw/text、UTF-16 边界，不把码元数当 UTF-8 字节数。 |
| AR-REQ03／AR-T03 | 同意分支隔离；本次普通保存不调用导入 | 草案 §2/9.1、[R02][handoff]。只有明确选快照，才核协议 2、真实账户/origin/folder、Workspace、token、选择键、版本与确认；原 Schema 保持严格。当前没有该选择，不把 ARN-11 标完成，也不把 null 变成默认目标。 |
| AR-REQ04／AR-T04 | 同意：核具体 Host 与格式容量 | 草案 §2/9.1、[兼容矩阵][compat]。本地 Markdown 保存、原生预览/引用、D1 提取和显式导入各用其原限额；32 MiB 单件／100 MiB 总量只属协议 2 导入。不得裁原件、抬常量或以小样本推整套格式。当前 Host 能力及实际输出目标未绑定。 |
| AR-REQ05／AR-T05 | 同意：审核随版本，恢复随编辑 revision | 草案 §7、AGENTS §7、[R7-03][r7]。核当前文件与 Workspace、被审正文 hash、审核状态和并发 revision；旧审核不得套给已改正文。未提交编辑稿另固定 revision，正常重启后核同任务、编辑内容及审核状态；独立保存件和原生对话草稿均不能代证。 |
| AR-REQ06／AR-T06 | 同意：按动作核读写权限和目标 | 草案 §4、AGENTS §7/8、[R02][handoff]。当前路径须在权威项目根，核读取资格、写入权限、目标与确认；账户/origin/Workspace 或版本变化后重新核适用确认。B 历史归属、同 hash 或文件名均不能解除 G03。 |
| AR-REQ07／AR-T07 | 同意无覆盖判据；当前目标待核 | 草案 §7.1、[命名原件][naming]、AGENTS §7/8。拟写新 Skills 文件存当前项目根且不加 `_OIW`，先核新旧、同名、权限与确认；目标存在保护原件并记录冲突，不自动改名/移动旧件，不重生成或二次收费。ARN-13 是新产物同名保护；不抹掉已显式选择的旧快照原有避让和去重条件。 |
| AR-REQ08／AR-T08 | 同意原状态分层；未选快照 | 草案 §2/5、原合同 §3。若选快照，应核关联结果及逐件 saved/skipped/failed、partial 原义、解绑范围和本地保全。仅关联 saved 不能当所有字节写入；不自动同步或回传。本地正文保存不套这组导入状态。 |
| AR-REQ09／AR-T09 | 同意原生安全打开及固定审核版本普通引用判据 | 草案 §4/7、AGENTS §7、[R7-03][r7]。实际须核原生安全打开及同 Workspace 授权，区分当前文件与固定审核版本，记录准确引用 hash 和未发送草稿。路径或 URL 不证明模型已读，不自动发送、生成或收费。已打开、已保存、草稿恢复分别留证。 |
| AR-REQ10／AR-T10 | 同意：各层单独验收 | 草案 §9、[R7-03][r7]。工程需同版审核、保存、打开、引用和正常重启恢复回执；专业审阅者按适用制作可见规则对同一版给具名意见，用户接受另绑准确 hash 和保留警示。缺风险/问题维度记未评估；不混入评价答案，不把初稿宣称完整申请文件。 |

## 原缺件、命名待核项和解除点

| 原 ID | 责任方和现态 | 受阻动作、最晚消费点和解除证据 |
|---|---|---|
| AR7-G01 | DSH-Oasis 项目 Codex 两职责已在本轮对同版、本用途各交十项具名意见。R01 部分沿旧回执；中心本轮核收待办。 | 本用途的具名文档意见已交齐。专项牵头在登记限定定稿前核本聊天实际轮次、两职责矩阵、标准/试填/R02 哈希及返回原字节；不得据此关闭其他用途或实际版本技术签收。 |
| AR7-G02 | AR7-P／DSH Host，历史提供身份已列；当前消费 Host/安装、Workspace/当前 revision、资源输入与待审核正文匹配仍未核。 | 阻实际组合绑定及相应运行声明；最迟实际采用/运行前。补准确当前安装/Host 及版本、原 B 权威归属与 revision、冻结输入/资源/正文哈希和适用 U1/D1/Host 准入证据。 |
| AR7-G03 | AR7-C／DSH Host 对应分支，拟项目根、目标、文件新旧或同名、权限与确认仍未绑定。 | 阻该目标实际消费、写入或快照导入；最迟消费快照或写入前。补当前根和目标身份、原版本/权限/明确确认、同名处理及无覆盖约束；写后另交文件字节/hash、引用或逐项导入结果。 |
| ARN-11／AR7-P | PENDING_ORIGINAL_IMPORT_CONTRACT；未选历史快照。 | 选用该分支、交确定命名前，提供真实快照/记录/版本、文件身份与原导入合同；不得因来源是网站或 API 自加标。 |
| ARN-11／AR7-C | PENDING_ORIGINAL_IMPORT_CONTRACT；未选历史快照。 | 消费或写入快照前，核该快照选择、归属、版本、权限、确认和原命名/避让。null 不补拟名；实际写入/跳过逐件取证。 |
| ARN-12／AR7-P | PENDING_SOURCE_AND_LIFECYCLE；合成待核格仍保留。B 原 run 的 Skills 来源在历史回执已有记录。 | 若待处理实际对象来源或新旧身份未定，给确定拟名前补任务/来源及文件生命周期证据；不得据同名、URL、hash猜。 |
| ARN-12／AR7-C | PENDING_SOURCE_AND_LIFECYCLE；B 的实际保存目标和文件新旧还未核。 | 该对象决定命名或写入前，核真实路径/目标现态、原版本/归属和允许的写入动作。不阻无关文档准备。 |
| R7-03 未提交编辑稿恢复 | DSH Host 提供源、消费职责分别核同一版；当前无 B 同版回执。 | 声明恢复已验前，固定一次正常重启的原 Workspace/任务/编辑 revision、内容 hash 和审核状态，记录前后对应。保存件及未发送对话草稿另列证据，不借重启重跑。 |
| 专业及用户接受 | 原专业责任方与用户分别作结论；原 B 仍待审核。 | 声明接受/发布前，各交同版正文、规则/支持材料、保留警示及实际结论。原工程、公开源码预览和旧稿接受各保留原用途。 |

## 可定稿的范围

可提交专项牵头核收并**限定定稿为文档判据**：同一 DSH Workspace 内，以原 B 的 M06／Flow-2-6 本地 Skills 结果为候选，核身份、审核与编辑失效、再审绑定、项目根 Markdown 无覆盖保存、原生安全打开、固定审核版本普通引用及未提交编辑稿恢复的判据。AR-REQ03/08 只固定「此用途未选显式历史快照、另选沿原合同」的适用边界；不定稿该快照的实际选择、命名、导入或解绑。两职责同版意见可供该文档出口核收。

**带实际版本和目标的采用范围仍保留候选。** 当前 Host／目标／权限等 G02/G03 材料缺失，不能定稿为已采用组合、发布有效接口或完成整个 IC-ARTIFACT。原生成结果合同是既有运行证据；R7-03 的新运行证据仍待取。交付核验期间观察到并行产品文件变化，逐项前后身份见 [交付核验](verification.json)；这些文件不是本轮判据的绑定输入，也没有被采为当前装机证据。原入场记录不覆盖，实际采用时按 G02 另核装机和受影响接点。

本轮只新增回执文件。未修改标准、计划、状态入口或原回执，未运行产品测试或实际保存、引用、重启，未发起业务调用、WorkBuddy 投递、联调或 Git 写入。

[dispatch]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r03-ar7-review/dispatch-preflight.json>
[request]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r03-ar7-review/request.md>
[standard]: </Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/IC-ARTIFACT-v0.3.md>
[trials]: </Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/examples/IC-ARTIFACT/repair-trials-v0.3.md>
[matrix]: </Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/2026-10-28-interface-static-review-v0.3.json>
[contracts]: </Users/tinadong7036/Documents/开发项目/docs/coordination/CONTRACTS.md>
[compat]: </Users/tinadong7036/Documents/开发项目/docs/coordination/compatibility/2026-10-25-project-compatibility.md>
[handoff]: ../2026-11-11-interface-r02-ar7/handoff.md
[binding]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r02-first-batch/bindings.json>
[r01]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-10-30-interface-stage1-closeout/closeout.md>
[r7]: ../../plans/2026-11-08-project-summary-and-next-plan-r7.md
[live]: ../2026-11-10-r7-02-live-16384-r1/execution-return.md
[dispatchrun]: ../2026-11-10-r7-02-live-16384-r1/dispatch-receipt.json
[liveverify]: ../2026-11-10-r7-02-live-16384-r1/verification.json
[result]: ../2026-11-10-r7-02-live-16384-r1/result-contract-verification.json
[naming]: </Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/examples/IC-ARTIFACT/repair-v0.3/naming-cases.json>
