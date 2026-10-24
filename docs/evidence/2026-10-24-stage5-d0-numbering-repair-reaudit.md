# 阶段5 D0自动编号修复全面复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD仍为`68a3264ff917afd1194259e96aa02699329b6d00`。本轮单代理全面复审，不实施修复，不改变原合同/计划或19项正式测试；原作者收口与FAIL原文保留。

## 结论：确认1项P2，尚不能认定编号修复无遗漏

**D0-NUM-R1 / P2：合法的默认样式布尔值on未识别，生效自动编号错误放行。**

位置：`scripts/check-v340-docx-numbering.py:108`。默认段落样式仅识别`w:default`为`1`或`true`。当正文段落没有显式pStyle，而默认段落样式使用合法的`w:default="on"`并含`numId=7`时，default_style被留为空；后续inherited(None)只检查docDefaults，跳过实际默认样式，最终返回`eligible/no-effective-automatic-numbering`。这与目标合同“默认段落样式的有效numId非零必须拒绝”及D1-1一致要求冲突。

Microsoft一手定义：[Style.Default](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.style.default?view=openxml-3.0.1)使用OnOffValue；[OnOffValue](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.onoffvalue?view=openxml-3.0.1)明确支持true/false、on/off、1/0。此处on是合法真值，不是格式损坏或未来额外能力。

复现以正式`default-style.docx`为底，仅将styles.xml的`w:default="1"`改为`on`，其余OPC部件/正文/编号定义不变。新公开合成文件保存在本轮证据`default-on.docx`，2851字节，SHA256：`3b67afa6cfa96b14d01497a84239ed56f97bd7de3f5cc4dc0773fc6050367cf8`。检查器两次直接执行均exit0并错误返回eligible；实际“应拒绝”断言在`repro-assert.py`中退出1，完整输出保留在`repro-assert.log`。

当前正式`default-style`用例只用`1`，没有on/true真值等价对照，故19项及1377项全绿不能覆盖这个缺口。建议修复默认样式布尔值判定，统一合法真/假表示，对非法或无法确定状态明确拒绝；正式补入默认编号1/true/on等价拒绝、0/false/off未使用编号声明保留、显式numId=0取消继承等对照。不能以一律忽略默认样式或见编号声明就全部拒绝来通过。

影响限于未接入Host的D0离线资格候选及后续D1消费规则：当前产品仍不接收DOCX，本轮没有发现来源开放或真实资料外传。产品未接线不能消除候选违反冻结合同的P2；D1部署/ABI/完整资源机制原BLOCKED条件亦不因此改变。本轮未修改实现或补入新正式测试，待后续修复。

## 逐项复核及实际证据

| 项目 | 本轮结论与界限 |
|---|---|
| 直接编号、项目符号 | 原真实DOCX均返回reject；非零numId映射检查失败也拒绝。未执行编号展开或全文提取 |
| 样式继承 | pStyle/basedOn、三级链、默认1/true、docDefaults、只给ilvl而继承numId、实际使用链循环/缺失均拒绝；默认on有上述P2 |
| 重启及多级 | startOverride=3及两层实际编号拒绝；编号样式链接、表格段落附加复核拒绝。检查非零编号状态，不声称还原标签或Word显示布局 |
| 手写及未使用声明 | 原7种对照保留编号资格，包括无编号部件手写、未用编号/重启/多级/样式、未用样式循环、段落和叶样式numId=0；手写正文不删改，eligible不是完整DOCX准入 |
| 合同与D1 | 两者均要求有效编号/无法解析整文件失败，准备完整前不消费额度/派发；hash、UTF-16、确认失效、新材料编码/文稿分支及旧v1规则一致。当前遗漏是候选布尔判定/正式覆盖，不是合同允许on放行 |
| 容量保护 | 私有实测原字节1048575/1048576通过编号资格，1048577拒绝；ZIP256/257条目、压缩比超100、声明展开合计超8MiB均符合现候选保护。不是D1完整ZIP/关系/CRC、实际解码总量、硬内存/时限验收 |
| XML及进程 | 原UTF-16 DTD拒绝正式用例通过；标准库stdin、固定Python、不接收任意路径、只返回body-free资格结果。正式子进程超时/输出上限保持，不声称已部署产品硬限制 |
| 旧v1及生产路径 | 原src、旧正式测试、锁/资源/活跃lib字节未改；全量包含旧v1/完整及values-v1、容量及审核保存/相邻接续回归。没有把新材料编码塞入旧schema |
| 台账与禁用 | 新鲜只读CLI为14节点/28格/114历史gap，dispatchEnabled=false、realCallVerified=false；全量包含B来源/读取正式回归。独立脚本没有被产品src导入，主包files白名单不含它 |

## 本轮新鲜验证

日志根：`.local/stage5-d0-numbering-reaudit-20261024/`。命令在仓库根以zsh、固定Node24.21.0及Python3.14.8执行；没有新安装依赖。

| 验证 | 结果/实际退出码 | 证据 |
|---|---|---|
| 原19项正式编号回归 | 19/19，0 | formal19.log |
| 主包正式全量 | 1377/1377，0失败/取消/跳过，0 | full.log |
| 同字节干净最小副本 | 19/19，0；没有.local/node_modules，只明确链接固定Python | clean19.log |
| 旁置单语句撤去生效编号reject | 11通过/8失败，1；测试与夹具同字节，当前实现不改 | mutated19.log |
| 私有扩展27组 | 26通过/1失败，1；唯一失败为default-on | probes.py/.json/.log及固定二进制 |
| 失败断言独立复现 | 期望reject实得eligible，1 | repro-assert.py/.log |
| 旧作者5组重新执行 | 5/5，0：docDefaults、直接0取消默认、编号样式链接、缺失basedOn、表格内段落 | additional-review.py/.json/.log |
| B只读映射CLI | 14/28/114、false/false，0 | mapping-summary.json |

正式定点：`tools/bin/node --test packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`。

全量：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

私有27组包含默认布尔六种表示、on加直接0取消、原13种主要拒绝/对照、原字节±1、ZIP条目边界及压缩/聚合限额。新增私有探针和失败断言不计正式新增；正式仍为19，总1377，C累计210。撤回分支的8红证明已有回归有效，但不能替代缺失on场景。没有因发现问题重写原FAIL、改测试预期或重算历史hash。

## 保全、范围与下一步

起点3379个受控/非忽略文件摘要冻结于本轮`baseline.json`；报告前核对全部同字节。本轮只新增此报告并向当前状态、后续计划及剩余清单追加复审索引，旧文完整字节仍为后缀；其余源码、正式测试、夹具、原合同/D1计划、旧报告和此前未提交C成果保持。最终保全及日志摘要见`audit-summary.json`，失败证据保留，不把本轮结论写回旧收口报告。

未确认第二项独立P1/P2；这不证明产品DOCX已准入，也不包括D1尚未实现的完整格式/部署/资源机制。建议下一批仅修复D0-NUM-R1、补入合法布尔等价正式对照并复审。D1仍BLOCKED，来源保持禁用。

未启动Desktop/实际DSH，未新增真实模型/API、上传或费用；未安装升级、改依赖/Profile/pin/活跃lib、提交推送或发布。本轮无构建/pack新结论：产品源/manifest未变，不覆盖活跃lib，也不用旧构建代替当前Desktop验收。
