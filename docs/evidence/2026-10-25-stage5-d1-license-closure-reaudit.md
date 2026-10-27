# 阶段5许可缺件、分发闭包与macOS机制材料批全面复审

2026-10-25，Asia/Shanghai。复审[本批收口](2026-10-25-stage5-d1-license-closure-closeout.md)、[2061成员候选](../business-baseline/v340-extraction-distribution-candidate.json)、[部署记录](../business-baseline/v340-material-extraction-deployment.md)、[逐格式清单](2026-10-25-stage5-d1-unblocking-checklist.md)、[执行计划](../plans/2026-10-25-stage5-d1-license-closure-and-enforcement-plan.md)、[D1计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md)和[冻结合同](../business-baseline/v340-material-extraction-contract.md)。逻辑dsh-lab链接实际DSH-Oasis，mac/continuity-v2，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。

**本轮确认1项P2（LC-R1），未确认其它P1/P2。** 2061个成员及其hash存在，不代表逐vendor通知引用已经完整；packaging两份实际许可正文被通知读取筛选和映射遗漏。本轮只复审/保存反例，不修候选、旧脚本、计划、合同或原件。PDF/DOCX继续BLOCKED，U1未执行、D1未接线。

## 1. P2：packaging双许可正文未纳入通知读取与映射

定位：[候选vendor条目](../business-baseline/v340-extraction-distribution-candidate.json)第353—363行，特别是noticeRefs第358—360行；前轮私有inspect-materials.py第53—55行及refine-candidate.py第18—22行。

原件内packaging/LICENSE只是说明应使用LICENSE.APACHE或LICENSE.BSD中的许可。两个正文实际同时存在于原运行时和原pip wheel；运行时还在dist-info/licenses下各有一份同内容副本。但前轮runtime_wanted只允许空后缀、.txt/.md/.rst，排除了合法的.APACHE/.BSD；之后namespace映射从已读取通知选择，packaging的noticeRefs因此只指向说明文件。2061成员表虽然有正文的文件hash，它们自身的noticeRefs也仍回指说明文件，没有形成完整通知关联。

| 正文 | 字节 | 实际SHA256 | 当前问题 |
|---|---:|---|---|
| LICENSE.APACHE | 10174 | 0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594 | 实际存在，前轮未选作通知、vendor条目未引用 |
| LICENSE.BSD | 1344 | b70e7e9b742f1cc6f948b34c16aa39ffece94196364bc88ff0d2180f0028fac5 | 同上 |

两种运行时位置前缀分别为`python/lib/python3.14/site-packages/pip/_vendor/packaging/`与`python/lib/python3.14/site-packages/pip-26.2.1.dist-info/licenses/src/pip/_vendor/packaging/`。本轮从原件重新流式读取四份副本并核对两个正文hash；它们没有从原件丢失，也不是需要重新下载的缺件。

影响：后续若按已交付的18项vendor noticeRefs装配通知，packaging只会带出说明文件而缺少其引用的实际许可正文；“18处通知位置找到”不能替代正文引用完整。整体L-P/分发仍OPEN，故没有造成当前来源开放或部署越门，但这是已承诺的通知映射交付中的可修复遗漏，不应仅归作泛化的“最终接受OPEN”。前轮检查只核引用目标存在，未核说明文件的伴随正文关联，因此10255项通过未覆盖此问题。

修复建议：准确识别并只读保留合法许可伴随文件，绑定说明文件、两正文的原件位置/字节/hash及dist-info副本对应关系，更新packaging vendor和相关成员映射；按内容去重时保留每个来源位置。补上通知引用完整性的材料回归，并保留防止licenses目录里的任意.py源码被误归通知的对照。不要为了读取.APACHE/.BSD取消已有读取/条目预算或重开任意代码文件复制。

反例命令：`tools/bin/python3 -I -B .local/stage5-d1-license-closure-reaudit-20261025/repro-packaging.py`。实际退出1，失败指明当前缺少LICENSE.APACHE/LICENSE.BSD的读取/引用；实际存在性前置断言通过。原始证明在同目录packaging-notice-proof.json，问题未在本轮补修，不把该红色断言重写为通过。

## 2. 其余重点复核

