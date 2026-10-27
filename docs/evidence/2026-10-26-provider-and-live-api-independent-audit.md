# 具体DSH provider与Flow-2-6网站单次校准独立审计

审计日期2026-10-26，Asia/Shanghai。审计者为用户指定独立子代理；**模型配置来自调度声明GPT-6.1 / max**，没有更换模型或从产物自行推断。承接`DSH-FOLLOWUP-20261026-01`及`DSH-FLOW26-LIVE-CALIBRATION-20261026-01`。

**结论：本批来源/安装与网站观察交付在下述范围可接受；发现的历史草案表述问题已修正并透明补保全。具体provider尚不满足材料合同的全部硬资源/访问要求，PDF/DOCX仍未达READY_FOR_OFFLINE_PROOF；网站取得正文和保存/消费观察，但未质量接受。全后续计划未完成。** 本结论不扩大此前首批准备和M06范围1审计，也不把网站校准或离线回放算作新版E/F/G0、双来源或发行验收。

本轮只读已存文件、归档、日志及脱敏观察，运行纯本地哈希/字段回放；没有创建请求、主动访问网站、接管浏览器、启动Host、变更pin、安装或联系他人。实际网站唯一创建的预算来自用户本次“批准一次，最多3元”，已消费；本审计没有新增或重置创建额度。

## 1. 冻结对象与时点

根`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支`mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。首次provider/调用前材料读取为11:41:24.285744Z；真实校准包读取为11:55:15.039301Z；最终修订/恢复材料读取为12:11:19.770321Z。以下路径相对`docs/evidence/`，hash只绑定对应字节，不替代权限或当前远端状态。

| 对象 | 字节 | SHA-256 |
|---|---:|---|
| `2026-10-26-dsh-provider-discovery.md` | 5204 | `7ef26e1025df9cd80cf7d0aff7d6cbf9b677014481e7d7e8818ac54400fbd069` |
| 同名`.json` | 6582 | `3b9803cffcf97b3a5618a504bcc389c6ea901abd9c1646554760b6922cee40d4` |
| `2026-10-26-live-api-service-observation.json` | 4056 | `f3106004d3ddda9e5fc3b8a10bb2dde53b98023a1115f0d60b4bc1f4164565b8` |
| `2026-10-26-flow2-6-public-api-input.md` | 3026 | `4608aa711b06a70dd1508044597838b841fd926476ddfc3f3623b2ca581e21f3` |
| `2026-10-26-flow2-6-live-request-draft.json`，批准/执行后版本 | 3814 | `1660a70f4ff63e89c4e71a4935fa30e7ee1ea08913cedcd40d38c5a0989968e9` |
| `2026-10-26-flow2-6-live-request.json` | 3059 | `f4c75408803b101e311d8f37ccc30cd619f3e1f50783fd7d75f58e80a2e7d218` |
| `2026-10-26-flow2-6-live-response.json` | 2434 | `51ccf454d7547373d90e292811e0ebc54d9133d48cfefbb84bb5408191121e4c` |
| `2026-10-26-flow2-6-live-result-original.md` | 1610 | `9819c7ea09eb52a24a4e7341d98ec883a5732edcfc5d40e549e1a91ed408d7d3` |
| `2026-10-26-flow2-6-live-reconciliation.json` | 2286 | `44db7fe2fca584e0820c1fc1536ecea3bba61a899b691aa047680ced09c2bf38` |
| `2026-10-26-flow2-6-live-calibration-return.md`，修订后 | 5479 | `2c2730763c4390c5f314a2a9b8ee1e3b4cdf4061bdf969fe8b399f51ddf918ad` |
| `2026-10-26-flow2-6-offline-replay.json` | 1493 | `ad2928aac09b52890f0b2671036298c46685aa81931d836f6f3d2fa45d830d34` |
| `2026-10-26-flow2-6-live-request-draft-initial-recovered.json` | 3451 | `0af28ad04f345ac756d2bf5ae101962fdf787d85eeb930baf48c3e945915748b` |
| `2026-10-26-flow2-6-draft-recovery-note.json` | 608 | `b5a9c8732f1fb1c4a4cc2985556b38bb69e2b37e57c4451244e5b7efbdbc9836` |

## 2. provider来源、依赖及资格

用户已明确授权本地找provider及安装必要依赖。本次独立源树位于`.local/oasis-follow-up-20261026/provider-source/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84`；主包与日常安装不是该目录。

