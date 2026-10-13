# 首模板程序证据收口 — 2026-10-11

## 目标、授权与结论

用户明确排除生成内容质量，并批准执行精简计划：先判定现有实现与证据是否对应，只补影响程序交付的真实缺口，满足范围后停止。沿用当前 main / 73b826f05c64142ea7bf866d10bc67e10da809be，不提交、推送、发布、安装或操作开发/日常窗口。

当前整个首模板双来源运行验收状态：**STATIC_ONLY**。本轮没有发现需要修改源码的具体程序缺陷；当前安装的同页切换、业务 A/B 恢复、网站记录样本导入、安全预览样例、固定版本单次草稿插入、版本切换和标签重开已有实际证据，不重复执行。历史真实本地/API 生成不改写为当前宿主的新真实派发证据。内容质量不再是本轮程序门禁，但取消质量门禁不等于补齐运行证明。

本轮只改本记录、当前状态索引及当前升级 tasks；不重写旧 evidence，不统一清扫所有历史清单，不晋升 AGENTS/开发 Skill 的整体验收基线。单代理作者自查，非独立复审。

## 新鲜验证与证据复用条件

- shell=cmd.exe、login=false：git status --short --branch、git log -1 --format=fuller、git diff --check 均退出 0；开始时工作区干净，HEAD 为 73b826f。
- shell=powershell、login=false（NoProfile）：2026-10-11T02:19:59Z 定向逐文件 SHA-256/缺失状态核对退出 0。对照 batch2-view-reopen-20261011-01/after.json，201 仓库输入（含 94 个 test 路径）、494 安装成员（110 业务包 + 384 Sidebar）、4 入口控制、46 有限保护项、12 日常控制、29 Workspace 文件，共 786 项，差异 0。只用于该有限范围，不声称全 Profile/userdata 不变或此刻仍保留 UI 草稿全文。
- 复用 git-closeout-20261011-01/verification.json 的同输入验证：build/test/pack 退出 0、856 通过/2 既有条件跳过、110 包文件、client.js/map 字节一致。本轮不重跑完整测试或构建。
- 当前 pin 仍为 Desktop 2.0.17 / DSH 0.2.0-rc.2 / Sidebar 0.24.1 + safe-native-files-3 / Cordis 4.0.4；pin/准入控制哈希未变。实际安装 dsh-llm 的版本和公开 prepareCall、PreparedLlmCall、BlockAssembler、createUserMessage 合同另作只读核对，不拿全局 CLI 替代。

原始证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007。

## 只补一处实际缺口：原生消息/组装器互操作

已有 dsh-generation-adapter.test.mjs 使用 TestAssembler 和消息替身，没有覆盖当前实际 0.2.0 原生消息构造器及组装器。此项可不启动 DSH、不用材料或凭据、不开网络补证，不需要重新生成。

新增一次性纯合成离线检查位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-closeout-20261011-01\native-helpers.mjs。使用私有 Node v24.19.0、实际已装 dsh-llm 0.2.0-rc.2 的 BlockAssembler/createUserMessage、当前主源 createDshGenerationAdapter；llm.prepareCall/stream 是内存替身，没有实例化原生 LlmRuntime、注册提供方或调用真实模型/API。

运行命令（shell=powershell、login=false）：

```powershell
& 'D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\runtime\node.exe' 'D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-closeout-20261011-01\native-helpers.mjs'
```

2026-10-11T02:23:04Z 退出 0，两个断言场景通过：原生消息/组装器正确返回合成文本且不发布 reasoning；max-tokens 不发布部分成功产物。fetch 尝试 0，每场景内存 prepare/stream 各 1，无真实提供方。没有修复行为，所以没有虚构 RED→GREEN。原生模块 SHA-256 为 9132c8a8053ee82b9fb1ded4f98c85cf557f288a15a85c552c6b1fb319ead120，与 candidate-pin 的该成员一致；适配器 SHA-256 为 1a21654b829f66d0d5efb67d8d101b2ee8bd9c45ed6fcbcd1754b6f773e4f512。结果仅为原生 helper 的离线互操作，不上推为当前完整生成或 Desktop 运行证明。

