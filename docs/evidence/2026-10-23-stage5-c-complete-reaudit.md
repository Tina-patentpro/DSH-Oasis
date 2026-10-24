# 阶段5 C批完整实现及两项P2补修：全面复审

日期：2026-10-23。仓库：`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD`68a3264ff917afd1194259e96aa02699329b6d00`。冻结本轮前3343个跟踪及非忽略未跟踪文件的SHA256，审查C首批36及完整批新增157（41+102+14）项正式回归、实际源码及此前两项P2补修。

## 结论

确认**1项P2**，当前不能维持“C离线候选范围没有遗留P1/P2或回归遗漏”的收口判断。该缺陷在HEAD已存在，不是C批新引入；但本轮已授权的正常生成、编辑及相邻输入范围可以触发，新增157项没有覆盖。未确认其他新增P1/P2。

原两项P2补修复核成立：文本来源回执已发送并绑定实际请求摘要；空/相对/NUL项目根不能被规范化为默认进程目录来取得原生准入。14节点资源/136输入、节点和模型确认、v1旧摘要、完整及values-v1、审核保存和相邻接续的已测行为未确认新增问题。正式全量1341/1341通过不抵消本次反例。

本轮仅复审，未修复产品或增加/改写正式回归。新证据在`.local/stage5-c-complete-reaudit-20261023/`；原C报告、FAIL、完成审计和原正式测试保留。只更新当前状态/后续计划索引并新增本报告。

## C-REAUDIT-R1 / P2：合法长稿的反引号段数触发围栏计算栈溢出

位置：`packages/oasis-professional-service/src/v340-document.js:59`。`Math.max(3,...[...body.matchAll(/`+/g)].map(...))`把每个反引号段展开为一个函数参数，段数较多时越过当前固定Node默认栈的参数上限，抛`RangeError: Maximum call stack size exceeded`。

最小稳定核心正文：``'`x'.repeat(150000)``，300000字符/300000字节。它符合既有模型字段及编辑正文准入，正常完整累计Markdown约0.91MiB，未超1MiB；应能按同一围栏规则完整保留。它不是超容量、非法JSON或伪造来源。

1. **正常原生运行失败。** 替身返回上述合法严格JSON；先正常磁盘prepared及一次原生prepare/stream，随后共同组装器将运行结算为`failed/INVALID_OUTPUT`、无产物。等长`'x'.repeat(300000)`在相同路径completed，完整文稿907715字节。一次额度已使用，同键不会重派。
2. **正常人工编辑失败。** 小结果完成后，`saveV340ResultDraft(format='core-markdown')`接受该正文，`editV340Result`抛RangeError，只保留原1版本及未提交草稿，无法形成可审核/保存的新版本。等长plain编辑成功，2版本，完整文稿909996字节。原数据未损坏，但合法编辑被拒绝。
3. **上游结构读取受影响。** 作者只在本轮.local复制模块，把参数展开替换为等价线性最大值以生成参考文件；907625字节，SHA256`408ed879315726f10b63868bb96cdd63082f304770c748ade384aabf74dfdcff`，参考检查accepted。当前未改的`inspectV340Document`对同字节文件返回warning/structure、snapshot=null；本应可读取的累计结构不能按正常相邻结构继承。

独立审查的29项探针有2个业务红，分别覆盖正常原生生成与编辑，是同一根因，只计1项P2。作者另做上游读取比较。`git show HEAD:.../v340-document.js`确认原fence已存在于基线，不将其误报为C引入的回归。

独立进程临时使用更大的Node栈时，同一含反引号输出可组装并inspect accepted，907595字节（summary采用较短`ok`），进一步排除容量拒绝。此操作只作诊断，未修改固定Node、系统配置或产品；**提高运行栈不能作为修复或门禁放行**。应逐段求最大围栏长度，保持输出规则及全部容量上限，并补生成、编辑、既有/上游读取及等长对照正式回归。本轮未执行修复。

## 复审覆盖

| 重点 | 本次实际检查 | 结果 |
|---|---|---|
| 14节点资源/136输入 | 逐行核对固定B输入/指纹、工厂nodeId、prepared/admission/run；独立14节点含中文/CRLF/emoji实际values及全部receipts，配置按原JSON序列化核对 | 未确认资源错配或输入丢失 |
| 确认失效 | 正式逐节点模型/根/输入变化；独立空/相对/NUL根、prepare中根变空和reasoning变化；默认工厂与任务隔离 | 两项原补修及既有失效保护成立 |
| 旧v1兼容 | 源码对照原prompt/request、实际prepared/completed正式夹具、审核保存与重开；作者用未改首批实现生成真实v1 values-v1长稿再交当前读者 | 旧摘要/字段同值，重开unknown且不重派 |
| 来源hash与严格输出 | 独立全部136通道receipt/hash、requestSHA、B指令hash；正常runtime拒绝额外字段、T7、host前缀、未配对completion及错误source_hash | 原文本来源P2未回退 |
| 编辑/审核/保存 | 本轮正式全量执行逐节点真实临时磁盘闭环、固定版本再审、回执/引用；独立实际编辑长稿反例和等长对照 | 发现R1，其他已测行为未确认新问题 |
| 相邻实际准入 | 全量执行单Workspace14节点实际编辑/保存/文件准入，T1—T6/正文/警示/pending/utility_model保留；另检查合法长稿上游读取 | 短/原长稿链通过，R1会影响密集反引号上游 |
| 容量/禁用/包 | 原容量常量、源码及B保留摘要；Mac26、配对候选合同9、122成员离线pack及47项目source map同字节检查 | 未扩大容量或开放任何来源 |

## 独立与作者证据

- **主包正式全量1341/1341**，0失败、跳过、取消；命令`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`，日志`full.log`。包含新增157及首批36，未改断言或跳过缺陷。
- **独立29探针27通过/2失败**，`reviewer/full-independent-probes.test.mjs`及`.log`；独立报告`reviewer/full-independent-report.md`。最初配置序列化辅助误判的日志另存initial，不算产品问题；最终两红均为R1。
- **旧v1紧凑长稿1/1**，`v1-compact.test.mjs`及`.log`。首批原实现产生v1 values-v1，输入快照821312字节、结果287867字节；当前解析prepared/completed同值，原回执摘要不变，重开unknown、无新调用。只用旧实现作夹具发生器，没有回退当前checkout。
- **作者线性参考反例**，`fence-reference-probe.mjs`及`.log`；参考模块只存本轮.local，不是产品补修。独立栈诊断见`reviewer/fence-stack-control.log`。
- **Mac合同26/26、配对候选合同9/9、离线pack122成员**，`mac.log`、`package-contract.log`、`pack.json`；继续使用上轮配对候选，当前源文件与其src/47项目sourcemap重新核对，不覆盖活跃lib。没有重建或安装依赖，pack带`--offline --ignore-scripts --dry-run`。
- **容量协议边界观察1/1**，`capacity-probe.test.mjs`及`.log`：Flow-6-14十个209400字节短路径文件，材料2094000、快照2096158均≤2MiB，但加入receipts后的实际请求2098390>2MiB。正常runtime本地failed，prepare/stream均0，仍保留保守的一次额度记录。由于该组合保留全部输入后也可能超1MiB最终文稿，本例不足以证明合法最终产物被拒绝，不另升P2；明确记录两个2MiB检查对象不同，不建议放宽任何限制。

## 保留与范围

审查前3343文件清单、C源码/正式157/首批36、B台账/原文/固定资源、旧夹具/报告、Profile/pin和活跃lib按摘要复核；只允许新审计报告与当前状态/后续计划的前置索引变化，旧状态全文原字节保留。最终清单见`audit-summary.json`。

未启动Desktop或实际DSH应用，未新增真实模型/API、网络/上传/费用，未安装升级、读取凭据、修改Profile/pin/活跃lib、提交/推送/发布。只读独立审查与作者反例均使用本地替身及临时磁盘。真实权限/专业语义/搜索、Desktop/正常重启、非文本、跨进程、降级/发行仍不在本报告验收范围。

本次明确保留1项待修P2，不能用原完成报告或全量绿推断“没有遗漏”。下一步应先处理R1的围栏计算及三条实际路径正式回归，再复核C收口；没有自动开始修复或D—H。
