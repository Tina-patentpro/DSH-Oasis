# 两项P1补修与再次审计收口

日期：2026-10-21。对应[复审报告](2026-10-21-audit-remediation-reaudit.md)的A1/A2，执行[补修清单](../plans/2026-10-21-p1-followup-repair.md)。用户已明确授权修复、补齐回归及重新审计，继续先做不依赖Desktop2.0.17恢复件的工作。

**裁定：两项P1在代码、无网络原生运行库/持久化合同及真实浏览器组件范围内均已修复，并取得失败→修复→通过证据。本次范围内复审未发现新增P1/P2；当前Desktop、原生对话/文件接线与重启验收没有执行，供应链干净恢复仍未关闭。不能据此宣布整体候选或发行通过。**

根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`；复用分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。按项目规则单代理执行与复审，不宣称独立评审；没有提交、推送或发布。

## 一 两项修复与关闭证据

### A1：终态前本地校验失败保持未决

修改[原生生成适配器](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/dsh-generation-adapter.js)。文本消费者记录是否收到有效stop/max-tokens/tool-calls终态；已派发后在有效终态之前发生本地INVALID_OUTPUT，返回unknown。原有ECONNRESET、无finish截断、TIMEOUT/ABORTED及迟到响应保护保持。

没有放宽100000字符/1024块限制，没有延长120000ms期限、自动换源或重试。完整stop后的空正文/不合格输出、明确max-tokens/tool-calls终态及明确认证/额度拒绝仍为已知失败。SDK包装的GENERATION_FAILED仍不能作为提供方停止或退款的证据。新增内部终态标记不进入持久化schema，原始错误与部分正文不保存为成功产物。

回归：

- 在[adapter测试](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/dsh-generation-adapter.test.mjs)加入9组状态断言：超长、工具包、非法索引、超块数、伪终态均保持unknown；stop后空文本、max-tokens、tool-calls及stop后晚到无效数据保持已知失败。
- 在[原生生命周期测试](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/dsh-stream-lifecycle.test.mjs)加入local-text-limit。使用当前固定Cordis/LLM运行库和实际Workbench服务；提供方只返回100001字符，后续终态不被消费。运行持久化为unknown/INVALID_OUTPUT、无result/finishKind；序列化重开后，同key只观察，新key被WORKSPACE_GENERATION_ACTIVE拒绝，原生替身prepare/stream各1次。
- 所有原生替身禁止fetch外传。先看到unit及原生服务均错误failed的红测，修复后相关31项全部通过。

### A2：冲突及错误态可取回草稿并明确恢复

修改[完整页面](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/client/PanelPages.js)、[草稿store](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/client/workbench-store.js)及[Surface回调](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/client/OasisWorkbenchSurface.js)。沿用既有冲突提示区域，复用已有放弃动作，不增加独立产品入口、依赖或持久化协议。

conflict/error页面列出当前Workspace全部任务的dirty结果草稿，包括非活动任务；显示任务、版本和baseArtifact身份。逐字正文以可选中的只读textarea提供保全，生成内容不会执行为HTML。用户可先选中复制，再逐项点击“放弃此结果编辑”。草稿未处理完时禁用重新载入；全部明确处理后，才由用户另行点击“重新载入服务端版本（舍弃本地输入草稿）”。store原有dirty reload保护保持，不借UI修复清空或绕过。

结果草稿放弃不会修改本地输入；后续reload的输入舍弃语义独立标明。新增可选expectedDraft只用于确认所展示草稿仍是当前对象，过期点击不能擦掉新编辑；原不传参数的编辑器动作保持兼容。保存进行中仍禁止放弃。异步动作失败由提示区域接住，保留当前状态，不制造成功反馈。

回归：

- 新增[完整页面与store回归](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/result-conflict-recovery.test.mjs)，纳入标准test/*.test.mjs。覆盖conflict/error两态、多任务逐字草稿、跨Workspace隔离、HTML惰性、逐项放弃、reload保护/恢复、过期草稿快照及保存中禁止放弃；4项通过。
- 扩展[实际DOM夹具](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/result-panel.browser.mjs)，通过createRoot/StrictMode挂载完整PanelPages，执行“取回正文→逐项放弃→显式reload”。error场景另覆盖reload失败后再明确恢复。旧4项版本/项目切换及固定审核场景继续执行，合计6/6通过。
- 实际浏览器红测为旧4项通过、完整conflict/error两项失败；修复后6项全部通过。未改系统剪贴板，仅从用户可选中的实际textarea读取逐字正文，未宣称原生复制/保存或Desktop验收。

![六项真实浏览器组件回归通过](/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/p1-repair-20261021/browser-green.png)

## 二 命令、结果及失败保留

所有命令由zsh发起，固定Node24.21.0。node测试/构建/pack包装器使用私有HOME/cache、独立npm配置、合成标志和阻断外部代理。浏览器只访问127.0.0.1回环夹具；未启动DSH或签名Desktop，没有模型/API、认证、上传或费用操作。

| 检查 | 实际结果 | `.local/p1-repair-20261021/`证据 |
| --- | --- | --- |
| A1红测 | 新unit/native两项均failed≠unknown，退出1 | a1-red.log |
| A1相关绿测 | 31/31，退出0 | a1-green.log |
| A2修正夹具后的红测 | 3项失败、1项原保护通过，退出1 | a2-red-corrected.log |
| A2首批相关绿测 | 33/33，退出0 | a2-green.log |
| persistence实际渲染/恢复组 | 7/7，退出0 | persistence-render-green.log |
| 最终主包全部测试 | 905总计、903通过、0失败、2历史跳过，退出0 | final-tests.log |
| 实际React DOM/StrictMode | 6/6，通过结果已从页面读回 | browser-green.json、ax.txt、png |
| 固定tsdown构建 | 退出0，lib/client.js及map重建 | final-build.log |
| 固定npm pack dry-run | 退出0、114成员、无测试/工具/依赖/运行/归档目录 | final-pack.log |
| Mac启动与安全预览合同 | 19总计、18通过、1历史跳过、0失败，退出0；其中启动14/14 | mac-contracts.log |
| 默认及正式Desktop check | 各退出1，拒绝现应用可执行文件pin漂移 | preflight.log、preflight-real.log |
| 3份旧Windows安全测试 | 3个文件装载失败，未算通过 | legacy-tests-blocked.log |
| diff空白检查 | git diff --check退出0 | final-summary.json记录 |

当前主包总数相对修复前899增加6项，分别是1项adapter状态表、1项原生生命周期场景、4项完整页面/store回归；原阶段5的13项仍属于既有基线。浏览器2项新增不混计进905。源码/测试没有改动后反复刷绿次数；仅在首轮失败定位并修正对应测试装配后重跑。

两项主包跳过仍是旧Windows `.dsh-test/stage2-desktop` 的离线准入和服务声明；Mac额外跳过仍为patchedMode=false下的重放检查，实际4项安全预览断言已运行。旧native-markdown-policy依赖stage3-desktop-app的React缺失，sidebar-safe-file缺旧client.js，web-markdown-policy引用Windows bundle报ENOENT，均与本轮产品修改无关，保留无法装载状态。

调试过程的失败也保留：A2首轮测试误把hydrateWorkspace的error状态回执当Promise拒绝，核对真实合同后更正；浏览器首轮IIFE构建不支持顶层await，改异步main后才执行红测。第一次全量905中，旧panel-persistence-ui用浅层元素遍历读取不到新子组件，造成1项失败；将该项改为实际React SSR，保留原有loading/conflict/error文字、role与不泄露原始错误断言后，7项定向及全量905均通过。没有删除失败记录或削弱断言来取得绿色结果。

## 三 再次审计与保全

单代理按A1/A2关闭标准重新检查了：有效终态与伪终态分类、明确失败反例、实际服务持久化/新请求锁、部分正文不发布；冲突/error两条页面早退路径、非活动任务、多草稿、Workspace身份、过期放弃、保存中限制、reload失败及原审核确认兼容。修复范围内未发现新增P1/P2。该结论只覆盖列明的源码/合同/组件证据，不能扩展为实际宿主或所有运行路径无回归。

开始前冻结3246个指定工作区文件并保存关键修改前原件。报告前核对仅有10个既有文件变化：4个生产源文件、4个测试/DOM夹具及2个lib构建文件；新回归、计划和报告单列。阶段5的3份Host源码、3份测试及其他新增合同文件均与本轮开始一致，没有混入修复或回滚。

同时对原修复3198项指定输入重新核对：无文件缺失，无超出前轮已记录变更及本次允许清单的变化。原应用、准入、锁文件、依赖、15+13设计、旧运行/unknown与业务证据保持原字节。没有重算pin让新client.js冒充原装配已获准；后续候选绑定仍须单独核对。状态文件只前置本次摘要，旧完整后缀及CRLF保留。完整文件清单/SHA256、精确argv/cwd/退出码分别见baseline.json、preservation-before-report.json、commands.jsonl、final-summary.json。

| 项目 | 本轮后状态 |
| --- | --- |
| A1 / F2新增遗漏 | 代码＋原生运行库替身＋序列化重开及未决锁通过，本P1在该范围关闭 |
| A2 / F3恢复回归 | 代码＋完整页面SSR/store＋实际DOM通过，本P1在该范围关闭；F3整体仍待Desktop |
| F4固定审核确认 | 旧4项组件及全量测试保持通过；Desktop待验 |
| F1 / Desktop固定组合 | 恢复件缺失及2.0.18漂移保持阻塞，两种check仍拒绝 |
| F5 / 供应链干净恢复 | 沿用旧未完成裁定；本轮没有重新物化、下载或关闭policy |
| R6 / 阶段4整体 / 阶段6发行 | 未完成，不以本次局部通过替代 |

未提交结果编辑仍只承诺同进程保全，跨应用退出/崩溃恢复未实现。本轮临时浏览器页与回环服务已关闭；没有修改日常Profile、认证、应用、全局环境或远端。