## 已满足项：复用，不重做

| 程序合同 | 有效证据及边界 |
|---|---|
| 同页输入/来源、业务 A/B 恢复 | 2026-10-09-current-ui-recovery.md；当前组合实际 UI。原生下拉重定向同一 composer 草稿，不认证独立会话草稿隔离。 |
| 生成输入/确认/未知请求不重发 | 当前不变源码及同输入 856 项包级验证；native-model-service、claims-api-execution、claims-api-transport、oasis-upload-checkpoints 等既有测试，不新建诊断器。 |
| 编辑不继承审核、未审固定版本拦截 | 2026-10-03-s6-result-edit-recovery.md 的旧组合实际编辑/再审，当前不变 unified-generation-service/claims-v2 测试。10月11日三个版本均已审核不表示合同从未验证，不为重复 UI 测试另建未审核版本。 |
| 保存/打开/版本与引用 | 2026-10-03-s6-common-artifact-functional-acceptance.md、2026-10-03-s6-result-edit-recovery.md；10月9日新组合旧审核/路径恢复，10月11日新组合正向单次插入、版本往返、标签关闭重开。 |
| 对话草稿保全 | batch2-native-reference-20261011-positive-01、batch2-version-review-isolation-20261011-01、batch2-view-reopen-20261011-01/result.md；949 normalized UIA 字符、固定正文一次、按钮防覆盖、未发送。该 UI 原文不复制进本记录，也不新增本轮 UI 操作。 |
| 网站记录 V2 | 当前批准的项目/记录筛选分页及部分失败；输入5046保存3460字节且 SHA 匹配，输出1664网站保存地址一次下载15987字节/SHA验证后同内容跳过。后者不是旧 signed-tool 地址修复。 |
| 首版必要预览样例 | batch1-sidebar-preview-20261008、batch1-markdown-safety-20261008、batch1-html-safety-20261009；DOCX两页、Markdown/内嵌HTML、独立HTML惰性样例及资源正反对照。任意 Office 外部模板/全格式不属于此样例收口，不宣传普遍安全。 |
| 正常启动及恢复 | 2026-10-07-dsh-upgrade-preparation.md 的原入口/正常重启/偏好恢复，加上述当前组合任务/旧结果恢复；不重新要求已满足的保存退出或前台回传。 |

## 真正保留的运行缺口与非阻断关注

1. **当前组合完整生成派发仍未验**：9月12日的真实本地来源与9月28日的真实 Fast 各有成功证据；本次 SDK/设置 owner/会话选择接点变化，不能仅凭业务源未变或本轮 helper 检查就将其标成当前 0.2.0 宿主双来源真实验收。需在本地原生服务绑定、上下文解析、请求派发和返回链路层获得对应运行证据；优先无网络合成原生合同，只有替身不能覆盖的真实提供方/接口环节才提出材料、目的地、一次预算与明确许可。本轮不自动再调用，也不将缺证定为程序失败。
2. 旧 signed-tool HTTP404 根因未证明；当前资格规则显式禁用且不回退、不加 Bearer、不重试，网站保存地址样本成功。因此不阻塞该批准 V2 样本合同，但旧地址不能宣布修复。
3. 原生 Workspace 下拉保留同一 composer 草稿，发送前须核对当前项目；本产品不冒充独立会话草稿管理，本轮不修改宿主或发送。
4. 纯合成安全补丁测试未能在干净检出直接复现，仍为已披露维护项。此轮不迁入整套测试/材料目录，不新增永久工具链。
5. 首模板之外的 Basic 异步、第二模板、独立项目文件、正式发行/日常安装另立切片。已被用户排除的额外跨版本 Desktop 演练不恢复成强制门禁；旁路恢复证据与完整演练保持区分。

