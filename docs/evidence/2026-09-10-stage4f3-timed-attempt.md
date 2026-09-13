# 4F：第二次授权生成的阶段记录准备

日期：2026-09-10。当前 4F 真实起草验收状态：**FAIL**。用户已点击第二次授权生成，85.249 秒后 failed/INVALID_OUTPUT，无可保存产物；4G 无正文可继续。以下最新结果优先于后文的待点击准备历史。

## 用户点击后的最终结果（2026-09-10）

- 用户回复“已点击”后仅收集该次结果，没有代点生成、重试或发起第三次模型请求。
- 新运行 `run-e8fbf276-1b2f-481b-a8a6-e89c3728032f`；session `session-b3653c7a-93d8-41d0-9bad-1735d5bf837f`。
- 上海时间 **12:54:10.592–12:55:35.841**，历时 **85249ms**，终态 **failed / INVALID_OUTPUT**，result=null、not-reviewed、writebacks=0。
- 实际 Desktop 结果页同样显示“未取得有效正文（INVALID_OUTPUT），不会自动重试。”已保存 `result.aria.txt` 与 `result.png`，并未执行审核、写回或对话发送。

| 阶段 | 上海时间 | 观察结论 |
|---|---|---|
| checkpoint 开始/返回 | 12:54:10.623 / .624 | 本次发送前会话检查点未长时间阻塞 |
| credential 开始/返回 | 12:54:10.624 / .625 | 仅观察返回时间，未读取/记录密钥 |
| extension 开始/返回 | 12:54:10.626 / .679 | 约 53ms |
| request-created | 12:54:10.680 | 即将调用原生 fetch，不是服务端收到的独立证明 |
| response-headers | 12:54:17.931 | HTTP 200，距 fetch 创建 7251ms |
| first-chunk | 12:54:18.195 | 首个原生解析块，距 fetch 创建 7515ms；未记录类型/内容，不能等同正文 |
| 业务失败落盘 | 12:55:35.841 | INVALID_OUTPUT，不是 120s 的 TIMED_OUT；未观察到 stream-end |

本次证明真实认证请求获得 HTTP 200 和解析块，不证明完整正文、模型质量、提供方最终终态或实扣。也不能把本次成功收到响应回溯为第一次超时的根因已解决。没有可供 4G 使用的统一产物，保留失败而不将半成品冒充成功。

### 有界源码核对与未决原因

已读取现有 `dsh-generation-adapter.js` 和 `local-generation-service.js`，没有修改业务实现：INVALID_OUTPUT 会覆盖流块非法、非 stop 终态、空/过长文字，以及随后累计输出合同解析失败。固定原生 DeepSeek 将 finish_reason=length 映射为 max-tokens，绿洲当前按 INVALID_OUTPUT 拒绝；因此达到 16384 输出上限是**待核实可能性，不是本次已证明原因**。

本次阶段记录未保存 finish reason、用量或响应正文；不能恢复被丢弃的正文，也不能据 85 秒或缺少 stream-end 断言一定是输出截断或 JSON 错误。缺少 stream-end 更偏向原生流未被绿洲正常耗尽，但不足以锁定具体校验分支。停止网络/密钥方向的重复排查，不追加线上试调用或扩展观察器。

### 收口、保全及恢复

