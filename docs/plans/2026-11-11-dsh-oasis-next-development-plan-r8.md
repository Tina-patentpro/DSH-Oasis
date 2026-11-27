# DSH-Oasis 后续开发计划 R8

2026-11-11，北京时间 · dsh-oasis · 规划稿。由 Codex 单代理按现有工作包推进，开始或恢复实施时按 EXEC-R2 核对应范围。

**近期目标**　用 11 月 10 日已取得的 M06／Flow-2-6 权利要求初稿，在当前隔离开发安装完成审核、编辑再审、保存、引用和草稿恢复，再以同版证据作限定安装版发行决定。

**实施依据**　沿 V3.4.0、原 R7 与项目总计划。复用 DSH 原生模型、文件、会话、权限及当前结果页。沿用 Desktop 2.0.17、DSH 0.2.0-rc.2、Sidebar 0.24.1、Cordis 4.0.4、Node 24.21.0、pnpm 11.8.0 和 checkpoint 3 的开发组合，实际以活动安装收据为准。现有同页双来源及共用输入/结果规则继续适用。专业 API 仅在实际项目、服务和字段可无损绑定后接通。 [项目总计划](2026-10-25-dsh-oasis-master-plan.md) · [原 R7](2026-11-08-project-summary-and-next-plan-r7.md) · [V3.4.0 业务基准](../business-baseline/ACTIVE-BASELINE.md)

## 一、进度与实施起点

| 工作 | 已有证据 | 剩余出口 |
|---|---|---|
| M06 本地生成 | 11 月 10 日，rc.5 历史 bundle `a25f1a19…` 的原 B 单次真实运行 `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d` 为 `completed / stop`。原正文 57,201 UTF-8 字节，通过 V3.4.0 结果合同，仍待审核。真实调用许可已用完，实际扣费金额未返回。 | 直接消费既有正文，按 R7-03 补工程、专业和用户证据。 [真实生成回执](../evidence/2026-11-10-r7-02-live-16384-r1/execution-return.md) |
| 当前 Host 与保存 | 11 月 11 日只读回执复核原 B revision **90**、原稿哈希及冻结输入；活动指针为另一已完成 run `v340-f56b9fb7-1cf4-4915-8fdc-955c31afaa78`。活动 bundle 为 `2339cca5a2711bf7851443af5ec144312c0eff84372094e8b6f456e91dedf0e4`，与历史生成组合有 **32 个程序条目、14 个 Profile 条目**差异。 | AR7-G01 限定文档出口已满足；G02 当前 Host 实际选中与同版验证、G03 实际保存计划与确认仍为 `UNBOUND`。磁盘候选当时无同名文件，应用权限、审核版本和写入另证。 [R03 文档核收](../../../docs/coordination/execution/2026-11-11-interface-r03-ar7-review/closeout.md) · [G02/G03 Host 回执](../evidence/2026-11-11-interface-r2-ar7-host-receipt/host-return.md) |
| 首发 | 11 月 10 日已公开 127 文件的 rc.5 源码预览，分支 `codex/m06-rc5-source-preview`、提交 `ae893658d20879da593625c47760e9bca3467b7d`。回执确认当时默认分支为 `mac/continuity-v2`。 | 待选定并验收实际分发的业务包与兼容 Host 组合。公开预览作为既有事件引用。 [源码预览回执](../evidence/2026-11-10-r7-04-github-source-preview-r1/execution-return.md) |
| 六类里程碑 | 设置和同页切换已有实现及历史验证，本地生成已有上述实证，API 现有 Fast39 内容为 `partial`。产物/对话和升级恢复已有早期限定工程证据。 | 重点补当前组合的产物/对话及未提交稿恢复。双来源 G0、完整发行/升级回退和阶段 5 总出口仍分别沿原范围验收。 [阶段 5 进度](../evidence/2026-10-23-stage5-progress-and-remaining.md) · [Fast39 复测](../evidence/2026-11-05-fast39-jtti-retest-return.md) |

