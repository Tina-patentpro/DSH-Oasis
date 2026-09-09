# 阶段 4B 最小 Host 适配器实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. 单代理；组内测试和范围内修复不重复请求授权。真实调用、真实 Profile、发布不在授权范围。

**Goal:** 将已验证的原生 llm 单次接点封装为薄 Host 模块，使提供方错误不进入 UI/日志，只有明确完成的有效文字能作为结果返回。

**Architecture:** 新增一个未接入产品 RPC 的适配器，通过构造参数接收真实 DSH llm、BlockAssembler、createUserMessage。复用原有七字段执行校验；不创建 Provider/Agent 框架，不改原生日志，不将真实运行塞入 `unified-fixture`。

**Tech Stack:** 现有 ESM JavaScript、node:test、固定 DSH 0.1.2-rc.1。通过既有隔离包导入原生依赖进行集成，不安装依赖、不修改锁文件。

日期：2026-09-07。用户“同意实施下一步”已批准本计划；最小适配器及定向离线验证已实施，证据见 docs/evidence/2026-09-07-stage4b-minimal-host-adapter.md。产品 RPC/UI 尚未接线，不开放真实生成。

## 1. 当前依据与范围

- `src/unified-generation-service.js` 仍明确只允许 `unified-fixture`；`completedFor`、停止和对话准备也受此约束。不能只替换 runner 就宣称完成产品接入。
- `src/generation-contract.js` 定义权利要求书七字段；`validateWorkflowForm('patent-claims', '1', values)` 是执行校验 owner。
- `createUnifiedResult` 限制结果非空且不超过 100000 个 JS 字符，并生成内容哈希。适配器沿用相同上限，但只返回文字，不改变旧产物格式/哈希。
- 4A 原生集成已确认：prepared call 只分发一次、绑定适配器代次；正常指令不追加到 Session/JSONL，但 failure.message 可含原文。不能直接返回或记录该对象。
- 实施起点保留九项既有未提交变更（包含本计划）；没有 OpenSpec 目录，不新建治理工具链。

本批成功标准：实际原生离线服务经过**产品适配器**后，正常文字可取得；包含样本指令的错误只变成固定安全结果；异常/不完整流不能变成成功。不是 G-SKILL、Desktop 或真实生成完成。

## 2. 文件白名单

