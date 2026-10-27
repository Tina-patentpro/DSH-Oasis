## 2026-10-25 本批已交付：DSH跨平台产品边界明确，U1仍阻塞

用户本轮明确“明确产品应该基于DSH，与操作系统无关”。当前产品依据是DSH专业插件及公共能力合同；不再要求为产品选择最低macOS或另建独立.app/XPC。此前macOS arm64/Python3.14.8、签名XPC及11原件仅保留为历史验证/供应材料候选，不是跨平台产品的唯一运行时、已批准分发集或必须先选的产品封装。旧事实/原文不改写。

[本批收口与作者复审](../evidence/2026-10-25-stage5-d1-product-gates-closeout.md)及[当前逐格式判定](../business-baseline/v340-extraction-product-gates.json)记录：固定DSH0.2.0-rc.2的scope/sandbox/PTC公共定义已只读核对；scope是路由所有权、sandbox定义文件效果，PTC是抽象执行接口，均不足以证明已挂载provider、硬内存/网络/进程及逐流预算满足原合同。产品方向已确认，实际DSH能力/分发接受仍OPEN，不因跨平台定位自动开放解析。

543项MISSING已逐成员分类；补证283个精确Include安装路径，其中282与固定CPython源码字节一致、pyconfig.h无该精确来源路径仍待构建证据；原候选1518/543及2058拟纳入/3未决不重写，最终通知/分发仍未接受。DOCX95源码成员静态分析无直接isoschematron导入，但该模块自身导入会读取两未许可XSL，不能只删两文件推定兼容；23模板/包数据hash及7native/9资源/实体缺口保留，无裁剪/加载/升级。

材料计划Task1—5按精确决定/缺件出口完成，交付COMPLETE_WITH_BLOCKERS。正式材料54/54与无.local干净副本54/54新鲜通过，无新增正式测试或产品改码；12处许可副本、27成员映射、原容量、旧v1/values-v1、原件历史、台账与来源禁用不变。

PDF/DOCX仍BLOCKED、未达READY_FOR_OFFLINE_PROOF，U1未执行、D1未接线。下一步先补固定DSH具体provider/公共资源限制/解析依赖及分发更新责任，再按格式给出材料准入；明确U1范围后先冻结真实执行组件/指纹/命令，实证通过且获D1指令才接线。旧macOS硬内存NO_GO只描述该历史候选，不外推为所有DSH平台无能力。

本批只读既有11原件和固定依赖/必要官方材料，没有新原始包、安装物化/构建/执行候选代码/接Host/Desktop/真实模型业务API、生产源码/测试/合同/锁/pin/Profile改动或提交推送。下方为执行前计划/历史正文，全部原字节保留；其中最低macOS/独立.app作为产品前置及“本批未执行”等旧描述由本节替代。

---

# 阶段5后续：产品承载、分发闭包与机制解阻计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans逐任务执行，结论前使用verification-before-completion。按项目规则单代理；以下任务均未执行。本次只核查完成情况、更新清单和制定计划，不启动下一批。

**Goal:** 在LC-R1/LC-R2修复及全面复审完成后，交付G1/G4关键决策包、共享运行时与DOCX独立闭包残缺表、逐格式U1材料准入判定，避免重复补查已关闭的通知/扩展头问题。

**Architecture:** 沿用11份原件、2061成员候选和现有合同，先识别产品承载与强制机制的决定性缺口，再分别收束分发及格式材料；原件、候选、批准分发集、未来实际运行树分层。缺少证据即交付明确OPEN/NO_GO和所需材料；不以生成更多台账、重复烟测或修改状态字样代替解阻。

**Tech Stack:** PDF先行，macOS arm64，独立固定Python3.14.8；Astral20261003候选、pypdf6.10.0；DOCX继续独立核对python-docx1.2.0/lxml6.1.1/typing_extensions4.16.0。材料读取策略v340-packaging-notice-2，不安装或执行候选包。

**Spec:** [LC-R2最新全面复审](../evidence/2026-10-25-stage5-d1-tar-admission-reaudit.md)、[完成与剩余清单](../evidence/2026-10-23-stage5-progress-and-remaining.md)、[逐格式关口](../evidence/2026-10-25-stage5-d1-unblocking-checklist.md)、[冻结合同](../business-baseline/v340-material-extraction-contract.md)、[部署材料](../business-baseline/v340-material-extraction-deployment.md)、[候选成员表](../business-baseline/v340-extraction-distribution-candidate.json)、[原材料计划及已执行范围](2026-10-25-stage5-d1-license-closure-and-enforcement-plan.md)。2026-10-25，Asia/Shanghai；逻辑dsh-lab对应实际DSH-Oasis，mac/continuity-v2，HEAD035fe82。

