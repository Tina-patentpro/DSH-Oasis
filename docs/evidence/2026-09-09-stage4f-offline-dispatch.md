# 4F 超时后：固定 DSH 离线发送路径核对

日期：2026-09-09。用户已批准离线排障并要求继续完成 4F。当前 4F 真实验收仍为 **FAIL**：没有真实正文。本文不把离线成功提升为真实起草通过。

## 已执行与边界

- 用户反馈官方平台“没有用量”，记录为用户观察，不能据此证明请求没有发出、恢复一次调用授权或自动重试。
- 单代理，原工作区保全，未修改业务代码、运行配置、构建或真实 Profile；未启用新模型请求、未读取密钥、未提交/推送。仅增加一份定向集成测试和本记录。
- 固定 DSH `dsh-llm` 与 `dsh-llm-deepseek` 均在测试中断言为 `0.1.2-rc.1`，使用实际原生 dispatcher、DeepSeekAdapter、请求扩展注册服务和会话检查点中间件。
- 凭据、会话 flush 和 HTTP 均为内存替身；不读取真实凭据、不创建原生文件服务。全局 fetch 被替身截获，仅接受 `https://offline.invalid/chat/completions`，从未调用原 fetch。四字段取自既定 fixture，Skill 加载正式 0.2.1。
- 测试文件：`tests/integration/stage4f-deepseek-dispatch.test.mjs`。不是通用探测器、后台服务或新增自动审计工具链。

## 结果

| 场景 | 到达阶段 | HTTP 替身调用数 | Host 结果 |
|---|---|---:|---|
| 正常 | checkpoint → credential → extension → HTTP/SSE | 1 | completed，取得离线替身正文 |
| 会话落盘阻塞 | checkpoint | 0 | unknown/TIMED_OUT |
| 凭据解析阻塞 | checkpoint → credential | 0 | unknown/TIMED_OUT |
| 请求扩展阻塞 | checkpoint → credential → extension | 0 | unknown/TIMED_OUT |
| HTTP 等待阻塞 | 全路径至 HTTP 替身 | 1 | unknown/TIMED_OUT |

用缩短的测试期限验证既有等待语义；没有改变生产 120000ms。初次测试故意不释放阻塞替身，断言完成但原生流清理未退出，已终止该测试进程；随后在 Host 返回后释放替身的等待，使原生清理自然完成，未用强制成功退出伪造结论。

cmd.exe 执行：

`node --test packages\oasis-professional-service\test\dsh-generation-adapter.test.mjs tests\integration\stage4f-deepseek-dispatch.test.mjs`

最终 **14/14，退出 0**（含 5 个子场景及其父测试）。只验证所覆盖的固定原生链路和既有适配器边界，不是实际完整 Desktop 环境复现。未运行无关整批 verify。

`node .dsh-test\stage4f2-result-read.mjs` 退出 0：仍仅原来 1 条 `run-b467a508-73fa-412c-b204-fa6c3300d6eb`，unknown/TIMED_OUT、result=null；9 个旧任务业务字段不变。未解锁、删除原运行或以替身替换其结果。

## 判断与下一步

### 实际 Host 发送前只读核对收口（2026-09-09 16:21 上海时间）

用户批准继续下一步。此次没有模型请求、HEAD 重测、服务注入或业务代码修改。

- 固定 `credentials-local` 的 `resolve()`（473–489 行）直接读取内存环境/文件值 Map，返回已解决 Promise，不在调用时等待文件刷新队列。这降低了“普通本地凭据解析自身长时间等待”的可能性；没有调用 resolve 或读取凭据文件，不据静态代码声称已验证该次实际凭据或服务实例。
- 固定 `session-persistence.flush()` 等待会话初始化与写队列。目标 session-fa523f28-868a-439a-8fd9-a79734182fae 的 session.jsonl.zstd 存在，789 字节，最后修改于 13:43:26（早于调用）。仅 stat 文件，没有解压正文。文件存在不能证明 14:04 的检查点已完成，mtime 不变也不能证明阻塞（没有待写事件时可以不改文件）。
- 原生模型设置页可打开并正常返回提供方“编辑”入口，随后正常关闭；只读标题/按钮，不读取输入框或凭据响应。没有从 UI 可用性推断模型请求正常。常见插件配置关键字未在两份顶层 Profile YAML 中直接出现，不据此认定服务缺失或未启用。
- 原生 session-title 的 onMainRequest 要求 isAgentLoopRequest；绿洲此路径未标记 Agent 循环，不能仅因提供 sessionId 就认定自动标题触发了额外付费调用。
- 显式 cmd.exe 执行 stage4f-host-readonly.mjs 与 stage4f-model-status.mjs，均退出 0。没有找到能安全回溯已结束请求等待位置的现有只读入口；不使用私有 store、调试内存取密钥或调用会产生落盘的 flush 来伪称只读。

