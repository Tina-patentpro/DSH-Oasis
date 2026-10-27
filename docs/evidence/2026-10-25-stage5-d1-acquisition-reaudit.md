# 阶段5原包获取与macOS机制材料批全面复审

2026-10-25，Asia/Shanghai。按用户本轮指令全面复审[原件获取收口](2026-10-25-stage5-d1-acquisition-closeout.md)、[准确原件清单](../business-baseline/v340-material-extraction-originals.json)、[部署记录](../business-baseline/v340-material-extraction-deployment.md)、[逐格式关口](2026-10-25-stage5-d1-unblocking-checklist.md)、[获取计划](../plans/2026-10-25-stage5-d1-acquisition-and-macos-gates-plan.md)、[冻结合同](../business-baseline/v340-material-extraction-contract.md)与[D1计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md)。逻辑dsh-lab链接实际DSH-Oasis，mac/continuity-v2，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。

**指定材料范围内未确认新增P1/P2或待修Minor。** 原批交付保持COMPLETE_WITH_BLOCKERS；G1部署接受及许可/机制缺项未关闭，两格式均未达到READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。本轮结论来自重新读取原件及当前官方资料，不沿用上一轮独立复审作为新鲜证据。默认单代理执行，未派发新的子代理。

## 1. 原件身份与来源

重新逐块计算8份原件的实际长度/SHA256，对照公开清单、初始7件冻结清单、1件补充清单和取得收据，均一致；总计**101858653字节**。准确URL、完整摘要及角色沿公开JSON，不重写既有清单或原件。初始清单含frozenAt；补充清单没有独立frozenAt字段，本轮按保全的文件mtime与取得收据时间核对先后，不将该本地时序核对称作签名/可信时间戳证明。

| 原件 | 字节 | 本轮重新核对 |
|---|---:|---|
| pypdf-6.10.0-py3-none-any.whl | 334459 | PyPI固定版本当前元数据、实际SHA、CRC/RECORD |
| python_docx-1.2.0-py3-none-any.whl | 252987 | 同上 |
| lxml-6.1.1-cp314-cp314-macosx_10_15_universal2.whl | 8577146 | 同上及7个原生扩展头 |
| typing_extensions-4.16.0-py3-none-any.whl | 45571 | 同上 |
| cpython-3.14.8+20261003-aarch64-apple-darwin-install_only_stripped.tar.gz | 26663219 | 固定release当前asset、发布摘要、独立SHA256SUMS及归档字节 |
| cpython-3.14.8+20261003-aarch64-apple-darwin-pgo+lto-full.tar.zst | 61659605 | 同上；角色为构建/许可材料，不混作已部署运行树 |
| SHA256SUMS | 128236 | 自身asset长度/SHA及两份运行时的行记录 |
| lxml-6.1.1.tar.gz | 4197430 | PyPI固定版本元数据、补充清单及只读许可材料 |

