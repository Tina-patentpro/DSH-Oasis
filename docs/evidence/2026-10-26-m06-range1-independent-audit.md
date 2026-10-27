# M06范围1最小适配独立工程审计

## 最终复审：45个选定断言及9组机械出口通过

最终返回包读取时点：**2026-10-26T11:30:24.638079Z（上海19:30:24）**。本节更新当前接受状态；下方“待S25-A01”的初审记录及缺证/补证过程保留，不能据旧待办段落误判当前仍未交包，也不重签旧失败。

**指定M06来源隔离、受限编辑提示、既有保存恢复与旧兼容的机械范围通过。** 本审计逐项核对45个选定断言，S25-A01已补件复核关闭，R1-V01—V09在该选定范围内通过。此结论不等于S24/S25整项、C36/C37专业语义、C38完整删除、实际Host、本地Skill装配、真实双来源或全后续计划完成。

| 最终交付 | 字节 | SHA-256 |
|---|---:|---|
| `docs/evidence/2026-10-26-m06-range1-engineering-return.md` | 5925 | `96c5db441d76f2ef936ca41fa9f9497d458a44509ed952d02f57997636064c22` |
| `docs/evidence/2026-10-26-m06-range1-execution.json` | 60003 | `02e790f8c26b2aa971e0868839111e3d4b5466f0014e227d2e2ab46a6972c3c8` |
| 执行JSON初版`.local/oasis-follow-up-20261026/execution-initial.json` | 58289 | `30e1510d57e7d44f9d316ad7c94c9c7bbf219ad797d6313e13362b0857e22ac9` |

复审结果：16份源码/测试/锁等身份及15份日志/夹具证据，**31项实际hash/长度均一致**；45个断言ID与expected逐项等于原selection，9组required_assertion_ids保留，作者只提交EVIDENCE_SUBMITTED_FOR_INDEPENDENT_REVIEW，未擅自给第三方审计PASS。逐原子表、命令/退出码、初始FAIL/并发FAIL、计数与未验范围已交齐。

最终可复现性补件包括5份公开合成values原值、JS UTF-16/UTF-8及SHA计算方法、固定Node实际解析路径/版本/SHA和2份旁置构建产物身份。独立以固定Node导入当前纯准备模块重算5份fixture，valuesSHA、preparedSHA、inputHash、完整receipts及每项文本/原字节SHA、两种长度全部一致，命令退出0；非BMP夹具按JS码元计数，未以Python字符数替代。Node实际为v24.21.0，SHA `e4b5a3af0e05c75de2eae013904145f40fe7fc2a6e6f17510128bf45cca4e79b`，解析路径与原固定工具相符。

旁置`client.js` SHA `9d97a36a94162cdadea66844e53acc176642917fa63e34a84b34c87dc1ed2f55`、`client.js.map` SHA `778a0ac3ccacf3aac3c9641daa86ba74c180b4b1b6bc35956a275437b187f65f`均按实际文件独立核对；初版执行JSON原SHA保全，45条映射未被补件改写。没有为这次纯身份补件再跑整包，也没有新的生产改动。

下方矩阵中R1-S25-A01当前判定更新为“有证／选定部分PASS”；V09当前为3项均有证，其余44项及8组结论保持。S05专业语义继续NOT_EVALUATED，真实Host/模型API/专业用户/发行、完整同步/删除及全目标未验状态保持。

作者此后另行推进provider查找/安装与已登录网站的实际服务元数据核对，属于后续独立范围，**不在本报告的R1合成测试网络0计数中**；本报告未审这些新交付，也不据此改变首批准备材料当时的冻结事实或宣称已完成真实生成。并发失败、准入拒绝及范围限制继续保留。

---

## 初审记录（原文保留，当前接受以本节上方最终复审为准）

任务`PD-M06-RANGE1-HANDOFF-20261025-07`／审查依据`PD-M06-RANGE1-REVIEW-20261025-08`；消费工程`DSH-FOLLOWUP-20261026-01`。审计者为用户指定的独立子代理，模型配置按调度声明为 **GPT-6.1 / max**，不从文件或产物推断。

**当前结论：指定机械实现及已补断言有证，未确认P1/P2实现缺陷；返回包仍待完成S25-A01，暂不宣布范围1全部验收通过。** 原45个选定原子断言逐项列于下文，不能用13个新增测试或1438项全包结果批量填PASS。真实Host、模型/API、专业/用户及发行未验，完整同步/删除和有效事实视图仍在后续范围；本审计不关闭DS-02/05或全部后续开发目标。

## 1. 依据、冻结与保全