| 范围 | 本轮重新核对 | 结论/边界 |
|---|---|---|
| 原件身份 | 11份原件合计130246227字节逐块重算长度/SHA；5个wheel全CRC/RECORD，所有tar逐流读取并核成员 | 与固定清单/候选一致，未安装执行；未用安装树充原包或声称签名attestation通过 |
| 两许可引用 | 固定9份构建资料的Git blob/SHA；[生成器](https://github.com/astral-sh/python-build-standalone/blob/5e46737f6480fc315ebfea83866910cbfcc772f0/pythonbuild/utils.py)库名z多重匹配及[macOS目标](https://github.com/astral-sh/python-build-standalone/blob/5e46737f6480fc315ebfea83866910cbfcc772f0/cpython-unix/targets.yml)选择，zstd原通知字节 | zlib-ng的NOT_APPLICABLE_WITH_EVIDENCE只限该目标声明引用；zstd源通知补件有效；原归档两缺失仍保留，未关闭整个L-P |
| 2061成员 | 原运行时1698成员+4wheel363成员、每项原件/成员字节与3629处通知目标存在性 | 计数与身份一致；1518 EVIDENCED/543 MISSING不是分发接受；LC-R1说明引用存在性尚不等于通知完整 |
| 来源对应 | 从实际CPython源码和pip wheel重算469/10及696/22的相同/其它成员 | 与原结果一致；差异和native/vendor来源待办没有被清掉 |
| 18vendor | 从原vendor.txt重读含缩进依赖共18版本，逐namespace和通知位置对应 | 18声明正确，上游原始来源/补丁/最终通知接受保持OPEN；packaging伴随正文单独列P2 |
| native | 实际full PYTHON.json的110扩展组及12静态库路径/字节，7个lxml二进制各有arm64/x86_64切片 | 固定来源声明仍不等于二进制可重复构建/加载，Tcl/Tk原件内@rpath不当作OS提供 |
| DOCX资源 | 9个wheel/source逐一同字节；LICENSES.txt明确两转换XSL unlicensed，readme范围不明，另6项内嵌通知保留 | 2项unlicensed/readme继续MISSING/UNDECIDED；未被主BSD或GPL测试脚本混写，未实际裁剪资源 |
| 实体控制 | 当前6.1.1 wheel的parser.pxi与固定6.1.3比较源码 | parameter-entity禁用改动确实未在当前源码；这是静态路径材料，不是漏洞实跑/二进制利用结论；解析前拒绝和OS外部资源约束仍待证 |
| macOS硬内存 | SDK源hash及函数声明、获取失败记录和精确kernel ref404记录 | NO_GO_CURRENT_EVIDENCE合理；声明/建议查询/rlimit不等于256MiB强制范围，无试跑或加额 |
| XPC隔离 | [Apple XPC资料](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)、承载bundle/签名归属、最小权限/调用者/FD与helper继承分层 | DESIGN_ONLY_NOT_IMPLEMENTED；npm插件不自动成为XPC bundle，未改DSH.app；sandbox不替代no-exec、硬内存和真实回收 |

## 3. 阶段门与合同一致性

两格式的U0及补件材料交付可以带阻塞收口；本轮新增P2须修通知读取/映射，不能再把指定材料范围表述为无遗漏。PDF仍有G1最低OS/具名承载/封装接受、G2/L-P完整来源/通知、G4强制机制、G5全profile和G6最终组件/命令缺项；DOCX另有G3/L-D/ABI-D的native来源、资源许可及实体控制。PDF不被DOCX资源缺件单独阻塞，DOCX也不能由PDF背书。

两格式均未达到READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。修复LC-R1仍不自动解除其它材料缺项；只有对应材料可审后才另明确执行U1，实际目标Host外加载/强制/隔离证明通过且获得D1指令后，才正式读取、证据/兼容与共同闭环接线。没有把候选JSON当产品files白名单、可运行guard/adapter或真实运行指纹。

C01—C20/P/D/X/I01—I09及D1-1—3责任保留：原/文本hash、UTF-16全文定位、变化使确认失效、新materialEncoding/原生v3/文稿v2显式分支、旧v1/values-v1和历史hash、unknown不重派、历史原件未重核警示及编辑再审保存后实际相邻准入。原1MiB文稿/2MiB快照/8MiB Workspace及所有格式/解码/定位/期限/输出/256MiB目标上限不变；300000 UTF-16下UTF-8上限等值不可达仍需独立计量证明。台账14节点/28来源格/136输入/114gap及enabled/dispatchEnabled/realCallVerified=false保持，E—H/阶段6等原待办未关闭。

## 4. 新鲜证据、复审方式与保全

本轮单代理重新读取实际原件，未调用旧核验器写回前轮结果、未派发子代理；51864条内部事实/字节/预算/引用断言通过并输出REVIEW_WITH_FINDING，另独立P2反例预期退出1。它们是本轮私有只读核验，不是新增正式业务回归或运行实证。首次私有检查器未计vendor.txt的四行缩进依赖而退出1，读回原文后只修本轮正则并完整重跑，18项原清单未变；此为核验器假设纠正，不另算产品/材料P2。

私有目录`.local/stage5-d1-license-closure-reaudit-20261025/`保存起始基线、重新计算结果、反例和最终保全核验。本轮未改既有受控文件、488份私有证据和11原件，仅新增本报告及本轮私有证据；另发现总计划`docs/plans/2026-10-25-dsh-oasis-master-plan.md`在本轮基线后再次发生范围外修改，未读取内容或覆写/归因，单独记录前后SHA于external-changes.json并保留。不能将该外部变化误计本轮或声称全部其它文件不变。最终保存数量/hash与链接、`git diff --check`结果见preservation-results.json；不改变前轮“无P1/P2”报告原字节，它保留当时作者复审结论。

没有获取新原件、安装物化、实际裁剪、构建、import候选、调用内存API或运行helper/解析器/压力/拒绝访问/终止试验；没有接Host、启动Desktop或新增真实模型/业务API/账户操作、用户上传、提交推送。未重跑67项编号/1425主包/92组私有业务回归，未改生产源码、合同、测试/夹具、锁/pin/Profile/活跃lib。
