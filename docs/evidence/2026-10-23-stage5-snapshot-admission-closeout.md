# 阶段5长稿输入快照准入修复及复审

日期：2026-10-23，Asia/Shanghai。开发根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：已修复重复全文导致合法长稿被2MiB输入快照准入拒绝的问题。两种来源标签的约817KB实际临时保存稿均通过相邻节点createV340Run准入、内部合成执行、客户端RPC投影及审核保存、仓库重开。原容量保护及历史数据读取保持，单代理作者复审未遗留本范围已知P1/P2。** 不代表真实模型/API或Desktop验收，阶段5整体仍未完成。

## 修复及兼容合同

原prepared同时保存values中的完整文件、upstream.body和解析后的upstream.snapshot。前轮817643字节合法稿的prepared达2182024/2182036字节，超过2MiB；身份修复只解决文件名，不能解决这个重复体积。原报告与拒绝日志保持，详见[前轮复审](2026-10-22-stage5-five-p2-reaudit.md)。

新增Host模块`src/v340-input-snapshot.js`，接入现有运行服务和完整性校验；合同仅新增可选显式`inputSnapshot.preparedEncoding=values-v1`。原完整快照在2MiB内时沿用原字段；超过时，prepared只保留一份完整冻结values和原完整准备对象的canonical SHA256。没有删正文、截断材料、降低来源检查或把输入移到不受控文件。

Host只从冻结values重建receipts、warnings、upstream及inputHash，并比对完整准备对象摘要。编码结构只能包含values/sha256，规范化后必须仍与原values一致；额外字段、未知编码、丢失标记、坏文件hash、值/hash漂移及草稿/文件通道错绑均拒绝。执行器取得独立副本，临时修改不能影响组装；项目文件变化/删除也不会重写既有运行。

输入快照hash继续绑定实际持久化对象，结果input_history继续绑定原准备inputHash。完整快照2MiB、单文稿1MiB UTF-8、材料合计2MiB、Workspace8MiB、普通材料/模型300000字符、运行/版本/保存数量限制及原未决/无覆盖规则保持。去重后仍超限则写盘和派发前拒绝；累计输出超1MiB仍明确失败，不丢旧正文来换取成功。

历史无标记快照沿用原完整准备对象比较，不迁移、不补字段、不重算旧hash。根schema4、运行schema1、inputSchemaVersion=v340-1保持；旧prepared/unknown/failed空前序三态及批准/保存证据的既有正式测试均执行。新旧格式可以同一Workspace混存，新长稿运行及后续客户端操作不改变旧运行、旧版本、审核或保存回执。

兼容方向为**新代码读取历史记录**。旧代码不认识新增显式编码，不能据此声称旧安装包能读取新记录或可以直接降级。候选Host/src和本次构建client必须配对使用；活跃lib及真实应用未替换。将来更改重建语义时必须处理版本合同，摘要不匹配会拒绝，不能静默重解释历史。

## 正式回归与复审

新增`test/v340-snapshot-admission.test.mjs`共11项，原正式测试/夹具整份保持。两项主回归先在旧代码失败，退出1，错误准确命中prepared bounded JSON与snapshot exceeds byte limit；最小修复后2/2通过。作者复审补充完整准备对象摘要保护，新增断言先失败2/2（摘要不存在），修复后11/11通过，最终全量实际执行全部新断言。

覆盖以下实际行为：

- 两种来源标签真实临时磁盘保存及精确_OIW文件规则→相邻createV340Run准入/完成；输入和产物hash、累计核心及旧证据保持。
- 新快照经真实RPC/store投影到共同页，激活页面后明确审核、确认保存；重复requestKey不重读缺失文件、不再派发，重开记录及磁盘字节保持。
- 去重后仍超2MiB、文件超1MiB、Workspace超8MiB时无写盘、无派发、无截断/驱逐旧草稿和批准保存记录。
- 外层input hash即使重新计算，伪造编码/派生字段/摘要/正文hash/非规范values/草稿文件错绑仍拒绝。
- 项目文件变化及执行器临时修改不影响冻结输入；人工改动长上游的完整原文和警示进入执行器，输出超1MiB明确failed/INVALID_OUTPUT，不假装完成。
- 新编码prepared/unknown/failed三态在文件已删除时仍可重开/观察，同请求不重放；与旧完整格式混存保持。

