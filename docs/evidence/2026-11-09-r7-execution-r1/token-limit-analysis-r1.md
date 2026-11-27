# 本次8192截断的有界分析

2026-11-09，Asia/Shanghai。对象仅为rc.5本次`v340-c72ecef4-2cfd-4db1-9680-638738db5cff`，不改旧UNKNOWN/FAIL或反推其原因。原件见[真实运行回执](real-call-original-result-r1.json)及[验证](real-call-verification-r1.json)。

## 已证明

- 新增单次授权只确认一次，SDK重试0；07:12:37.377+08创建，07:13:33.999+08记为`failed/INVALID_OUTPUT`，`result`与`resultDraft`均null。
- 经过rc.5安全摘要链持久化的结束证据为`failureStage=stream`、`finishKind=max-tokens`、`outputTokens=8192`。本次在流结束层因触及输出上限而未进入成功JSON/schema/累计装配，不是一次已取得有效正文后的专业审阅失败。
- 其他安全用量字段为`inputTokens=735`、`cacheReadTokens=46976`、`totalTokens=55903`，均按提供方/SDK字段原样记录；不是价格或已付金额，不据此补账单。
- 固定安装的官方`@deepseek-ai/dsh-llm-deepseek/lib/index.js`中，Messages请求构造把本次maxTokens映射到`max_tokens`，High映射到`thinking.type=enabled`与`output_config.effort=high`；该版本接受off/low/high/max四值。这是该固定包代码事实，不是其他版本或云端性能保证。

## 仍未证明

没有保留部分模型正文/推理或错误全文，本次也未返回`reasoningTokens`。无法区分8192中推理和最终正文各占多少，不能声称“全花在推理”；不能推断再加多少预算必然成功，也不能把前两次归因为同样截断。现有最小合成JSON成功例证明合同有可装配输出，不证明当前真实模型会在此预算内完成。

## 对接续工作的影响

原样参数再次创建请求不属于本次修复后的自动重试，单次许可已经消费完，当前不派发。后续参数方案需要明确：是否改变High、输出上限的具体值、同版输入/资源与正文质量判据、一次调用和费用边界。降低推理强度或改变预算是两个不同变更，不能在失败后同时静默修改，也不拆换固定八载荷来制造一次“相同输入通过”。

本轮已经完成固定SDK配置接点核对和上述有界分析；没有修改真实Profile、生成参数、资源或请求上限，没有新增调用。R7-03仍等待有效正文；专业/用户与发行状态不变，不把截断诊断成功当成业务完成。