## 本轮停止点

最终文档及保全复核：2026-10-11T02:27:20Z，shell=powershell、login=false，退出0；同一786项仍差异0，9份必要证据文件存在，已跟踪/未跟踪变更严格限定本记录、当前状态、升级tasks共3份文档；实际原生helper模块同时匹配本轮运行SHA及pin。新增结果以CreateNew保存于D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-closeout-20261011-01\verification.json。git diff --check退出0；原仓库autocrlf提示保留，不更改Git设置或无关文件换行。

当前没有具体源码缺陷或失效测试要求修正；完成必要文档对齐后结束本轮，不为清单齐整新增调用或界面操作。源码、依赖、安装、Profile、用户产物及原未发送草稿未主动修改；只新增上述合成证据和最小文档变更。不声称整批、当前双来源真实运行或正式发行已完成。结论范围不包含生成内容质量，历史内容关注保留而不作程序阻塞。

调查时尝试读取按旧名称猜测的 native-model-service.js、verify.py、src/index.ts、after.json 均明确失败；改按实际 imports/目录/已装 lib 定位，没有将缺失文件当成验证通过，也未生成或恢复这些旧路径。历史失败未删除。

## 用户批准的下一步：实际原生服务离线互操作

本节为独立的后续执行记录，覆盖上文“尚未实例化原生 LlmRuntime”的当前性，不改写旧检查的边界。批准范围仅无网络、内存提供方/存储和纯合成材料，不操作现有 Desktop/Profile/未发送草稿；发现具体产品缺陷才修改源码。本轮离线互操作目标 **PASS**，整个当前首模板双来源实际运行仍 **STATIC_ONLY**。

一次性检查与结果：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-native-runtime-20261011-01\check.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-native-runtime-20261011-01\result.json

执行技能沿用 superpowers:executing-plans → 项目 dsh-plugin-development 的实际合同核对 → superpowers:verification-before-completion；单代理。计划为匹配当前源码/固定包与保护基线，在新 Context 中绑定真实 LlmRuntime，通过内存上下文走原有 claims-v2 确认/运行/回写，然后退出服务并复核。停止条件为必要断言通过或发现不能由内存证明的真实接线缺口，不启动宿主、增建诊断平台或反复完整测试。

命令（shell=powershell、login=false/NoProfile）：

```powershell
& 'D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\runtime\node.exe' 'D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-native-runtime-20261011-01\check.mjs'
```

2026-10-11T02:35:35Z 最终运行退出0，四项断言场景通过：
1. 实际 Cordis 4.0.4 可选服务缺失时不开放本地运行，依赖齐备后绑定。测试宿主显式声明外层 workspaceRegistry，再由当前 bindNativeModelRuntime 注入四项原生生成服务；不是直接以 root Context 冒充实际 Host 的依赖边界。
2. 当前 resolveDshGenerationContext 执行 pending、默认模型、既有 requestHeader 与 adapterDefaults 的选择规则；错误 Workspace/cwd 被拒绝。这里 Workspace、Session、projection/default-model 是显式内存服务，不证明已装原生 owner 的返回形状或真实会话状态。
3. 实际已装 0.2.0-rc.2 LlmRuntime.prepareCall/单次 PreparedLlmCall.stream，实际 LlmAdapter 子类（纯内存），实际消息和组装器，通过当前 claims-v2 业务服务完成确认→输入/Skill快照→派发→结果校验/内存回写。预览及未确认创建不派发，成功后同请求重复不派发；成功运行提供方 prepare1/stream1。Skill0.2.2仅用于本地加载/请求构造；无网络，正文未输出到日志。产物合成，仅验证程序合同，不评价内容。
4. 内存提供方注册句柄退出后返回 MODEL_UNAVAILABLE、不 stream/不回退；可选服务退出后 runtime 禁用。

