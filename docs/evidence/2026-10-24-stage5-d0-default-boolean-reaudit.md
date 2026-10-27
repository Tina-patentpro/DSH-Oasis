# 阶段5 D0默认样式布尔修复全面复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，`mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。起点工作区干净，本轮单代理审计，不实施修复或新增正式测试；此前修复、FAIL和提交/推送事实不回写。

## 结论：布尔修复成立，确认1项相邻P2遗漏

**D0-BOOL-R1 / P2：合法省略w:type时没有按paragraph归一化，导致默认编号错误放行、合法取消继承误拒绝。**

位置：`scripts/check-v340-docx-numbering.py:117`及`:129`。默认样式选择只接受显式`w:type="paragraph"`，所用样式继承也用同一精确比较。规范允许省略type，并规定此时按paragraph处理。省略属性不是缺失/损坏的样式，也不是未声明的额外格式能力。

一手依据为[ECMA-376 Part 1第五版原始分发件](https://ecma-international.org/wp-content/uploads/ECMA-376-1_5th_edition_december_2016.zip)，§17.7.4.17 style的type属性说明，印刷页644 / PDF第654页。原件从[Ecma标准入口](https://ecma-international.org/publications-and-standards/standards/ecma-376/)取得，43501721字节，SHA256 `9d0bcad9cf06054785b03762fcfadbf6bab7e54a5f9d69434e34b7fd464d4129`。本轮仅作为参考文献有界下载至.local，以现有Codex附带pypdf读取相关页；不是安装/分发解析依赖，也没有将该运行时接入产品。摘页及原件身份见本轮reference.json/standard-page-654.txt。

实际二进制反例：

- 从正式true-1/true-word/true-on夹具只去掉样式的`w:type="paragraph"`，保留default真值及非零numId，均错误返回eligible。on反例`missing-type-default-on.docx` SHA256 `914aeae68d9438e7b9f7d16d85ad8db0d53a86bf24cd0ab9641911478496b507`；“必须拒绝”独立断言实际退出1。
- 三种真值下，仅去掉叶样式Off的type，其numId=0和basedOn链均保留，合法取消继承均被返回reject/unresolved-numbering；显式使用缺省段落类型的零编号样式也误拒绝。共7个失败观察属于同一类型缺省根因，不拆成多个P2。
- 相邻18组私有检查为11通过/7失败，实际exit1，完整原件/hash/结果在extended.json，失败断言在repro-assert.log。正式39项均显式声明样式类型，因而不能捕获此缺口。

这是原编号候选既有比较暴露的相邻遗漏，未发现本轮on_off函数将六种合法布尔值判反；不能把原布尔修复说成失败，也不能据39项全绿认定完整默认样式合同已无遗漏。建议统一解析样式的有效类型，并在默认选择和继承校验两处消费；保留未知/非法类型的明确失败。补入缺省type的真值拒绝、假值未用声明、显式pStyle和零值取消对照后再复审，不能仅修默认扫描而保留继承误拒绝。

当前候选未接入Host，产品材料入口仍只接受.md/.txt，来源禁用，没有发生本项错误放行后的产品生成；D1仍BLOCKED。候选边界不消除违反冻结编号语义的P2。本轮未修改实现、合同/D1计划、正式20项或原19项，待后续修复。

## 指定范围逐项复核

| 范围 | 结果及证据限制 |
|---|---|
| 1/true/on | 显式段落类型时默认非零编号全部实际拒绝；缺省类型有上述遗漏 |
| 0/false/off | 未使用声明全部保留编号资格；不是把假值当作numId=0。多个假值/未用声明不会消除另一个真默认编号 |
| 显式pStyle | 三种假值标记的样式被显式使用且numId非零时仍拒绝；显式普通样式可覆盖另一个编号默认样式，3组补查均保留 |
| numId=0 | 显式段落类型时直接/叶样式三种真值共6项均保留；缺省叶样式类型误拒绝属于同一P2 |
| 其它布尔边界 | 缺省default与空值不同；非法值、混合双默认拒绝保持。character默认样式不与paragraph默认样式冲突 |
| 原19项 | 直接/样式/basedOn/docDefaults、重启、多级、项目符号、手写/未用声明、DTD/损坏及容量用例全通过；不声称已提取自动标签 |
| 合同/D1计划 | 六值、缺省default、非法/双默认、显式pStyle与numId=0规则一致；原hash、UTF-16、编码/旧v1与容量合同无冲突。没有声明必须显式type才算段落样式，且eligible不应掩盖无法判定编号。完整产品集成和硬资源仍是未来D1任务 |
| 容量及兼容 | 原32组私有边界重跑全通过；1MiB±1、ZIP256/257、比率/声明展开预算保持。旧v1/完整及values-v1、编辑审核保存/相邻准入随全量通过；生产源码、限制、旧记录/回执hash未改 |
| 台账/禁用 | 新鲜只读CLI为14节点/28格/114历史gap、dispatchEnabled=false/realCallVerified=false；B来源正式回归随全量通过。脚本仍在主包分发白名单外，未被产品src导入 |

## 新鲜验证

日志根`.local/stage5-d0-default-boolean-reaudit-20261024/`，zsh及固定Node24.21.0/Python3.14.8。正式命令为`tools/bin/node --test packages/oasis-professional-service/test/v340-docx-default-boolean.test.mjs packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`；主包命令为`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

| 验证 | 实际结果 / 退出码 | 日志 |
|---|---|---|
| 新20+原19正式 | 39/39 / 0 | formal39.log |
| 最终全量 | 1397/1397，0失败/取消/跳过 / 0 | full.log |
| 同字节干净副本 | 39/39 / 0；无.local/node_modules，仅明确链接固定Python | clean39.log |
| 完整修复前检查器旁置撤回 | 35通过/4失败 / 1；测试/夹具同字节，当前实现不动 | rollback39.log |
| 原32组私有边界 | 27/27及5/5 / 0 | probes.log/.json、additional-review.log/.json |
| 本轮相邻扩展 | 11通过/7失败 / 1，唯一根因为缺省type | extended.py/.json/.log |
| 独立生效编号拒绝断言 | 期望reject实得eligible / 1 | repro-assert.py/.log |
| 台账CLI | 14/28/114及false/false / 0 | mapping-summary.json |

本轮私有扩展不计正式新增，正式仍39、主包1397、C累计210。撤回4红证明原20项保护布尔修复，但不能替代缺省类型覆盖。本轮是单代理复审，没有独立代理背书；未确认第二项独立P1/P2，不将D1尚未实施项写作已验收。

## 保全与下一步

起点3404个受控/非忽略文件SHA冻结，复现后全部仍同字节。仅新增本报告，并向当前状态、后续计划和剩余清单追加索引；原文为完整后缀。产品src/lib、两组39项正式测试/夹具、合同/D1计划、旧报告及FAIL、依赖/锁、台账/资源均不改。最终文件身份、日志SHA及副本同字节见audit-summary.json。

建议下一批仅修D0-BOOL-R1的样式类型缺省，覆盖默认扫描和使用链两处；保持编号资格与完整DOCX准入分开。D1产品运行时/分发件/ABI/完整资源机制仍BLOCKED，OCR、E—H/阶段6继续原待办。

未启动Desktop/实际DSH、未新增真实模型/API、资料上传或费用；未安装升级、读取凭据、改Profile/pin/活跃lib，未提交推送或发布。本轮只有官方规范参考下载，未进行业务网络调用；没有重复构建/pack或声称当前Desktop验收通过。