新鲜验证（原始证据 `.local/stage5-snapshot-admission-20261023/`）：

| 验证 | 结果与证据 |
|---|---|
| 新增长稿准入正式回归 | 11/11，退出0；`derived-digest-green.log`，最终full.log亦完整执行 |
| 受影响V340/B1/客户端/结果/工作流组 | 87/87，退出0；`affected.log`，为首次10项新增版本；后续第11项和增强断言由最终全量覆盖 |
| 最终主包全量 | **981/981，失败0、跳过0，退出0**；`full.log` |
| Mac Markdown/Sidebar/安全预览/启动合同 | 26/26，失败0、跳过0，退出0；`mac.log`，未启动应用 |
| 旁置候选客户端/包/装配合同 | 9/9，退出0；`contracts.log`。与主包部分重叠，不累加为独立用例总数 |
| 固定工具旁置构建 | 退出0；`build.log`。client SHA256 `21d8cd5131f1483deb9f0f0aee4fde5526e7488b7b512acebaa52360310fc577`；未替换活跃lib |
| 候选npm dry-run | 120成员（新增一个Host模块），退出0；`pack-current.json`；src与当前源码逐字配对，无测试/依赖/运行/归档数据 |
| 最终私有撤回反例 | 4组均退出1，5个选中用例全部预期失败；`final-mutation-*.log` |

四组反例分别撤去去重、原2MiB聚合保护、编码结构校验、完整准备摘要校验；第一组两种来源均重新准入失败，其余分别触发Missing expected rejection/exception。均在私有源码副本进行，未改工作区来制造反例，未出现导入或初始化失败。这证明正式断言能抓住修复撤回及容量/完整性保护退化。

复审过程也保留两类测试装配失败：客户端增强最初误用id而非pageId，修正后又被既有“审核须当前激活页面”规则拒绝；补齐activatePage→flush→捕获revision的真实顺序后通过，未放宽产品审核守卫。旁置候选合同初次7/9，2项因未复制构建配置失败；补入原配置后9/9，未改断言。见`client-projection-selector-failed.log`、`full-client-inactive-failed.log`和`candidate-config-missing-failed.log`。最初981/981全量原件另存`full-initial-green.log`，最终含客户端接续及摘要保护的全量以`full.log`为准，不覆盖失败证据。

主包命令（zsh）：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。新增组：`tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/v340-snapshot-admission.test.mjs`。构建在业务包执行`../../tools/bin/node node_modules/tsdown/dist/run.mjs --config tsdown.config.mjs --out-dir ../../.local/stage5-snapshot-admission-20261023/build`；npm dry-run使用固定tools/bin/npm、offline/ignore-scripts、私有cache和两个独立空配置，未安装依赖。

## 保全及阶段边界

起点3286份文件冻结于`baseline.json`，原src旁置保全。既有文件只改三个运行合同/服务/完整性模块及状态摘要，其余3282份SHA256保持；新增Host辅助模块、正式测试、计划和本报告。旧正式测试/夹具、历史设计、审计/FAIL、锁/manifest、业务资源/pin、活跃lib和Profile/应用/准入保持。旧状态全文作为本次摘要精确字节后缀保存；最终核验见`preservation.json`及`final-summary.json`。

本轮为单代理作者复审，未发现本次范围内尚未修复的P1/P2，不保证未测路径没有问题。未启动Desktop/实际DSH或浏览器UI验收，未新增真实模型/API、认证/登录、上传/费用、对话发送；未安装依赖、修改Profile/应用/准入，未提交/推送/发布。两种来源标签均为内部合成执行器，不代表真实来源接线或业务质量验收。

阶段5整体仍未完成。真实来源与逐节点项目/服务映射、非文本解析、原生打开/导出/引用、实际Desktop及正常重启、跨进程排他、安装升级/降级及发行仍待实施或验收。多份材料/大文本可能在去重后仍超2MiB，人工修改导致累计输出超1MiB也仍会被保护拒绝；本修复不承诺所有单文件上限内的任意组合都能执行。