fetch 与 socket connect 在独立检查进程中拒绝网络，成功运行记录 networkAttempts=0。未注册任何真实模型提供方，也没有启动连接网关/监听端口。内存业务记录的 evidenceKind=native-model 是生产代码路径标签，**不是真实模型证据**，未写入现有用户业务数据。

前后原786项逐文件哈希/缺失状态均一致；仓库包输入与 git-closeout 已验证副本对应，因此使用该副本现有固定依赖，不安装或改变主工作区旧 node_modules。dsh-llm、cordis、dsh-typert-protocol 各 manifest/lib入口共6项与 candidate-pin 一致；不将此有限核对扩大为所有原生依赖全量重新验收。实际 native 模块 SHA 同上文，Cordis入口 SHA 为 6a9394c0877ff45218818c6e815edd038f8057e1a1deb390a8d43ec81c57691e。

保留夹具失败：前三次因外层workspaceRegistry声明缺失而未激活（await root fiber/等待都不能替代真实依赖边界）；一次错误调用ctx.dispose掩盖了提供方夹具传参错误，改用Fiber清理后明确看到failed；随后按实际业务输出helper合同将upstream_snapshot与四表单字段分开；一次错误把可调用注册句柄当.dispose对象，按当前公开类型纠正。均只修改本次合成检查脚本，未据此修改产品；最终绿色不冒充产品RED→GREEN。另一次按错误文件名native-model-runtime.test.mjs读取失败，已按目录定位native-model-service.test.mjs，不作为验证通过。

本轮没有具体源码缺陷，停止扩展离线验证。真实 Workspace/Session/projection/default-model owner 的接线、真实提供方和专业 API 当前派发仍未由本节证明。下一切片只处理这些必要运行边界；不要重复安全样例、UI草稿、已通过业务测试，也不要因内存验证绿色晋升整体验收基线。若需要真实调用，先明确现有项目/材料、具体目的地、单次共享预算和人工许可；已消费旧许可不复用。

## 用户批准的真实宿主只读接线检查：停在安全边界

本轮目标为现有开发宿主的服务绑定与原生上下文接线，不是生成质量/真实派发；用户明确禁止发送、真实模型或专业API调用并要求保留草稿。当前该接线目标 **BLOCKED_WAITING_FOR_USER**：没有取得必要的实时服务返回，不能宣布通过，也不能将工具/准入阻塞判断为产品失败。前节离线互操作结论不变。

采用现有 executing-plans、项目开发Skill、computer-use 和 verification-before-completion；准入失败后只读使用 systematic-debugging 的根因边界核对，无行为修复/TDD或新代理。计划：核对实际开发进程/固定包；只读记录草稿；只用公开本机目录、会话、提供方登记和已加载会话投影（不发现模型、不激活Agent）；复核保护项；触及安全或业务变更边界即停止。

