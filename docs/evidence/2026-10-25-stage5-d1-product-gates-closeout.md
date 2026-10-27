# 阶段5产品承载、分发闭包与逐格式U1判定收口

2026-10-25，Asia/Shanghai。执行[本批计划](../plans/2026-10-25-stage5-d1-product-gates-plan.md)，绑定逻辑dsh-lab/实际DSH-Oasis，`mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。按用户实时澄清调整G1，单代理完成五项材料/精确缺件交付及作者复审；未安装、接线或实际运行候选。

**本批COMPLETE_WITH_BLOCKERS。产品方向已明确为基于DSH、操作系统无关；具体Host能力、来源/分发和强制机制未因此获准。PDF与DOCX仍BLOCKED，未达READY_FOR_OFFLINE_PROOF，U1未执行，D1未接线。** 当前判定与依据见[结构化材料记录](../business-baseline/v340-extraction-product-gates.json)；既有[分发候选](../business-baseline/v340-extraction-distribution-candidate.json)保持原字节和未批准状态，不替换为实际产品文件集。

## 1. G1决定：产品基于DSH，不要求独立.app或产品最低macOS

用户本轮原话：“明确产品应该基于DSH，与操作系统无关”。据此登记CONFIRMED_DSH_OS_INDEPENDENT：业务输入、材料证据、编辑审核保存和错误/容量合同围绕DSH公共能力，不绑定macOS应用ID或向用户增加平台选择。该决定是产品方向，不等于所有平台实现/验收已通过。

| 项目 | 本批决定/核对 | 保留的接受边界 |
|---|---|---|
| 产品宿主 | DSH专业插件/公共能力；现有peer固定DSH0.2.0-rc.2、Cordis4.0.4保持 | 未启动Host，不认定provider已经挂载或接线 |
| 平台前置 | 不要求用户选择产品最低macOS、签名Team ID或独立.app/XPC来推进产品G1 | 未来实际DSH支持环境仍须相应能力/依赖证明，不宣称无条件跨平台可运行 |
| 旧macOS/Python路线 | 11原件、macOS arm64/Python3.14.8及XPC方案作为历史验证/供应材料候选保留 | 不是唯一或必须的产品执行后端，不安装、弃置原件或暗换pin |
| 更新与回退 | 由DSH/插件实际分发责任和固定公共能力交接，不自动下载解析器 | 具名provider、依赖树/通知、包指纹与更新回退接受仍OPEN |

没有创建新Provider框架或另做桌面产品。旧计划中以最低macOS/独立签名承载作为产品前置的文字保留为历史，由当前入口明确取代；容量/编码业务合同不变。

## 2. 固定DSH公共能力与G4强制机制判定

只读当前依赖中的8份package/API/插件入口文件并记录实际路径、版本、字节和SHA，没有import/执行DSH模块：

| 同版公共入口 | 已有定义 | 不能据此认定 |
|---|---|---|
| `dsh-scope` / `createScope` | Cordis注册归属、事件/作用域路由 | OS或进程隔离 |
| `dsh-sandbox` / `ctx.sandbox.confine` | 文件效果策略及包装后的argv、full/partial状态；网络/进程可见性在该词汇之外 | 指定输入之外的严格读边界、网络/exec/后代约束、硬内存，或具体provider已挂载 |
| `dsh-ptc-runtime` / `ctx.ptcRuntime.resolve/run` | 抽象程序/绑定/目录/timeout/abort/result接口；language/isolation描述不构成安全声明 | native内存/后代总量强制、binding返回逐项字节上限、独立stdout/stderr前置收流；固定定义将Python后端描述为实验性私有路线 |

PTC定义还明确：中断程序后，进行中的宿主binding由调用方收束；logs只作为外层结果整体受限。故不能用`AbortSignal`或结果错误分类替代5000/15000ms全过程、stdout2097152/stderr16384字节、实际退出及回收合同。当前插件入口也没有把这些抽象接口接为材料提取能力。检查范围是固定本地公共定义，不据此否定其它DSH provider或平台可能提供的能力。

**G4出口为NO_QUALIFIED_DSH_ENFORCEMENT_EVIDENCE/DESIGN_ONLY_NOT_IMPLEMENTED。** 下一责任是固定DSH执行provider/发布维护方提供具名版本、公共配置/权限、受控执行世界、硬内存口径/粒度/启动/native/后代范围，以及文件/网络/外部程序/期限/输出/回收证明；绿洲只消费足够的公共能力，缺项保守拒绝，不私接Host store或DOM，不以抽象接口存在冒充已实施。

旧macOS路线补核了Apple官方XPC/helper资料及Apple公开XNU比较源。比较源固定commit `f6217f891ac0bb64f3d375211650a4c1ff8ca1ea`，对应公开导入xnu-12377.1.9，**不是原冻结验证内核xnu-13432.1.9**。其中内存API有权限检查、MB命名参数，并沿用已有active/fatal状态，不能由SDK签名推定任意调用都会形成强制终止。[Apple比较源](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/osfmk/kern/task.c#L7580)

Apple对XPC服务封装与helper继承的资料只补充该平台路线边界，不转成DSH产品前置，也不证明硬内存或无exec。[XPC官方说明](https://developer.apple.com/documentation/xpc)、[helper官方说明](https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app)

公开source/metadata只作材料核对。GitHub tags集合入口被连接器拒绝后改用支持的branch读取并固定commit；Apple内存API正文仍不可得，不自动重试或把取不到解释为机制不存在。XPC/helper Markdown经有界只读获取，字节/SHA留档；没有调用任何内存/隔离API或试跑helper。

## 3. 运行时/PDF闭包：543条件逐项落地，补282来源字节对应

核验既有11原件长度/SHA，保留2061成员、18vendor、110扩展组、12静态库和原1518 EVIDENCED/543 MISSING状态。原候选2058为CANDIDATE_INCLUDE、3为UNDECIDED；拟纳入和字节对应都不是最终分发/通知接受。本批不实际裁剪、重打包或获取新原始包。

543项逐行绑定原件/成员hash、原通知/状态、缺失材料、后续责任角色和U1待证，私有`source-gap-dispositions.json`保存完整对应：

| 本批分类 | 条目 |
|---|---:|
| 运行时归档链接 | 9 |
| 运行时生成/安装代码 | 12 |
| 运行时独立native/build路径 | 5 |
| 运行时头文件/构建输入 | 285 |
| Tcl/Tk组成（含其资源/native范围） | 198 |
| 其它运行时构建资源 | 14 |
| pip变换/生成成员 | 10 |
| DOCX native构建 | 7 |
| DOCX未许可XSL | 2 |
| DOCX readme范围 | 1 |
| 合计 | 543 |

分类互斥，不将5条独立路径说成native依赖总数，也不把543说成543份许可正文缺失。9链接的原件身份/内部目标已有证据，待接受的是最终纳入/链接装配与分发；所有拟分发文件的最终通知范围仍须逐项接受，不只审核MISSING行。

在固定`Python-3.14.8.tar.xz`的不可变hash快照中，按明确Include安装路径核283个头文件，**282份长度/SHA完全一致**；剩余`python/include/python3.14/pyconfig.h`无该精确源路径，仍需生成/配置依据。Makefile安装规则单独绑定，未用相似文件名、mtime、版本高低或`.in`模板替代实际文件。xz/tar读取沿用物理头准入及实际展开预算，选中文本≤1MiB，未展开运行树。

这282份补充证据逐项写入本批记录，补的是源字节对应；没有接受二进制构建/最终通知、重写原候选1518/543或历史hash。native精确构建/strip、vendor upstream+patch、生成代码及最终产品分发闭包仍OPEN。zlib-ng固定目标误引用解释、zstd补件和原归档16引用/14可读/2缺件历史保留；LC-R1/LC-R2、12许可位置/27成员不重新登记为待修。

## 4. DOCX独立缺口：静态导入、资源和包数据已具体化

从原wheel字节只读分析95个python-docx源码成员的AST导入，未发现直接导入`lxml.isoschematron`；它们使用`lxml.etree`及现有XMLParser。另绑定23个模板/包数据成员hash，包括`default.docx`和XML/关系/媒体资源。未执行python-docx/lxml，也没有把静态无直接导入推定为所有动态路径安全。

`lxml/isoschematron/__init__.py`在模块导入时直接解析/编译`XSD2Schtrn.xsl`与`RNG2Schtrn.xsl`。因此候选排除方案不能只删除两文件后宣称该模块继续兼容：须明确模块/包数据整体边界、DSH实际加载及所有间接路径，再由未来U1验证。当前两XSL上游unlicensed、readme范围未明的3项UNDECIDED保持，没有实际排除或接受权限；其它6资源的已有许可材料保留。

7个扩展仍STATIC_ABI_MATERIAL_MATCHED_NOT_LOADED，仅针对原平台候选；不充当跨平台DSH加载验收。native实际wheel构建/静态组成、python-docx/typing_extensions最终通知、lxml6.1.1参数实体控制仍OPEN。现有`resolve_entities=False`及6.1.3源差异不能替代DTD/实体在解析前拒绝和强制执行环境，不自动更版。PDF不因这些DOCX私有缺口增加前置，也不替DOCX关闭它们。

## 5. 逐格式U1准入与下一交接

| 关口 | PDF | DOCX |
|---|---|---|
| G1产品方向 | 已确认DSH/OS无关 | 同左 |
| G1具体DSH能力/分发绑定 | OPEN | OPEN |
| G2/L-P共享运行时来源/最终通知 | OPEN；旧Python供应候选不是必须产品后端 | 同共享缺口 |
| G3/L-D/ABI-D | 不适用DOCX私有项 | 资源/构建/实体/实际加载OPEN |
| G4 | DSH具体强制provider及全部资源边界未证 | 同共享缺口 |
| G5 | bootstrap/对象/XRef/过滤器/重复解码与缓存/JBIG2前置未实证 | 另有OPC/ZIP/编号/DTD/实体前置未实证 |
| G6 | 材料级要求已有；真实provider/runtime/guard/adapter/通知/策略/命令待冻结 | 同左并含DOCX实际依赖 |
| READY_FOR_OFFLINE_PROOF | false | false |
| U1 / D1 | 未执行 / BLOCKED | 未执行 / BLOCKED |

下一步首先取得**固定DSH公共provider的准确包/版本、执行世界、可消费接口、资源及访问/进程/回收保证和分发更新责任**，再补对应解析依赖/通知与格式控制材料。不能由本批新建Host私有执行器或要求用户为产品选独立macOS应用。材料/决定/方案齐备最多材料可审；后续明确U1范围后先实现并冻结执行级组件/指纹/命令，再开始受限Host外加载实证；对应格式通过并获D1指令后才业务接线。

## 6. 验证、复审和保全

新鲜正式材料组：`tools/bin/python3 -I -B -m unittest discover -s scripts/tests -p 'test_v340*.py' -v`，54/54退出0；新建无`.local`干净副本54/54退出0，8份材料输入恢复/保持与仓库逐字节一致。没有新增正式测试或修改读取器；本批新分类、静态导入与282补充对应另作材料/身份断言，不计成新增业务回归。

作者复审另核对五项Review Focus：产品方向与能力实证分列、旧平台材料不当全平台结论、543分类与282补证不提升最终接受、DOCX排除未执行、U1/D1和来源保持关闭。当前材料/判定范围未确认新增P1/P2；无独立代理背书。8份DSH文件只读，真实provider/Host/UI/机制及专业质量没有验收。

本轮起始冻结3467个受控文件、736份既有D1私有材料。仅对7份部署/状态/计划文档增加有界前缀，旧后缀原字节保留；新增本报告和产品关口JSON。原候选、产品src/lib/test、合同、锁/pin、Profile、台账及旧v1/values-v1不改；11原件、旧失败/unknown/审核/保存hash及两次许可修复历史保留。私有目录`.local/stage5-d1-product-gates-20261025/`含用户决定、DSH文件hash/行号、官方资料、分类/补证、导入/资源影响、回归、ledger及最终核验；原始包新增0。

最终命令`tools/bin/python3 -I -B .local/stage5-d1-product-gates-20261025/verify.py`退出0：2770项材料/身份/保全断言、17个本地交付链接通过；3460个既有受控文件未变，7个仅上述前缀，736份旧私有材料及11原件全部保持原字节，无外部文件漂移。`git diff --check`退出0，两个新增文件无空白诊断。断言数量只表示本批核验记录，不是阶段完成比例或新增业务测试。

全程没有安装物化、构建/签名/运行候选包或helper、接Host/启动Desktop、真实模型/业务API、账户/用户数据上传、提交或推送。网络仅必要官方source/metadata，未把它们当运行树。原容量、全部来源禁用和其余D后续/E—H/阶段6/稳定性待办保持。
