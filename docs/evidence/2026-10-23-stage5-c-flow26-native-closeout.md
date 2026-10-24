# 阶段5 C首批：新版Flow-2-6原生模型禁用适配候选收口

日期：2026-10-23。仓库：`/Users/tinadong7036/Documents/开发项目/dsh-lab`。起点及收口HEAD均为`68a3264ff917afd1194259e96aa02699329b6d00`，分支`mac/continuity-v2`。本批未提交、推送或发布。

## 结论及范围

新版Flow-2-6候选已在显式内部注入、替身原生传输及真实临时磁盘范围完成：冻结材料及模型确认→派发前持久化→原生流式接口替身→严格结构输出→共同累计文稿→编辑新版本→重新审核→Markdown保存与固定版本对话草稿。最终正式新增36项、包全量1184/1184通过；独立只读复审未发现本范围可复现P1/P2。

候选证据明确记为`native-model-candidate`，不是`native-model`。`executionScope=injected-only`、`dispatchEnabled=false`及`realCallVerified=false`写入独立合同；默认Host/index不注入，公开生成路由不开放，台账28格及所有来源禁用状态保持。C首批完成不等于C全部节点、阶段5整体或真实原生模型能力完成。

## 实现与兼容

- 新增`v340-native-contract.js`和`v340-native-model.js`，仅支持新版Flow-2-6/local-skill。使用固定包的公共规则、节点指令、T表三段原文，原装配SHA256仍为`72205d5a7cfb7b1aff85cfdeef75ed82888d38567e9d7e3d3024c47aa1ec9325`；Host附加结构响应合同的摘要单独存储，不改B资源或原文。
- 确认绑定Workspace、task、session、revision、模型/显式reasoningEffort、输入及资源摘要。使用既有DSH只读上下文解析；落盘前及派发前校验，会话归属/cwd/选定模型变化阻断调用。prepareCall返回的实际配置须匹配已选配置，并在stream前再次核对上下文。没有读取或保存凭据。
- `prepared`落盘记录包含请求/输入/模型/资源/确认摘要及一次预算`maxCalls=1,usedCalls=1`，之后才进入执行边界。这里是候选派发额度，不是实际费用记录。重复requestKey返回原运行；unknown、停止/关闭、进程重开后的prepared不重派，不换来源，不发布迟到或局部结果。
- 在既有DSH适配器中共享流处理，旧入口100000字符规则保持；新内部入口对请求和响应均有2MiB UTF-8保护。严格JSON解析后交既有输出schema与累计组装器，拒绝只有URL、缺字段、伪造身份及畸形输出。错误原文、推理和正文不写入失败状态。
- 运行schema1只扩展候选可选分支；旧synthetic记录不添字段、不改标签、不迁移。完整及`values-v1`快照走原还原和摘要校验；模型请求只包含权威values，避免重复快照。模型/预算元数据不挤占既有2MiB输入快照。
- 候选来源标记进入共同审核/写回回执，不另建结果体系。实际磁盘测试验证编辑后必须再审，保存正文与固定审核版本一致，回执保留候选身份，固定对话草稿接续成功。
- 文稿1MiB、材料/输入快照2MiB、Workspace8MiB及字段300000等原限制不提高；原16/16/28和B的46/13项正式测试、旧资源/台账/pin、历史证据及活跃lib均保持原字节。

## 正式回归及反例

正式文件：`packages/oasis-professional-service/test/v340-native-candidate.test.mjs`，共36项。公开材料明确为合成阀体及合成前序，不冒充真实上游或专业质量验收。

覆盖显式候选工厂、派发前实际磁盘记录和额度、确认缺失/错误/失效、模型及推理配置偏移、项目归属/cwd变化、严格输出、故障分类与脱敏、停止/关闭/超时/迟到、存储失败零调用、重复请求不重派、记录损坏拒绝、默认禁用、真实磁盘编辑再审保存、长稿紧凑快照实际还原、选定材料变化、执行器副本修改隔离、其他节点/API拒绝及重开unknown。

初始红测分别证明候选导出/实现缺失，不把缺模块错误算成业务保护命中。另在完整旁置副本撤去确认摘要比较、stream前上下文复核及实际配置匹配三处保护，同一36项得到26通过、10项业务断言失败；产品未撤回，最终同字节正式36/36通过。日志分别保留在`feature-red.log`、`contract-red.log`、`withdraw-guards.log`和`final-targeted.log`。

| 检查 | 实际结果 | 证据文件（均在.local/stage5-c-flow26-native-20261023） |
|---|---|---|
| 最终正式候选 | 36/36 | final-targeted.log |
| 最终包全量，串行/统一fixture | 1184/1184，0失败/跳过 | final-full.log |
| Mac静态合同 | 26/26 | mac.log |
| 独立最终定点 | 候选36+旧adapter11，47/47（首次为39/39） | reviewer/targeted.log |
| 独立额外反例 | factory 1+额外8，9/9；额外8已纳入正式36 | reviewer/native-independent.log |
| 独立追加复核 | 正式36/36；8项原断言逐字保留，结论不变 | reviewer/review-report.md、reviewer/targeted.log |
| 旁置配对构建 | 固定工具退出0，活跃lib未改 | package-build.log |
| 旁置包合同 | 9/9 | package-contract.log |
| 离线pack dry-run | 122成员，精确白名单 | pack.json、package-preservation.json |
| 构建/来源对应 | 全部旁置src与当前src同字节，47个项目sourcemap来源逐字对应 | package-preservation.json |
| 三处保护旁置撤回 | 36项中10项业务红，其余26通过 | withdraw-guards.log |

122个成员包含新增两个源码模块；白名单精确等于src、lib及原manifest/patch/API基线，未混入测试、node_modules、.local或临时证据。旁置包在其自身目录构建，sourcemap与配对src核对；没有用旁置产物替换日常包。

正式全量命令为`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。旁置构建使用固定Node及已安装tsdown，pack使用`--dry-run --json --offline --ignore-scripts`和批次独立cache；没有安装、升级或联网取依赖。

## 复审与保留边界

按代码复审技能安排独立新上下文只读审查，核对确认/持久化/执行身份、流式未知、紧凑快照、共同保存、来源禁用及旧数据；额外8项反例全部通过后纳入正式回归。追加测试经独立复核断言未削弱。作者另核对最终全量、旁置包、3328个基线跟踪文件的摘要及`git diff --check`。独立报告在`reviewer/review-report.md`；验证摘要在`verification-summary.json`。

本批未启动Desktop/实际DSH，未新增真实模型/API调用、网络请求、上传或费用；未改Profile/pin、依赖、Host默认装配或活跃lib。候选测试使用注入替身，不证明实际原生权限/凭据、模型质量、跨进程排他、Desktop重启、安装/升级/降级或发行验收。

剩余：C后续节点按组实施；D非文本输入；E仍因14个API格实际服务/schema/字段结果/账户项目证据不足而阻塞；F Desktop及正常重启、G分批真实双来源均待各自授权与条件；H收口/阶段6仍未完成。B历史gap不删除。下一步先复审本候选，再按原计划选择C后续或D，不能据本批测试数量开放真实来源。