- 实际进程命令（shell=powershell，login=false/NoProfile）退出0：Win32_Process确认开发主35996、Host监听52300；Get-NetTCPConnection确认127.0.0.1:43120。Computer Use返回唯一开发窗口395664，初次只读观察因最小化拒绝，正常激活该已返回窗口后刷新成功，不启动新实例。实际UI显示A项目5967c480-f400-4083-b650-9176dade70d1、旧API/v2已审核结果、防覆盖提示、原生DeepSeek-V41-Flash/High。初次树观察含正文，后续仅提取长度/哈希，不把正文另存至证据。
- 当前业务存储只读摘要：A revision40、B revision6，两既有任务均为workflow2/oasis-api。本轮不切来源、不编辑业务、不调用task/prepare-local，因为其正式合同会拒绝API来源；直接预览验证需要有限业务来源变更，不能假装只读。
- 从固定pin实际定位app/resources/app/node_modules中的Session Controller、session-projection、agent-default-model及workspace/session/llm，不以Profile仅链接包或全局CLI代替。13项原生入口/manifest和私有Node匹配pin。当前原生Session Controller.selectionFor与本插件的pending→requestHeader→default选择/adapterDefaults规则对应；原生projection原始state为pending/lastUsed，wire为next/lastUsed，二者未混用。原生公开session/list不激活Agent，projections使用sessionQuery观察；listProviders仅列已登记提供方，不调用模型发现。这些源码事实不等于实例运行证据。
- 新一次性检查脚本D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-host-wiring-20261011-01\check.mjs严格限制回环origin和4个只读方法，不允许创建/发送/API/模型动作。首次误用不带session-前缀的历史目录UUID，归属断言退出1且Host请求0；按真实workspace注册记录纠正为session-6379a4c7-291d-4a39-8a48-a6c4af76ab49，不修改产品。
- 第二次执行（私有Node、shell=powershell/login=false）退出1：唯一workflow/catalog读取HTTP403，未取得业务结果，其后的native列表/投影调用没有执行。实际Connection源码有Host/Origin围栏和浏览器认证准入；不把无认证外部进程当作已有浏览器，也不读取/复制令牌、cookie或改变信任配置。未重试同一路径、伪造认证或放宽安全。
- 在现有Desktop正常浏览器上下文打开开发者菜单→开发工具5179906→Console，拟用fetch读取上述4个公开接口，不用私有store、DOM、Host注入或shell命令。输入后初次即时树为空；下一次刷新明确出现DevTools“Don’t paste code…”安全提示，prompt仍空。**表达式未执行，没有按Enter、输入allow-pasting或绕过提示**。所有实时返回仍未验。恢复原Network页签和127.0.0.1:10209/batch1-safe-html-20261009/过滤，日志未清、缓存/安全设置未改，然后只关闭本轮DevTools。
- 开发工具既有Console包含连接丢失、ERR_NETWORK_IO_SUSPENDED、remote.mux失败和旧oasis-professional/bootstrap HTTP400记录；未清除，也不凭旧记录认定本次新产品缺陷或真实外部API调用。没有重新载入页面、调用professional/bootstrap或模型catalog来追查，避免扩大授权。
- Computer Use前后草稿逐字相等：949规范化字符、SHA-256 790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b。原项目/API/v2/防覆盖状态保持；没有发送、引用、输入修改、创建运行、来源切换、真实模型/专业API或上传下载动作。不声称整个活跃宿主后台绝无任何网络。
- 最终2026-10-11T03:25:35Z有限保护复核（shell=powershell/login=false）退出0：201仓库、494安装、4入口、46保护、12日常、29Workspace共786项与基线无差异，业务JSON SHA一致；原生13项及私有Node再次匹配pin。仅有限范围证明，不声称DevTools正常UI缓存/偏好或全Profile/userdata绝无事务。

原始记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-host-wiring-20261011-01\ui-result.json、verification.json。新脚本保留失败，不存在成功result.json，不把预编写的成功分支当已执行结果。调查中workbench-rpc-runtime.js、Profile下@dsh及@deepseek-ai/dsh不存在、一次引号参数错误均明确失败；按真实imports/pin/app包定位，无安装或新建旧路径，失败不是绿色证据。

**人工决定/下一步精确边界**：已询问是否允许仅把现有任务从API切到本地Skills、打开生成前确认预览，再还原API。该操作会改变业务来源/revision，须获此有限许可；不得按确认生成或发送，草稿必须前后逐字一致。按已核对prepare-local合同，预览只解析上下文/本地资源与输入，不调用LlmRuntime.prepareCall/stream或专业API。若获批且成功，可证明当前真实owner接线，不认证提供方凭据、网络或生成；若仍失败按实际代码/返回诊断，不扩大权限。现阶段不执行该来源变更、不修源码、不重装重启/提交推送/晋升基线。

## 后续明确批准：有限来源往返与真实宿主预览

用户答复“允许上述有限操作”，已消费本次有限操作许可，不续期真实调用。该窄目标 **PASS_WITH_CONCERNS**；此节覆盖前节等待来源变更许可的当前性，保留403/DevTools安全阻塞历史。完整当前双来源运行仍STATIC_ONLY，不评价生成内容质量。

