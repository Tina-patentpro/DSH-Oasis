# 阶段5新版运行、持久化及旧记录兼容全面复审

日期：2026-10-22（Asia/Shanghai）。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支 `mac/continuity-v2`；HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**裁定：发现3项可复现P2遗漏，阶段5运行/持久化基础不能维持“无遗留P1/P2”的收口结论。正式全量924/924和Mac 26/26再次通过，但新增7项审计探针有3项失败；三个失败分别对应A1–A3，均不依赖2.0.17恢复件。未发现本次范围内新的P0/P1或旧审核/保存回执被覆盖的回归。**

本次为单代理复审，不是第三方独立审计。只新增本报告、前置当前状态摘要及忽略目录内的审计材料，未修复产品或修改正式测试。旧计划、收口报告和失败证据保留；本报告更新其当前结论，不改写历史。没有启动Desktop、实际DSH Host或新增真实模型/API调用。

## 1. 范围与方法

核对[本轮执行计划](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/plans/2026-10-21-stage5-runtime-persistence.md)、[原收口报告](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/evidence/2026-10-21-stage5-runtime-closeout.md)，逐项审阅新增3个运行模块及其仓库、合同、Host/RPC和dispose接线。检查19项新增正式测试（运行18、Host重建1）、旧记录迁移、审核/保存和既有P1/P2回归；复跑全部正式测试，并增加并发时序、长文稿、14节点两来源标签及8次运行容量探针。

起点冻结3261份版本控制范围文件，包括未跟踪但未忽略的既有工作；账本位于 `.local/stage5-runtime-reaudit-20261022/`。测试采用固定Node24.21.0、私有HOME/cache、空npm配置和业务外网阻断环境，不安装依赖。磁盘测试使用临时JSON storageDomain适配器与真实repository；Host测试使用插件/Cordis及Connection夹具。这些证据不代表实际DSH安装包存储、Desktop进程重启、跨进程互斥或真实生成验收。

## 2. 发现

### A1 / P2：准入落盘到执行所有者登记之间，观察会误判活跃运行已中断

位置：[v340-runtime-service.js:79](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-service.js:79)、[观察路径:106](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-service.js:106)。

`createV340Run`等待repository提交及Workspace guard返回后，才在`active`登记所有者。`observeV340Run`只判断盘上prepared且`active`缺项，就排队settle为unknown/INTERRUPTED；真正执行该mutation时不复核所有者。并发读者能在prepared已可见、创建调用尚未恢复的窗口启动观察。

探针在测试存储完成prepared写入后、put返回前发起实际service观察，不修改生产方法、不创建第二写者。实际事件为：prepared落盘 → executor派发（signal未abort）→ 观察将运行写成unknown/INTERRUPTED。执行器返回明确completed，正常结果被后续settle忽略，运行永久未决、Workspace继续锁定。探针期望活跃运行正常完成，实际unknown；多次稳定复现。

这不是“重开后无所有者”的正常恢复，也没有证据表明本例在停止落盘后才派发；后一个说法不成立。修复应协调正在进行的准入和观察，在仓库串行mutation内复核所有权/准入状态，并确保关闭、准入失败和真实重开仍能结束所有者生命周期；不能简单取消孤儿prepared的unknown保护。

正式回归缺少这个并发窗口，只覆盖创建调用返回后观察、停止、关闭以及真正的重开。生产未注入执行器且没有run/create RPC，当前影响限于已交付的内部合成生命周期，因此列P2；接入真实来源前必须修复。

### A2 / P2：累计组装允许的文稿被较小读取上限拒绝，完成结果丢失并转为未决

位置：[v340-runtime-integrity.js:32](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-integrity.js:32)，关联[v340-document.js:55](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-document.js:55)和[v340-runtime-service.js:102](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-service.js:102)。

新运行保存前使用`inspectV340Document`验证完整结果，但该函数共用文件schema的300000字符上限；累计组装器与新结果合同允许的范围更大，组装器只在文稿超过1MiB UTF-8时拒绝。

复现：合法`research_request_text`为299000个ASCII字符。合成执行明确completed，累计组装成功，文稿305294字符、306328字节，远低于1MiB。repository提交结果时在inspect的300000字符校验失败；worker外层catch把它当发布失败吞掉，原记录停在prepared，观察后成为unknown/INTERRUPTED、result=null。此时没有模拟磁盘故障，丢失的正是已经生成的合法结果。