本轮重新获取5份公开发布元数据（4个PyPI固定版本及1个GitHub固定release），文件URL/长度/SHA均仍匹配，PyPI所选文件均未标yanked。[Astral发行页](https://github.com/astral-sh/python-build-standalone/releases/tag/20261003)的immutable与commit `5e46737f6480fc315ebfea83866910cbfcc772f0`吻合；这是Astral发布的CPython构建工程候选，未冒称python.org安装包。没有核验asset的密码学attestation，也不将页面commit的Verified徽记当作原件签名通过。

四个wheel重新完成全部成员CRC、RECORD唯一性/长度/SHA和完整成员集合对照，共363个文件（60/124/174/5）。三份tar逐流复核1698/3841/506条目；实际成员长度/hash、链接声明及103份归档metadata/通知摘录与原记录一致。全部检查在独立获取/归档预算内，只在内存读取字节及原生头，没有提取或创建可执行运行树。此前13份公开资料收据的长度/SHA也保持一致。

## 2. G1、许可与DOCX静态ABI

| 复审项 | 本轮核对结论 | 仍未完成 |
|---|---|---|
| G1用户目标 | PDF先行、macOS arm64、独立固定Python3.14.8保持；DOCX独立解阻 | 目标确认不代表完整部署接受 |
| G1工程候选 | 来源固定Astral20261003；版本布局、-I/-S/-B隔离启动接口和随产品更新/确认失效边界已列 | 实际files白名单、guard/adapter、签名封装、升级/回退接受没有完成；接口不可运行，目录不存在 |
| OS范围 | 本机只读sw_vers为27.0.1/build26A434，与候选验证组合一致；arm64原生头最低11.0声明另列 | 产品最低OS、低版本/其它build/未来OS兼容没有验收，二进制声明不等于产品支持承诺 |
| runtime身份 | 两份实际解释器头均含arm64；stripped可执行SHA为3104082b75b7a6dc6ae6db236fe64e850ca909139e84d1cd9f699bd6fa5132ff | 未运行解释器；不复用旧开发可执行/安装树身份或将full等同stripped |
| runtime闭包 | 从原件PYTHON.json重新推导110扩展组、16个许可引用和12个静态库路径；12库实际存在；14许可引用可读 | zlib-ng/zstd两个声明许可引用实际缺失；实际组件/版本/来源、pip/vendor、最终逐文件纳入/排除和通知闭包未完成 |
| DOCX ABI | 重新核对cp314-cp314 tag、Requires-Python、7个扩展各自arm64/x86_64切片和arm64最低11.0；runtime SOABI=cpython-314-darwin、Py_GIL_DISABLED=0、Py_DEBUG=0 | STATIC_ABI_MATERIAL_MATCHED_NOT_LOADED；未安装/导入/动态链接验证，原cp312 ImportError及旧证据保留 |
| DOCX许可/资源 | lxml同版源码5份许可材料及原始字节可追溯；未用功能随分发仍须计入闭包 | wheel内实际libxml2/libxslt静态版本/构建来源、Schematron资源与最终通知映射仍OPEN；源码可得不证明wheel构建来源或分发接受 |

确切缺失引用是`python/licenses/LICENSE.zlib-ng.txt`与`python/licenses/LICENSE.zstd.txt`。这是发行材料引用缺口，不能据此断言所有引用分支实际链接，也不能用其它同名通知自行替代。stripped/full普通文件映射重新计算为1673同SHA、16不同、0无对应；未将strip变化或路径对应当作同字节树/完整来源证明。其它vendor/native闭包尚未完成，不因没有第三个已定位缺件就宣称其余全部闭合。

上游[lxml6.1.3发行说明](https://pypi.org/project/lxml/6.1.3/)确实描述默认外部参数实体解析修复。本批6.1.1的具体影响分析仍未完成；合同/计划的DTD/实体/外部关系前置拒绝及OS隔离责任保持，不能仅凭默认parser选项宣称安全，不能自动升级原pin或运行候选来补认。

## 3. 硬内存NO_GO与隔离方案

本轮重新读取Apple的[建议性可用内存接口](https://developer.apple.com/documentation/os/os_proc_available_memory)、[App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)及[嵌入helper说明](https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app)公开材料，另对照[继承规则](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)。网页工具不能读取Apple Markdown内容时，使用有界只读HTTP保存原始资料及收据；不执行文档中的构建/签名/安装示例。

- **硬内存仍NO_GO_CURRENT_EVIDENCE。** os_proc_available_memory是建议性查询，文档列native macOS不可用；没有给出设置本合同256MiB额度的接口。本批没有选定并证明覆盖启动、Python/native/映射与后代范围的原生macOS强制机制。该结论是当前路线/证据缺口，不是声称macOS在任何封装下都绝不可能实现。
- **隔离仍DESIGN_ONLY_NOT_IMPLEMENTED。** 独立最小权限sandboxed XPC/helper、字节管道、固定环境/FD/cwd/依赖白名单是候选；不可从未sandbox的宽权限Host启动child后就当已隔离。helper继承与XPC独立权限的具体实现须分路线核验，不把两者自动等同；App Sandbox不自动提供硬内存上限、禁止exec或完整产品文件白名单。
- **监护与收流仍仅方案。** 独立单调时钟5000/15000ms、stdout2097152/stderr16384字节的块前置限额、所属进程终止及真正退出回收尚未实证。无helper构建/签名、内存压力、拒绝访问、子进程或终止试验。
- **PDF控制点没有后移。** 从新wheel原始filters.py及generic/_data_structures.py重新确认jbig2dec/subprocess及decoded_self缓存分支。保护须在导入和PdfReader/bootstrap前生效，允许过滤器链各步/对象流/XRef与实际重复解码要计量；缓存命中不算新解码，保有内存仍计入。JBIG2解码/版本探测在任何执行前拒绝；无extras不代表无外部程序。完整profile可检测性与实际控制仍为G5/U1/D1待证明。

## 4. U0/U1/D1、合同和计划一致性

已交叉核对7份既有更新文档的新前缀、获取收口和原件清单。顶层当前记录明确覆盖下方历史“原包暂无/目标未选”状态；历史原字节未被覆盖，没有将旧业务测试数量当本轮部署证据。

| 层 | 可确认范围 | 当前关口 |
|---|---|---|
| U0及本批 | 决定/来源/原件/静态材料、明确缺口与机制方案 | 文档材料交付COMPLETE_WITH_BLOCKERS，G1—G6/逐格式材料接受没有全面关闭 |
| U1 | 需明确获准后，在固定目标Host外物化、实际加载及强制资源/隔离证明 | 尚未获本轮执行许可、未执行；两格式未达READY_FOR_OFFLINE_PROOF；不编造可直接执行命令或指纹 |
| D1 | 对应格式U1通过且获接线指令后，正式有界读取、全profile、证据/兼容及共同保存后相邻准入 | PDF/DOCX均BLOCKED；不从静态ABI或原件下载直接接Host |

C01—C20及P/D/X/I01—I09责任保持：单原件1MiB、原件/正文各2MiB、300000 UTF-16且单正文UTF-8≤1MiB；PDF100页/10000对象、8MiB单流/16MiB实际累计，DOCX256条目/1MiB单entry/8MiB总展开/比100；定位4096、单证据65536/全部131072字节；5000/15000ms、256MiB、2MiB stdout/16KiB stderr；文稿1MiB/快照2MiB/Workspace8MiB及固定引用150000均未提高。300000码元最多900000 UTF-8字节的等值不可达限制仍要求独立计量证明，未用其它条件先拒绝冒充边界通过。

原/文本hash含义、UTF-16全文定位、raw/正文相同与否的确认失效、Host证据归属、新materialEncoding/原生v3/文稿v2显式分支、旧v1/values-v1原字节与hash、unknown不重派、历史原件未重核警示、编辑再审保存和真实磁盘文稿向相邻节点实际准入，均仍留D1正式实现/回归。没有把本轮材料核验写成这些业务链已通过。14节点/28来源格/136输入/114历史gap及来源禁用保持，E—H/阶段6等其余待办没有关闭。

## 5. 新鲜核验与保全

私有证据目录：`.local/stage5-d1-acquisition-reaudit-20261025/`。`review.py`以现有tools Python的标准库重新读取原件，不import所取得的库或执行其代码；`fresh-material-results.json`记录身份、成员、ABI、许可和机制事实，原始官方元数据/资料及收据单独保存。本轮只读取公开发布资料，没有再下载原件、登录账户、上传用户材料或调用业务API/模型。

逐条目材料核验通过（33929条内部断言，是成员/预算/字节检查，不是新增业务回归或产品进度）。核验期间材料检查器误读补充清单的不存在frozenAt字段，首次退出1；改按保全的mtime核对并完整重跑退出0，没有修改或补写旧清单。保全检查器首次只数112项来源gap而遗漏2项顶层gap，退出1；对照原台账及正式读取口径后改为112+2=114，原台账未修改。两项均为本轮私有核验器的已纠正假设错误，不是原批P2；最终完整重跑与退出码见私有结果。此前误归的4份临时源码副本逐一与归档原hash核对，确认已删除且原件未变；既有纠正记录仍保留。

最终保全核验要求本轮3450个既有受控文件及278份既有私有证据原字节全部不变，仅新增本报告与本轮私有证据；7份原批前缀仍严格等于`.prefix + .before`。原生产源码、正式测试/夹具、合同、锁/pin、Profile、活跃lib未修改；`git diff --check`通过，分支/HEAD不变。原批已记录的总计划范围外变化以本轮起始实际字节作为保全基线，不重置、不重新归因。

没有新增或重跑67项编号、1425项主包、92组私有业务测试，也未构建、pack、安装物化、加载解析器、运行helper/限制器、接入Host、启动Desktop、提交或推送。最终文件/证据保全结果见同目录`preservation-results.json`。

后续仍先补运行时两份声明通知与实际组件/版本/最终分发映射、DOCX native/resource闭包，以及具名可证明的macOS硬内存/隔离方案；材料可审后再明确执行对应U1，实际通过后再获D1接线指令。无机制则继续NO_GO/BLOCKED，不自动换平台/解释器、引入VM或放宽合同。
