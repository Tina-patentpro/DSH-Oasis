# 阶段1：流超时无模型诊断 — 2026-10-14

结论：**PASS_WITH_CONCERNS（仅阶段1无模型范围）**。已完成首包停滞、持续推理、部分正文后停滞、原生超时、停止和迟到响应的定向复现，以及错误映射、未决锁和序列化重开验证。修复一个已复现的原生超时错误映射缺陷；不能据此解释或宣称修复2026-10-11真实提供方的超时根因。

执行目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD `73b826f05c64142ea7bf866d10bc67e10da809be`。用户批准执行阶段1，并在中断后要求继续；保全记录始于10月13日，验证收口于10月14日。原始日志、文件哈希和账本保留在 `.local/stage1-20261013`，不加入Git/发布包。单代理作者自审，无独立复审。

## 旧运行证据与当前结论

定向读取Windows恢复快照 `docs/project-current-state.md` 及10月11日程序收口记录，按 `docs/development-layout.md` 的归档映射定位。旧运行 `run-0e8c8593-8ac3-4e03-b822-346f3e299ebb` 约120058ms后为 `unknown/TIMED_OUT`，摘要仅有 `failureStage=stream`，没有结束原因、用量或正文。旧单次许可已消费，旧运行及历史原件未修改。

当前适配器的默认120000ms是调用准备加流处理的总期限，持续收到推理或部分正文不会续期。替身证明三类不同停滞都可以产生相同的旧摘要，故无法从旧摘要判定当时是首包未到、持续推理、部分正文后停滞，或其他提供方/网络问题。**旧提供方是否收到、完成、取消、扣费及真正超时原因仍未知。** 本轮没有加大期限、换模型、改推理参数、切API、清未决状态或新建真实请求。

## 唯一生产行为修复

固定本地 `@deepseek-ai/dsh-llm 0.2.0-rc.2` 的 `LlmError` 使用 `TIMEOUT`，原生 `LlmRuntime.adapterStream` 会将提供方抛出的错误转换为 `finish/error` 的失败数据。插件 `providerCode` 原先没有此映射，结果为 `failed/GENERATION_FAILED`；该状态不能继续保护提供方结果未知的运行，重开后会允许进入新运行创建。

`src/dsh-generation-adapter.js` 仅增加 `TIMEOUT → TIMED_OUT`。沿用现有规则，在已经开始本地准备/派发的路径中保留 `unknown`，不保存部分正文，继续保留输入锁与请求去重。准备阶段同样保守记未知，不推断提供方已执行。未改变超时、重试、业务schema、UI、依赖、Profile、凭据或发布范围。

新测试使用实际固定Cordis4.0.4、DSH0.2.0-rc.2的 `LlmRuntime/LlmAdapter/LlmError/BlockAssembler/createUserMessage`；唯一提供方是进程内测试替身，`fetch` 在测试中禁止。正式0.2.2业务资源用于本地合同组装，不外传。Workspace/Session owner与Domain backend仍为替身，不是实际Desktop、真实提供方或认证证据。

## 复现和持久化

| 场景 | 新鲜证据 |
|---|---|
| 首包停滞 | 原生流不返回首包；测试50ms总期限后unknown/TIMED_OUT，流阶段、无结果、无审核/回写 |
| 持续推理 | 约每2ms返回推理；总期限照常生效，推理正文不进记录/产物，不因活动无限延长 |
| 部分正文后停滞 | 先返回公开正文及用量快照；到期无成功产物，仅保留允许的整数用量，不把部分正文写入业务记录 |
| 原生超时 | 实际原生准备抛TIMEOUT、提供方迭代抛TIMEOUT经原生finish/error转换；均unknown/TIMED_OUT，错误细节/正文不泄入结果 |
| 停止/重复停止 | 已开始流后停止；保持unknown/ABORTED；重复通知不增加revision，不误认后端取消；不协作return不阻塞本地结束等待 |
| 迟到响应 | 停止后迟到文本/拒绝、期限后迟到文本均不改变已结束的原记录，不写入B项目，不新增请求 |
| 去重/重开 | 同requestKey只观察原运行；新requestKey拒绝WORKSPACE_GENERATION_ACTIVE，输入仍锁定；JSON写入临时文件、重新读取及打开真实repository/service后，记录/输入哈希/摘要/锁保持 |