应统一组装、检查、存储和后续前序文件读取的容量合同，按既定字节边界验证，不截断或重新标记旧hash；并区分可预见的合同失败与存储故障。回归须包含300000字符边界、1MiB字节边界、多字节文本、累计前序文件和关闭/重开，验证合法结果可提交且超限不会丢旧证据或伪装可重发。

### A3 / P2：已完成的合法结果大于100000字符时，编辑草稿保存入口直接拒绝

位置：[v340-runtime-contract.js:33](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-contract.js:33)及[命令schema:58](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/v340-runtime-contract.js:58)。

结果合同允许较长主Markdown，而`resultDraft.body`与`result/draft.body`均硬限100000字符。两者不一致使合法完成结果无法以完整正文初始化编辑草稿；并非revision或baseSha过期。

复现：110000字符合法输入生成116294字符、117328字节的结果，运行成功completed。以该结果的当前hash和完全相同的body调用`saveV340ResultDraft`，立即抛出V340_INVALID_INPUT。原结果保留，但草稿功能对这类正常产物不可用。短正文回归无法发现此遗漏。

应确定统一且能容纳合法产物的编辑字节合同，同时保留原hash绑定、revision冲突和record总量保护；补齐长稿保存/重开、少量编辑、明确放弃、过期放弃及原产物不变的回归。不得以静默截断长稿通过校验。

## 3. 已确认的保护与证据边界

| 审计重点 | 本次结果与限制 |
| --- | --- |
| 旧v1–v4读取 | 正式测试实际执行通过：读取不写盘，不给旧任务补v340，不重算输入/产物hash。无关旧工作流即使版本字符串为V3.4.0仍可读。 |
| 旧审核/保存证据 | V2/V3/V4混合记录新增新版任务并重开后，旧task整体深相等，包括approved审核、原产物及两文件writeback回执。另增探针验证新版完整运行、编辑草稿保存、第二次运行停止/迟到及重开全过程，旧task仍逐项相等；未发现擦除或重标。临时存储夹具不等同真实业务库迁移验收。 |
| 老客户端替换 | 保留Host专属v340、原结果及结果草稿；不能伪造v340、删除已有新版任务或越过revision竞争。旧任务原删除策略未被扩成新功能。 |
| 未决与重开 | 真正失去所有者的prepared经观察转unknown且不重放；unknown锁定输入/来源及Workspace新派发，旧本地/API未决与新版互相保护。A1说明活跃准入期间的判断仍有遗漏。 |
| 并发与幂等 | 同revision只准一次提交、requestKey不能换任务/输入，同Workspace跨任务runId冲突拒绝；跨Workspace相同runId结果/停止隔离。未声称跨Host/跨进程锁。 |
| 迟到响应与停止 | 已unknown的结果不会被晚到completed覆盖，其他任务/Workspace不串写；并发停止探针通过。停止仅停止本地等待，不证明后端取消或退款。 |
| 故障与关闭 | 准入写失败不派发；结果写失败保留prepared直至观察，忽略abort的执行器不挂死close；立即close不派发排队调用。A2另揭示合法结果的合同异常被错误归入同一失败分支。 |
| 输入冻结与结果草稿 | 指定真实临时文件正文/hash在准入后冻结，外部文件改动不改原快照；短编辑稿重开、基线绑定、过期放弃均通过。A3限制长稿，不能概括所有合法结果均可编辑持久化。 |
| 14节点/两种标签 | 新增审计矩阵实际创建28个合成任务、完成并关闭/重开逐项深相等；不是14节点真实Skills/API验证，也不替代专业内容质量验收。 |
| 容量与证据淘汰 | 新增探针确认第9次运行拒绝，前8次完成记录及第一版编辑草稿逐项不变；不自动淘汰历史。文稿与编辑容量仍有A2/A3。 |
| 审核与物理保存 | 旧审核/保存逻辑在全量中通过。新版reviewStatus仍只能not-reviewed，尚无新版人工审核、编辑新版本、物理Markdown保存/导出和原生引用链路，不能声称这些动作已验收。 |
| 生产边界 | 真实Host不传V340 executor，14节点实际来源均disabled，无run/create RPC；没有以synthetic冒充真实运行。 |

原3份Host/Connection测试的diff保留原断言，只随真实新增路由更新精确计数并追加新版断言/Host重建测试；原P1/P2测试文件本轮审计未动。全量绿色只能证明已有断言通过，不覆盖A1–A3缺失的断言。