| 核对项 | 独立实际证据 | 接受边界 |
|---|---|---|
| 原源码归档 | `.local/supply-mac-20261021/dsh-fixed-source.tar.gz`实际32801529字节，SHA `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`；对应既有固定commit `639ed015397290b3745d163aafe02ffee4aa3f84`来源记录 | 复用原固定来源，不以目录名推断版本；本轮未联网重认证上游签名/tag |
| 源成员 | discovery JSON所列12份package/README/index，另加锁、根LICENSE/package、profiles、两测试、Python bootstrap、vitest配置，共20个归档成员逐件字节相等，缺失/不同均0 | 没有以修改过的provider源码冒充固定版本；未对全部依赖做最终产品分发审计 |
| 版本/许可 | Node PTC、sandbox-local、实验Python的package.json均0.2.0-rc.2/MIT；根LICENSE为MIT，SHA `ebb4f09972aee8608be255debaf78451a68e95c290f55c240dec2ecfa16ea6be` | 仅记录实际软件声明；复制/分发仍保留原通知，不能推出解析依赖、第三方闭包或专利知识资产的用途许可已接受 |
| 原锁及包管理器 | 源`pnpm-lock.yaml`仍`80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1`；安装元数据为pnpm@11.8.0、isolated linker、项目`.local` store | 根源码声明pnpm11.7不等执行器已切换；首次版本解析失败保留，后续固定工具消费原锁 |
| 安装记录 | 首次解析pnpm11.7失败；固定pnpm离线缺chokidar4.0.3 tarball；获准registry安装日志无error，结束于execution-time记录；未出现lifecycle记录，安装元数据保留pendingBuilds | 支持本次冻结锁/ignore-scripts的安装记录；不把离线失败改成成功，不将用户新授权推广为主包任意升级/安装许可 |
| 原provider测试 | provider-tests.log实际SHA `c68d7e08436bff21c05b3bd8e234a3c4e038390ebda4490a37099b9ea4117dda`，Vitest4.1.8，2文件、65通过/1跳过；测试源码与归档相同 | 本审计核日志/源码，没有重跑昂贵全量或将其称为绿洲U1。唯一跳过对应runtime.spec.ts L68的Windows专属条件；同机其他文件约束条件用例没有被批量跳过 |

安装三日志实际SHA：offline `1f9d35a6ab3ed6a9727473a62f0b33f9f7cc2e61cc6da8b5352275570fb88f36`；fixed-pnpm `dcf84b5e6958f932c8af6cb4a617c00d09736789a0066a27cdc745a5d0015883`；registry `be0f9b2ec48832664fdd620355b95f40f985626ca33fdbe55e31b846e3ec7cd7`。保留失败和成功的各自范围。

实际能力限制与报告相符：

| 材料合同要求 | 固定源码定位与实际含义 | 当前结论 |
|---|---|---|
| 268435456字节硬内存，包括native/后代 | Node README L140明确heap非process-tree memory；index.ts L222是`--max-old-space-size`；Python bootstrap.py L1046—1049只在非Darwin设置RLIMIT_AS | 不能据V8堆帽或Darwin Python配置证明硬内存；仍缺证 |
| 严格读白名单、网络/exec限制 | sandbox-local/src/profiles.ts L17对`/`只读bind、L35的readOnly含`/`；L52的Seatbelt是allow default加deny file-write | full是公共文件效果合同，不是绿洲全部隔离保证；未具备所需严格读取/网络/exec证明 |
| 逐stdout/stderr前置限额、全过程期限与回收 | Node组合maxOutputBytes与结果/诊断账本，grace和managed subprocess清理；README L141/144保留逃逸后代/Host binding分配边界 | 不能等同stdout2097152、stderr16384、5000/15000ms及全部进程回收要求已验 |
| 解析器/profile/最终分发 | 本次找到PTC执行实现，未冻结实际PDF/DOCX parser、guard/adapter、通知及完整profile证明 | 未达READY_FOR_OFFLINE_PROOF，U1未执行、D1未接线；DOCX私有缺件仍不作PDF前置 |

因此，“已找到具名provider并测试其原机制”和“满足产品材料合同”分别成立/不成立；不能泛称DSH所有环境都无能力，也不能因为65项通过就开放解析。原首批主包node_modules只见抽象seam的观察仍只约束其当时本地集合，本次扩大查找不重签旧证据。

## 3. 网站单次校准的真实性与合同边界

本节依据已存脱敏网络字段、正文及两张本地截图进行交叉核对，没有再次请求网站。它是对捕获观察的来源/内部一致性审计，不是独立服务端账务审计或当前远端状态认证。