序列化重开验证使用测试文件与替身Domain后端，不冒充实际DSH存储正常重启或Mac安装包验收。停止路径先落unknown/ABORTED，拒绝晚到的整个状态覆盖，因此可能没有调用摘要；本轮没有以猜测值补齐。未收到用量/结束原因仍保持缺省，未伪造零用量或完成。

## RED/GREEN、命令与退出码

实际执行方式为zsh（Python子进程构建使用参数数组、无shell）。固定Node24.21.0、pnpm11.8.0版本已核对；本轮不运行DSH CLI、不安装依赖。日志为下列命令的完整stdout/stderr。

1. `tools/bin/node --test packages/oasis-professional-service/test/dsh-stream-lifecycle.test.mjs packages/oasis-professional-service/test/local-generation-service.test.mjs`：移除修复、保留最终回归测试后，退出1，14项中9通过/5失败。4项为目标TIMEOUT映射/重开锁缺陷；另1项为已有Mac临时目录夹具失败。见 `red-final-regressions.log`。
2. 定向32项：退出0，32通过、0失败、0跳过。包括 `dsh-generation-adapter`、`dsh-stream-lifecycle`、`local-generation-service`、`native-model-service`、`dsh-generation-context` 五份测试。最终日志见 `targeted-tests-final.log`。
3. 当前固定Node直接运行本地主包 `node_modules/tsdown/dist/run.mjs --config tsdown.config.mjs`：退出0。构建HOME/缓存均在 `.local`，使用阻断代理，无依赖安装。`build.json` 保存完整绝对命令、cwd/时间/退出码；client.js及map字节与本轮前一致。
4. `tools/bin/node scripts/macos-development-launch.mjs --check`：退出0，`preflight-only`、`Desktop-not-run`。见 `check-final.log`。没有刷新准入哈希或启动Desktop，不能上推为Host/GUI已验收。
5. 本轮修改范围差异/哈希与Git索引核对：见 `preservation-final.json`；本轮目标文件差异检查退出0。只运行受影响合同与构建/check，未运行包级整套verify或安装/打包。

首次新服务测试错误地过早调用close，抢先中止了派发；已改为等待状态落定后断言，原始失败日志保留，不计为产品缺陷。既有 `same Store RPC page uses local admission, observation, review and no-overwrite save` 在Mac上以 `/var` 临时路径注册Workspace，实际canonical路径为 `/private/var`，导致WORKSPACE_ROOT_CHANGED；在有/无TIMEOUT修复时均可复现。仅修测试夹具为realpath，并回收其自有临时目录，未放宽生产文件安全检查。

## 保全、裁定与后续

本轮前3062份Git可见文件哈希、未暂存/暂存patch、HEAD/refs/index已保存。既有未提交变更和归档保持；本轮增量仅适配器1行、Mac测试夹具、新生命周期测试、此证据及当前状态/路线图索引。主包manifest/lock、构建lib和既有源码其余文件保持。Codex在中断续接时添加了一项 `refs/codex/turn-diffs/.../base` 捕获引用；原有refs、分支HEAD、Git索引及暂存内容保持，未删除该应用引用、未提交推送。

裁定：遵循用户指定根目录/当前分支及单代理规则，使用本地包导出而不启动DSH查询版本；代价是作者自审及有限本地合同证据。测试后端仅覆盖序列化重开，实际Desktop正常重启仍须阶段2验证。阶段1按范围完成，下一步为路线图阶段2无模型Desktop/Host验收，需其独立运行范围；本轮不自动启动阶段2。首模板真实双来源整体验收仍未收口。

## 新授权下的阶段1提交收口

2026-10-14用户新增阶段1–3连续执行、必要真实模型/API测试及每阶段Git提交授权。提交前复跑受影响流与Mac入口合同，共48/48、0失败、0跳过，退出0；日志 `.local/stage1-20261013/precommit-tests.log`。全部待提交文件检查未发现真实密钥/JWT/私钥模式；归档/运行数据/依赖/工具二进制不入Git，小型工具包装器与相对工具链接入Git。阶段1提交包含原已保全Mac迁移/root适配与本次流修复，不推送。此前“未提交/不启动”描述是历史执行边界；后续以新授权补充及连续执行计划为准。
