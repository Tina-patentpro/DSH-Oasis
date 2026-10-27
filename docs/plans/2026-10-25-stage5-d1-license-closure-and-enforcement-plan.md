## 2026-10-25 本计划材料任务已执行：带精确缺件/NO_GO收口

Task 1—6按本计划允许的材料/缺件出口推进并交付[收口/作者复审](../evidence/2026-10-25-stage5-d1-license-closure-closeout.md)、[候选2061成员JSON](../business-baseline/v340-extraction-distribution-candidate.json)。原8件保持，新增3件28387574字节来源原件与固定发布摘要一致；两原始许可引用已分别解释/补件，但未改写原归档或关闭整个L-P。

110扩展/12静态库声明来源、18vendor通知与9资源已映射；native/vendor/最终分发通知、DOCX2个上游unlicensed转换XSL/readme、实体前置和G1签名承载bundle接受仍OPEN。硬内存NO_GO_CURRENT_EVIDENCE、隔离DESIGN_ONLY_NOT_IMPLEMENTED。PDF/DOCX未达READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。

本轮仅材料/公开原件获取，没有安装物化/实际裁剪/构建/import/运行限制器/接Host/Desktop/真实模型业务API或提交推送。下方是执行前原计划，含“当前不存在/未执行”等历史状态，完整原字节保留；拟候选清单本轮已创建但不是最终分发文件集。

---

# 阶段5下一批：许可缺件、分发闭包与macOS强制机制解阻计划

> **For agentic workers:** 后续明确执行本计划时使用superpowers:executing-plans逐任务推进，完成前使用verification-before-completion；沿项目单代理方法。本次只制定/自审计划，没有开始补件获取、安装物化、构建/导入、机制试跑或Host接线。

**Goal:** 在已取得8份原件基础上，澄清运行时两份声明许可缺件、native/vendor与DOCX资源分发映射，并将macOS硬内存/隔离路线变为可审的具名材料或明确NO_GO；逐格式交付剩余缺口，不冒充U1通过。

**Architecture:** 复用固定原件及有界只读检查，不重建原包、不展开运行树；将原件来源、声明构建、实际分发候选和运行实证分层。补件先冻结准确清单，候选分发映射覆盖每个文件/链接/内嵌组件；硬内存、访问隔离、进程控制与监护分别判定，材料完成后再形成U1交接条件。

**Tech Stack:** PDF先行、macOS arm64、独立固定Python3.14.8；Astral20261003工程候选；pypdf6.10.0、python-docx1.2.0/lxml6.1.1/typing_extensions4.16.0原件不变，DOCX独立解阻。仅现有工具/标准库进行材料读验，候选代码不执行。

**Spec:** [本轮全面复审](../evidence/2026-10-25-stage5-d1-acquisition-reaudit.md)、[8份原件清单](../business-baseline/v340-material-extraction-originals.json)、[冻结合同](../business-baseline/v340-material-extraction-contract.md)、[部署记录](../business-baseline/v340-material-extraction-deployment.md)、[逐格式清单](../evidence/2026-10-25-stage5-d1-unblocking-checklist.md)、[D1接口计划](2026-10-23-stage5-d1-material-extraction-plan.md)。2026-10-25，Asia/Shanghai；dsh-lab链接DSH-Oasis，mac/continuity-v2，HEAD035fe82，既有未提交内容保留。

## 当前状态与本批边界

8原件101858653字节已取得且全面复审；4个wheel CRC/RECORD、3个归档及来源记录在指定范围一致，无确认新增P1/P2。原包不再是全面“暂无”；cp314/arm64仅静态ABI匹配未加载；G1工程候选已明确但部署接受未闭合。硬内存NO_GO_CURRENT_EVIDENCE，隔离DESIGN_ONLY_NOT_IMPLEMENTED。PDF/DOCX均未达READY_FOR_OFFLINE_PROOF，U1未执行，D1均BLOCKED。

本轮不联网获取或重跑原件检查。本计划后续获明确执行时，材料范围建议为：已固定8原件的必要只读核对、发布者固定release/commit及其实际引用的准确组件/许可/构建资料、Apple对应目标的公开API/SDK/权限资料。若需新补件，先记录确切版本/文件/来源/预期长度与发布摘要，再隔离取得；发布方未提供摘要时如实列缺，不把自算SHA当作独立认证。只允许公开资料/必要原件，不登录账户或上传用户资料；若执行指令限定离线，则仅消费明确本地材料，缺件保持OPEN。