| 层次 | 实际核对 | 结论 |
|---|---|---|
| 服务坐标 | 调用前观察Fast catalog211/detail39、Workflow/is_async=0/price3；Basic catalog212/detail46、is_async=1/price5，input/output Schema分列 | catalog ID与detail ID未混用；Basic未调用，现同步normalizer应拒绝Basic |
| 项目/账户 | 新合成项目302；截图选中该项目，重开时显示1会话；观察注明localDSHWorkspaceBindingAccepted=false | 只接受网站项目观察，不能作为DSH账户/Workspace/folder权威绑定验收 |
| 冻结实际POST | `POST https://lzhxpy.oasisintwrite.com/api/apicategories/create`，id39、folder_id302、key `task_1793014998417_8g0e1uo5puj`；捕获记录保存暂停/释放/响应时点及1次预算 | 一次网站校准预算已消费。OPTIONS预检和先前建项目不冒充另一次workflow创建；本审计未发额外POST |
| 两个文本及网站空字段 | disclosure_text完整等于technical_solutions，user_input完整等于User_input；实际网站另外5个段落字段为空串，未包含上传文件字段 | 没有丢弃本次实际文本，但这只是本例网站序列化；不是共同八输入全部无损映射或必需性合同批准 |
| 请求摘要 | 草稿`inputSHA256=2055739c…98a0`是`SHA256(JSON.stringify(draft.inputs))`，即两个API字段原序JSON；实际inputs摘要`7c197654…b7de`与请求摘要`72c617ee…4107`为递归canonicalJson | 三者算法/字段集合不同，独立重算均匹配，不能相互替代或混称共同表单对象hash |
| 原始结果 | 网络标识48954.322，捕获HTTP200；answer_text 1609 UTF-8字节，SHA `2089f39662c405c0f0ad717d6fccfbd1f4dade918667d23cde98542d4bf1a12d`；响应无record id/key | 原请求key回挂是本地关联，不虚造响应字段；不以进度100%代正文 |
| 原文保全 | 结果Markdown恰为answer_text加一个LF，1610字节，SHA `9819c7ea09eb52a24a4e7341d98ec883a5732edcfc5d40e549e1a91ed408d7d3` | 追加LF已披露；未把两种hash混为同一正文或编辑原结果 |
| 持久化 | 捕获项目列表/详情5271、folder302、storedInputs.server_key等于冻结key；记录正文摘要相同；完成/重开截图与可见正文相符 | 支持一次网站正文保存/重开观察；没有DSH审核版本、无覆盖项目文件、原生引用或重启验收 |
| 费用 | 流水6097、19:45:54、Fast消费数值3，与保存时间/服务及单次创建相符；预算remainingAuthorizedRequests=0 | 接受3元消费观察及预算耗尽；`link_id=5309`不同于5271，未推定外键/完整账务关联，也不证明服务端幂等、取消/退款或所有账务已对账 |
| 文件 | response.file_url=[]，存储观察为空串，截图下载按钮灰显 | 无文件交付，未生成或验证DOCX下载/保存 |
| 质量 | 输出增加源材料未明示的U形、金属、卡槽、螺栓、预压缩、柱形等确定限定；2/3/4项重复定义；未给要求的缺失依据/待核对清单 | `RECEIVED_NOT_QUALITY_ACCEPTED`恰当；这是源一致性发现，未作专业/法律结论，不自动改原文或再花费重跑 |

截图SHA：completed `2029756a449dfccde62dc33852c10c305c7e0437f99b431499916110983d04a1`；reopened `a30a7b31c4ac29ce5b25975ed673bdda3d76827d683971290aae0719715a780b`。本报告只取合成项目/结果/下载状态，不以侧边其他项目作为本任务证据。

审计独立纯本地字段回放：Fast详情解析、Basic异步拒绝、请求原样构造、无id/key响应正文/原key/空文件、默认non-production拒绝生产origin、显式production接受批准origin的注入传输、unknown/403各1次不重发，共7点通过；4次均为合成fetch，实际网络尝试0，退出0。**默认环境拒绝生产域名不等于客户端所有模式拒绝生产域名**；既有显式production模式本就存在，未改策略。

首次审计探针曾把草稿inputSHA误按共同字段canonical对象核算，断言退出1；查明它实际绑定两个API字段的原序JSON后，按上表所列真实算法复核通过。没有重算旧hash或改原件来消除差异，该失败不作为产品缺陷。

作者offline-replay.json与回放日志字节相同，均SHA `ad2928aac09b52890f0b2671036298c46685aa81931d836f6f3d2fa45d830d34`。原API/绑定35/35日志SHA `61f8e6eee7f9218245c139c72cd657104d9445e3fcc47b20a8479f17d739c31b`，退出0；API client/origin/binding及主包锁没有本批改动。本次未重复跑该组或昂贵全量，也没有把7点或35项当作新版E完整出口。

