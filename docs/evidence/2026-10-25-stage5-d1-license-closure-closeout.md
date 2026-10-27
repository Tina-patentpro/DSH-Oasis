# 阶段5许可缺件、分发闭包与macOS机制材料批收口及复审

2026-10-25，Asia/Shanghai。执行[六任务计划](../plans/2026-10-25-stage5-d1-license-closure-and-enforcement-plan.md)，消费[前轮全面复审](2026-10-25-stage5-d1-acquisition-reaudit.md)、[原8件清单](../business-baseline/v340-material-extraction-originals.json)和[冻结合同](../business-baseline/v340-material-extraction-contract.md)。dsh-lab兼容链接指向DSH-Oasis，mac/continuity-v2，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`，既有未提交成果保全。

**材料交付COMPLETE_WITH_BLOCKERS。** 两个原始许可引用均已有具体处置，但完整native/vendor/通知与产品分发闭包没有通过。DOCX资源取得确切映射和新增具体阻塞；硬内存NO_GO_CURRENT_EVIDENCE、隔离DESIGN_ONLY_NOT_IMPLEMENTED。PDF/DOCX均未达READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。

## 1. 获取与身份

沿授权只读取公开发布/构建/机制资料，未登录账户、上传用户资料或访问业务API/模型。原8件101858653字节不修改、不重新下载；本批按时间戳冻结原清单2件及补充清单1件，新增**3件28387574字节**：

| 角色/原件 | 字节 | 完整SHA256 |
|---|---:|---|
| zstd1.5.7来源通知：zstd-1.5.7.tar.gz | 2440298 | f24b52470d12f466e9fa4fcc94e6c530625ada51d7b36de7fdc6ed7e6f499c8e |
| stdlib来源/通知：Python-3.14.8.tar.xz | 24130644 | c2215904f02b175596dc49351585104f4bc20341e1c47378b26a2c274360ce73 |
| vendor字节来源：pip-26.2.1-py3-none-any.whl | 1816632 | 71138adf1f4ca900cdb7d289c21b7494329f2332b6d85f0e1c42108c0384ed3e |

三件均与固定发行的[downloads.json](https://github.com/astral-sh/python-build-standalone/blob/5e46737f6480fc315ebfea83866910cbfcc772f0/pythonbuild/downloads.json)所声明长度/SHA一致。来源分别为python/cpython-source-deps的固定zstd标签、python.org固定Python源码及files.pythonhosted.org固定pip wheel；逐跳HTTPS/允许域、实际字节、预算与取得时间独立留证。源码包只作为原始归档保存，未解包为运行树或执行构建/import；pip只是来源比较材料，不批准作为产品能力安装。没有核验密码学attestation。

另读取固定PBS commit的9份必要构建/目标/许可生成资料，Git blob身份及实际SHA对应。初始downloads.json与lxml修复比较首先作为公开发现资料读取；原始归档补件则全部在准确清单冻结后取得，不把发现资料时间冒充原件获取前可信时间戳。只保留有界metadata/通知/源码资料文本，不把它们放入产品tools/src/lib或Profile。

## 2. 两份原始许可缺件的处置

| 原始缺失引用 | 新证据与判定 | 没有被关闭的部分 |
|---|---|---|
| python/licenses/LICENSE.zlib-ng.txt | 固定[生成函数](https://github.com/astral-sh/python-build-standalone/blob/5e46737f6480fc315ebfea83866910cbfcc772f0/pythonbuild/utils.py)按库名z遍历全部下载项，既匹配zlib也匹配zlib-ng；固定macOS目标未选择zlib-ng，实际原生头依赖/usr/lib/libz.1.dylib。对此目标的多余声明引用分类NOT_APPLICABLE_WITH_EVIDENCE | 只解释此引用，未证明所有内嵌组件或系统库运行/许可闭包；不修改原PYTHON.json或原件，也不凭无动态依赖推断无静态组成 |
| python/licenses/LICENSE.zstd.txt | 固定目标选择zstd1.5.7，_zstd声明libzstd.a；取得发布方固定源码，其根LICENSE为对应BSD通知，1549字节、SHA7055266497633c9025b777c78eb7235af13922117480ed5c674677adc381c9d8。通知材料补件分类EVIDENCED | 原发行归档该路径仍缺失，补件不是原包原有内容；二进制→实际构建/版本对应及最终通知纳入接受仍OPEN |

原归档16引用/14可读/2缺失事实保留；本批补充处置不改写前轮缺件记录，也不单独关闭G2/L-P。私有runtime-license-gap-disposition.json和公开候选清单保留对应证据/边界。

## 3. runtime native/vendor与候选分发映射

新增[完整候选清单JSON](../business-baseline/v340-extraction-distribution-candidate.json)，状态**MATERIAL_CANDIDATE_NOT_APPROVED**。保守映射当前运行时1698个成员及4个解析wheel的363个成员，共2061项；不实际裁剪、不生成运行树。每项有原件/成员身份、来源对应、通知引用、候选纳入/未决和剩余原因，字节/来源证据与最终许可范围分别标记。1518项有对应证据、543项仍缺来源对应或明确通知条件；不是1518项已获分发批准，所有最终通知范围接受仍未完成。

- 110扩展组与12个静态库逐项绑定实际归档路径/hash和固定下载声明。声明来源为bzip2 1.0.8、OpenSSL3.5.9（crypto/ssl两库）、expat2.8.5、libffi3.4.8、xz5.8.4、mpdecimal4.0.0、SQLite3.53.1.0、Tcl/Tk9.0.4的stub、libuuid1.0.3和zstd1.5.7。这是固定源清单/构建选择与实际库字节关系，未宣称可重复构建或二进制来源attestation通过。
- 固定生成元数据里的system标记不能一律当作目标OS提供。_tkinter的实际@rpath指向原件内libtcl9.0.dylib/libtcl9tk9.0.dylib；已分别标BUNDLED_NOT_OS。其它系统位置依赖保留目标实际加载待证，不读取日常Python树来填。
- 原pip wheel已核CRC/RECORD；469个运行时pip成员与原wheel字节相同，10个安装/strip/生成或非对应成员仍需解释。原件内vendor.txt列18组件，18项通知位置均找到并逐namespace关联；上游原始来源/补丁对应及复合通知最终接受仍OPEN，未import不豁免随包分发的内容。
- 696个运行时Lib成员与新CPython源码相同，22个其它Lib成员保持差异/生成/原生来源待审。CPython复合通知及mimalloc/pyzstd等内嵌许可有源材料；不能只凭主LICENSE关闭所有stdlib/native组成。full/stripped1673同/16异/0无对应关系保持。

候选JSON没有最终adapter/guard或运行树SHA，不当作实际产品files白名单；原8件清单与新增3件身份分列。精确残缺项可由members的sourceCorrespondenceStatus/noticeScopeStatus和remaining读取，不能只看整体计数或EVIDENCED标签。

## 4. DOCX资源、native与实体路径

9个Schematron资源逐一验证wheel/source字节一致并保留各自SHA、来源和通知。结果是6项有内嵌权限文字，2项在上游同版LICENSES.txt被明确列为unlicensed（RNG2Schtrn.xsl、XSD2Schtrn.xsl），readme.txt的独立许可范围仍未明确；后3项均为MISSING/UNDECIDED，未默认用主BSD覆盖。不把源码包中的GPL测试运行器文本等同整wheel许可，也不在本批删除资源“解决”许可。

另登记python-docx的23项模板/包数据、typing_extensions通知及7个原生扩展。wheel携带头文件声明libxml2 2.14.6、libxslt1.1.43、libexslt0.8.24，仅是header声明；实际二进制组成、固定native构建来源与最终通知仍OPEN。cp314/arm64分类仍STATIC_ABI_MATERIAL_MATCHED_NOT_LOADED，旧cp312失败不覆盖。

固定上游[lxml6.1.3源码](https://github.com/lxml/lxml/blob/3c1a4c7f2d5a3c19efe01adfd3c33ac3c8fe52c1/src/lxml/parser.pxi)与所取得6.1.1 wheel内parser.pxi比较，只见该修复在禁止外部实体的分支增加parameter-entity回调禁用，6.1.1源码缺少此语句。因此默认internal选项不足以声称该路径影响已排除；新材料构成源码层面的具体控制缺口，不是已执行漏洞测试或证明当前wheel二进制可利用。DTD/实体须在解析前拒绝，OS外部资源限制仍要证明；不自动升级6.1.1。本批PyPI网页获取返回challenge，虽HTTP200也未当发行正文；采用固定上游源码/既有官方发行说明，不绕过挑战或重试。

## 5. macOS硬内存与隔离判定

| 子关口 | 取得材料/明确结果 | 仍缺 |
|---|---|---|
| 硬内存256MiB | SDK mach/task.h声明task_set_phys_footprint_limit，头文件/行片段/SHA已保存；不再只停留在建议性查询讨论。仍NO_GO_CURRENT_EVIDENCE | 精确目标的公开userspace支持/权限、单位/常驻或映射口径、启动/native与后代/聚合语义，以及U1强制/回收证据；未调用API |
| 核心源码/资料边界 | 当前观察kernel xnu-13432.1.9~1，具名公开ref查询404；Apple该函数Markdown此次不可读 | 不将“此ref没取到”写成源码绝不存在，不用main替代当前OS证明，不拿SDK声明等同机制通过 |
| XPC访问隔离 | [Apple资料](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)支持按服务分离权限，推荐作为有条件的材料路线 | 具名承载bundle/签名所有者/版本/发布方式、调用者认证与最小权限未定；npm插件不是自动具备XPC app bundle，未修改DSH.app/Host |
| helper继承 | 与XPC分路线列出；需兼容的签名sandbox父进程及静态权限 | 从未sandbox的宽Host直接spawn不算隔离；未选为已通过实现 |
| 外部程序/后代与监护 | adapter前置拒绝JBIG2等，独立单调5000/15000ms、块前置stdout2097152/stderr16384和所属资源回收的证明输入已列 | App Sandbox不是no-exec或硬内存；OS进程控制、parent/worker/监护异常及实际close均未实证 |

访问隔离保持DESIGN_ONLY_NOT_IMPLEMENTED，承载bundle决定OPEN。保护/环境在导入前、计量在PdfReader/bootstrap前；对象/XRef/允许过滤器链/实际重复解码及缓存保有内存各自覆盖，完整profile确认后才prepared。无机制构建/签名/试跑、压力/拒绝访问/杀进程试验；未引入VM、换平台/解释器或放宽容量。

## 6. 逐格式交接与复审

| 关口 | PDF | DOCX |
|---|---|---|
| G1 | 工程候选已明确，最低OS/兼容、签名承载/封装/更新回退接受OPEN | 同运行时边界，不从PDF继承格式通过 |
| G2/L-P | 两许可引用有处置、2061成员候选与声明来源推进；native/vendor/最终分发通知闭包OPEN | 共享运行时未闭合条件继续生效 |
| G3/L-D/ABI-D | 不依赖lxml，不受其资源许可单独阻塞 | ABI只静态匹配；native来源、两unlicensed资源/readme、包数据通知与实体控制OPEN |
| G4/M-P/M-D | 硬内存NO_GO、隔离/进程控制/监护未证明 | 同样未证明，不能互相补认 |
| G5/G6 | 全profile可检测性/前置机制、最终产品文件/adapter/guard及真实命令/指纹未就绪 | 另保留DOCX全部OPC/关系/编号资格与实体前置责任 |
| 出口 | BLOCKED，非READY_FOR_OFFLINE_PROOF；U1未执行、D1未接线 | BLOCKED，非READY_FOR_OFFLINE_PROOF；U1未执行、D1未接线 |

本批Task 1—6按允许的缺件/NO_GO出口交付；下一项为上表具体残缺材料与产品封装决定。对应材料可审后另明确执行U1 Host外实证，实际通过且获D1指令后才正式有界读取、原/文本hash/UTF-16、确认/新编码/旧v1和values-v1、历史未重核警示、共同编辑再审保存及相邻节点实际准入。旧unknown不重派，来源全部禁用；C01—C20/P/D/X/I01—I09和D后续/E—H/阶段6待办保持。

按计划单代理完成作者复审；不声称新的独立代理背书。复审重点已核两引用声明/实际差异、所有候选成员及未import分发、9资源/7native、默认实体路径、XPC/helper与硬内存分离及各格式关口，没有把OPEN项写成通过。完整原件/文档/旧证据保全、映射引用和最终新鲜命令结果在本批私有verification-summary.json记录；文档/材料检查不新增正式业务回归。原始数据及历史FAIL/unknown/审核/保存hash保全。

保全核对另发现`docs/plans/2026-10-25-dsh-oasis-master-plan.md`在本轮起始基线后发生范围外修改，来源未归因。仅记录基线/当前SHA于私有concurrent-changes.json并保留，未读取内容或覆写，不将该文件计入本批7份前缀修改，也不宣称所有其它文件均不变；最终核验限定为该确切外部hash及本批限定变更。

最终材料核验`tools/bin/python3 -I -B .local/stage5-d1-license-closure-20261025/verify.py`退出0：10255条内部字节/字段/引用/保全断言、3629处真实归档成员通知引用、22个本地链接通过，4处官方网页引用有对应具名来源；不是新增正式业务回归。3452个基线文件中3444个不变，本批7份前缀的旧后缀逐字节保持，另1项上述范围外修改单独保留；320份此前私有证据及8原件不变，仅新增候选JSON/本收口及本批私有证据。合同/生产源码/正式测试/锁/台账漂移0，`git diff --check`退出0，HEAD/分支不变。

执行裁定：沿既有非main分支及忽略材料目录保全未提交成果；按已定单代理方法采用作者复审；只读材料用字节/来源核验，不编造产品TDD或安装运行结果；发现阶段公开源码资料与原包获取前冻结清单分别留证。初次静态库映射因crypto同时匹配OpenSSL1.1/3.5而停止，改按固定macOS目标needs选择3.5；初稿候选通知引用过宽，已保留初稿并改为组件范围引用和独立noticeScopeStatus，未以广泛通知集合冒充许可关闭。

本批不安装物化/实际裁剪/构建/import候选，不接Host、启动Desktop、调用真实模型/业务API、修改Profile/pin/活跃lib或提交推送。新原件只在`.local/stage5-d1-license-closure-20261025/originals/`，只读检查/收据/材料和ledger在同目录；发布者源码仅作资料，不执行其中任何脚本。
