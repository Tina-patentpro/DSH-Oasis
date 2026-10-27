# 阶段5运行时决策与解阻材料批收口

2026-10-25，Asia/Shanghai。按[本批计划](../plans/2026-10-25-stage5-d1-prerequisite-materials-plan.md)执行四项材料核对任务，边界沿前轮：不安装物化、不接Host、不启动Desktop或新增真实模型/API调用。

**本批核对/缺件交付COMPLETE_WITH_BLOCKERS；PDF/DOCX均未达到READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。** 与前轮不同，待取证运行时目标现已由用户明确决定，不能继续笼统写作“目标未选定”。

## 1. 直接决定与当前边界

用户对“PDF先行、macOS arm64、独立固定Python3.14.8作为待取证目标，DOCX继续独立解阻”回答：**“采用该目标，DOCX继续独立解阻”**；对现有解释器/解析器原始离线包及来源记录回答：**“暂无”**。

选择只涵盖待取证目标。G1的最低OS、原件分发来源、产品相对路径、启动/隔离和分发更新等仍未完整；没有安装/分发/Host/U1/D1执行许可，也没有从开发构建参数推定产品最低OS。决定和原件可用性记录在私有`runtime-target-decision.json`及`material-input-window.json`，不借缓存或文件名补认原包。