后续补件读取预算沿既有保守上限单独冻结：新增原件单项≤96MiB/本批合计≤128MiB，公开元数据合计≤16MiB、65536字节分块、单请求30秒、无自动重试；已有8原件只读复用不重复获取。wheel≤512条目/单项64MiB/总展开128MiB；tar≤20000条目/单项512MiB/实际解压2GiB；metadata/通知单项8MiB/合计32MiB，Zstd窗口log≤27。超出即交具体缺件，不自动加额；必要改变先定范围。发布入口及每次重定向均核HTTPS/官方允许域，固定revision只取必要文件，不广泛clone/递归下载。新清单含frozenAt，明确与旧7+1清单分开，补件不覆盖原件或旧记录。

不安装/物化/裁剪实际运行树、不调用包管理器/安装钩子、不构建/签名/import/执行候选或helper，不进行压力/网络文件拒绝/终止进程试验，不接Host/Desktop、不调用真实模型/业务API。版本/平台/解释器/合同、VM或其它执行封装变化单独决策；不在本批暗换。无提交推送/发布、Profile/pin/活跃lib或生产源码/正式测试修改。

## 文件与交接对象

| 位置 | 后续执行责任 |
|---|---|
| `docs/business-baseline/v340-material-extraction-deployment.md` | 追加许可引用处置、构建/native/vendor证据、DOCX资源和机制决定；旧文保全 |
| `docs/business-baseline/v340-extraction-distribution-candidate.json`（拟新增，当前不存在） | 原件→成员/内嵌组件→候选纳入/排除→来源/通知映射；必须标MATERIAL_CANDIDATE_NOT_APPROVED，不冒充已分发或运行树 |
| `docs/evidence/2026-10-25-stage5-d1-unblocking-checklist.md` | 更新G1—G6、L-P/L-D、M-P/M-D逐格式缺项；C/P/D/X/I责任不减 |
| `docs/plans/2026-10-23-stage5-d1-material-extraction-plan.md` | 只追加真实交接条件；guard/adapter/机制未齐前不填可直接执行命令或最终运行指纹 |
| `docs/evidence/YYYY-MM-DD-stage5-d1-license-closure-closeout.md`（执行日生成） | 实际材料/取得摘要、关闭/未关闭项、范围/复审及下一接收方 |
| `.local/stage5-d1-license-closure-YYYYMMDD/`（执行时独立创建） | 冻结补件清单、原始字节/收据、只读预算、逐文件哈希、判定及保全证据；不进Git或产品包 |

共同材料记录沿已有rawSHA字段意义，至少含`component/version/artifactFilename/artifactSHA256/memberPath/memberSHA256/sourceURL/sourceRevision/noticeRefs/inclusion/status/evidenceRefs`。未取得或无法确认的值为明确缺项；不造SHA/版本/URL。`inclusion`为CANDIDATE_INCLUDE/CANDIDATE_EXCLUDE/UNDECIDED；证据状态为EVIDENCED/MISSING/NOT_APPLICABLE_WITH_EVIDENCE。候选排除不是实际删除，NOT_APPLICABLE必须有绑定本发行的依据。

## Task 1：逐项处置两份运行时许可引用缺件

**Consumes:** 固定full/stripped原件、PYTHON.json及runtime-closure-map；产出`runtime-license-gap-disposition.json`私有记录与部署摘要，供Task 2使用。

| 缺件 | 已知引用/构建线索 | 必须澄清 |
|---|---|---|
| `python/licenses/LICENSE.zlib-ng.txt` | `_sqlite3/_tkinter/binascii/zlib`声明引用，相关链接有system `z`；不能将全部认作实际zlib-ng链接 | 固定发行的构建条件、实际组件/版本/来源、为何引用缺失，以及每项是否随拟分发运行时存在 |
| `python/licenses/LICENSE.zstd.txt` | `_zstd`声明引用并列`build/lib/libzstd.a`，库路径已存在 | 具体zstd版本/构建来源、对应原通知、原件缺失原因及最终通知要求 |

