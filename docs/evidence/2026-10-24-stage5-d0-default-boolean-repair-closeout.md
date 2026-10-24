# 阶段5 D0默认样式布尔P2修复及作者复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD保持`68a3264ff917afd1194259e96aa02699329b6d00`。修复本轮复审D0-NUM-R1/P2：默认样式合法真值on被忽略，导致生效编号错误放行。原[全面复审及FAIL结论](2026-10-24-stage5-d0-numbering-repair-reaudit.md)保留原字节，本轮不回写历史。

## 修复与边界

独立离线检查器`scripts/check-v340-docx-numbering.py`新增窄`on_off`判定，并替换默认段落样式选择时的1/true枚举：1/true/on全部为真，0/false/off全部为假；缺省不标默认，空值及非法值抛出固定元数据拒绝。多个真值默认段落样式仍拒绝，包含1/on混合。保持只在当前候选的段落样式选择点消费，不改变numId或继承优先级。

假值仅决定该样式是否被隐式应用，不是取消编号。显式pStyle使用0/false/off标记的编号样式时仍拒绝；三种真值下段落numId=0或叶样式numId=0均保留资格。原直接/样式/basedOn/docDefaults、重启、多级、项目符号、手写、未使用声明及未知链拒绝保持。

[冻结合同](../business-baseline/v340-material-extraction-contract.md)明确这些布尔语义及失败边界，[D1计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md)同步39项基础及未来实际准备入口验证。仍用原编号策略合同标识，这次落实其默认样式语义；策略/适配脚本内容指纹须绑定新字节，不能复用旧确认或重签旧数据。

该脚本仍是**未接入Host的独立离线编号资格候选**，eligible只代表编号检查通过；不是完整DOCX验证/提取，也不证明产品已拒绝该格式中的具体结构。当前产品仍仅支持原.md/.txt材料入口，台账、默认Host及来源禁用保持，D1因产品运行时、原始分发件、ABI及完整资源机制继续BLOCKED。本轮没有进入D1或安装解析依赖。

## 正式回归

新增`test/v340-docx-default-boolean.test.mjs`及`test/fixtures/v340-docx-default-boolean/`，执行真实Python检查器和20份固定ZIP/OOXML文件。原19项正式测试、其17份二进制及manifest全部原字节保留；新测试使用独立手工预期，不grep文档或调用待测布尔函数来计算答案。

| 新增范围 | 项数 | 实际预期 |
|---|---:|---|
| 1/true/on默认编号 | 3 | 全部拒绝生效编号 |
| 0/false/off未用编号声明 | 3 | 全部保留编号资格 |
| 三种真值下段落numId=0 | 3 | 全部取消继承并保留 |
| 三种真值下叶样式numId=0 | 3 | 全部取消继承并保留 |
| 三种假值但显式pStyle使用编号样式 | 3 | 全部拒绝，假值不能消除实际编号 |
| 缺省default属性 | 2 | 未使用保留；显式使用非零编号则拒绝 |
| 空值/非法值/1和on双默认 | 3 | 固定元数据拒绝、exit2，不静默放行 |

公开合成夹具基于原default-style.docx的明确部件，固定ZIP_STORED和2000-01-01条目时间；新manifest固定原字节SHA256/长度/模式/手工预期。正式用例核对真实输出、退出码、原件文件未变化、不泄露正文及dispatchEnabled=false；不依赖Codex库或预建.local，不向产品增加测试接口。

先补正式再修检查器，39项运行35通过/4失败，实际exit1：on误放行、两个非法值及混合重复默认样式未拒绝，均为业务断言失败，没有缺包/导入失败。修复后39/39，exit0；旁置以**完整原检查器字节**撤回本轮修复，其它新旧测试及夹具同字节，再次35通过/4失败，exit1。原19项始终通过。

## 作者复审与保留

单代理在完成后另作作者复审，核对缺省与空字符串不同、合法真/假值集合、仅默认选择点变化、直接/叶样式零值优先级、显式pStyle不受假值取消、混合双默认拒绝。未确认本轮修复范围遗留P1/P2或新增回归；这是作者复审，没有独立代理或新上下文背书。

原全面复审的27组私有探针按当前检查器在本轮目录重跑，27/27通过，包括on原反例、原始字节1MiB±1、ZIP256/257条目、压缩比及8MiB声明展开限额；原作者5组重跑5/5，包括docDefaults、直接0取消默认、编号样式链接、缺失basedOn和表格段落。共32组补充，不计正式新增。旧目录的26/27及FAIL保持，不能把新结果覆盖原观察。

XML/ZIP/字节上限、继承128跳及DTD拒绝代码未变；这仍不代表D1完整OPC/CRC、真实解码聚合、硬内存/总时限已经实施。合同第2节起的原件/文本hash、UTF-16定位、编码/旧v1兼容及全部容量章节原字节保留；无快照升级、哈希迁移或旧证据重算。全量包含旧v1/完整/values-v1、容量、编辑审核保存、相邻交接及B来源读取回归。

## 新鲜命令和结果

日志根`.local/stage5-d0-default-boolean-repair-20261024/`，zsh及固定Node24.21.0/Python3.14.8。结果与摘要记录于`verification-summary.json`。

| 验证 | 实际结果 / 退出码 | 日志 |
|---|---|---|
| 修复前原19+新增20 | 35通过/4失败 / 1 | red.log |
| 修复后原19+新增20 | 39/39 / 0 | green.log |
| 同字节干净最小副本 | 39/39 / 0，无.local/node_modules，仅明确链接固定Python | clean39.log |
| 完整原检查器旁置撤回 | 35通过/4失败 / 1 | rollback39.log |
| 最终主包全量 | 1397/1397，0失败/跳过/取消 / 0 | full.log |
| 私有探针 | 27/27及5/5 / 0 | probes.log/.json、additional-review.log/.json |
| 只读B台账CLI | 14节点/28格/114历史gap，dispatchEnabled=false、realCallVerified=false / 0 | mapping-summary.json |

定点命令：`tools/bin/node --test packages/oasis-professional-service/test/v340-docx-default-boolean.test.mjs packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`。

全量命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

本轮正式新增20，编号资格累计39，主包总1397，C累计仍210。测试数量只代表离线覆盖，不代表产品格式能力或真实验收进度。产品src/lib/manifest未变，本轮没有重复构建/pack或覆盖活跃lib。

## 文件与环境保全

起点3380个受控/非忽略文件SHA冻结；本轮仅改独立检查器、合同/D1计划，以及三份状态索引（prepend-only）。新增正式测试、20份二进制/manifest/说明及本报告。原合同/计划/检查器和三索引的完整修改前字节另存本轮.before并匹配起点SHA；旧生产源码、原正式测试/资源/锁/活跃lib、旧报告/FAIL及此前未提交C成果不改。最终精确差异、复制件同字节、撤回原件身份及日志SHA见verification-summary.json。

未启动Desktop/实际DSH，未新增真实模型/API、上传/费用，未安装升级、读取凭据或改Profile/pin/日常环境，未提交推送发布。D1、OCR、E—H及阶段6仍为原待办，不因本项修复自动执行或解阻。
