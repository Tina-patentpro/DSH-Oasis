# 阶段5 D0样式类型缺省P2修复及作者复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，`mac/continuity-v2`，HEAD保持`035fe82b3f97b983bb561fbefff9ae1ea9d42862`。用户明确要求修复D0-BOOL-R1：默认选择和继承校验没有将w:type合法缺省视为paragraph。本轮保留[原全面复审及FAIL结论](2026-10-24-stage5-d0-default-boolean-reaudit.md)原字节，不改写历史。

## 修复和能力边界

独立`scripts/check-v340-docx-numbering.py`新增一个有效样式类型解析函数，**默认选择和使用链校验两处共用**。仅在属性省略时返回paragraph；显式paragraph/character/table/numbering保持各自语义，空值或未知类型固定失败，不静默当成未使用声明。没有按type缺省拒绝全部文件，也没有把所有样式都当成段落。

实际结果：缺省段落类型的1/true/on默认非零编号均拒绝；0/false/off未使用声明保留，显式pStyle使用非零编号仍拒绝。段落直接numId=0、叶样式numId=0、基样式合法缺省类型及普通显式样式覆盖均正确保留资格。缺省处理对basedOn链逐项生效，仍保留未知链/循环/长度保护。

[提取合同](../business-baseline/v340-material-extraction-contract.md)与[D1计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md)明确了同一类型规则及67项资格基础；原合同第2节起原件/文本hash、UTF-16定位、确认/编码及容量/旧v1条款原字节保留。未来policySHA/adapterSHA须绑定新内容，不能复用旧确认或重签旧证据；本轮没有实现D1新编码或迁移数据。

这仍是**未接入Host的独立离线编号资格候选**：eligible只表示编号检查通过，不是完整DOCX准入/提取成功，不代表产品已支持该格式。生产准备入口仍为原.md/.txt，源码/默认Host、台账及来源禁用保持。D1产品运行时、原始分发件、ABI、完整格式/资源机制均仍BLOCKED；没有安装解析依赖或进入D1。

## 新增正式回归

新增`test/v340-docx-style-type.test.mjs`和`test/fixtures/v340-docx-style-type/`，28份固定公开合成DOCX。前18份与原全面复审的二进制逐字节同一，保留7个反例的原件身份；另有10份对照。ZIP_STORED、2000-01-01条目时间及manifest的SHA/长度/手工预期固定，生成只用固定Python标准库。

| 范围 | 项数 | 实际预期 |
|---|---:|---|
| 省略type的三种真值默认非零编号 | 3 | 全部拒绝 |
| 省略type的三种假值未用声明 | 3 | 全部保留资格 |
| 三种假值下显式pStyle使用缺省类型的非零编号 | 3 | 全部拒绝，假值不取消实际编号 |
| 直接/叶样式三种真值取消、基样式缺省类型、显式零编号样式 | 8 | numId=0取消保持，不误拒绝合法使用链 |
| 普通显式样式覆盖编号默认，包括自身type省略 | 4 | 全部保留 |
| character默认并存、假声明并存及三类非段落默认声明 | 5 | 段落编号仍拒绝；未用非段落声明保留，不混同类型 |
| 空值/未知type | 2 | 固定元数据拒绝、exit2 |

正式断言执行真实独立检查器，核对决策/退出码/资格协议、不泄露正文及原文件不变；不grep合同或用待测类型函数计算答案。原19项、布尔20项及其37份二进制/manifest/说明全部不改。新回归不依赖预建.local、node_modules或Codex库，不向产品增加测试接口。

先补正式回归，原39+新28共67项在修复前56通过/11失败，真实exit1：原7个类型缺省反例、普通覆盖和基样式链误拒绝、两项非法类型放行，均为实际业务断言失败。修复后67/67，exit0。

完整原检查器旁置撤回，其它测试/夹具同字节，再次56通过/11失败、exit1；当前代码未被撤回。作者另单独撤去默认选择点或继承校验点：新28项分别23通过/5失败、19通过/9失败，均exit1，证明两个消费点各有正式断言保护，不能只修一处。旧39项持续全绿。

## 作者复审与保留

完成后单代理另作作者复审：缺省与空值、四类有效类型、布尔真/假及缺省default、显式pStyle覆盖、0值优先级、链中间类型缺省、非段落声明及固定失败协议均核对。实现差异仅为类型解析函数和两处消费；原on_off、numId/ilvl、ZIP/XML/DTD/字节上限、128跳和正文输出边界不改。

原全面复审的18组相邻探针以新脚本运行18/18通过；原27+5组容量/编号探针均通过，共50组补充，不计正式新增。原目录的11/18、断言FAIL、规范原件及旧报告保留。1MiB±1、ZIP256/257、压缩比/8MiB声明展开及DTD检查不因修复放宽；这些仍不证明D1完整OPC/CRC、实际解压聚合、硬内存或总时限已部署。

未确认本轮修复范围遗留P1/P2或新增回归；此为作者复审，无独立代理/新上下文背书。旧v1/完整/values-v1、编辑审核保存/相邻准入及B读取/来源正式用例随全量通过，生产src、旧记录/回执hash、锁/资源均未改变。

## 新鲜命令与结果

日志根`.local/stage5-d0-style-type-repair-20261024/`，zsh、固定Node24.21.0及Python3.14.8。完整日志SHA和文件保全见verification-summary.json。

| 验证 | 实际结果 / 退出码 | 日志 |
|---|---|---|
| 修复前67正式 | 56通过/11失败 / 1 | red.log |
| 修复后67正式 | 67/67 / 0 | green.log |
| 干净最小副本 | 同字节67/67 / 0；无.local/node_modules，仅明确链接固定Python | clean67.log |
| 完整原检查器撤回 | 56通过/11失败 / 1 | rollback67.log |
| 单独撤回默认选择点 | 新28项23通过/5失败 / 1 | default-only-rollback.log |
| 单独撤回继承校验点 | 新28项19通过/9失败 / 1 | inherit-only-rollback.log |
| 最终主包全量 | 1425/1425，0失败/跳过/取消 / 0 | full.log |
| 补充探针 | 27/27、5/5、18/18 / 0 | probes、additional-review、extended的.log/.json |
| B只读台账CLI | 14节点/28格/114历史gap，dispatchEnabled=false、realCallVerified=false / 0 | mapping-summary.json |

定点命令：`tools/bin/node --test packages/oasis-professional-service/test/v340-docx-style-type.test.mjs packages/oasis-professional-service/test/v340-docx-default-boolean.test.mjs packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`。

全量命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

本轮正式新增28，编号资格累计67，主包1425，C累计仍210。测试不是产品进度或真实验收；产品src/lib/manifest未变，本轮未重复构建/pack或覆盖活跃lib。

## 文件与环境保全

起点3405个受控/非忽略文件SHA冻结，包括此前未提交复审文档。仅改离线检查器、合同/D1计划并在三个状态索引前追加本轮结果；六份完整.before匹配起点SHA。新增28份固定二进制/manifest/说明、正式测试及本报告。其余源码、原39项/夹具、旧报告与FAIL、容量/旧数据/台账、固定依赖及此前成果保持；文件精确差异、75个复制件身份及完整/单点撤回指纹见verification-summary.json。

未启动Desktop/实际DSH，未新增真实模型/API、上传或费用；未安装升级、读取凭据、改Profile/pin/日常环境，未提交推送发布。D1、OCR、E—H/阶段6继续原待办，不因本项修复自动进入。