## 已完成核查与当前判定

LC-R1许可正文/12位置/27成员映射、LC-R2四类物理tar扩展头准入及全面复审完成。最新材料组54/54（原26＋新28）、干净副本54/54及撤回证据有效，指定范围未确认P1/P2；本轮重新比对8份测试输入和11原件摘要与该次冻结一致，没有重跑54项或旧业务回归。

候选仍MATERIAL_CANDIDATE_NOT_APPROVED：2061成员中2058为CANDIDATE_INCLUDE、3为UNDECIDED；来源状态1518 EVIDENCED/543 MISSING。CANDIDATE_INCLUDE不是批准分发，543也不能直接解释为543份许可正文缺失。完整来源、分发/最终通知及机制仍OPEN；PDF/DOCX均BLOCKED、READY_FOR_OFFLINE_PROOF=false、U1未执行、D1未接线。共同流程/A、B、C、D0等历史完成层保持，不据此补认真实验收。

## Global Constraints

- 不变更已选平台/解释器/版本；不自动引入VM、替代平台或升级lxml。
- 不安装物化、实际裁剪/重打包、构建/签名/import/执行原件或helper，不接Host、不启动Desktop、不新增真实模型/业务API调用。
- 原文稿1048576、输入快照2097152、Workspace8388608字节及C01—C20/P/D/X/I01—I09合同不变；旧v1/values-v1、历史hash/FAIL/unknown保留。
- 保持14节点/28来源格/136输入/114缺口台账、全部来源禁用和11份原件。候选更新按字段留前态/证据，不重写归档或既有报告。
- 本轮不联网或获取新材料。后续明确执行本材料计划时，先复用本地原件及固定资料；必要公开资料只核准确release/commit/引用来源，不访问业务账户或上传资料。新补件仍须先冻结准确清单，沿旧计划单项96MiB/合计128MiB、公开metadata合计16MiB、30秒/无自动重试等边界，不从计划文件产生额外获取授权。
- 只做交付所需材料核对，不新增通用扫描器/诊断器。材料tar物理头数量/大小/累计准入及原实际展开预算沿用已审v2；任意源码不能因位于licenses目录而复制。
- 不读取签名私钥、凭据或日常Profile；不提交、推送或发布。未存在的组件不能写成可运行命令或实际指纹。

## Review Focus

1. macOS内存API声明被误写为268435456字节强制保证：Task 1分列口径/权限/启动与native/后代范围，缺一保持NO_GO。
2. 插件npm包被误当作具名签名XPC承载：Task 1核对真实bundle/owner/启动与更新责任，不创建或签名应用。
3. 候选纳入或字节对应被误当成最终许可闭包：Task 2分类543项、18vendor及native来源，缺件不提升EVIDENCED或接受状态。
4. DOCX两unlicensed资源/readme被静默排除而推定兼容：Task 3仅提候选方案，记录导入/资源/包数据影响及U1待证，不实际删包。
5. 材料完成直接触发U1/D1：Task 4保留共享与逐格式阻塞，Task 5复核未执行字段、旧证据和明确接收条件。

## 文件与交接

后续执行只在原职责文件追加：部署记录保存决定/材料，候选JSON保存有据映射，逐格式清单保存G1—G6状态，D1计划保存接口与待证责任。执行日新增`docs/evidence/YYYY-MM-DD-stage5-d1-product-gates-closeout.md`；私有证据放独立`.local/stage5-d1-product-gates-执行批次/`，保存原件/规则输入身份、前后态、取得收据、差异、判定及保全核验，不进产品/Git。

每项缺口至少含`gate/format/component/artifactSHA256/memberPath/sourceRevision/evidenceRefs/status/missingEvidence/nextOwner/U1ProofNeeded`；已有字段复用，未知不得编造。Task 1—3产生具名判定供Task 4，Task 5只汇总有据结论。

## Task 1：优先交付G1/G4产品承载与强制机制决策包

**Consumes:** 已确认目标、固定SDK/官方材料和现有机制记录。**Produces:** G1决定/待决定表、硬内存NO_GO或可审候选、隔离/进程/监护分路线表；供Task 4判定共享阻塞。

