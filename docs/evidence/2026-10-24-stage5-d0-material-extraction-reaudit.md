# 阶段5 D0执行成果全面复审

日期：2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD`68a3264ff917afd1194259e96aa02699329b6d00`。按项目规则单代理复审，没有独立新上下文背书。

## 结论

确认**1项P2合同/计划遗漏：DOCX实际生效的自动编号没有明确保留或拒绝规则**，不能给出“D0合同及D1接线计划没有遗漏”的无条件结论。本轮没有修复合同或实现，原D0交付及FAIL证据保留。

PDF/DOCX部署BLOCKED判断成立；原件/提取文本hash及UTF-16定位实例、容量目标与实际保护的区分、旧v1读取和来源禁用没有确认其它新增P1/P2。D1保持BLOCKED，修复本项合同遗漏也不能消除原运行时/分发件/ABI/资源机制缺口。

## D0-R1 / P2：允许编号声明，却没有处理实际生效的自动编号

位置：`docs/business-baseline/v340-material-extraction-contract.md:12`允许正常模板样式/主题/编号声明；26—32行仅规定按段落/单元格正文及LF形成全文/定位。`docs/plans/2026-10-23-stage5-d1-material-extraction-plan.md:43—47`的正式输入和不支持预检清单没有自动编号、样式继承、重启/覆盖等规则。

候选按`Document.iter_inner_content()`及`Paragraph.text`提取，编号不一定是w:t正文。两种公开合成反例均得到非空、可正常hash的正文，但没有编号：

1. 段落直接numPr引用一个从3开始、decimal、lvlText=%1.的编号定义：原结构表示“3. 一种阀体……”和“4. 根据权利要求3……”，提取只剩两段正文。`numbering-probe.py`的完整编号正文断言失败，真实退出1。
2. 标准`List Number`样式继承numId=5/abstractNumId=7、decimal/%1.：两段正文提取时均没有“1.”/“2.”；相同文字手写编号的DOCX对照完整保留编号。此核对退出0并明确记录automaticNumberingLost=true、controlPass=true。

原件和提取文本hash都可以正确，UTF-16定位也可正确指向已提取正文；这些机械一致性不能补回丢掉的权利要求标识。原文件只保留hash而不进入模型正文，模型无法可靠恢复编号与“根据权利要求3”等引用的对应关系。合同既未显式排除实际编号，也没有展开规则，D1按当前候选和清单接线会留下静默丢失风险。这是冻结合同与计划遗漏，不是已经上线的PDF/DOCX运行故障。

建议修订为一个明确可验证的决定：首切片拒绝实际生效的编号/项目符号，包括样式继承与覆盖；或支持编号展开并定义计数/重启/多级标签、定位与hash规则。不能简单拒绝文件中存在numbering.xml，因为普通未使用编号的模板也可能包含该声明。D1回归至少应包含直接numPr、样式继承、起点/重启覆盖、多级或项目符号、手写编号以及仅含未使用编号声明的对照。

证据目录：`.local/stage5-d0-material-reaudit-20261024/`中的`numbering-probe.py/.log/.json`、`numbered-claims.docx`、原document/numbering XML、`style-numbering-control.py/.json/.log`和`numbered-style.docx`。textutil对直接编号夹具同样只返回正文，进一步说明其扁平输出不能充当编号保全方案；不以该工具作为编号渲染正确性的独立证明，编号含义以已核对的源OOXML定义为准。

## 已核对合同与证据