- `node .dsh-test\stage4f3-result-read.mjs capture` 退出 0：新任务只有该次运行，10 个旧任务业务字段深比较不变，含首条 unknown/TIMED_OUT。`observed-run.json`、`observed-result.json`、`observed-events.jsonl` 保存在本页所列基线目录。
- 正常关闭窗口后候选仍留有后台进程；确认所有进程路径及主进程隔离 userdata 后，仅停止该候选，进程/端口检查为空。没有停止系统或其他 Desktop。
- 候选停止后运行 `stage4f3-prepare.mjs restore-observer`，恢复两份原生模块。`stage4f3-verify-restored.mjs` 再次读取并核对 SHA 与原字节一致：DeepSeek `5c598e3b6c35c8f302d4f7ae0b1812cabf77483cf2f6f5986d0cd6b7785d3acb`；checkpoint `80a4475de0594399bfdd3203e000cfe0bf1967af163f8747c45b9b80e9549f2a`。临时观察已撤除，原生输出上限保留。
- 相同 Desktop Node 24.18.1 在恢复后的原生模块下运行既有适配器和固定原生断网回归：**14/14、退出 0**。真实网络 0 次，仅证明恢复后原生合同回归，不代表真实起草通过。没有重复整批 verify 或改变业务源码。
- `node .dsh-test\stage4f3-profiles.mjs after` 退出 0：两处真实 Profile 内容变化 **0**、10 个旧任务业务字段不变、旧保存正文和 Skill 编写资源不变。本轮关闭/后比对与观察补丁恢复均已完成。
- 未提交、推送、发布；没有第三次调用授权，费用仍由官方平台核对，不把失败视为免单。

### 输出边界离线排查（2026-09-10，用户批准后已执行）

本次范围仅为下面两种既定对照；单代理自查，非独立审计。没有启动 Desktop 界面、连接真实提供方、读取密钥、改原生模块或业务实现。只在既有 `tests/integration/stage4f-deepseek-dispatch.test.mjs` 补两个子用例，复用现有内存 repository harness；`.dsh-test/stage4f3-output-boundary-run.mjs` 仅为一次性执行和保存退出结果的脚本，不是新增诊断器。

两用例使用相同的合成四字段、正式 flow-2-6/0.2.1 装配与 schema 有效的公开合成结果。固定原生 DeepSeekAdapter/dispatcher/checkpoint 使用内存凭据及 fetch 替身，经过真实绿洲 adapter、local-generation-service、累计结果解析及内存持久化。确认预览不发送；每例只调用一次 fetch 替身。原生推理块 index=0、正文块 index=1，正文分两段，usage 位于最终响应块。

| 唯一终态差异 | 原生输出 | 绿洲最终结果 | 能证明什么 |
|---|---|---|---|
| finish_reason=stop | reasoning、text、usage、finish/stop | completed，统一产物存在，正文无推理 canary，资源版本 0.2.1 | 此正常流形态与有效合同可通过完整服务路径，不存在必现的推理块混入/稀疏索引误拒绝 |
| finish_reason=length | 同样正文与 usage，finish/max-tokens | failed/INVALID_OUTPUT，result=null | 即便 JSON 本身有效，非正常结束也不会被冒充成功；能复现实测错误码，但不能证明实测就是 length |

原生收到的合成 usage 被正确映射为 inputTokens=800、outputTokens=2000、totalTokens=3000、cacheReadTokens=200、reasoningTokens=1500。数字完全是测试替身，不是两次真实请求的用量。当前绿洲 `textConsumer` 对 usage 直接跳过，非 stop 结束和累计合同解析失败又共同压成 INVALID_OUTPUT；运行记录因此无法区分截断、流协议问题与业务格式问题。这个失败可解释性缺口已经由源码和对照确认，但不是生成失败根因已经定位。

验证记录：

- 初次 Node 22 对照中正常例通过；length 例的新增断言误写为 `run.error.code`，产生测试自身 TypeError。按现有持久化合同改为 `run.failureCode`，未改产品逻辑；重跑 **9/9，退出 0**。不把这次测试编写错误当作业务缺陷或根因修复。
- 最终执行 `node .dsh-test\stage4f3-output-boundary-run.mjs`，先核对两份原生模块与已恢复 SHA 一致，再以相同 Desktop.exe 的 **Node 24.18.1** 运行既有 adapter 与新增原生集成对照：**17/17（含父测试），退出 0**，真实网络 0 次。结果保存在 `.dsh-test/stage4f3-baselines/output-boundary-check.json`。未重复整批构建/verify。
- 密钥输入框问题另有固定 UI 源码依据：`dsh-client-ui-settings-models/lib/client.js:1529–1533` 仅在输入非空时写凭据，保存后显式清空 keyDraft；空框不等于凭据丢失。第二次已有 HTTP 200/解析块证据，不支持把该次失败归因为缺少密钥。未宣称实际凭据跨重启持久化已由本轮验证。
- 本轮测试持久化只在内存，没有打开真实 Profile 或旧业务 repository；此前已完成的 Profile 后比对仍按上一节历史证据引用，本轮没有重新扫描并冒称取得新 Profile 比对证据。旧 unknown 不重试、不解锁；没有第三次模型调用、提交、推送或发布。