计划与停止条件：先只读核对草稿/786项基线；既有任务API→Skills，只点一次“核对模型与材料”；记录确认预览但不勾选、不确认生成；还原API及原结果视图；比较草稿和业务逐叶哈希。有未批准变化、安全屏障或预览错误即停止，不修源码、不改模型/配置、不创建新运行。沿用Computer Use、executing-plans、项目开发Skill和verification-before-completion；名称差异仅按systematic-debugging只读追溯，单代理、无独立审查。

实际操作与返回：
- 仍为已运行开发窗口395664。首次沿用仅文本观察的索引点击因coordinate input geometry unavailable拒绝，没有业务变更；重新枚举同一唯一窗口、激活并取截图/树后正常操作，未重启。
- A原任务98d68e38-3dc7-4060-9187-922a35d11b4a由API切Skills，保存后revision40→41。实际正式入口“核对模型与材料”一次，返回“模型：deepseek-official / deepseek-flash”“发送四选项卡文本（未选上游文稿），共1312字符，另含内置Skill flow-2-6/0.2.2”。确认框未勾选，“确认并生成”禁用；未点击重新核对或确认生成。
- 这次不是合成fixture、外部无认证HTTP探针或DevTools表达式：当前固定业务包的真实客户端仅在native-model能力可用时进入prepare-local，服务实际解析当前Workspace/Session归属/cwd、模型选择和本地Skill/材料。能显示预览证明此预检路径接通，不证明LlmRuntime.prepareCall/stream、凭据、提供方连接或专业API派发。未取得单独原生list/projection接口返回，不将前次未执行探针标绿。
- 随即恢复专业API，revision41→42，恢复原v2已审核结果视图。前、中、后949规范化UIA字符逐字相同，SHA-256 790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b；防覆盖按钮仍禁用。没有发送、引用、运行创建、真实模型/专业API/上传下载动作。不声称活跃宿主后台完全无网络。

保全命令（shell=powershell、login=false/NoProfile）：私有node.exe执行D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-host-preview-20261011-01\snapshot.mjs，分别参数before、skills、restored，2026-10-11T03:36:17Z、03:38:44Z、03:39:16Z退出0。每次核对201仓库/494安装/4入口/46保护/12日常/29Workspace，共786项；初始差异0，后两次仅home/storages/oasis_workbench.json哈希不同。业务逐叶哈希仅允许来源、revision及两级updatedAt；最终来源已还原，只有revision/时间戳三叶不同，所有材料、运行、审核、产物、回写及B记录保持。实际app内六原生包manifest/lib共12项再次匹配pin。是有限范围，不宣称全Profile/userdata不变。无需改源码/重建/重复856项测试。

**仅保留一个新关注：模型选择显示一致性。** 原生选择器前后显示DeepSeek-V41-Flash/High，实际预览显示deepseek-official/deepseek-flash且没有推理等级；当前UnifiedGenerationPage会显示返回route.reasoningEffort（若有），所以不能归因为该组件静默隐藏等级。名称可能是显示别名，不能仅凭字符串判定选错模型。只读追溯确认getGenerationSession来自公开mainView保留者，resolveDshGenerationContext按pending→requestHeader→agentDefaultModel；A持久化投影缓存pending/lastUsed均null，但缓存不等于实时值，尚不足定位根因。Profile cordis.yml仅3字节、patch不含这两个模型名称；未打印配置/凭据，不猜测新owner、不改变配置或扩大到真实调用。下一步只读取得原生显示名与实际模型ID/推理选择的权威对应，若不一致再提出定向修正；本轮不宣布模型选择完全一致或程序故障。

证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-host-preview-20261011-01；before.json、skills.json、restored.json、ui-result.json仅保存摘要/哈希与预览非敏感元数据，不复制材料/草稿正文或凭据。源码、安装、启动入口、设置、日常及远端均未主动修改；仅追加原三份文档和本轮新证据，不提交/推送或晋升AGENTS/Skill基线。