## 4. 新鲜测试与构建

zsh启动的包装命令使用固定Node，完整argv/cwd/UTC时间/退出码见[commands.jsonl](/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/stage5-runtime-reaudit-20261022/commands.jsonl)。本地日期与UTC日志日期分别保留。

| 检查 | 结果 | 本轮证据 |
| --- | --- | --- |
| 主包所有test/*.test.mjs | 924/924，0失败、0跳过，退出0；含新增19项 | full.log |
| Mac原生Markdown/Sidebar/Web/启动/安全预览 | 26/26，0跳过，退出0 | mac.log |
| 最终审计探针 | 7项，4通过、3失败，0跳过，退出1；A1–A3稳定复现 | probes.test.mjs、audit-probes-final.log |
| 固定tsdown旁置构建 | 退出0；client.js与活跃lib逐字一致，未覆盖lib | build.log、verification-summary.json |
| 固定npm pack dry-run | 退出0；117成员，无测试/依赖/工具/归档/运行目录 | pack.log |
| 两种只读--check | 均退出1，拒绝现有应用可执行文件漂移；未spawn | check-synthetic.log、check-real.log |
| 文件保全、13项pin、diff | 原产品/正式测试/lib/锁/资源及组件准入pin保持；diff退出0 | preservation.json、final-checks.json、verification-summary.json |

早期`admission-probes.log`、`admission-trace.log`保留了一个“停止请求发起后必须零派发”的过严测试预期。事件追踪证明派发发生于停止落盘之前，不能据此报告停止后派发缺陷；最终探针改为检查停止后的unknown和晚到结果保全，该项通过。边界探针的阶段性日志也保留，没有把失败计为正式回归通过。

本轮没有重装/重新联网全量验证供应链；主锁SHA256仍为 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，13项组件/补丁及admission文件hash与原冻结清单一致。重构client.js SHA256仍为 `c062f9a0a765aea03fe1311209c73093418becb57bc389b2bc7a25d455ed3d9e`。源码/lib与目标安装候选的完整配对准入仍待完成，不能由单项pin未变代替。

## 5. 不受2.0.17缺件影响的下一步

按以下优先顺序推进；本报告只列出，没有开始产品修复或新增设计：

1. 修复A1的准入/观察竞态及A2/A3容量合同，保留本次失败复现，转为正式回归；增加正常并发、失败准入、关闭、真重开、长文稿和多字节边界，重新全量及复审。先解决当前基础遗漏，再依赖该基础开放后续接线。
2. 按已确认设计完成新版共同输入/结果页面及同一份草稿，接入编辑新版本、固定审核确认、无覆盖物理保存/导出及原生对话草稿的无模型合同/组件测试。新界面重大变化仍按设计版本决定，不默认为本审计已批准。
3. 本地业务资源与原生适配器的无模型接线：冻结每节点资源身份、输入/输出和一次调用边界，以原生服务替身验证，不打开实际模型派发、不消费旧预算。
4. 逐节点核对共同字段→API inputs→结果类型和现有服务/schema/账户项目绑定证据，记录缺口并保持来源禁用；不猜folder_id，不登录、不新增API请求。
5. 明确并实现获准的PDF/DOCX/图片材料解析切片，使用本地合成材料做正文、来源和哈希回归；当前md/txt能力不外推为全文件支持。
6. 阶段6离线准备：候选源码/lib/资源清单、版本变化和历史资源读取政策、合成迁移/回退矩阵及失败保全。当前新v340记录仅以当前资源指纹验证，未来资源升级与旧二进制回退须单列验证，不能靠改hash冒充兼容。

## 6. 仍未完成的安装包与真实运行事项

指定2.0.17恢复件路径及旁置应用仍不存在；现有安装为已报告的2.0.18，两种check本次继续拒绝漂移。F1/R1可信恢复件取得、旁置恢复和整套候选准入，R6/F3/F4实际Desktop编辑/审核/键盘/窗口，原生文件与对话草稿、正常重启、安装升级/回退及发行验收继续未完成。

真实模型/API、账户登录/上传/费用的实际验收还分别受当前明确禁令与调用授权条件限制，不能归结为只缺Desktop文件，也不能沿用旧单次预算。本轮无真实Profile/业务库、认证、应用或准入变更，无对话发送、Git提交/推送或发布。