- [ ] 绑定本release/commit、引用扩展、构建分支、静态/动态/系统库路径和实际原件成员；分别标声明、实际字节和未知，不能仅凭PYTHON.json解决链接事实。
- [ ] 从发行方固定源码/构建清单和被引用组件的正式来源核对；需要原始许可补件时先冻结准确文件/版本/取得边界，再只读取得并记录bytes/SHA。未核对前不猜zlib-ng/zstd版本或抓取latest许可。
- [ ] 每项给出：匹配实际组件的通知补齐；或绑定本发行的未使用/误引用解释；或仍MISSING。保存原缺件事实和补件身份，不修改归档、不把补件伪装成原包原来就有；通用同名LICENSE不足以关闭。
- [ ] 核验两个缺件都有独立处置及证据；没有发行对应关系/实际组件证明就保持L-P OPEN，不以已找到文本替代完整闭包。

**Exit:** 两条处置可审或精确缺件交付；无论哪种都不授权安装/分发。Task 1完成不单独关闭G2/L-P。

## Task 2：运行时native/vendor来源与候选分发闭包

**Consumes:** Task 1记录、8原件及完整成员表；产出上述候选JSON与`runtime-component-provenance.json`私有证据，供Task 3/5合并。

- [ ] 以stripped为运行候选、full为构建材料，逐路径保留1673同/16异/0无对应关系及各自SHA；目录、符号/硬链接、native二进制、stdlib数据/编码、内嵌静态库与系统库分别登记。声明路径与实际Mach-O load command/原件成员对照，不能将“system=true”或otool未列静态库当作无需来源/依赖核对。
- [ ] 逐项绑定110扩展组和12静态库的实际来源版本/构建记录/通知及拟分发归属；特别核清Tcl/Tk等声明系统依赖能否来自目标OS，不能假定目标机自带，也不能只审核PDF所import的模块就忽略随包分发模块。无法追溯列具体组件/原因。
- [ ] 从实际原件的`pip-26.2.1.dist-info/METADATA`和`pip/_vendor/vendor.txt`等有界读取版本线索，逐项映射vendor/native/通知。pip版本仅是原件成员记录，不批准把pip作为产品依赖；未import仍随包分发的内容计入闭包。
- [ ] 对每个拟纳入成员给出原件定位/摘要、来源revision、所属组件、通知/例外与依据；对候选排除列精确成员和功能/加载影响及需U1证明项。不实际裁剪或重打包，不用“整目录不用”绕过内嵌组件核对。
- [ ] 核验无未映射候选纳入文件、悬空链接、缺失notice引用或来源/版本未知项；如存在，完整列出而非宣布闭包通过。原包SHA、成员SHA、候选树与未来实际运行树/adapter/policy身份始终分开。

**Exit:** 有逐文件/内嵌组件的候选BOM和残缺表；全部相关材料有据才可关闭相应L-P材料项，产品分发/实际加载接受仍留后续。

## Task 3：DOCX native来源、9项资源与通知映射

**Consumes:** 同版lxml wheel/source、python-docx/typing_extensions原件与Task 2接口；产出`docx-resource-map.json`、native/许可残缺表及候选JSON的DOCX分支。

- [ ] 对7个cp314/arm64扩展逐一关联实际libxml2/libxslt等静态组成、版本、固定构建来源/通知；Mach-O架构或同版源码存在不替代wheel构建对应关系，实际加载仍未执行。
- [ ] 将`lxml/isoschematron/resources/`的9成员逐文件对照wheel/source bytes/SHA及许可例外：`rng/iso-schematron.rng`；`xsl/XSD2Schtrn.xsl`、`xsl/RNG2Schtrn.xsl`；`xsl/iso-schematron-xslt1/`下`iso_abstract_expand.xsl`、`iso_dsdl_include.xsl`、`iso_schematron_skeleton_for_xslt1.xsl`、`iso_svrl_for_xslt1.xsl`、`iso_schematron_message.xsl`、`readme.txt`。差异/来源不明逐项留OPEN。
- [ ] 对照已取得5份lxml源许可材料，分离主BSD、独立资源/例外、third-party native通知与最终纳入/排除；python-docx模板/包数据和typing_extensions复合通知也纳入完整实际文件集。不能因本业务不用Schematron或source目录有GPL文本就跳过逐文件映射/作整包许可结论。
- [ ] 就6.1.3外部参数实体修复核对固定6.1.1的源码/上游影响材料，记录适用/未知和DTD/实体前置拒绝/OS边界责任；不执行解析器、不据默认选项宣称影响已排除、不自动更版。
- [ ] 核验恰好9项资源均有归属/状态/通知引用，7扩展有对应native来源或明确缺项；旧cp312失败、静态ABI分类和未知项保留，不将材料映射写成导入成功。