**结论及停止点：** 两种离线对照已完成，没有复现有效正常输出被误拒绝，故不放宽终态或累计合同校验，也不增加超时/输出上限。历史响应未保留，无法通过继续构造替身恢复它；4F 真实验收仍为 FAIL，4G 仍缺正文。

下一项最小修订建议（尚未实施）：在现有运行记录和结果页内保留有限枚举的失败阶段（流处理/结果合同）、结束原因及合法数值用量；旧记录缺失时显示“未记录”，不得补造。只有确认 max-tokens 才提示输出上限，合同失败则提示结果格式，不复制正文/推理/密钥/原始异常，不新建诊断服务。回归沿用这两例以及既有合同失败测试，并验证旧记录可读、失败无产物、无自动重试。先完成这个产品级错误反馈切片，再另行决定真实复验及费用授权；不立即增加第三次请求。

### 上轮建议（历史；两种离线对照现已执行）

先做一个有限离线切片，不新增模型请求：在现有固定原生集成测试内补真实同型的 reasoning + text + usage + stop，以及相同内容以 length 结束的对照，检查绿洲流消费与累计输出合同的边界；最多这两种对照，不另建验证器。若能复现有效输出被误拒绝，只针对该分支提出最小修复和回归；若只能复现正确拒绝截断，则不改成接受半成品，也不盲增超时/输出上限。需要新真实结果时，必须先有明确修订与重新核算的费用边界，再单独取得授权，不能连续盲试。

以下为已完成的调用前准备记录（0 次/待点击是当时状态）：

## 授权和最小执行范围

用户“同意进行下一步”批准上一轮提出的一次性阶段时间观察及最多新增一次真实生成，累计预算仍为 10 元。沿用官方 DeepSeek V4 Flash / high、合成四字段 1111 字符、flow-2-6/0.2.1，无上游、无附件、不调用绿洲专业 API、不发送对话。原 unknown 不删除、不解锁、不重试；未取得新的第三次调用授权。

单代理；未改业务生成代码、Skill 或客户端构建。仅临时改项目内候选 Desktop 的两个固定原生模块以插入阶段事件，另在已关闭的隔离 Profile 原生 llm-deepseek 设置中增加 maxTokens=16384；其他设置结构保持一致，retryPolicy=normal/maxRetries:0 不变，Host 总期限仍为 120000ms。未改系统安装或真实 Profile，未提交/推送/发布。

## 费用约束

2026-09-10 只读核对官方价格页 https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ ：Flash 高峰缓存未命中输入 3 元/百万 tokens、输出 9 元/百万 tokens，上下文 1M、最大输出 384K。按高峰、全未命中计，不把上次“没有用量”当作免费或退款。

保守地将 M/K 按二进制上取：首尝试预留完整 1,048,576 输入及 393,216 输出（实际原生默认输出为 256000，仍按更大值预留）=6.684672 元；本次预留完整 1,048,576 输入及 16,384 输出=3.293184 元；合计 **9.977856 元 < 10 元**。这是上述定价下两次单请求的预算上界估算，不是实扣确认；不包含也不授权任何额外模型请求。固定原生断网集成验证 wire payload 的 max_tokens=16384。不能获得完整正文或超时也不得自动再生成。

## 一次性阶段记录及验证

