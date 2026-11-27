# R7执行回执R1

## 后发：追加一次真实运行已消费，确认max-tokens截断

用户对[具名rc.5调用提案](one-call-proposal-r1.json)回复“同意追加一次独立运行”后，按[新授权](authorization-real-call-r1.json)只点击一次确认，未复制凭据或改参数。新run `v340-c72ecef4-2cfd-4db1-9680-638738db5cff`／requestKey `9a6750e4-80fc-4f46-a2b9-1a543e7d77fc`已持久化输入后派发；07:12:37.377+08至07:13:33.999+08，终结为**FAILED／INVALID_OUTPUT**。

本次安全摘要给出`failureStage=stream`、`finishKind=max-tokens`、`outputTokens=8192`；input735、cacheRead46976、total55903，费用金额未返回。没有有效正文或编辑草稿，没有进入新稿审阅/保存/恢复接受。该证据只定位本次输出上限截断，不推定前两次原因，也不能判8192的推理/正文分配。[原结果](real-call-original-result-r1.json)／[本次验证](real-call-verification-r1.json)／[无费用有界分析](token-limit-analysis-r1.md)。

本次追加额度已用1／剩余0，未重试、切来源、提高上限或再请求一轮。三个独立的一次许可均已消费；A旧UNKNOWN及B旧INVALID_OUTPUT原run保持，新run仅追加于原B任务，B revision80→82，A118不变。Workspace JSON及44份其他现存保护文件原字节保持；授权业务JSON与B原生会话压缩文件变化，2旧临时件原已缺失，不补作逐事件差分结论。

PID9148通过原生菜单正常退出code0／signal null；本轮共两次不同范围的启动/正常退出（R7-01无生成检查一次、本次获准生成一次），未做结果编辑草稿恢复性重启或发送原生对话。退出后只复核已释放所有权，没有新调用。[授权消费](authorization-consumption-r1.json)／[所有权](ownership-after-real-call.json)。

**当前出口：** R7-01限定完成；R7-02授权尝试已执行但正文出口未通过；R7-03因无正文未执行；R7-04同版事实可审、暂不发布；其余支路按下方直接缺件保持。下一次需先明确参数/输出预算变更范围及新的单次许可，不能由本次接续授权自动派发。以下为本次真实调用之前形成的执行记录，原时点“等待许可/调用0”不覆盖本节后发结果。

2026-11-09，Asia/Shanghai；Codex单代理。用户“同意按计划继续推进”后，按[R7](../../plans/2026-11-08-project-summary-and-next-plan-r7.md)和[EXEC-R2复核](execution-preflight.json)执行既有开发安装内的无费用工作；未创建新持久目标，不提交、推送或发布。

## 本轮结果

**R7-01已完成限定出口：** 诊断充分性差异已定位、最小修正与同版候选已交，现有开发安装一次原生启动／正常退出通过；本轮没有真实生成。诊断修正不等原INVALID_OUTPUT根因已解决。

| 步骤 | 实际状态／证据 | 剩余条件 |
|---|---|---|
| R7-01 | rc.4三类失败合并已用固定SDK复现，新增三固定阶段；私有rc.5原位装回，旧记录解析与B原生失败状态恢复通过 | 不外推完整原生业务恢复或真实生成 |
| R7-02 | [一次调用对象](one-call-proposal-r1.json)已固定，已向用户提出新单次授权，尚未派发 | 两项旧额度均用完；等待本次准确追加决定 |
| R7-03 | 未执行，没有新有效正文 | 新稿工程链、未提交结果编辑草稿跨重启及专业/用户接受分别办理 |
| R7-04 | [rc.5技术事实](../../release/m06-public-0.1.0-rc.5/TECHNICAL-FACTS-R1.md)及[RL01—09接续](../../release/m06-public-0.1.0-rc.5/RL-CONTINUATION-R1.md)可审，未投递/发布 | 新稿、公开范围、独立法律复核及具名发行决定保持 |
| R7-05 | [具名直接缺件接续](independent-prerequisites.json)，WorkBuddy原私有ZIP hash保持，来源登记路径仍缺失 | 源CI/真实caller/Batch、格式资格及第二Host实际机制分别待办，不互等 |
| R7-06 | 未选新模板、未制作新Skill | 准确M06范围及具名来源/消费合同后只选一个采用建议 |

## 根因调查、修正与验证

本轮确认的根因仅为**诊断粒度缺口**：native代码用同一catch处理JSON.parse和schema解析，runtime装配catch继续用`result-contract`。实际旧模型失败已丢失这些信息，无法据此推定当时落在哪处。