**Exit:** L-D/ABI-D材料单独判定；PDF闭包不覆盖DOCX，资源许可与真实加载分别留证。

## Task 4：macOS硬内存与隔离分路线材料判定

**Consumes:** 固定OS/解释器目标、Task 2/3实际组件边界和Apple公开API/SDK/签名封装资料；产出`macos-enforcement-route.json`和U1证明设计，不构建/运行helper。

| 子关口 | 材料阶段必须明确 | 本批出口/后续U1证明 |
|---|---|---|
| 硬内存268435456 | 具名组件/API及确切SDK/最低OS/权限/entitlement、虚拟/常驻/映射口径、页粒度、启动/导入/native/后代范围及超限行为；直接资料定位 | 无可验证强制机制则NO_GO_CURRENT_EVIDENCE；不是RSS采样、RLIMIT声明、建议性查询或sandbox。即使资料可审也未执行；U1才压力/边界与外部回收实证 |
| XPC访问隔离 | 独立服务的封装/签名/入口认证、最小权限，固定运行时/必要系统资源、字节IPC与环境/FD/cwd白名单；不授用户文件/网络/bookmark或Profile权限 | 与helper继承路线分列，不继承宽Host能力；需U1实际拒绝读取、网络/外部资源和继承FD试验 |
| helper访问隔离 | 若仍候选，明确sandbox宿主/独立bundle与继承关系、谁启动、签名/entitlements和固定依赖许可 | 不能从未sandbox的Host直接spawn就当限制已生效；未解决封装则保留DESIGN_ONLY，不与XPC混称已选实现 |
| 外部程序/后代 | adapter在JBIG2解码/版本探测前拒绝，另具名OS进程限制及所属范围/逃逸/取消回收机制 | App Sandbox不等于no-exec；禁止分支、后代与监护故障由U1分别证明，不扩大为杀任意进程 |
| 期限与有界收流 | 独立单调时钟5000/15000ms、块前置stdout2097152/stderr16384字节、终止/等待实际close、异常/迟到输出不发布部分结果 | 仅冻结证明方案，无分配压力、拒绝访问、启动或终止试验；D1再接业务事务 |
| parser前置顺序 | OS/环境保护→受限导入→PdfReader/bootstrap前有界解码→对象/XRef/允许过滤器链/重复解码及缓存计量→全profile确认 | G5可检测性仍需证明；不能在reader已无界展开后补检查，无extras不保证无PIL/crypto/外部程序 |

- [ ] 对硬内存、访问隔离、外部进程和监护各填具名证据、已知限制、未决项及U1输入/预期拒绝点/实际回收标准，不用一个PASS覆盖其它栏。
- [ ] 形成一个推荐且有据的候选路线，或准确NO_GO。原生目标若无满足合同的路线，交付具体差距/封装与兼容影响；不自动引入VM、换Python/平台或提高上限。
- [ ] U1设计覆盖启动/导入/native分配/映射/后代、取消/总期限不重置、FD/网络/外部路径、输出洪泛、监护/worker异常和实际退出回收；先证明限制器与完整控制点可用，再允许不可信解析。页粒度与不可达等值边界如实记录，不伪装逐字节RSS精度。

**Exit:** 有可审材料的候选路线或具体NO_GO；本批最高MATERIALS_REVIEWABLE，DESIGN_ONLY不代表U1已可执行。G4不齐则两格式均BLOCKED。

## Task 5：G1余项及逐格式U1交接

**Consumes:** Task 1—4全部结果；产出G1—G6/L-P/L-D/M-P/M-D表及执行日收口，更新状态入口。