- [ ] 分清已定目标与未定项：产品最低OS、具名承载bundle、签名责任/Team ID、启动所有者、解释器与XPC相对布局、安装/更新/回退责任。验证OS27.0.1/build26A434不自动成为产品最低OS，声明原生最低11.0不替代产品兼容接受。
- [ ] 对`task_set_phys_footprint_limit`等候选逐项绑定准确资料位置、权限/entitlement、口径/页粒度、启动/导入/native分配/后代范围和超限行为。SDK只有声明或无法证明目标权限时保持NO_GO_CURRENT_EVIDENCE，不能写成已满足合同。
- [ ] 分开独立sandboxed XPC与helper继承路线：入口认证、环境/FD/cwd、文件/网络/外部程序能力、取消和实际回收责任。XPC仍为候选，缺承载/签名不将DESIGN_ONLY_NOT_IMPLEMENTED升级为已实现；App Sandbox不等于禁止exec或硬内存。
- [ ] 交付需产品负责人明确的决定及技术证据缺项。若固定目标无可审硬内存路线，给出差距/影响，保留BLOCKED；任何改平台、版本、封装架构或容量的方案另列决定，不自动执行。

**Exit:** 每个共享关键门均有具名依据或精确OPEN/NO_GO及下一责任方；本批不做压力/拒绝访问/启动终止实验。NO_GO不妨碍已有范围内独立材料整理，但不再以重复小样本试跑追求PASS。

## Task 2：收束共享运行时与PDF拟分发闭包

**Consumes:** 固定11原件、2061成员及v2通知组、前批构建映射。**Produces:** 逐组件来源/通知/纳入决策残缺表，供Task 4的G2/L-P判定。

- [ ] 将543项MISSING按native实际构建来源、生成/strip差异、vendor upstream/patch、许可范围/通知及其它缺口分类；给每项具体所缺材料，不能用总数替代处理，也不把已有1518字节对应当实际构建或许可接受。
- [ ] 对110扩展组、12静态库、system依赖、stdlib/pip及18vendor核对实际分发归属和固定来源/版本/通知；未import但拟随包交付的内容仍计入。pip保留或排除只形成候选与加载影响，不安装、不裁剪或重打包。
- [ ] 保持zlib-ng误引用的固定目标依据和zstd通知补件身份，保留原归档16引用/14可读/2缺件的历史事实；LC-R1/LC-R2及packaging12位置/27成员关系不重复登记为待修。
- [ ] 给出拟保留/排除/未决成员的完整通知和悬空链接/功能影响表；最终通知范围与分发接受由具名责任方处理。无证据的项保持缺件，不修改原件/旧hash或先把CANDIDATE_INCLUDE变成已批准。

**Exit:** G2/L-P能逐项解释剩余缺口或有据关闭相应材料项；完整分发/实际加载未验就仍OPEN，原件取得成功不算解阻成功。

## Task 3：DOCX独立处理3项未决资源、native与实体责任

**Consumes:** 7个cp314/arm64扩展静态材料、9资源及同版源码、Task 2共享闭包。**Produces:** DOCX资源/ABI/实体的明确待办与候选处置，供Task 4的G3/L-D/ABI-D判定。

- [ ] 优先逐项处理`XSD2Schtrn.xsl`、`RNG2Schtrn.xsl`（上游明确unlicensed）和`iso-schematron-xslt1/readme.txt`（范围未明），对应候选中3项UNDECIDED。材料不足继续未决；可提出取得权利依据或候选排除路线，但不能认定不使用即无需处理。
- [ ] 保留其余6资源的逐文件许可证据，检查python-docx模板/包数据与typing_extensions复合通知；若提排除，读固定源码说明包导入/资源装配影响及U1验证要求，不实际删除或执行代码。
- [ ] 对7扩展补齐libxml2/libxslt等实际wheel构建来源/通知，保留STATIC_ABI_MATERIAL_MATCHED_NOT_LOADED及旧cp312失败，不以架构/tag/同版源码替代实际加载。
- [ ] 固定lxml6.1.1的外部参数实体修复差异及DTD/实体在任何解析前拒绝、OS隔离和U1证明责任；未解决不自动升级到6.1.3或宣称默认选项已排除风险。

**Exit:** DOCX缺口独立可审或继续BLOCKED，不以PDF通过覆盖，也不把DOCX私有资源缺项加成PDF额外前置。

## Task 4：冻结G5/G6证明责任及逐格式U1准入

**Consumes:** Task 1—3判定和现行C/P/D/X/I矩阵。**Produces:** PDF、DOCX各自的准入表及U1证明输入清单，不产生运行命令。