沿既有白名单增加`result-json`、`result-schema`、`result-assembly`；保留旧`result-contract`，不新增原文/错误字段、日志平台、自动重试或Provider框架。不改生成参数、模型、提示词、资源及审核判据。装配子类仍合并来源政策/累计/容量等内部细因，足以确定下一步离线调查边界，不保证所有细因一次定位。

验证记录：

- [RED](substage-red.log)：固定DSH LlmRuntime／BlockAssembler加离线provider，JSON、schema、装配3例在预期阶段断言失败；截断/成功2控制例已过。
- [源码GREEN](substage-green.log)：99项exit0；[实际归档GREEN](archive-green.log)：102项exit0。五个新用例覆盖finish/计数过滤、无原始载荷、冷重读和一次流调用；实际归档另外验证公开资源消费、旧内部确认拒绝。没有云端模型、API或费用。
- 构建和pack exit0，私有rc.5／125成员，修改7、保持118，增删0；51份自有source map与归档一致，17份第三方来源保持。[实际清单](archive-identity.json)及[同版bundle](bundle-identity.json)绑定完整hash。
- [原位安装](install-result.json)及[controller交接](controller-handoff.json)离线完成；[新schema只读解析](installed-record-read.json)A revision118／5任务、B revision80／2任务通过，不开业务backend，不说成原生UI验收。
- [原生观察](native-result.json)：现有B空白原生会话、相同公开输入恢复；点击“查看结果”后可见旧INVALID_OUTPUT及不重试提示；通过菜单正常退出，PID8141已消失，exit0／signal null。一启一退、零重启，未编辑/审核/保存/发送/确认生成。A只做schema读取，未切换原生会话。[租约/JSON所有权](ownership-after-native.json)复取释放。

首次命令/夹具失误均不当产品失败，也不掩去：pnpm11的exec默认先尝试依赖检查/安装，被非TTY保护拒绝；更正命令显式禁verify-deps-before-run，沿现有依赖完成构建。系统Python不支持tar filter参数，验证器改为逐成员文件/路径校验后解包；归档验证补正确父依赖link和既有公开归档flag/源码CWD，失败日志分别保留，无重建归档来配测试。首次安装记录读取误取JSON根而非`tables.workspaces`，按实际provider格式更正，只续只读解析，无产品或数据修改。源码测试命令还列了不存在的独立summary测试路径；实际99项来自4份现有测试，summary覆盖由新固定SDK用例和现有adapter用例提供，不声称存在该独立测试文件。

## 保全与身份澄清

两工作区全部任务和run原字节语义保持、revision不变，业务及Workspace JSON整文件相同；无新run。原48条保护路径中46现存、2份旧临时候选在本次原位升级前首次核对时已缺失，缺失时间/原因未核；45份现存文件保持，B原生会话压缩文件变化，未逐事件差分。凭据与日常Profile在这45份保持范围内，没有复制/更改或新增凭据访问权限。旧A UNKNOWN及旧B INVALID_OUTPUT不重发、不重签、不补usage或费用。

R7称`a34ae147…`为“prepared hash”，准确对象为`prepared.inputHash`；完整`preparedSHA256`是`fb01f3ab…`。已比两次旧运行prepared深度相等、当前三文件hash和四文本未变。此为标签澄清，不是输入变化，不修改旧计划/回执或更换expected hash。[调用提案](one-call-proposal-r1.json)列二者完整值。

## 审阅、决定与边界

单代理自审三源码及相对rc.4差异：success判据、未知/失败及重试逻辑不变；枚举为固定值，不存原始响应、推理或错误；旧stage继续读取。属于作者自审，没有独立代码审阅结论，不冒称专业/用户或法律接受。

Ruling：依项目规则复用现有工作区、单代理、不提交/清理原证据，覆盖通用技能的worktree/独立reviewer/提交清理流程。成本：本轮无独立代码审阅，最终发行仍沿原门。Ruling：沿原failureStage增加安全固定子类而不加新字段；新子类记录需要同版runtime，不能宣称旧版本能读取这些新记录或完整回退已验。

用户此轮批准接续R7，不补回此前两项已耗单次额度；新真实生成问题已具名提出，收到实际答复前保持0派发。任何新增许可仅属于其准确候选/输入/次数/费用范围，不能自动重试或扩成发布、源事务、WorkBuddy导入。暂不发布及所有旧FAIL/UNKNOWN/接受保持。

最终产物、链接、输入身份、历史后缀及差异检查见[verification.json](verification.json)。该检查不把本次真实失败改为通过，也不替代尚缺的业务接受。旧临时件缺失仅在本次原位升级前首次核对确认，时间/原因未核；相关早先“开始前”措辞按此准确范围理解。