- 临时文件仅在 Git 忽略的 `.dsh-test/stage4f3-*`；不新增常驻服务、RPC、产品诊断框架或自动审计器。
- 原生两个模块均断言版本 0.1.2-rc.1、替换锚点唯一、修改前后 SHA；原字节备份和 manifest 位于 `.dsh-test/stage4f3-baselines/`。
- 记录 loaded、checkpoint 开始/结束、credential 开始/结束、extension 开始/结束、request-created、response-headers、first-chunk、stream-end。只存时间、PID、固定事件名、数值 HTTP 状态；不传入/序列化请求参数、headers、body、密钥、正文或原始异常。first-chunk 指首个原生解析块，不保证是正文；request-created 是调用 fetch 前的事件，不等于提供方已收到。
- 未盲调 120s；如请求挂起，结合最后阶段与业务持久化终态定位，不能把没有结束事件解释成取消成功。
- 首轮观察测试发现将 SSE comment 回调误当首块回调，检查失败且未用于真实调用。已改为观察原生解析迭代器首块，原有 onActivity 回调保留。失败记录保留。
- 最终 `node .dsh-test\stage4f3-offline-run.mjs` 使用相同 Desktop.exe 的 Node 24.18.1 运行固定原生链路：**6/6、子进程退出 0**；事件白名单及秘密 canary 检查退出 0。全局 fetch 为内存替身，真实网络 0 次；观察模块不会自行发请求。最初 PowerShell GUI exe 直接调用没有可靠回收结果，未采用其退出码作证明；最终使用 windowsHide 的同步子进程取得退出码和输出。
- 当前实际 Host PID 11436 的 live-events.jsonl 只有一条 loaded，证明候选加载了观察模块，尚无生成阶段事件。结束本次验收、停止候选后，使用 `.dsh-test/stage4f3-prepare.mjs restore-observer` 按 manifest 验证并恢复两个原生模块原字节；保留原生预算上限，不重新生成。移除观察的恢复尚未执行，当前候选不是未经观察的原始发行构建。

## 实际 Desktop 待点击状态

两个旧工作区均保留未决运行，因此通过原生“添加工作区”目录选择器增加独立空目录，未复用或解除旧锁：

- 路径：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage2-workspaces\workspace-c-4f`
- Workspace：`ed5eb80e-088f-4944-8f9a-773147c07f98`
- 任务：**阶段4F-第二次授权验收**，`99620f95-241a-4006-b885-8a4208031c6e`
- 原生模型：`deepseek-official / deepseek-v4-flash / high`
- 来源：本地 Skills；正式资源：flow-2-6/0.2.1；四字段与既定 fixture 深比较一致，1111 字符，无上游；当前新任务 runs 为空。
- 确认组显示上述模型及资源；复选框未勾选，“确认并生成”禁用。实际截图已保存并查看，未模拟界面：`.dsh-test/stage4f3-baselines/confirmation.png`；ARIA 和 preflight.json 同目录。

`node .dsh-test\stage4f3-final-preflight.mjs` 退出 0：10 个已有任务业务字段保持不变，包括首个真实 unknown/TIMED_OUT；第二次尚未发出。这里没有把新工作区当作原运行重试或为旧运行补造终态。

上一轮关闭后的最终保全已补做：`node .dsh-test\stage4f2-profiles.mjs after` 退出 0，两处真实 Profile 内容变化 0、当轮 9 个旧任务及既有保存正文和编写资源不变。本轮以该次完整采集（包含第一条 unknown 的 10 个任务）作为启动前基线；本轮运行后关闭与真实 Profile 后比对仍待做，不能提前宣称最终保全完成。

## 接续步骤

1. 用户在当前窗口勾选确认，点击“确认并生成”**一次**，随后返回“已点击”；不要点击主对话发送，不再另点生成或切换模型。
2. 读取本次阶段事件和统一产物终态。若 unknown/失败，保存证据并停止，不新增第三次请求。
3. 若取得完整真实正文，按已有合成材料清单做内容验收，再复用该产物完成 4G 编辑再审、无覆盖保存、原生打开、重启恢复及对话草稿（不发送）。
4. 最后关闭候选、恢复临时原生观察补丁并核对原 SHA，完成真实 Profile 和旧任务保全。当前 4F/4G 均未完成。