- [ ] PDF逐项保留PdfReader/bootstrap前控制、对象/XRef/多过滤器链、实际重复解码/缓存、可选依赖及JBIG2外部程序前拒绝；DOCX保留OPC关系/编号/实体/ZIP资源控制。规则不可可靠检测时按合同拒绝，不先无界解析后补统计。
- [ ] 将期限5000/15000ms、内存268435456字节、stdout2097152/stderr16384字节、访问/进程限制和真实退出回收分别绑定未来实施组件与U1测量口径；组件未存在则标待实现，不填猜测脚本/命令/实际树hash。
- [ ] G6给准确原件、候选通知/文件/链接、未来runtime/guard/adapter/policy指纹的交接结构；原包hash、候选树和未来实际树分列。材料级设计/接口/白名单要求与U1执行级真实文件/指纹/命令分栏；没有实际分发树时只列证明要求，不伪造交付文件。未来明确U1范围后，须先实现并冻结这些执行级输入，再开始受限加载实证。
- [ ] PDF检查共享G1/G2/L-P/G4及自身G5/G6；DOCX另检查G3/L-D/ABI-D。任何相关材料/决定/方案缺项维持BLOCKED；材料和方案均可审至多READY_FOR_OFFLINE_PROOF，仍需后续明确执行U1。材料就绪不表示真实组件已存在或U1可直接运行；对应U1实际通过且获D1指令后，才开展正式接线。

**Exit:** 各格式有完整缺项/下一接收方或材料可审结论；不存在READY_FOR_D1、来源自动启用或本批开始U1的出口。

## Task 5：交付、限定核验和复审

- [ ] 更新部署/逐格式清单/已完成与剩余/后续计划及执行日收口；保留旧正文、失败、原件、审核保存hash和当前来源禁用。
- [ ] 对候选字段、引用/通知/原件身份、精确来源与链接、共享/格式独立条件进行只读核验。纯文档/材料任务不为凑数量新增测试；只有实际改读取器或材料映射才跑受影响正式材料组和干净副本。原28扩展头回归不被删除或放宽。
- [ ] 单代理复审Task 1—4各自出口，不将缺件收口说成解阻通过；记录实际修改、命令/退出码、未执行项和未来U1所需明确范围。检测到代码P2另保留反例并报告，不借本批建设通用工具链。

**Exit:** COMPLETE_WITH_BLOCKERS或逐格式材料可审交付；阶段5仍进行中。U1/Host/Desktop/真实模型/API、提交发布保持各自范围。

## 更后续工作顺序

| 范围 | 后续实际工作 | 当前边界 |
|---|---|---|
| U1→D1 | 对应目标获准后Host外机制/空环境加载实证；通过后再接正式身份读取、双hash/UTF-16、确认/新编码旧兼容、编辑再审保存和实际相邻准入 | 两格式当前均BLOCKED，不能因LC-R2通过启动 |
| D后续 | OCR/扫描/混合页、图像/复杂结构/压缩包及DOCX/PDF新增导出 | 独立切片；输入支持不等于导出已实现 |
| E | 14节点实际服务坐标、method/path/schema/结果语义及账户项目证据，具备后做禁用适配/假传输 | 资料补证可独立安排，不需等DOCX；实际业务请求不在当前范围 |
| F | 当前精确Desktop/Host/client/Sidebar配对、原生操作/无模型UI、正常重启与跨进程恢复 | 当前禁止启动，不用历史安装验收替代 |
| G、H/阶段6 | 分组真实双来源与专业质量，14×2验收、包资源指纹/安装升级降级回退和发行 | 运行/费用/数据去向等另定；不复用旧调用额度或以材料计数填真实通过格 |
| 稳定性尾项 | 150000字符以上文件引用芯片真实能力、外部writer/磁盘配额跨关闭恢复、legacy异步及历史编码穷尽 | 保留待办，旧兼容测试通过不等于全部窗口穷尽 |

## 本计划自审与本轮交付

已逐项核对范围、固定输入、Task 1—5接口与出口、五项Review Focus、共享/独立关口和旧合同保全；未发现需新增产品设计或放宽限制的条款。本轮只生成本计划和现有状态入口前缀，任务勾选均保持未执行。核查/保全证据保存在`.local/stage5-post-lcr2-plan-20261025/`；54/54是最近具名复审证据，本轮仅重新核验输入身份，不冒称新跑回归。

本轮核验命令`tools/bin/python3 -I -B .local/stage5-post-lcr2-plan-20261025/verify.py`退出0，782项文档/身份/保全断言和15个本地交付链接通过，`git diff --check`退出0。3466个既有受控文件中仅4份文档新增有界前缀、旧后缀逐字节保留；新增本计划，736份既有D1私有材料及11原件保持，无其它文件漂移。源码、测试、合同、锁/pin、台账和来源状态不变，下一批未执行。