## 后续只读对应核对与本次记录收口

用户继续后只读核对模型标识/默认推理合同，目标PASS；本节覆盖上一节名称关注的当前性，不将旧预览历史抹除或升级为真实派发。采用systematic-debugging→verification-before-completion及项目实际包合同；Computer Use只读窗口，首次最小化拒绝后正常激活同一395664，未点击模型或业务控件。既有API/v2、选择器DeepSeek-V41-Flash/High及防覆盖保持；草稿949字符/SHA790d628f...保持。没有源代码修改、TDD红绿、真实模型/专业API请求、模型选择/设置变更或额外预览。

权威对应均来自当前固定安装文件：
- dsh-llm-deepseek/lib/index.js:43–44，默认目录id=deepseek-flash、name=DeepSeek-V41-Flash；dsh-llm-deepseek-api-key/lib/index.js:36，provider=deepseek-official。名称差异是ID/显示名区别。
- dsh-base/cordis.patch.yml:82–86默认选择只有provider/model；Profile cordis.yml、Profile/app patch及dsh-web-app patch没有覆盖这两个模型入口的相应字段。读取YAML只输出provider/model/thinking/reasoningEffort/models白名单，不输出凭据或地址。
- dsh-client-ui-model-selection/lib/client.js:561–564、811–818采用currentChoice.model.name和显式等级或reasoning.defaultEffort显示；dsh-llm-deepseek/lib/index.js:468–470、517–522提供high/High默认能力（未配置off/low/max且未禁用thinking时）。所以未显式传等级也能显示High。
- dsh-llm/lib/index.js:2180–2186补齐requested或defaultEffort，prepareCall使用此配置并标明adapterDefaults；业务dsh-generation-adapter.js:173–180以prepared.config派发，不丢弃原生补齐等级。这是源码合同核对，本次没有调用resolveModel/prepareCall/stream，没有读取凭据、实例化/注册真实提供方，也不声称取得新的能力RPC。

2026-10-11T06:02:15Z（本地14:02:15）只读断言成功：9个原生manifest/lib/装配输入匹配candidate-pin，5装配文件保持，786项相对上次还原后基线无新增差异。无须修改程序或重复生成证明本映射。上一回合未写文件；本次用户继续后仅将该已获证据摘要CreateNew保存至D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-model-mapping-20261011-01\result.json，并同步本记录、当前状态与tasks，不建立新诊断脚本。摘要区分observed_at/recorded_at，重新核对上述包/配置/786项后保存；草稿观察明确来自前次只读回合，不声称本次再次捕获。

停止扩大本项：缺少显式reasoningEffort可由原生默认解释，不凭此构造修复或新UI需求。未来模型能力/默认配置若变更须重新确认，当前预览不冻结或证明未来提供方能力。完整双来源真实派发、提供方凭据/网络与正式发行仍另列；历史调用许可不复用。只读核对当前launch.mjs仍为回环代理、网站443显式NO_PROXY，不能把泛称继续视为新增模型网络放行或一次真实生成授权。当前记录收口后不再重复此映射、预览、UI草稿或全量测试。

## 新授权执行：单次真实本地 Skills（当前目标 FAIL）

用户明确批准材料外传、可能费用、网络准备及执行；最终“已完整退出”后新鲜进程0/43120无监听。不重复索取同范围许可，按executing-plans、项目Skill、TDD、Computer Use与verification执行；超时后使用systematic-debugging仅只读追溯。范围/停止条件已在D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\openspec\changes\upgrade-dsh-test-20261007\local-model-test.md记录，单代理自审，无独立审查。

### 网络准备与启动