逻辑dsh-lab链接实际DSH-Oasis，git顶层同实际根，mac/continuity-v2、HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`；本轮复用现工作区，仅材料与文档变更，原有未提交成果保留。

## 2. 四任务实得交付

| 任务 | 本轮新增实得 | 未完成的准入条件 |
|---|---|---|
| Task 1 产品决定 | 已冻结用户的格式/平台/架构/独立Python3.14.8待取证目标；补G1余项表 | 完整产品路径/最低OS/启动分发及解释器原件闭包仍缺；G1未关闭 |
| Task 2 PDF/共用原包及许可 | 明确用户原包暂无；建立逐件原件/安装树/构建声明与许可缺项；9项相关stdlib为builtin，配置静态模块/链接声明及指纹留档 | 解释器、pypdf真实原件/来源/完整SHA/实际分发BOM和许可通知仍缺；未宣称许可闭包通过 |
| Task 3 DOCX ABI/native | cp312/universal2与当前cp314目标分开判断；原始ImportError保留；定位9个Schematron资源的逐文件许可/裁剪责任 | 对应运行时的三原包、匹配ABI与native构建/静态组成/许可尚缺；实际加载留U1 |
| Task 4 资源与交接 | 7份本地源码/SDK资料定位，明确多过滤器/缓存/JBIG2外部程序面，监护/收流/实际解码/隔离的限制点与证明责任 | 硬内存/隔离强制组件未选定；无真实部署/边界证明、最终白名单/分发指纹或可运行物化命令 |

详细材料/源行/机制矩阵已追加到[部署核对](../business-baseline/v340-material-extraction-deployment.md)，逐格式状态同步[解阻清单](2026-10-25-stage5-d1-unblocking-checklist.md)。下方旧资料与原计划原字节保留，不重签旧hash。

## 3. 新材料为什么影响后续证明

开发Python的zlib/_bz2/_lzma/_ssl/_hashlib/_elementtree/pyexpat/unicodedata/_ctypes均列为builtin；没有独立.so不能用来排除native闭包。构建配置中static模块、静态libpython、ssl/crypto/expat/zlib等链接声明及mimalloc/JIT信息只是开发侧线索，实际组件版本、来源和通知仍需原包及构建材料证明。lxml的9个Schematron资源随实际包分发时必须纳入许可映射，未导入不能视为未分发。

pypdf6.10.0的filters.py有多项75000000默认限额，Flate只是一条分支；EncodedStreamObject存在decoded_self缓存；JBIG2通过PATH查找jbig2dec并有subprocess.run分支。因此D1须在任何解码前拒绝子集外内容，U1证明每条允许路径/链、对象流、重复解码和实际累计计数及外部访问限制，不能靠不选extras或最终图像拒绝兜底。本轮仅读源码，未import解析器、查找/运行jbig2dec或执行上述分支。

MacOSX27.0 SDK的AS/RSS别名和RSS手册描述不足以证明256MiB严格硬内存；sandbox_init手册明确废弃，不能直接当产品隔离方案。本批没有setrlimit/分配压力/终止进程试验，强制机制继续阻塞。5000/15000毫秒独立监护、有界输出、所有者终止与实际退出/句柄回收的方案仍待U1用获准组件实证。

## 4. 复审与验证口径

本批仅使用固定Python标准库做身份/元数据/AST核对及otool静态声明读取；标准库脚本可加载其正常内部依赖，不把这记为解析器或逐模块部署证明。私有证据根为`.local/stage5-d1-prerequisites-20261025/`：baseline、runtime-target-decision、material-input-window、component-material-register、development-runtime、development-native-components、static-resource-sources、progress及最终核验记录。

本轮不新增正式业务回归，不重跑67项编号/1425项主包/92组私有测试，也不以重复前轮材料核验数量作为进展。正式容量及旧v1/values-v1仍按原合同，完整profile/零调用业务断言/编辑再审保存与相邻实际准入继续留D1。材料批结束不等于这些功能已完成。

新鲜材料/文档核验通过591项断言，包含直接决定/原包可用性记录、7份源码/SDK身份与全部摘录、9项builtin/构建声明、许可及9项资源、370个既有候选文件、16个本地链接、原文后缀和64份前轮私有记录保全。基线3445个文件中3438个原字节不变，本批仅追加6份文档/新增本报告；另1份总计划为已记录并保全的并行更新，未归为本批成果。合同、D1实际接线计划、生产源码/正式测试/锁/pin/台账漂移0；git diff --check通过。591是材料核验，不计正式业务测试。

执行计划技能要求的一次独立只读整体复审已完成，未确认本批P1/P2或Minor，可按COMPLETE_WITH_BLOCKERS交付。复审明确原包/完整BOM/硬内存隔离/ABI缺失、无可运行物化命令及完整profile/业务回归未执行均按计划保留，不把这些条件补认通过；历史目标未选文本由最新用户决定记录覆盖，旧原文继续保全。复审原记录、范围裁定及并行变化分别见私有independent-review.json、progress.md、concurrent-changes.json。

## 5. 退出与下一项所需输入

| 格式 | 当前实际推进 | 进入U1前仍缺 |
|---|---|---|
| PDF | 用户确认待取证目标；原件暂无/具体闭包缺项与资源方案已交付 | 最低OS/产品路径/启动隔离分发余项，Python3.14.8及pypdf6.10.0真实原件/获准来源和完整许可BOM，硬内存/隔离强制组件，profile可检测性及准确白名单/指纹/命令 |
| DOCX | 用户确认继续独立解阻，现cp312与目标cp314差异及许可资源面保留 | 对应目标的python-docx/lxml/typing_extensions原件和严格ABI/native/许可闭包，独立资源/profile/部署材料；不假定上游已有目标二进制包 |

原件暂无且本批不联网获取；下一项需明确原件取得范围/来源和剩余产品决定，以及macOS硬内存/隔离方案。资料可审后还需后续明确执行U1，Host外实际证明通过再申请对应格式D1接线；不改变U0/U1/D1顺序、不自动换解释器/平台或放宽合同。

本轮仅追加6份已有文档和新增本报告，不改D1实际接线计划的文件/命令、生产源码/测试/夹具/合同/锁/pin/台账/Profile/活跃lib。容量、来源禁用、旧v1/values-v1与历史FAIL/unknown/审核/保存hash保持；E—H/阶段6、OCR/新增导出等待办不减。无安装物化/Host/Desktop/网络/真实模型/API/上传/费用/提交推送发布。