## 4. 唯一审计发现与修正：历史草案保全表述

**PL-A01 / P2文档追溯问题，已关闭。** 初读回执SHA `a43a17bba14e1224e37781e656f895ea73b197449eb276d4205a227e8f759440` 的L22把早期“观察/草案/响应”均描述为保留原记录时态。但审计者11:41:24Z已读取的草案3451字节、SHA `0af28ad04f345ac756d2bf5ae101962fdf787d85eeb930baf48c3e945915748b` 为AWAITING/creationSent=false，后来同路径草案3814字节已改为APPROVED/true，且当时没有独立副本。原表述把观察JSON的历史保全泛化到了已更新草案。

作者已承认并修正最终回执L22—24：早期观察JSON/响应保留时态，草案随批准及执行更新；在实际12:08:06.247910Z补恢复旧字节副本，恢复note明确`POST_AUDIT_RECOVERY_NOT_CONTEMPORANEOUS_BACKUP`及方法，没有伪装为调用前已有备份或回写mtime。审计只读恢复计算和实际副本hash均与先前观察完全相同，恢复note亦匹配当前草案摘要。修正足以消除错误历史表述，不能将恢复副本提升为事前独立时间戳证明。

本批未确认其他P1/P2交付一致性问题。软件许可/分发和真实集成缺件作为明确阻断保留；输出质量未接受是本次实测结论，不因程序收到正文而被关闭。

## 5. 当前入口与历史后缀保全

| 入口 | 审计读取的当前SHA-256 | 原字节后缀核对 |
|---|---|---|
| `docs/project-current-state.md` | `26b063d248885c54127cb99ce9cea76b1ac19f2627da2389da35bc7d3cec47c6` | 前置3520字节后，余262961字节精确SHA `90474832b98b4c6b78de100e7212bcd497075ddc4c8be1abe86ff9ca6903c083`，等于开工基线及before-prefix副本 |
| `docs/evidence/2026-10-23-stage5-progress-and-remaining.md` | `82e1f51b3bcc4b56a194627f527b08d73f34001f366c7b5a9a413d724039f98e` | 前置2026字节后，余70217字节精确SHA `4977117a8805bace5a45b140098d2687ccbbbe2f983caf7d2c715b22b85c4aec`，等于开工基线及before-prefix副本 |

新前缀正确分开：先前首批准备/M06机械接受、provider具名但资源不足、网站一次3元与质量未接受、尚未验DSH真实层。顶部唯一调用后的摘要明确接续下方“费用待确认/尚未创建”的旧时点，未把其作为当前预算；没有删除旧失败或重新签旧结论。状态登记中的“新批审计待出具”是本报告出具前的实际时点，由作者后续按原流程接续，本审计不代改入口。

原B台账实际SHA仍`1b084249ab889083287ec0050e232b7a5f372581efba8e300d9da2d1efe65245`；dispatchEnabled/realCallVerified=false，14个本地及14个API来源enabled全部false。网站service39已观察不等于新版八输入/api/workspace合同已接受，保留原114历史gap没有虚构来源已开放。

## 6. 未验项与实际交付范围

- provider：实际PDF/DOCX parser与最终许可/依赖/通知闭包、硬内存、严格读取/网络/exec及独立流预算/回收、完整profile和G6执行组件仍缺。当前不准入U1，不接D1，不把旧Mac方案强加为全部平台前置。
- 网站：接受本次实际legacy Fast的两个文本传递、正文及保存/消费观察；required语义、共同八输入全部映射、当前DSH账户/项目权限、报价/usage/资金的完整关联、完整撤权/迟到/跨项目业务链未验。Basic异步和文件出口未运行。
- 产品：没有本批新业务Skill、当前Host/Desktop的派发/审核/文件保存/引用/正常重启或跨进程证明；未完成E/F/P1/U13、G0—G5/H、阶段6及P2—P4/OCR/新导出等原保留范围。输出保留待专业审阅，用户产物接受与发行未取得。
- 本审计只读捕获材料，未认证当前服务器/账户状态、未独立现场重计网络请求或完整账务；不会为补证再消费已用完的一次预算。后续固定Desktop恢复属于另批，不在本报告中接受。

本报告采用的最终核心校验均为本地只读Python/固定Node哈希、tar成员比较、文本/字段断言及注入传输回放，退出0；主代理的provider65/1、原API35、网站操作和费用分别按其具名证据核对，没有新增真实执行或合并为旧R1网络0。本批可继续交接准确provider缺件及已观察的网站结果，**不能宣布全部后续计划完成**。