- 既有隔离目录原launch/admission及业务字节CreateNew保留。新增--local-model-check，须--s6-ui-check；仅Host api.deepseek.com:443后缀旁路并设置公开默认https://api.deepseek.com/anthropic，五原生配置层没有baseURL覆盖。原生NO_PROXY也匹配其子域443，不称精确主机防火墙；其他端口/HTTP/相似域/其他外部主机仍代理。默认启动、Electron、更新/遥测、日常与候选包/依赖不变，准入仅更新checkedFiles/launch.mjs。
- shell=powershell/login=false：私有node.exe --test local-model-check.test.mjs，RED退出1（目标4失败/默认1通过）；最小实现后同命令加site-read-check.test.mjs，10/10退出0，实际原生代理路由无请求。按受影响边界验证，不重跑856项业务测试。
- 原私有node launch.mjs --check --s6-ui-check --batch1-site-read-check --local-model-check退出0；25,946 app文件/15,122依赖文件及完整锁/装配/准入核对。原start-development.cmd同三模式标志正常启动一次、退出0，新主49520、receipt launch-1791701749821.json，实际唯一开发窗口6360318。原cmd executor路径引用一次拒绝、没有启动；简化为PowerShell原生调用后成功，保留失败而不称双启动。

### 唯一真实创建与未确认结果

Computer Use核对同一A任务及949字符未发送草稿；切本地后实际新鲜预览仍为deepseek-official/deepseek-flash、1312字符、无上游、flow-2-6/0.2.2。勾选本次外传/费用确认后，仅点击一次“确认并生成”，未发送原生消息。运行run-0e8c8593-8ac3-4e03-b822-346f3e299ebb，原session-6379a4c7-291d-4a39-8a48-a6c4af76ab49，native-model/dsh-local；06:57:33.406Z→06:59:33.464Z，120058ms后unknown/TIMED_OUT，executionSummary={failureStage:stream}，result=null、not-reviewed、writebacks=[]。

失败阶段stream结合固定适配器路径证明native prepareCall已返回并进入PreparedCall.stream消费；不是成功正文或提供方确认。UIv4结果页明确“运行状态未确认（TIMED_OUT）；已停止本地等待，不代表提供方取消或退款，不会自动重发”，展开调用记录显示流处理、结束原因/用量未记录，与持久化摘要一致。只点一次“查看原运行”（本地观察，不重发）、只读结果/详情；不切API、不清未知锁、不审核保存引用。许可已消费；提供方是否接收/完成、是否收费仍未知。流阶段超时根因未定，不能凭超时断言网络不可达、密钥错误、模型慢或程序已修复，不盲目扩超时/改等级/重试。

### 保全与边界

退出前最近授权状态业务SHA7f9d0ec5.../revision42；首次786项复验只有这一已解释历史差异。最终同786项与本次before相比，仅launch.mjs、admission.json、oasis_workbench.json三个预期差异；业务逐叶变更限唯一新运行/激活指针/来源、revision42→45及两级时间戳。旧输入/professionalDraft/引用/三个旧运行/审核/产物/回写/所有API执行与其他Workspace精确保持。29个旧Workspace文件哈希和完整相对路径库存保持、新文件0。949字符原生草稿逐字不变，SHA790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b；原生消息日志等有限保护无变，不声称整个Profile/userdata或后台完全无网络。

一次库存断言因slash/backslash表示不同失败，统一键表示后所有原SHA精确一致；可选REPL纯哈希模块导入因zod解析缺失未完成、未安装依赖，不当作Desktop故障。输入快照字段精确比较完成，记录原生输入SHA但不冒充本次独立重算。一次截图/树不一致时未输入，经新鲜重选精确开发窗口/激活恢复匹配，未操作Codex或日常窗口。新建证据D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\program-local-generation-20261011-01\result.json、before/after.json、preview.json、dispatch-intent.json、network-preparation.json；记录保留，不建立常驻诊断器。无新专业API生成、源包安装升级、依赖下载、远端改写、提交推送发布或AGENTS/Skill整体验收晋升。本轮成功响应验收失败，完整双来源仍未收口；下一步优先只读定位此次流阶段超时，而非重复已过UI/测试或新付费调用。