新增：
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\dsh-generation-adapter.js`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\dsh-generation-adapter.test.mjs`
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-07-stage4b-minimal-host-adapter.md`

修改：
- `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\stage4a-native-llm.test.mjs`：保留原生暴露对照，增加调用产品适配器后的无原文断言，不另建集成框架。
- AGENTS.md、本计划及主计划仅同步准确状态，不清理其他历史段落。

不改 index.js、业务状态机、客户端、依赖/锁文件、Sidebar/Desktop/DSH 包、凭据或 Profile。新增模块没有自动加载和真实执行入口；后续接线时才声明所需 SDK 依赖及 capability。

## 3. 固定接口与行为

```js
const adapter = createDshGenerationAdapter({
  llm, BlockAssembler, createUserMessage, timeoutMs: 120000,
})
const result = await adapter.generate({
  runId, sessionId, formValues,
  instruction: { version, body },
  route: { provider, model, reasoningEffort, maxTokens },
  signal,
})
```

这是 Host 内部接口，不是 RPC。调用者必须在业务授权和持久化入队之后提供权威 sessionId、路由和指令；适配器不得读取客户端任意路径或自己推断 Workspace。**本批不验证产品权限/入队，因为接线尚不存在；不得把形参校验冒称为跨项目授权。**

### 输入与请求

1. 校验必填上下文字符串、指令版本、非空指令正文（最多 64000 JS 字符）、有效 AbortSignal，以及现有七字段执行 schema。错误只返回固定提示，不输出 zod issue/input。
2. 仅复制允许的 route 字段；输入及配置做脱离原对象的冻结快照。unknown 字段拒绝，不转发 headers、endpoint、tools、messages、凭据或其他调用参数。
3. 用 JSON 编码的七字段作为一条 user message；Host 指令只进入 system。用户“instructions”字段仍属于 user 数据，不拼进 system；无历史、文件、工具、递归子任务。
4. 调用一次 `llm.prepareCall(route, combinedSignal)`，随后仅调用该 prepared handle 的 `stream`。不自行 fetch，不改路由，不重试、不回退 API、不绕过 DSH 适配器。

### 返回值

成功：`{ status: 'completed', body, model: { provider, model } }`，只含显式字段，不含原始请求、usage 对象、reasoning、replayState 或 SDK block 对象。

非成功：`{ status: 'failed' | 'unknown', code, message }`，message 从模块内固定中文表取得，不包含动态 error.message、stack、cause、request 或提供方文本。模块不调用 logger/console。

固定失败码：
- `INVALID_INPUT`：输入或配置不完整/无效。
- `MODEL_UNAVAILABLE`：NO_ADAPTER、MISSING_CREDENTIAL、INVALID_CREDENTIAL、AUTH。
- `MODEL_LIMITED`：RATE_LIMIT、QUOTA_EXCEEDED、CONTEXT_WINDOW_EXCEEDED。
- `INVALID_OUTPUT`：空正文、正文超过 100000 JS 字符、工具/图片等非文字业务输出、缺失/重复 finish、finish 后还有数据、非 stop 终态。
- `GENERATION_FAILED`：其他提供方或 SDK 错误、未知 code、装配器异常。
- `ABORTED` / `TIMED_OUT`：中止/超时；调用已开始时返回 unknown，否则 failed。两种均无成功正文，也不表示提供方已取消或未扣费。

读取错误 code 时同样置于保护边界；拒绝恶意 getter/任意字符串成为新的泄漏通道。未知 code 用固定默认值，不拼接进提示。

### 流与资源

只允许一次明确 `finish.kind='stop'` 和有效非空 text 成功。文本分片累积时就检查上限，不等结束才限制内存；不向 UI 流出未验证分片。reasoning/replayState 不持久化、不返回；若要忽略 reasoning 分片，必须在送入 assembler 前丢弃，避免无界缓存。

对 prepare、iterator.next 和最终消费共用 120 秒默认期限及外部 signal；测试可显式传短期限。不只依赖提供方自觉检查 signal：通过有清理的 Promise race 使调用者能及时收到受限结果；向下游 abort，移除监听与计时器。对不合作的 iterator.return 不无界等待，挂接拒绝处理；不能因此宣称后台已停止。迟到分片/异常不得重新改变已返回结果，不提供自动重发。

不得以 canary 字符串过滤正文来证明模型不能复述 Skill。业务正文的专业审核与模型泄漏风险仍独立存在。

## 4. 实施和定向验证

1. **先写失败断言：** 给最小导出骨架，测试一个携带 canary 的提供方异常，要求返回固定码且 `JSON.stringify(result)` 不含 canary。确认失败因适配器行为缺失，不以 import/环境错误当业务红灯。
2. **实现最小边界：** 完成固定错误映射和正常 prepare/stream/assemble 路径，不添加产品入口。先让上例转绿。
3. **补齐受影响规则：** 用表驱动覆盖空/超长/工具输出、缺失/重复/非成功 finish、外部取消、超时、不合作流、迟到异常、无重试、原对象改变不影响快照。测试 double 只用于异常排列，不能代替下一步真实原生集成。
4. **复用 4A 原生装配：** 原始 SDK 错误仍含 canary（对照）；调用 adapter 后只见固定安全错误。正常文字仍经真实原生服务返回，Session/JSONL/导出条目仍不含指令；不关闭普通日志。
5. **定向回归与记录：** 只运行新增适配器单测、既有统一生成单测和该原生集成；记录退出码、源码指纹、未验证项。无 UI/打包接线，不反复跑全量 verify。

命令（cmd.exe）：

```cmd
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\dsh-generation-adapter.test.mjs" "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\unified-generation-service.test.mjs"
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\stage4a-native-llm.test.mjs"
git -C "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研" diff --check
```

## 5. 停点与随后接入

范围内单测修复不重复申请批准。若需要安装依赖、改变公共合同、改上游核心或启动真实模型，则停止对应动作。不得为测试通过削弱失败/未知语义或隐藏原始暴露对照。

本批结束时只允许宣称 Host 模块及原生离线集成的证据。工作台当前仍不可真实生成；不提前改按钮可用状态或“待确认”的说明为“已就绪”。

随后工作台接线必须显式增加真实本地运行模式及迁移/审核/保存兼容、权威 Workspace/Session 与配置读取、授权快照、未决任务互斥、恢复 unknown，然后在原 V3.1 界面验证正常/失败路径。这不是本批独立模块的隐含完成项。实际私有 Skill、真实模型及费用继续另行授权，G-SKILL 保持未通过。