- [ ] 对G1产品最低OS/兼容接受、签名/封装/更新/回退责任给明确决定依据或OPEN，区分验证组合27.0.1/build26A434与原生头最低11.0。布局/启动接口保留候选，guard/adapter不存在就不填可运行命令。
- [ ] PDF单列G1/G2/L-P/G4/G5/G6；DOCX另列G3/L-D/ABI-D及自身资源/机制要求。缺件、实际来源不明、未选具名强制机制或安全解析控制不完整均保持BLOCKED。
- [ ] 只有相关材料/方案均可审才可能READY_FOR_OFFLINE_PROOF，仍须后续明确执行U1；届时在批准的隔离范围补实际guard/adapter/文件白名单与准确命令，先通过机制再进行候选加载。不能要求本次不准构建时预填尚不存在的真实脚本或把接口当启动命令。
- [ ] 原件、许可/来源、ABI静态材料、硬资源证明、完整业务提取分别出证。对应U1实际通过且获得D1接线指令后，才实施有界身份读取、双hash/UTF-16/确认/新编码与旧兼容、共同编辑再审保存和相邻节点实际准入。保留历史原件未重新核验警示与零业务调用责任。

**Exit:** COMPLETE_WITH_BLOCKERS或逐格式材料可审交付；不是READY_FOR_D1或阶段5完成。下一接收方与剩余确切材料逐项列出。

## Task 6：保全核验与计划/材料复审

- [ ] 对照执行前基线核对既有原件/8件清单/合同/台账/源码/正式测试/锁/pin及历史FAIL/unknown/审核/保存hash；补件只追加新清单与收据，不重签旧证据。新原件身份与既有原件分列。
- [ ] 每份补件核实际长度/SHA/发布者来源，逐文件映射无悬空引用；9资源与两缺件覆盖完整，native/vendor未知未被吞掉，机制各关口状态一致；本地链接和`git diff --check`通过。只运行一次受影响材料检查，不借此扩大自动审计工具链或重跑无关业务回归。
- [ ] 自审并写执行日复审结论：不将源码许可当wheel来源、标签当加载、系统声明当目标可用、Sandbox当硬内存/no-exec、材料完成当U1/D1通过。发现范围内材料误述定点更正并保留旧记录；实际接线/运行仍不得开始。

**验证方法：** 仅现有工具的有界字节/归档元数据/通知/原生头读取与文档交叉核对；准确命令在实际材料/核验文件存在后写入执行记录。结束运行`git diff --check`（预期退出0）；不编造尚不存在测试命令，不构建/安装/试跑原包。

## 固定合同与Review Focus

沿C01—C20/P/D/X/I01—I09：单原件1048576、原件/正文分别2097152；正文UTF-16≤300000且UTF-8≤1048576；PDF100页/10000对象、单流8388608/实际累计16777216；DOCX256条目、单entry/XML1048576/总8388608/比100；定位4096、单JSON65536/总131072；worker5000/总15000ms、内存268435456、stdout2097152/stderr16384；文稿1048576/快照2097152/Workspace8388608及固定引用150000不变。300000码元最多900000 UTF-8字节，无法构造同时合法的单正文UTF-8上限等值，保留独立计量器证明责任。获取/归档预算另行冻结，不套作业务限额。

旧v1、完整/values-v1快照、原生候选v1/v2/synthetic、旧草稿/审核/保存hash原样保留；不重读旧路径解析、不迁移重签、不重派unknown。materialEncoding extracted-text-v1、原生候选v3和文稿v2仍是D1待实现显式分支，材料计划不提前塞入旧schema。14节点/28来源格/136输入/114历史gap和enabled/dispatchEnabled/realCallVerified=false保持；原件hash、正文hash与权限不互代。

Review Focus五项与对应核对：Task 1核两个缺件及声明/实际链接差异；Task 2核未import但随包分发的native/vendor/链接和每文件通知；Task 3核9资源/7扩展及6.1.1实体影响未决；Task 4核独立权限/继承、启动前控制与硬内存/no-exec不可互代；Task 5—6核逐格式U0/U1/D1与原hash/旧兼容/容量/来源禁用不跳步。

本计划已按最新复审逐任务自审；当前仅规划、未执行Task 1—6。既有共同流程/A、B、C、D0/编号67与已完成材料范围保持；D后续OCR/新增导出、E实际API证据、F宿主/正常重启/跨进程、G真实双来源质量、H/阶段6/发行及长稿引用芯片、外部writer/全部legacy异步穷尽仍待各自范围。没有以补件计划关闭任何真实验收格。
