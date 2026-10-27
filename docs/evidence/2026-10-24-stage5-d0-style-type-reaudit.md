# 阶段5 D0样式类型缺省修复全面复审

2026-10-24，Asia/Shanghai。仓库`/Users/tinadong7036/Documents/开发项目/dsh-lab`，`mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。起点保留前轮未提交复审/修复成果，本轮单代理审计；不修改实现、正式测试、合同或D1计划。

## 结论与范围

本轮指定修复范围**未确认遗留或新增P1/P2**。D0-BOOL-R1的默认选择和继承校验共用有效类型解析成立；原28项与旧39项共67项、干净副本及主包1425项全部新鲜通过。完整撤回修复复现11红，单独撤回默认/继承点复现5红/9红，证明两个消费点均有实际正式断言保护。

该结论仅限独立离线编号资格候选、合同及回归范围。eligible不是完整DOCX验证/提取或产品材料准入；候选未接入Host，生产仍只有原.md/.txt材料入口。D1运行时、原始分发件、ABI、完整OPC/解码/硬资源机制仍BLOCKED，不将本轮复审当成已部署或真实验收。

## 逐项复核

| 重点 | 本轮证据与结论 |
|---|---|
| 共用类型解析 | 默认扫描和实际使用链均调用style_type；只有属性省略才默认paragraph，空值/未知值拒绝。不存在仅修一处、另处保留旧精确比较的分支；两处单点撤回各自触发正式红测 |
| 三种真值编号 | 缺省/显式paragraph下1/true/on默认非零编号均拒绝；补查混合类型的三级basedOn链仍拒绝。样式类型解析不改变原on_off布尔规则 |
| 假值未用声明 | 0/false/off默认标记只影响隐式选择，未用声明保留；显式pStyle使用其非零编号仍拒绝。未使用编号/重启/多级和手写对照保留 |
| 显式pStyle | 显式普通样式能覆盖编号默认样式，其自身可合法省略type；缺失引用、引用非段落样式、未知/循环使用链明确拒绝，不默认为普通文本 |
| 零值取消 | 段落直接、叶样式、中间样式的numId=0均优先于基样式非零值；反向叶非零覆盖基零仍拒绝。基样式省略type不再误拒绝；零值不绕过无法解析的使用链 |
| 非段落边界 | character/table/numbering各自保持类型，未用默认声明不成为段落默认；character与paragraph默认并存不互相冲突。用作段落pStyle或basedOn的非段落类型明确拒绝，不为通过对照而重新分类 |
| 非法边界 | 空值/未知type在扫描时拒绝，即使段落有直接0；缺省不是空字符串。缺省type下非法default也拒绝，两个真默认不因声明次序或省略type而放行 |
| 容量/复杂度 | 原1MiB±1、ZIP256/257、压缩比/8MiB声明展开及DTD用例通过；新增链长128/129对照分别允许编号资格/拒绝。原限制代码及数值未变；不声称D1硬内存/墙钟或完整格式保护已经实现 |
| 旧v1及原链路 | 产品src/lib/锁与旧schema未改，旧v1、完整/values-v1、容量、编辑审核保存/实际相邻准入回归随全量通过；没有新材料编码、旧hash迁移/重签或unknown重派 |
| 合同与D1 | 缺省paragraph、四种显式类型、非法拒绝、布尔及零值优先级规则一致；现有67项定位与未来集成用例保持。早先19/39修订段落按其修订时点保留，最新D0-BOOL-R1及Task D1-1明确现67项；没有用资格候选解除D1阻塞 |
| 台账/来源 | 新鲜只读CLI为14节点/28格/114历史gap，dispatchEnabled=false、realCallVerified=false；完整B回归随全量通过。独立脚本未被产品src导入，主包分发白名单不含scripts |

原件/文本hash、UTF-16定位、确认失效和新旧编码合同保持。规则虽在同一策略标识下修正，D1仍要求实际新policy/adapter内容指纹；不能据此给旧运行重签或重算哈希。

## 正式回归与补充审计

原28项的手工预期、固定二进制SHA/长度、决策/退出码、body-free输出和原件保全断言逐项核对；测试运行真实检查器，不grep代码/合同、不调用待测函数生成答案。前18份与原复审公开反例同字节，原39项及其37份旧二进制全部保留。复制验证同时确认固定Python链接，未复用node_modules、Codex库或预建.local。

原50组补充探针重新运行全部通过；本轮另加42组私有组合，42/42通过：三真值下三级链、叶/中间/直接0及反向非零覆盖15组；三假值下未用/显式非零/中间0共9组；非段落引用及基类6组；双默认次序2组；直接0仍不绕过非法类型2组；非法布尔2组；无样式直接属性、缺失引用、循环及128/129跳6组。共92组私有检查，不计正式新增或业务进度。

这些组合仅检验编号资格状态；含无样式部件等对照不能作为完整OPC结构可接受的证明，完整预检仍留D1。未为审计新增产品入口、修改测试预期、放宽限额或覆盖原FAIL。

## 新鲜命令及结果

证据根`.local/stage5-d0-style-type-reaudit-20261024/`，zsh、固定Node24.21.0及Python3.14.8。最终日志SHA、复制件及全部文件保全记录于audit-summary.json。

| 验证 | 实际结果 / 退出码 | 日志 |
|---|---|---|
| 原28+39正式 | 67/67 / 0 | formal67.log |
| 主包全量 | 1425/1425，0失败/取消/跳过 / 0 | full.log |
| 干净最小副本 | 67/67 / 0 | clean67.log |
| 完整原检查器旁置撤回 | 56通过/11失败 / 1 | rollback67.log |
| 单独撤回默认消费点 | 新28项23通过/5失败 / 1 | default-only-rollback.log |
| 单独撤回继承消费点 | 新28项19通过/9失败 / 1 | inherit-only-rollback.log |
| 原补充探针 | 27/27、5/5、18/18 / 0 | probes、additional-review、extended的.log/.json |
| 新增组合 | 42/42 / 0 | combinations.py/.log/.json及固定二进制 |
| B只读CLI | 14/28/114，false/false / 0 | mapping-summary.json |

定点命令：`tools/bin/node --test packages/oasis-professional-service/test/v340-docx-style-type.test.mjs packages/oasis-professional-service/test/v340-docx-default-boolean.test.mjs packages/oasis-professional-service/test/v340-docx-numbering-policy.test.mjs`。

全量命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

本轮无正式新增，编号资格仍67，主包1425，C累计210。源码及分发白名单不改，没有重复构建/pack、覆盖活跃lib或借旧构建宣称当前Desktop验收。

## 保全与剩余工作

起点3437个受控/非忽略文件SHA冻结，复审和补充检查后全部同字节。本轮仅新增本报告，向当前状态、总计划及剩余清单prepend索引，原完整字节为后缀。原实现、合同/D1计划、67项正式测试/全部二进制、旧报告/FAIL、此前未提交成果、固定依赖/台账/资源均保留。完整/两处单点撤回只在.local副本运行，不动当前实现。

单代理本轮复审，没有独立代理/新上下文背书。D0编号/类型修复可在离线资格范围维持收口；D1部署及完整材料接线、OCR、API逐节点实际证据、F—H/阶段6仍未完成，来源保持禁用。

未启动Desktop/实际DSH、未新增真实模型/API/网络、上传或费用；未安装升级、读取凭据、改Profile/pin/活跃lib，未提交推送发布。本轮也未重复下载规范；已冻结的一手规范及之前的FAIL保留。