**停止扩大只读排查**：现有证据不足以判定超时发生在发送前，上一轮“检查发送前等待”是排查方向而非既定结论。不再追加替身数量、不盲目修超时/凭据，也不宣称根因已解决。

后续建议需新的真实调用授权，不能由本轮“继续下一步”静默扩大：为隔离候选配置一次性、仅记录阶段时间/事件的观察（请求创建、响应头状态、首块、结束/超时），不记录 headers/body/密钥/推理正文，不建设常驻诊断服务或新 RPC。先以断网替身验证不会自行发请求、不会输出敏感字段；确认预算与原生输出上限后，最多新增一次原模型/原合成输入/原 Skill 的正常 UI 生成，不重试、不自动改来源。无用量反馈不构成退费或剩余预算证明，累计费用必须仍在用户授权上限内；无法约束时不调用。原 unknown 保留，成功才继续 4F 内容质量与 4G；若仍失败按阶段证据修单点，不再连续盲试。

### 后续授权 HEAD 检查结果（2026-09-09 16:14 上海时间）

用户回复“继续下一步”，执行上一轮明确提出的单次无凭据 HEAD 检查。此处为独立网络证据，不改写上文离线测试“网络 0 次”的范围。

- 执行同一隔离候选 `DSH Desktop.exe` 的 Node 模式（Node 24.18.1 / Electron 43.3.0），未启动第二个 Host，也没有启动完整 Desktop/DSH 入口。固定脚本仅有一次 fetch，结果文件用 wx 预留，禁止重复运行产生第二次请求。
- 请求 `HEAD https://api.deepseek.com`，不带凭据/材料，redirect=manual，超时 15000ms。**1036ms 返回 HTTP 401**，模型调用 0 次、无重定向或重试；无响应正文/密钥/原始异常落盘。
- 新检查进程继承的 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY/NO_PROXY/NODE_USE_ENV_PROXY 均不存在；无 NODE_OPTIONS 或 NODE_EXTRA_CA_CERTS。仅记录存在性，不读取代理口令。此结果不是对原先运行 Host 内存环境或系统透明代理的完整检查，不能声称两进程实际出站配置绝对相同。
- cmd.exe 调用 `powershell -NoProfile -File .dsh-test\stage4f-head.ps1` 包装命令退出 0；子进程 ExitCode 属性未返回数值，不将其冒充已核对的子进程退出码。持久化 JSON 明确记录 HTTP 响应和耗时，stderr 0 字节；用 Node 重新读取 UTF-8 JSON 成功退出 0。
- 原始记录 `.dsh-test/stage4f2-baselines/official-head.json`。当前连通性检查目标状态为 PASS，只证明该新进程在检查时可获得官方 HTTP 响应；无凭据 401 不证明用户保存的凭据正确、POST 流式请求正常或原超时根因已经排除。
- 再次读取既有运行：仍仅 1 条 unknown/TIMED_OUT，无产物，9 个旧任务业务字段不变。未改业务/配置、未再次生成、未提交推送；4F 真实验收及 4G 仍未完成。

下一步不重复公网连通性检查、不要求用户反复录入密钥、不盲改超时。需针对实际 Host 的会话落盘/凭据解析/请求扩展等待，设计不返回秘密且不触发模型 POST 的最小检查；不能将它扩展为通用诊断服务。未经新的真实调用授权，不恢复模型生成。

本次未发现能解释真实超时的确定性代码缺陷；缺失原生检查点的旧离线覆盖已补齐。相同超时可在发送前和发送后出现，故不能仅凭 TIMED_OUT 和用户观察到“没有用量”定位故障，不能盲目延长超时或修改凭据。

以下为上项 HEAD 检查执行前的计划（授权及结果已见上节）：

1. 只读核对候选启动的代理设置是否存在（仅布尔状态或脱敏 origin，不输出用户名/密码）；不修改代理、系统或 Profile。
2. 使用同一 Desktop 内置 Node 运行时，对官方 `https://api.deepseek.com` 发出一次不带凭据、不带材料、不调用模型的 HEAD 请求，最多 15 秒，禁止重定向；仅记录 DNS/连接/TLS 错误分类或 HTTP 状态及耗时。没有计费生成操作，但不以此证明认证或 POST 流式请求一定可用。
3. 若失败，针对确认的连接层问题提出最小修复；若成功，不继续盲试模型，转向实际 Host 前置等待的最小检查。保留本次 unknown，禁止自动重试或切换来源。

新的真实生成依然需要另行确认，沿用同一合成材料与明确剩余预算；4G 必须复用成功的真实产物。窗口和最终 Profile 后比对仍待收口，不能宣称 4F/4G 完成。
