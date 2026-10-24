# 阶段5 D0自动编号P2修复与作者复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD保持`68a3264ff917afd1194259e96aa02699329b6d00`。用户明确选择首切片拒绝实际生效的DOCX自动编号，本轮据此修复D0-R1合同/计划遗漏。

## 修复结论与能力边界

D0-R1在合同、D1任务及离线编号资格候选范围已修复。合同新增`v340-docx-numbering-policy-1`，将有效numId非零的数字编号、项目符号、直接编号、样式/basedOn/默认样式/docDefaults继承、重启/覆盖及多级统一拒绝。无法解析实际使用的样式/编号同样拒绝；不删除编号后提交、不展开标签、不补造原文。

手写编号、未使用的编号/样式/重启/多级声明，以及明确numId=0取消继承的有效对照保留。不能简单以numbering.xml或numPr存在就拒绝普通DOCX；未使用链不当作生效状态。拒绝规则及优先级已同步到[目标合同](../business-baseline/v340-material-extraction-contract.md)和[D1接线计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md)，D1集成仍必须验证完整准备前不消费额度、不派发、不留部分正文及旧输入保全。

新增`scripts/check-v340-docx-numbering.py`是**独立、未接入Host的离线资格候选**，只读有界stdin，使用固定Python标准库分析ZIP内明确WordML元数据，只输出body-free的reject/eligible。eligible只代表编号检查通过，不能代替格式/关系/正文完整性、解析部署、硬内存/时限或产品准入。产品src、准备入口、依赖和默认Host没有接入或启用此脚本；它在主包分发白名单外。

因此本轮修复不等于产品已经支持DOCX，也不消除D1的运行时/原包/ABI/完整资源机制阻塞。没有进入D1、启用来源或新UI。

## 正式回归及证据强度

新增正式文件`packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`，固定公开二进制夹具位于`test/fixtures/v340-docx-numbering/`。使用真实DOCX ZIP/OOXML并运行独立检查器的实际结果，不grep合同文字，也不以当前产品本来拒绝所有DOCX冒充本项修复。

| 范围 | 项数 | 正式行为 |
|---|---:|---|
| 拒绝 | 9 | 直接编号、单层样式、三级basedOn、默认段落样式、只给ilvl但继承numId、从3重启、多级、项目符号、实际使用样式循环无法确定 |
| 保留编号资格 | 7 | 无编号部件手写编号、手写加未用声明、未用编号样式、未用重启/多级/项目符号定义、段落0取消样式、叶样式0取消基样式、未用编号样式循环 |
| 限额/异常元数据 | 3 | 超过1MiB原始输入拒绝、损坏ZIP拒绝、UTF-16编码DTD仍拒绝 |

17份二进制文件、manifest内原件hash/长度及手工判定预期冻结；ZIP使用固定条目时间，不需要Codex附带解析库或.local历史目录。正式用例同时核对原字节不变和无正文泄露，拒绝结果不表示已执行正文提取。

首先用旁置旧“仅看正文则合格”行为回放运行原18项：9个该拒绝场景失败、9个对照通过。这是旧遗漏的行为对照，不声称旧产品已经存在该检查器。初步检查器18/18通过；作者审查另发现字节级DTD扫描不能覆盖UTF-16，先补正式1红（19项18绿/1红），再在XML解析器层拒绝doctype，最终19/19通过。

最终还复制同字节正式19项及夹具，只把新检查器的“有效编号→reject”分支旁置改为eligible，真实退出1，8个生效编号场景失败，其它11项通过。该撤回不修改当前实现，证明正式断言不是只保护文档措辞。实际使用链无法解析的独立拒绝仍生效，不为制造更多失败而撤销它。

## 作者复审与保留

单代理在完成候选、正式测试及文档后单独复审：直接属性覆盖样式、叶样式覆盖基样式、0值不可当作缺失、ilvl不替代numId、默认段落样式/docDefaults、使用与未使用图边界、样式循环、重启/多级/链接以及表格段落均核对。额外5组私有探针验证docDefaults生效、直接0取消docDefaults、编号样式链接、缺失basedOn和表格段落；5组全通过，不计正式新增。

检查器对原输入1MiB、ZIP条目256、单条目/XML1MiB、展开声明合计8MiB、压缩比100及样式链128跳设有界拒绝，XML层禁止DTD。它不是完整DOCX/ZIP验证器，不保证全部未读取部件CRC、关系、未知元素/结构、硬内存或总墙钟均已保护；D1仍须完成原合同的全流程限制，不把离线脚本的小范围保护当成产品保护。

未发现本轮合同/资格候选范围遗留P1/P2或新增回归；此为作者复审，没有独立代理/新上下文背书。旧v1/synthetic、完整/values-v1和审核/保存/unknown等随最终全量通过；生产源码及旧正式测试原字节保持。原容量及材料/快照2MiB、Workspace8MiB、文稿1MiB、300000/150000字符规则不变。B台账/资源原文/hash/114历史gap及来源禁用保持。

## 本轮新鲜命令和结果

仓库根以zsh及固定Node24.21.0/Python3.14.8执行。日志根`.local/stage5-d0-numbering-repair-20261024/`，完整摘要见`verification-summary.json`。

| 验证 | 实际结果 | 日志 |
|---|---|---|
| 原18项旧行为对照 | 9通过/9失败，预期exit1 | red.log |
| 初步18项 | 18/18，exit0 | green.log |
| UTF-16 DTD红测 | 18通过/1失败，exit1 | dtd-red.log |
| 最终正式定点 | 19/19，exit0 | green19.log |
| 主包正式全量 | 1377/1377，0失败/跳过/取消，exit0 | full.log |
| 干净最小副本 | 同字节19/19，exit0，未预建.local，无node_modules | clean19.log |
| 只撤去关键拒绝分支 | 11通过/8失败，预期exit1 | mutated19.log |
| 作者补充边界 | 5/5，exit0 | additional-review.log/.json |
| B台账只读CLI | 14节点/28格/114gap，dispatchEnabled及realCallVerified为false，exit0 | mapping-summary.json |

全量命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。干净副本只借用开发固定Python的明确可执行链接，不安装或复用Codex库；这证明开发回归可复现，不是产品解释器分发已经完成。由于发布src/lib/manifest未变，没有重复构建/pack或覆盖活跃lib。

本轮正式新增19，主包总1377；C正式累计仍210，不能把D0编号检查算为新的C或真实业务进度。原审计编号丢失反例和FAIL报告保留，其原始提取观察仍然成立；修复采取拒绝策略，没有把原失败改成“编号已能提取”。

## 文档和环境保全

起点3357个受控/非忽略文件冻结；仅目标合同/D1计划按本次选择修订，并在当前状态、总计划及剩余清单追加索引。两份原文修改前完整字节另保存在本轮证据目录的`.before`文件，匹配起点摘要；其它旧文件、原D0/复审脚本/夹具/日志及旧报告保持。新独立脚本、正式测试/夹具和本报告单列摘要，既有未提交C成果完整保留。

未启动Desktop/实际DSH，未新增真实模型/API、资料外传/上传或费用，未安装升级、读取凭据、改Profile/pin/日常环境、提交推送发布。D1部署及正式材料接线、OCR、API逐节点实际证据、F—H与阶段6继续待办。