## 二、主线开发与验收

### P0.1 固定原稿与当前采用组合 · DS-02／04／05，R7-03、AR7-G02

- [ ] 启动前按 EXEC-R2 重新核活动安装、Profile、控制器、单 writer 和任务所有权。记录实际 bundle、Host 组件、业务 revision 和原 B Workspace `11e1a348-0248-42a1-8141-bcb6306caccc`、任务 `d8d762fe-36ae-49dd-b275-b7ffff04fda7`、会话 `session-be573ee0-ae7a-4d40-99d5-d607f6106786`。revision 90 是上次观察值，后续按实读记录。
- [ ] 在既有结果版本入口显式选中原 run，以版本标识和正文 SHA256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442` 核对预览。冻结输入 SHA256 `b563a98036bbb94e3ff835944f5c36a7c69f20b4b6d35f0a6bd8ba8c366895b5` 和资源 SHA256 `e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d` 沿原回执。确保原 A、B 的其他运行及活动任务身份在操作前后可追溯。
- [ ] 当前装机能正确完成该选择时直接继续。若出现误选、版本漂移或权限拒绝，先用现有受影响用例复现并固定准确失败，再沿最小接点补齐。候选接点为 `src/client/V340GenerationPage.js`、`src/client/workbench-store.js`、`src/workbench-rpc.js` 和现有结果合同。仅在实证缺陷落在对应文件时修改，实际改包后以新 bundle 重核受影响证据。保持工作区源码、已安装 bundle 和公开源码三种身份各自可追溯。
- [ ] **交付**　当前 Host 具名回执，包含显式选中原稿的标识、预览 hash、实际 revision、适用准入和程序差异处理。若选中关系未能证明，G02 保持 `UNBOUND`，先留具体缺件。

### P0.2 复用原稿验证编辑、写回、引用和恢复 · R7-03、AR7-G03

- [ ] 在对应审核责任方和开发验证范围内，预览并固定审核版本；编辑产生新版本，验证旧审核与旧保存确认对新版本失效。核原稿仍可读取，再审绑定新版本及正文哈希。工程操作产生的审核记录按其实际范围记载。
- [ ] 由 Host 生成实际保存计划，核 B 权威根、Markdown 与配套 `.oasis.json` 的最终路径、应用权限、目标新旧和双路径冲突。新本地 Skill 产物使用项目根、文件名无来源标记。用户明确确认当前 revision、审核版本/hash 与目标后，经原生流程排他写入。回读两文件和写回收据，核正文、版本、哈希及无覆盖结果。任一目标冲突、权限变更或确认过期时停在写入前。
- [ ] 用原生安全预览打开实际保存文件，另将固定审核版本放入未发送的对话草稿，核资料身份及正文版本。原生输入若达到长度限制，依现有完整 Markdown 退路留证，保持正文完整。
- [ ] 对同一任务另留一份尚未提交的结果编辑草稿，经正常退出和重启，核 Workspace、run、基准审核版本、草稿内容/hash、revision、审核状态以及已保存文件。核整个过程新增模型派发、专业 API 请求及对话发送均为 0。历史 R7 收据记本地测试余量 8 次，执行前核后发消耗和原适用范围；本流程所需新增真实调用为 0。
- [ ] **交付**　工程回执含操作与退出结果、原稿和派生版本、两文件实际字节及写回、原生打开/固定引用、未提交稿恢复与原任务保全。记录 AR7-G02/G03 的实际结果供原接口专项引用。对 `src/writeback-service.js` 或结果草稿逻辑的修复以实际失败为依据。

若需代码修复，从仓库根在 zsh 运行受影响用例。选用下列测试文件中的实际受影响子集，先复现失败再核修复，预期退出码为 0。随后只对实际采用的装机组合重做相关原生步骤。

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --test \
  packages/oasis-professional-service/test/m06-native-business-recovery-client.test.mjs \
  packages/oasis-professional-service/test/m06-native-business-recovery.test.mjs \
  packages/oasis-professional-service/test/result-edit-drafts.test.mjs \
  packages/oasis-professional-service/test/result-review-confirmation.test.mjs \
  packages/oasis-professional-service/test/writeback-service.test.mjs
```

