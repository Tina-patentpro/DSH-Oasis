# 阶段 4A 推荐 A：原生 llm 单次调用非秘密验证

日期：2026-09-07。状态：**STATIC_ONLY**（有真实原生服务的本地离线集成证据，无 Desktop 界面及真实模型证据）。

## 授权和目标

用户“同意按方案执行”：验证首个纯文字模板的 Host 业务指令 + DSH 原生 llm 单次调用路线。只使用公开 canary、离线适配器与项目内新建测试日志；不修改上游或产品业务代码，不使用真实模型/API、凭据、私有 Skill，不启动或修改真实 Profile。

保留前轮所有六项未提交文件；本轮新增一个既有测试体系内的原生服务集成用例和本报告，并同步路线决策。没有创建新的诊断/监管框架，没有提交、推送、发布。

## 实际装配，不是自制 llm mock

使用固定隔离 Desktop 安装包内的真实：
- Cordis Context / plugin fiber；
- DSH LlmRuntime / prepareCall / BlockAssembler；
- SessionStore / Session 及 session/event 事件；
- JsonlSessionPersistence（本批明确 `compression=none`，不是发行配置覆盖）；
- session-checkpoint-policy；
- session-log-export 的 sessionLogZipEntries。

唯一提供方为测试注册的 `stage4a-offline`；它继承原生 LlmAdapter、在进程内产出合成流，未挂载真实提供方/Agent loop/Skill 工具。真实 Session 由 SessionStore 创建，不伪造父 Agent。临时持久化根由 mkdtemp 新建在项目 `.dsh-test/stage4a-native-llm/` 内；不读取真实 Profile。

`fetch` 在测试期间被拒绝，结束后恢复；这只是测试进程防误用，不是操作系统断网证明。所执行路径没有调用真实网络适配器。未添加 CLI 配置、环境秘密或原生设置副本。

## 结果与反例

| 检查 | 实际结果 | 证明边界 |
|---|---|---|
| 单次正常文字生成 | 原生 assembler 得到非空文字和一个 stop；重复 dispatch 被拒绝 | 离线服务，不是业务生成质量 |
| 普通事件/日志 | 调用前后 Session 事件相同，session/event 没有新增记录 | 仅本测试挂载组合，不覆盖发行组合的全部监听器 |
| 实际持久化与导出条目 | flush 后读取真实 JSONL；原生导出条目不含 canary | 没有 browser ZIP 下载/父子树 UI 操作证据 |
| 正对照 | 普通 session 主动记录 system 后，JSONL 与导出仍含 canary | 证明不是靠全局过滤/关闭日志得到阴性结果 |
| 适配器绑定 | prepare 后替换注册项，旧 prepared call 仍使用原适配器；旧调用累计 2 次，新错误适配器 1 次 | 证明原生代次绑定，不证明插件已实现整个运行配置冻结 |
| 提供方错误 | 新适配器抛出带 canary 的 LlmError(AUTH)，原生流终态保留完整 failure.message | **反例：不得直接把 SDK 错误交给 UI、普通日志或业务存储** |

错误反例的断言预期观察到原文，测试正常结束是“准确复现暴露”，不是“错误已安全”。按设计中的暴露即停规则，本轮停止 Desktop 接入和其他业务门禁验证。没有生产 adapter，因此也没有声称已有工作台正在泄露真实 Skill。

当前判断：相比原生子任务的必然正文日志，A 的正常调用避免了该特定路径；无需据此深改核心。但“原生 llm 已自动替我们处理所有正文保密”不成立，G-SKILL 未通过。

## 新鲜验证

Shell：cmd.exe，Node `v22.19.0`。

```cmd
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\stage4a-native-llm.test.mjs"
```

最终退出码 0，1 个原生集成用例通过；内部包含正常调用、重复调用拒绝、事件/持久化/导出阴性与阳性对照、代次绑定和错误暴露检查。

最终运行新建目录：
`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4a-native-llm\run-nx8McZ`

过程说明：首次运行因测试误用不存在的 `ctx.start()` 失败；改用该版 fiber `.await()`/`.dispose()` 后，又因样本 user/message 缺 `surfaceOp` 失败；补齐原生合同后测试通过。两次是新测试接线错误，不是业务缺陷红灯、环境安装修复或生产修复证据。本轮没有生产代码，不虚构 TDD 的生产红绿过程。

实际调用包的 `lib/index.js` SHA-256（均为 `0.1.2-rc.1`）：

| 包 | SHA-256 |
|---|---|
| dsh-llm | bde337804d68e095b174abc6c7fad604296a13474d6ee84f6ecf943adcbe60db |
| dsh-session | be25b05ffd1403908796935ef11a61d4c002f7ff3d12f83ef82a8c9976984342 |
| dsh-session-persistence-jsonl | dfd6cde28928996f2f44220d013359563c8d9bf6c9c904972e77256767eec385 |
| dsh-session-log-export | e81f28feee53cfba4c47423de6e03ead849e1aa340edd91af16090e265492756 |

## 尚未验证，不能省略

- 产品 Host 的 Workspace/Session 解析、跨项目拒绝、运行前业务持久化与恢复未知状态。
- 工具返回、缺失/重复终态、长度上限、超时/取消及迟到结果的正式消费规则。
- 完整 Desktop 装配的全部监听器、普通错误、RPC、界面、父会话导出以及保存/引用。
- 实际 DSH 模型/凭据设置读取和真实调用去向；本轮没有用生产适配器验证凭据。
- 模型复述指令的风险、私有 Skill 分发/本机提取边界。不能用本次非复述的离线适配器或字符串过滤证明不存在该风险。

## 下一步最小修改建议（待批准，不在本轮实施）

只新增薄 Host adapter，不改 DSH 核心：复用原生 prepareCall/stream/BlockAssembler，对外只返回允许的终态码、固定安全提示及有效文字结果。异常分支不能序列化原 error/failure、message、stack、cause 或 request；未知错误统一归为受限失败，不把提供方原文放入 logger。错误诊断保留运行 ID、非秘密版本和允许列表中的 code；不能通过删除旧日志制造安全。

实现顺序：先用本轮错误样本写一条对外无 canary 的失败测试，再实现最小适配器；覆盖有效文字/非成功终态/取消/超时/发布冲突，最后复用现有工作台与隔离 Desktop 验证正常路径和错误路径。仍只用公开样本；不自动开启真实调用或扩大为新框架。完整输入授权与外传确认不能由 llm 服务本身替代。