根目录`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支`mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`，有未提交内容。项目/根AGENTS、协同1.2.1、当前状态及本批准备交付已读。范围1设计已经确认，本次工程授权由当前任务承接；提供方旧交接中的“只编文档”不被误当本次实施禁令。

审计依据均为准确v0.2.0原件，不按文件名或mtime选版：

| 提供方依据 | SHA-256 |
|---|---|
| `patent-distillery/docs/delivery/M06-host-B-v0.1.1/range1-review-20261025/2026-10-25-range1-handoff.md` | `cd7ea29c5238c4362d683506a4a87c198810d5b64ff7f5565a86f4b7e0b907fa` |
| 同目录`2026-10-25-range1-selection.json` | `afc786aae7114ac0a1bc1932e7da96df73c1ef328dd1db1d57cf6feaca895a9a` |
| `patent-distillery/docs/superpowers/plans/2026-10-25-M06-range1-engineering-plan-v0.2.0.md` | `8178a5b0d1bf962039cee30585d3f7e5d39687b6f7876e3905593343d31534a2` |
| selection绑定的原S目录 | 实际`5da93c52b64daddb5aaefa5ee456910660b48b0b45f6833f30934dbebb4635c9`，与原绑定一致 |

2026-10-26T11:20:23.979912Z再次冻结工程文件；实际执行最终M06筛选为11:18:49.629815Z，同组测试摘要一致，两生产文件始终保持以下字节：

| 文件（业务包相对路径） | 字节 | SHA-256 |
|---|---:|---|
| `src/v340-document.js` | 23860 | `276b6a79152a34f8e022e133b6f0ee3ad80b3ba3d1a49d5c5bf167219c45236f` |
| `src/client/V340GenerationPage.js` | 15808 | `3d87a089226433aae2f40d9816e7d00efa514f5e12234cd651ac377028942e5a` |
| `test/v340-workflow.test.mjs` | 27750 | `67e55b6933a707f28d069019473971a547a7ef8d05cfb20060d22cd45c3a712d` |
| `test/v340-client.test.mjs` | 10360 | `303ad9f37166457332ff1f60d559adc23dcb39b2183e911e24f077f3669da080` |
| `test/v340-results.test.mjs` | 13001 | `f5e6a3cf662c8f93128d98b9d364bfb0c8c8d0dfdd293a718289c2473700e0da` |
| `test/v340-native-candidate.test.mjs` | 20718 | `47441dd4989fdcaad7ff686c06db4c345c02ff6f096a49bd40e9486d47de49ba` |
| `test/v340-result-fixture.mjs` | 3656 | `db51f268109a87dcde623546db501e88bb7023fe951299590828683d88040549` |

首轮保全复核逐读作者开工基线3471项，当时仅2份生产及4份测试/helper变化，其他3465项未变；随后仅追加native-candidate测试及其他断言。源码变更没有新增依赖、公共RPC、持久化分类字段或业务输入，没有修改旧golden、原pin、锁、活跃lib或历史S/C目录。原selection的原case状态仍NOT_EXECUTED、选定状态仍NOT_EXECUTED/DEFERRED，不能把本报告回填提供方冻结目录。

本审计只新增本报告、运行无网络合成测试与临时存储；未改作者源/测试/证据，未启动实际Host/Desktop、读取凭据、发起真实模型/API/上传/费用、提交推送或发布。

## 2. 实现核对与补证过程

`v340-document.js` L162—185按精确ID投影并在新M06装配中调用来源政策；实际装配L222重新准备、校验inputHash，L225解析模型七字段，L226在累计产物形成前拒绝指令/歧义来源和保留warning前缀。用户指令逐字存档使用原`user_text`及`excluded_from_formal_text`，不改准备摘要。不存在关键词分类器或自由正文事实检测器。

L188—194使用本次规范UID及真正继承warnings建立冻结警示；新装配L228、核心修订L202均先拒绝继承精确目标warning_id，发生在通用去重之前。模型占前缀拒绝限新M06输出，旧inspect/read不应用新输出策略。核心修订保留表/来源/历史，新增manifest和当前open警示；新版本仍not-reviewed、not_recommended_for_filing。

`V340GenerationPage.js` L48将限制放在输入/结果共同视图的持续位置，仅按任务nodeId决定，不依赖目录、关键词、当前tab或manual_edit_manifest推断。没有结构删除动作，版本审核与正文删字都不会撤回事实。此处证据是合成SSR/组件与服务验证，不是实际Desktop界面验收。

初审曾发现4类选定目标的证据不足：父子/仅历史编辑的提示、同一edit request幂等、其他UID旧closed警示保全、M06超限后的持久化草稿/旧版本保全。已向作者反馈；作者仅补测试，生产字节未变。当前13项实际M06测试已覆盖这些补证：UI父子选择与历史manifest、重放edit的完整run不变、其他UID resolved/accepted保留且本次open、RPC文稿超限后原approved版本/草稿/生成与publish计数保持。警示1024/1025另有直接装配/修订边界，与共用服务失败保全链分别列证。

尚缺的交付证据不是生产缺陷：截至冻结时未收到作者按原45断言/9组整理的最终返回包（S25-A01）。必须补准确路径、源/夹具/产物hash、实际命令/退出码及独立网络/替身计数与限制后，再判V09及范围1机械出口。

## 3. 实际验证与失败保留

均在实际项目根以zsh/固定`tools/bin/node`执行：

| 证据ID | 实际范围与结果 | 身份及限制 |
|---|---|---|
| I-1 | 独立首次`--test --test-name-pattern='M06 R1'`，workflow/client/results三文件9/9、退出0 | 11:05首轮测试树，不充当最终13项测试树的证据 |
| I-2 | 独立`--test --test-concurrency=1`运行workflow/runtime/results/client/native-candidate/claims-v2/claims-upstream/native-handoff，128/128、退出0 | 首轮C/D旧兼容树；旧schema、完整/values-v1、旧审核、保存/引用及unknown实际回归；后续只加断言，生产未变 |
| I-3 | 独立最终M06筛选4文件，13/13，0失败/0跳过、退出0；11:18:49Z | 最终4份测试hash见上表；另加仅本审计进程的fetch/net.Socket.connect拦截与计数，4个测试进程记录均fetch=0、socketConnect=0；不改产品网络机制 |
| I-4 | 独立纯文稿探针：多冲突ID首次冲突顺序[y,x]、普通重复ID去重、重复分类稳定/原prepared不变；99999兆帕/不存在实验指令不搬入材料且无confirmed_fact，退出0 | 分类fixture SHA `0fcebd8b1c39240f8ee53cfb802f2189d22f6e08f38d41d5f6ef0ec0dabc7838`；参数fixture SHA `4c5a2421c0747ad1c67ccc470425347a21f3c3ff07dbb08fd1f721f58b2b1ec7`；产物`e248733d1573ebc7be5f1c8b3d82ca4f77226831f38b66ec515e88edaf8c4b5a` |
| A-RED | 作者`m06-red.log`及`ui-red.log`保留新政策/持续提示的初始失败 | SHA分别`b55d26a601d65a19c699a205b651e19c2a378640e2b490dc07e2c6f0e54c0e68`、`22656ce77f8da2238cf4de19597849d64816e1139ecca692c965c801cea5421b`；本审计读原日志，未重跑旧实现 |
| A-FULL | 作者先1433/1433；后并发full-suite-final.log出现长稿候选失败；隔离1/1及后续串行1434/1434、1436/1436、1438/1438分别存在 | 不删除或合并并发FAIL。长稿测试配置200ms候选timeout；本审计的串行C/D长稿通过。其失败只表明该次并发运行未通过，不能重签成绿或据串行结果断言根因已完全证明 |
| A-BUILD | 旁置build-private.log构建完成，pack-dry-run有122成员 | 只读核日志/清单，未独立重建；不是当前安装包、部署、签名或发行通过 |
| A-HOST | host-preflight.log为Invalid Mac admission；观察JSON列8条DRIFT/MISSING，runtimeStarted=false | 观察SHA `aad0e17903e17f14d89d67a4c3e0e34c4cf5e29dec66f8d9f061ab56abdfdc6f`；旧dsh-lab路径canonical相同不消除实际文件差异，未改pin放行，F仍未通过 |

I-3命令等价于固定node `--import <本次data:审计网络拦截模块> --test --test-concurrency=1 --test-name-pattern='M06 R1'`加workflow/client/results/native-candidate四文件。拦截模块只在测试进程中计数并拒绝fetch和Socket.connect，退出时打印`AUDIT_NETWORK_COUNTS`；真实网络尝试总计0，不能用候选budget.usedCalls替代此记录。替身调用按结果fixture的generationCalls及native fixture的seen.prepare/seen.stream独立断言，保存及拒绝路径均无新增派发。

I-4首个自编夹具因条目键顺序不符合canonical渲染，预检如实返回manual-edit warning，审计断言退出1；纠正审计夹具的字段顺序后退出0。此为审计夹具纠正，未改产品或放宽准入，不将该失败当作实现缺陷。

## 4. 45个原子断言逐项判定

“有证”指本表列明的代码/实际断言及其复用范围，S05专业语义仍NOT_EVALUATED。W=workflow测试，R=results，U=client，N=native-candidate；行号对应上方冻结测试树。旧回归只在同版公共路径上复用，不推出真实Host或专业接受。

| 原子断言 | 选定要求及实际证据 | 当前selected_part_status |
|---|---|---|
| R1-S01-A01 | W33—59原prepared JSON前后、空串not_provided/空白冻结；prepare主体未改，I-1/I-3 | 有证 |
| R1-S01-A02 | W36—42指令正文/hash/理由/排除标签；实际Host retain仍user_text原来源，I-3 | 有证 |
| R1-S01-A03 | W203—218七字段、八receipts、无持久化投影字段；严格schema未增，I-3 | 有证 |
| R1-S02-A01 | I-4带99999兆帕/不存在实验的指令，prepared/材料正文均未被搬改 | 有证 |
| R1-S02-A02 | I-4无confirmed_fact、无model completion；W203—218结构边界/未评估对照 | 有证 |
| R1-S03-A01 | W43—46三origin伪装、W77—96历史/歧义ID拒绝；政策在真实装配路径使用，I-3 | 有证 |
| R1-S03-A02 | W旧source_fact指令保持、prepared JSON不变；read/inspect不走新模型政策，I-2/I-3 | 有证 |
| R1-S03-A03 | N139新增M06拒绝输出实际failed/INVALID_OUTPUT、result=null及重复请求不再prepare/stream，I-3 | 有证 |
| R1-S04-A01 | W48—50同SHA不同无歧义材料ID仍可引用，I-3 | 有证 |
| R1-S04-A02 | W实际材料定位/hash正例与旧注入定位负例；共用校验L265—269未减，专业警示保留，I-2/I-3 | 有证 |
| R1-S05-A01 | W203—218合法七字段、空updates、无实测依据99秒核心可结构通过，I-3；这是界定保证边界 | 有证 |
| R1-S05-A02 | 同对照的当前Host open限制与model_completion=未评估、ready_with_warnings，I-3 | 有证 |
| R1-S05-A03 | 机械边界成立；本报告明确专业NOT_EVALUATED，未记M06业务质量PASS | 有证，仅限口径 |
| R1-S06-A01 | W62—69三态、结构异常全文保留；prepare结构warning仍在原路径，I-3 | 有证 |
| R1-S06-A02 | W82—96重复、跨角色、材料ID冲突；普通旧条目不重写，I-3 | 有证 |
| R1-S06-A03 | W JSON不变；I-2旧v1–v4/审核及冻结恢复不写盘重签，3471基线旧资源/夹具保全 | 有证 |
| R1-S06-A04 | I-4多个冲突的首次顺序/稳定去重与重复分类，原对象不变；列表不等已核事实 | 有证 |
| R1-S07-A01 | W181—200内容/T4前缀；无/错误前缀拒绝、相同表对象不生修订，I-3 | 有证 |
| R1-S07-A02 | W合法材料+精确替换指令成功；材料来源仍由原hash/定位校验，I-3 | 有证 |
| R1-S07-A03 | W直接指令依据拒绝，内容及T4保留before/after；术语/表正文不宣称同步，I-3 | 有证 |
| R1-S08-A01 | W139—152表/术语/来源/父文稿不变与manifest；R56—78实际服务新版本not-reviewed/not_recommended，I-3 | 有证 |
| R1-S08-A02 | 新版本body持有限制warning；R及I-2实际M06候选编辑/审核/保存共用链，审核不改业务状态 | 有证 |
| R1-S08-A03 | W固定parent/UID/时间/body深比较可重复；父body/hash不改，I-3 | 有证 |
| R1-S09-A01 | W正文删字对照只修核心，未删结构或撤回事实，I-3 | 有证 |
| R1-S09-A02 | W表/来源/历史保全，R草稿和旧版保全；I-2共享重开、I-3持续提示 | 有证 |
| R1-S10-A01 | U11—31无关键词依赖，组件L48持续展示，不新增自然语言删除分类器，I-3 | 有证 |
| R1-S10-A02 | U34—54分别选父/子与仅历史manifest、目录undefined；提示保持、投影不变，组件不据历史manifest判断当前编辑，I-3 | 有证，合成投影 |
| R1-S11-A01 | R10—23审核后原result完整相同，排除标签及open警示仍在；I-2兼容run.reviewStatus保持 | 有证 |
| R1-S11-A02 | R固定草稿含原body、保存SHA与警示不变；U持续当前提示不写record；旧固定正文读取路径未加政策，I-2/I-3 | 有证，旧链复用 |
| R1-S11-A03 | I-2 native-handoff实际区分current-file与固定审核正文、composer保全/不发送；M06固定草稿同链，I-3 | 有证，合成原生接口 |
| R1-S12-A01 | W100—115完整冻结警示字段；工厂分别取上游/父版warnings与规范UID，I-3 | 有证 |
| R1-S12-A02 | W116新模型占前缀拒绝；inspect接受持有该前缀的存档且不追加输出政策，I-3 | 有证 |
| R1-S12-A03 | W117—128四状态，装配UID不在input_history；装配/修订均拒绝且旧JSON不变，I-3 | 有证 |
| R1-S12-A04 | W130—135不同历史UID的resolved/accepted完整保留，本次UID open；W固定装配深相同，I-3 | 有证 |
| R1-S12-A05 | R56—65同edit request重放完整run及2版本保持；U父/子提示、R存储重开，I-3/I-2 | 有证 |
| R1-S13-A01 | W严格八/七字段，无新公共字段；I-2旧prompt/完整及values-v1/旧回执审核真实回归，原锁/资源未变 | 有证，旧路径复用 |
| R1-S13-A02 | W155—178最终1024/1025及1MiB/+1拒绝；R56—78服务超限旧approved/草稿不变、publish/生成不增，I-3 | 有证，直接边界+共用服务保全 |
| R1-S13-A03 | W明确其他节点user_input保留原source_fact；I-2全14相邻链，旧golden保全；新M06警示为具名新增差异 | 有证 |
| R1-S13-A04 | W目录/来源false、U按钮禁用、N默认candidate禁用；I-3真实网络尝试0，fake生成/prepare/stream另计 | 有证 |
| R1-S24-A01 | R26—40发布文件实际SHA=固定正文/manifest主文件及artifactId，I-3 | 有证 |
| R1-S24-A02 | R33/43/51—53错误码/未记writeback/记录不变及文件保留；I-2原无覆盖保存回归 | 有证 |
| R1-S24-A03 | R44—50 publish/consume独立计数、生成不增；同token重放不publish，manifest SHA前后稳定，I-3 | 有证 |
| R1-S25-A01 | 作者最终逐45/9组返回、源/夹具/产物身份、命令/退出码/计数及限制尚未交齐；本报告提供独立核对但不代作者交付 | 待作者返回 |
| R1-S25-A02 | 冻结selection及原S目录hash未变；本报告只审选定部分，不关闭S24/S25整项、C36/37语义或C38删除 | 有证，仅限口径 |
| R1-S25-A03 | 本批无真实Host/模型API/专业用户/发行；full目标矩阵仍未完，范围1不是M06全功能或DS-02已接包 | 有证，仅限口径 |

## 5. 9组出口及后续范围

| 组 | 选定断言数 | 当前机械结论 |
|---|---:|---|
| R1-V01 | 7 | 已有对应证据；技术真实及人工确认未评估 |
| R1-V02 | 9 | 已有对应证据；S05自由核心语义不在机械保证内 |
| R1-V03 | 4 | 已有只读分类证据；不构成历史清洗/有效事实视图 |
| R1-V04 | 7 | 已有受限编辑/持续提示证据；不是同步或删除 |
| R1-V05 | 5 | 已有UID警示冲突/旧状态/重放证据 |
| R1-V06 | 3 | 已有审核/保存/固定草稿及原生替身证据；非真实Host验收 |
| R1-V07 | 4 | 已有严格schema/容量/禁用/网络0及旧兼容复用证据 |
| R1-V08 | 3 | 已有发布后索引失败身份/回执及计数证据；未验change_id事务 |
| R1-V09 | 3 | **待S25-A01最终返回包，暂不可整组PASS** |

仍保留：六载体18 UID许可待核、未决规则定义未解、未制作/装配新业务Skill；完整正文/表行/术语联合同步、结构删除/事实撤回及有效视图未实现。PDF/DOCX U1/D1阻断，E实际API映射、F当前Desktop/正常重启/跨进程、G双来源/质量、H/阶段6与全部原保留范围未因本机械实现关闭。

最终接收条件：作者交齐S25-A01并固定上述工程/测试身份，第三方复核后才可称“指定M06来源隔离、受限编辑提示、既有保存恢复与旧兼容通过”；不能扩展为M06业务质量、真实Host、本地Skill已装配、双来源或全后续计划完成。审计网络计数、首轮/最终树、并发FAIL、准入失败与缺件均须保留。