### P1.1 具名专业审阅与用户接受 · R7-03、DS-05

- [ ] 固定送审的正文版本、hash、所用制作可见规则、原三份公开 Markdown／四段文本及证据位置。专业审阅逐项核查权项依据、必要技术特征、依附关系、原稿警示及待确认项。资料不足时保留对应警示，缺风险/问题字段按未评估记录。引用历史 MC01–04／15 警示回执时附其原稿版本。
- [ ] 专业审阅者给具名结论及必要修订；如改稿，固定新版本并重审受影响部分。用户按准确版本/hash、用途限制和保留项作接受决定。工程、专业、用户各以具名证据为准。
- [ ] **交付**　面向用户的 M06 权利要求初稿验收结论及可追溯版本。尚有专业或用户待定项时，发行决策材料注明影响和可用边界。

### P1.2 准备并决定限定安装版首发 · R7-04、DS-05

- [ ] 先沿 RL01–09 更新准确技术事实。把公开源码提交、待选业务归档、实际采用的 bundle/Profile/控制器及二者差异分别列明，固定成员清单、第三方通知、安装/升级/回退和用户数据保全的同版证据。产品承诺仅覆盖有同版证据的能力；拟分发对象有新差异时只重验受影响链路。
- [ ] 在已采用的 OasisIntWrite Community License 1.0 范围内核新增贡献及分发权，注明独立法律复核状态。Codex 提供技术事实、限制和准确版本，WorkBuddy 负责面向用户的 GitHub 说明与运营内容。复用既有源码预览回执，沿 GH1／OSS1 和 PG1-R1 接续。
- [ ] **交付**　可审的首发包、技术事实、适配范围、回退说明、剩余风险和发行决定。由用户对具名归档、仓库、渠道及动作作发行决定，获准发布时再记录实际事件。 [RL 接续](../release/m06-public-0.1.0-rc.5/RL-CONTINUATION-R1.md) · [GH1／OSS1](../../../docs/coordination/plans/2026-11-07-github-operations-workstream-plan.md#oasis-github-open-source-oss1)

## 三、独立支路

| 支路 | 负责人及下一交付 | 进入实施或验收的条件 |
|---|---|---|
| **Fast39／AR3，DS-04/05** | Codex 在源设计、后台、DSH 各端沿 C4 和 PREP2 确认具名 DSL/实例、真实 caller、后台及 DSH 目标版本与正常治理入口。三处修复分别验证来源 ID 传到 Outline、锁止件核心特征处置有据、结构化输出在后台与 DSH 保全且旧投影兼容。 | 源事务沿原治理、Batch 与批准范围。按 API-1／ACCOUNT-1 绑定实际 origin、服务/C0/Schema、账户、Workspace、folder、报价、权限、结果和文件合同。受限校准须满足原 G0 准入和单次上传/费用授权，正式启用须取得 G0 验收。未知仅查原运行。账户与财务界面归 workarea，服务端权限与账务事实归实际后台。 [C4 限定采用](../business-baseline/fast39-c4-limited-adoption-20261105/限定采用确认与解除条件.md) · [Fast39 最小修复计划](2026-11-05-fast39-minimal-repair-plan.md) |
| **PDF、DOCX／DS-03** | Codex 先为 PDF 补所选平台的 runtime/parser/launcher、许可通知、profile、硬限和退出清理证据，复用已有公开 PDF 和 OOM 两例。DOCX 另交 XSL/许可、ABI 和实体控制缺件；E07 输出排版另沿其业务合同。 | 各格式按 READY → U1 → D1，实际接线再固定材料编码、原件/正文/提取哈希及定位。两例只覆盖原隔离条件。纯 Markdown 主线可独立交付。 [PDF/M06 最小实现回执](../evidence/2026-10-29-pdf-m06-implementation-return.md) |
| **WorkBuddy 用户入口／DS-02** | Codex 复用已绑定的 `packages/oasis-workbuddy-user-entry` 及 10 成员私有候选，先核实际目标 Host 版本、官方导入流程、资源读取/权限和触发行为，提交具名导入验证方案。 | 在明确范围内验证安装和零调用打开，再按适用授权验证实际行为、项目归属、审阅与保存恢复。原内部连接器的签收按其单任务范围引用。 [入口采用记录](../../packages/oasis-workbuddy-user-entry/ADOPTION.md) |
| **下一模板／DS-01/02/05** | **建议只准备 M05 一个 DSH 消费候选。** 它产出 M06 上游的技术交底，已有 `patent-technical-disclosure 0.3.0-rc.4` 固定事实包。由 patent-distillery 与 DSH 分别交所选包、许可/规则/来源及目标 Host、装配位置、输入和权限的 SKILL-1 绑定。 | 实际采用为 `UNBOUND`。先交共同字段→本地输入→API 映射→结果类型的差异及所选样例、五章输出/来源定位/缺材料警示判据。任一来源无法无损映射时明确禁用。后续独立验证 Host 和专业内容，Dify 从同版 Skill/规则另行验证。 [M05 事实包](../../../patent-distillery/docs/delivery/2026-11-11-interface-r02-m05/technical-facts.md) · [G1 产品目标](../../../专利业务Skills清单.md) |

Skills 优先。收费专业能力与自制后台替换继续沿 BM1 的约 1–2 个月、2–3 个月目标窗口，起算点待定。过渡服务选用时再固定实际青岛后台及服务合同；切换时核历史任务、身份和数据映射、资金对账、回退及两端消费。各支路按直接交付物推进。保留 14 节点、双来源和 29 项业务目标，T01 单列。适用的制作可见规则须记录版本、用途与采用位置，`evaluation_only` 答案/评分材料保持隔离。

## 四、排程与开始条件

1. **首批 P0.1 → P0.2。** 第一份交付是同版原生选中回执。随后验证原稿工程链，优先安排一个可判定的未提交稿恢复场景。
2. **首批之后 P1.1 → P1.2。** 可提前准备首发差异、许可和回退材料，准确专业/用户接受与同版工程回执齐备后进入安装版发行决定。
3. **具备直接输入时准备独立支路。** 每项缺件记录提供方、最晚消费点和解除证据。排程按里程碑与责任方实际可用时间滚动，未承诺日历日期。

执行时沿原 R7/EXEC-R2 建立对应回执，并在两个登记的 `current_entry` 回写已发生的具名结果。保留历史 `FAIL`／`UNKNOWN`、原材料、旧产物和同期工作区变化；确认随版本、revision、归属或目的地变化失效。真实模型、上传、费用、源事务及远端发行按实际已有授权和对应准入办理。本轮交付为开发计划。

## 五、整体一致性与输入复核

- **符合。** 中心登记和独立索引均定位整体 P1110。项目局部入口仍为 P1108，按后发具名回执接续 R7。沿 NS1-R1、BM1-R1/S1/S2-R1、G1、GH1/OSS1、PG1-R1 与接口 R2。原 IC-ARTIFACT V0.3 的 AR7 本地判据仅在具名范围采用，IC-SKILL/RULES 约束下一模板，IC-API/ACCOUNT/ACCOUNT-ENTRY 约束专业 API。当前增量围绕 DS-01—05 原工作包。 [整体 P1110](../../../docs/superpowers/plans/2026-10-25-independent-projects-and-compatibility.md#oasis-plan-progress-p1110) · [接口 R2](../../../docs/superpowers/plans/2026-11-11-interface-standards-post-r03-plan.md#oasis-interface-standards-followup-r2)
- **起点差异。** P1108／R7 的未取得有效正文由 11 月 10 日回执接续。P1110 的历史 bundle `a25f1a19…`、结束 revision 86 与 11 月 11 日观察到的活动 bundle `2339cca5…`、revision 90 各自留证。原 R7-05 的旧专利蒸馏路径缺件由平级 `patent-distillery` 登记及 M05 具名事实接续；实际 Host 采用继续待核。公开源码预览回执接续早期 RL 的未公开时点。
- **缺件及影响。** AR7 尚缺实际选中、目标权限和确认，只限制对应采用及写回。专业/用户接受和拟分发组合的兼容、回退、权利及发行决定只限制相应承诺和发布。Fast39 的实际接口和源事务身份、逐格式准入、WorkBuddy 实际导入以及 M05 同版消费由各工作包单独取得。依据为本地登记、资料与具名回执，未实时核生产服务、GitHub、装机或后发运行。

规划读取于 2026-11-11，Asia/Shanghai，Codex。项目 Git 根为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支 `codex/pdf-m06-minimal-20261029`，HEAD `30031b589d4ff7108ed5df16b698351ad4a45f37`，另有同期未提交源码与证据。以下对实际采用的文件或相关章节记录完整原始字节 SHA256，文件内锚点沿父文件身份。

| 绝对路径 | 版本或读取范围 | SHA256 |
|---|---|---|
| `/Users/tinadong7036/Documents/开发项目/AGENTS.md` | 根 R1／EXEC-R2／接口纳管 | `5da00f111b7d1632ea0f7d59c4d45790743988c1a8ba5f84ac895258b3ca7559` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/AGENTS.md` | 项目规则 | `0d77317680cb86a8465aed464ca2c33db7b58e52c645e9d86a66effafdc03159` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/README.md` | 协同 1.2.2 | `f2e51a7dcdc2f894f5ae748400356119759febb2ddee5dda21e5320f24ed79fd` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/projects.json` | 协同 1.2.2，整体 P1110、接口 R2 | `58e5c4fe993b78db3e9785e4d3089385ba0d15b144cb23fd96f003bc99e596cf` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/independent-plans.json` | 1.3.1，整体 P1110、项目 P1108、接口 R2 | `7129f27102a7a9b644e03dd08d32b9325cc963b25cd71c2f22b43e9155eab8f5` |
| `/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-10-25-independent-projects-and-compatibility.md` | 1.3.1／NS1-R1，BM1-R1、P1110、OSS1、PG1-R1、接口纳管 | `80975717d3e73a966833a37abef3a8ac0fba3b3dabdc252937d94816829368fb` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/plans/2026-11-05-open-source-business-mode-bm1.md` | BM1-R1／S1／S2-R1／GH1，局部 P1108 | `20661be6bfb34dbb73b6250786bb1c57b09ae83158ad1b2a56e883974e612409` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/compatibility/2026-10-25-project-compatibility.md` | 1.3.1 及适用补充 | `a136e61999cdd6f0b196e07ca95cbdf7e591204562c32fc588816d50cf13751c` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/CONTRACTS.md` | 协同 1.2.2，§1–4 及 BM1-R1／S1 | `12193ba8eb42f54c1f6146c82ed7c500aa87ce046e81e815650712725666c6f3` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/plans/2026-11-07-github-operations-workstream-plan.md` | GH1／OSS1，发布边界 | `74f121a323b8bdba8d80d59cc05a189bb5086d125fe3b8f96595a92cef696f3b` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/plans/2026-11-10-website-github-promotion-plan.md` | PG1-R1，M05 技术事实与传播 | `783bb1a22e924b70a74bc3d48b76dbf95b1646a97a61cc6985121f82af7164c4` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-10-25-dsh-oasis-master-plan.md` | 1.3.1／NS1-R1／项目 P1108 | `566f665829e04c675c7bb4334d0ea0e1b52f92231009de88b51631e8fb5a560d` |
| `/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-10-25-cross-project-interface-standards-plan.md` | IS-00—IS-06，相关接口 | `2aaf7c6194acb9bd20d78a518c92c7b15e4c8a237b9fcfc2d01afa927d88edac` |
| `/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-10-28-interface-standards-progress-retrospective-and-next-plan.md` | R01—R06，采用及运行 | `a72feffee8f239032df4f1114c29fffccb6e6a5944e32ecf4897c02c7af1f5ed` |
| `/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-11-11-interface-standards-post-r03-plan.md` | 接口 R2，AR7、AR3、M05 | `8c64d3ee0bae1d2971c3ec52ce1d6859ab7498092861c8070e54b9e772e6977f` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/IC-ARTIFACT-v0.3.md` | V0.3-draft，AR7 限定采用 | `35382445972163d35541920dbce6df6037a3948b22516a7c783da2d2e23a8b29` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/examples/IC-ARTIFACT/repair-trials-v0.3.md` | V0.3 AR-T01—10 | `720b56b8068c7557215748982582cb985767616150f4794c8cdeebcd3f36f0a5` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/interfaces/review-preparation/2026-10-28-stage1-r1/ARTIFACT-7.md` | AR7 逐边核对 | `c73b776cc5a475d39cfb6075fc85de174362039ed240663901ec185b957c4b33` |
| `/Users/tinadong7036/Documents/开发项目/专利业务Skills清单.md` | G1 登记，原文件未声明版本 | `1bdc284f4b60890965c2fc06e9afda99d0a54448230c569fbf0ccc57000ae941` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-11-08-project-summary-and-next-plan-r7.md` | R7，原任务和验收 | `107a0ab769751fce16c0d5412fd0c9740190ff78f1b477e6b13e8ee7721db368` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/project-current-state.md` | current_entry，相关段落 | `6bf99848509ed6f4fa06e4d74cec0a167562484399b4c563e5b5a1f2b85ca478` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-23-stage5-progress-and-remaining.md` | current_entry，阶段 5 相关段落 | `ebdcef28e95fa0de355e49055a54235ca4f5ce0e6d47f3c35892934172a48307` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-10-r7-02-live-16384-r1/execution-return.md` | R7-02 单次生成 | `b5be916fe629f66622f8e5aa8512a7a267c7c95bf74ee1f98e749057b68814d0` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-10-r7-04-github-source-preview-r1/execution-return.md` | R7-04 限定源码预览 | `a71349001932ba5f91fedfca4c24e318a986013aa42d30b81334a9c5bbcc79bc` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r03-ar7-review/closeout.md` | R03 限定文档核收 | `ea3d94d8b205a9c884edf7dc26264c9b1b04a0069a2854882123177c8299d2b6` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-11-interface-r2-ar7-host-receipt/host-return.md` | G02／G03 项目只读回执 | `fa1e11f812e06789a5c7f1485085b13257c35c4f922a864a097df5d7c6823a9a` |
| `/Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r2-ar7-host-followup/closeout.md` | G02／G03 专项核收 | `12936fa3e2fec7999c20dad8e40837df900ba8fcd8c42a2d003bd338a3989646` |
| `/Users/tinadong7036/Documents/开发项目/patent-distillery/docs/delivery/2026-11-11-interface-r02-m05/technical-facts.md` | M05 具名交接，实际 Host UNBOUND | `92983839681a0d50a87a2a5e7c2f773c2fb693d66a490e4b694b3f7b21e0433c` |
| `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/packages/oasis-workbuddy-user-entry/ADOPTION.md` | R3-07 技术准备 | `5178d376ffcf19e7b2d29db936df86c146e017802f47409c165b80afeade033a` |