| 范围 | 新鲜核对 | 判断 |
|---|---|---|
| PDF/DOCX部署 | 原版本/元数据及370组件文件hash；固定Python3.14重新加载明确只读库路径 | PDF两页中英文仍通过，DOCX仍因CPython3.12 lxml ImportError；Codex库不是产品部署，BLOCKED保持 |
| 原件/正文hash | 原6个冻结夹具逐字hash/大小；两个原提取全文/定位与旧JSON全部相同；只改DOCX ZIP注释后原hash变化而提取正文不变 | rawSHA与textSHA分工成立；同正文不能沿用旧原件确认的要求保留 |
| UTF-16定位 | 原PDF/DOCX区间逐项比较；新增“甲😀乙”、空段落、组合附加符、Tab及LF | emoji占2码元，首段[0,4)、空段[5,5)，所有片段用UTF-16字节切片可原样还原；组合符未被NFC折叠。该核对是定位数学/候选证据，不是新schema已部署 |
| 容量目标/保护 | 重跑pypdf单Flate流8MiB−1/等于/+1；审阅所有新数值和限定语 | 两个界内值完整通过，+1抛LimitReachedError。页数/对象/聚合解压/ZIP/硬内存/墙钟仍只是目标与阻塞，不外推为已保护 |
| 旧v1兼容 | 当前parseStoredWorkbenchRecord读取冻结prepared/completed | 两份同值、零写回；生产及正式测试源码原字节保持，没有把本轮局部读者核对说成全部未来v2/v3兼容已实现 |
| 当前准备入口 | 真实临时目录：txt读取通过，PDF/DOCX各自仍V340_PREPARATION_FAILED | D0没有偷偷开放非文本材料入口或生成来源 |
| B台账/来源 | CLI及当前catalog逐节点核对，原文件hash保全 | 14节点/28格/114历史gap；catalog和台账dispatch均false、两来源均disabled |
| 内部新版本计划 | 对照新materialEncoding、候选v3、文稿v2的相互约束、旧序列化分支、冻结值重建、继承证据信任边界 | 仍是待实现合同，未冒充新格式代码已存在；旧包读取新编码明确未保证 |

## D1门槛及本轮未升级为缺陷的事项

运行时封装、原始离线分发件/依赖闭包及许可、DOCX ABI都是独立于接线任务的真实前置，未见可据现有材料放行的依据。资源/预检一栏同时描述“当前没有产品实现”和“需要机制/边界证据”；后续应把前置的隔离机制可行性证据与D1实装/完成验收分别列清楚，避免执行误读。

但现文允许先补解阻材料，未明确禁止隔离机制探针，因此本轮没有证明其必然形成无法执行的循环，不将这项表述疑义再计一项P2。产品仍须在启用前完成全部实际保护；本复审不删除、放松这些要求或授权提前接线。

其它保留边界：候选树hash只绑定本机已见文件，不替代获准原包和实际运行完整闭包；新schema/完整硬限额未实现本来就在BLOCKED清单；复杂PDF布局/扫描、DOCX非正文/修订、OCR和专业语义质量没有被小夹具外推为通过。这些是已明确的后续工作，本轮不当作新的产品缺陷或悄悄划掉。

## 命令、结果与保全

均在本仓库以zsh执行，不启动Desktop/DSH。以下8/10/7都是私有本轮复核，不计正式新增，不把它们累计到原1358或C正式210。

| 核对 | 实际结果 | 日志/结果 |
|---|---|---|
| 同字节原8项脚本在新旁置目录重跑 | exit0，8/8 | replay8.log、replay/candidate-smoke.json |
| 冻结原夹具只读/Unicode/原件变化/解压探针 | exit0，10/10 | read-only-probes.log、probe-summary.json、utf16-proof.json |
| 直接编号保全反例 | exit1，完整编号正文断言失败 | numbering-probe.log/.json |
| 样式编号及手写编号对照 | exit0，自动编号丢失及手写保留均确认 | style-numbering-control.log/.json |
| 固定3.14加载对照 | exit0，PDF通过且DOCX ImportError符合预期 | fixed-runtime-recheck.json |
| 旧v1/当前入口/容量/禁用 | exit0，7组核对通过 | current-contract-checks.json |
| 台账CLI | exit0，14节点/28格/114gap，全禁用 | mapping-summary.json |
| 原D0产物/证据、依赖身份 | 原摘要全部匹配，370文件同字节 | original-evidence-hashes.json、dependency-identity-recheck.json |

样式对照的初版私有探针因普通lxml元素XPath未绑定命名空间报错；原日志保留为`style-numbering-control.initial.log`，仅修正私有探针使用限定名查找后重跑。它不是产品缺陷，不计编号反例或通过数。直接编号反例失败是明确内容断言，不能与探针准备错误混算。

起点3356个受控/非忽略文件已冻结；报告写入前全部原字节保持。最终仅给`docs/project-current-state.md`添加最新复审前缀，旧状态精确后缀保留，新增本报告；原D0候选/合同/D1计划、原烟测脚本/夹具/日志、台账、源码/正式测试、依赖/锁/pin/活跃lib和此前未提交C成果不改。完整核验见本轮`audit-summary.json`。

本轮没有全量/构建/pack新增结果；没有安装/升级、读取凭据、改Profile、Desktop/实际DSH、真实模型/API/网络/上传/费用或提交/推送/发布。D0-R1待后续明确修订，D1、其它阶段批次及真实验收均未开始。
