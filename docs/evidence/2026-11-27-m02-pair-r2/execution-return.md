# M02 补齐登记与更新双向配对修订 R2 回执

2026-11-27，北京时间。隔离候选已补齐双向配对指令及离线正反例，79/79 定向测试和固定工具构建通过。按本轮授权新增一次真实模型请求，Host 完成并取得正文，状态为 completed_with_warnings；重发 0 次，专业 API 创建 0 次。本次授权已消费。 [执行复核](execution-preflight.json) · [派发绑定](dispatch-binding.json) · [运行核验](verification.json)

本轮保持原公开合成 P1 独立材料及 skill patent-triz-analysis / 0.3.0-rc.4，DeepSeek Flash / Low。候选位于 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-m02-pair-r2-20261127/package`，新增 v340-native-candidate-9 身份绑定修订系统指纹。两个数组分别为 updates 中 model_completed 更新和 model_completions 登记，按 content_id 双向一一对应，各自唯一、集合相同、顺序不限。无补齐更新时登记为空；假设仍待验证，不提升为已确认事实。来源逐字定位、原收据哈希和原组装器约束保留。旧 v5/v8 回执仍按原指纹读取。 [源码差异](candidate-source.patch) · [候选核验](candidate-verification.json) · [新系统指纹](system-freeze.json)

| 离线验证 | 结果 |
| --- | --- |
| 新增配对样例 | 空集合、一对、多对且顺序不同的 3 条正例通过；孤立登记、缺登记、ID 不同、错误来源类型、重复登记、重复更新、大小写不同等 7 条反例按字段拒绝；旧 v5/v8 回执兼容 1 项通过。 |
| 定向回归 | 79/79，包含来源定位 R1 和首批、第二组、全节点合同。RED 阶段 3 个版本断言失败，修订后全通过。 |
| 隔离 DSH Host | 非空有效配对完成、工程审核、排他保存和冷启动预览回读通过。孤立登记得到 $.model_completions[0].content_id / orphan-completion，缺登记得到 $.updates[1].content_id / missing-completion。 |
| 替身样例修正 | 首轮 Host 正例把 assumptions 写成数组，被 result-schema 正确拒绝；改为合同规定的字符串后通过，失败证据保留。该过程模型外传为 0。 |

[回归日志](green-final.log) · [构建](build.log) · [正例](proof-host-return.json) · [孤立登记反例](orphan-negative-host-return.json) · [缺登记反例](missing-negative-host-return.json) · [冷读](recovery-host-return.json) · [首轮样例拒绝](initial-invalid-fixture-return.json)

| 单次真实验证 | 结果 |
| --- | --- |
| 请求标识 | eb6bee3f-e23c-4333-b51f-554ebe6f94a7 |
| 运行标识 | v340-10b9e02f-3991-47b5-a503-24f829e9b2e0 |
| 实际派发 | 2026-11-27T12:43:38.130000+08:00，固定官方 Anthropic API，零工具、零重试。 |
| 提供方 | HTTP 200、end_turn、终止帧及最终用量均取得。 |
| Host | completed；completed_with_warnings / ready_with_warnings；业务稿审核状态 not-reviewed。 |
| 正文与表格 | 正文 6,339 字；T1 1 行、T2 5 行、T3 4 行；T4—T6 明确为 not_yet_generated。 |
| 来源 | 两条 user_text 来源的逐字定位及 SHA256 均与本次冻结实收原文匹配。 |
| 配对覆盖 | model_completed 更新 0 条、model_completions 登记 0 条，空集合配对合法；候选建议保留在分析正文。非空真实配对未被本次模型选中，非空及缺项证据来自离线样例。 |
| 内容核对 | T1 保留 P1，4 条 T3 均指向 P1；研发定性预期及候选效果继续标未测量/待验证，无实验数值或检索执行结论。 |

原始完整结果与正文已按原字节分别归档，完整结果 SHA256 为 3adb93e6473ad4f87ad20de8ee1512aec344c55f476ac72cf93dd904b2383b6a。技术一致性核对与专业/用户接受分开，原始业务稿保持未审核。 [完整结果](M02-R2完整结果.md) · [TRIZ 分析正文](<M02-R2 TRIZ分析正文.md>) · [内容复核及问题清单](content-review.json)

实际用量为 1,241 未命中输入、6,784 缓存命中输入、16,183 输出 token，与 Host 用量一致。按派发时工作日空闲时段每百万 ¥1 / ¥0.02 / ¥4，计量折算 **¥0.06610868**。前两次余额未变化，最后一次 2026-11-27T12:48:14.954891+08:00 观测相对派发前余额减少 **¥0.00**。该差值属于账户余额观测，逐笔结算账单未取得。 [用量与初次余额](verification.json) · [最终余额核对](balance-final.json) · [DeepSeek 官方费率](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)

本次发现的问题已逐项保留。正文自述响应合同为 v340-native-candidate-2，实际 Host 凭证是 v9；正文标签 model_completed_pending_confirmation 与实际空登记不一致。技术分析中“缺少保持约束”等属于推断，需专业复核，S2 的楔紧与过中心机制也需细分条件。输出达到 16,183/16,384 token，剩余 201 token，但 end_turn 正常结束。旁路计量标记 streamIncomplete=true，同时已取得终止帧、最终用量及 Host 完整产物；保留全部信号。

旧 M02 失败回执、M01 T1 稿件和原业务存储均复核指纹一致，临时隔离凭据已清理。本轮修订和验证范围为旁置候选与隔离 Host，未安装到日常 Profile，未提交、推送或发布。后续可独立修正文档元信息、做专业内容审阅，并在明确范围下继续工程保存/恢复；本轮不追加真实生成。
