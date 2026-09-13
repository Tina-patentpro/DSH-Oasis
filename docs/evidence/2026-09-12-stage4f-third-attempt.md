# 4F 第三次真实调用结果

## 结论：FAIL

用户已接受实际 DeepSeek-V4.1-Flash，并授权助手直接启动第三次唯一一次调用。已执行；模型正常结束，但统一结果合同拒绝，未形成可审阅产物，4F 未完成，4G 无正文可继续。未发第四次请求，未自动重试。

## 本次事实

- 隔离 Desktop v2.0.5，内置 DSH/llm/deepseek 0.1.2-rc.1；客户端 SHA256 `4c8c93594922ec606577616df24d51fbe985e26e4aad955eeb83912a20de7f7c`。
- 请求别名 deepseek-official/deepseek-v4-flash/high。2026-09-12 官方价格页实读确认该旧别名由 V4.1-Flash 提供服务；此为提供方公开映射，不是额外捕获的响应 model 字段。
- 正式 flow-2-6/0.2.1，原四字段纯合成材料 1111 字符，无上游/附件；maxTokens=16384、normal/maxRetries=0、Host 原 120s 均未变。
- workspace `ed5eb80e-088f-4944-8f9a-773147c07f98`，新 task `4f8105f8-e02c-4cff-b2ec-64facc5047e9`。
- run `run-f9d5ea39-faed-445f-a2fe-84c14386dde6`，上海时间 2026-09-12 13:44:51.638–13:46:08.628，76990ms。
- 终态 `failed/INVALID_OUTPUT`，`failureStage=result-contract`，`finishKind=stop`，`result=null`。
- 提供方报告 tokens：非缓存输入 134，缓存命中 13949，输出 15384（其中推理 7141），总计 29467。推理是输出子项，不重复相加。
- 实际 Desktop 的“调用记录”已展开并截图查看，错误、终态和用量与持久化一致。

## 判读与边界

源码 `local-generation-service.js` 131–136 行表明：本次原生 adapter 返回 completed 后，`createUnifiedResult` 抛错，记录为 result-contract。已收窄到模型返回后的统一产物构造/校验；不是本次密钥缺失、120s 超时或 max-tokens 终止。不能回溯证明前两次原因。

当前摘要未保存原始失败正文或具体校验分支，因此不能认定是 JSON 语法、缺字段、ID/累计材料校验中的哪一项，也不能认定一定是模型错误或验证器错误。不能凭 stop、tokens 或离线测试把本次当作业务成功。

## 费用

官方来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ 。今日公开 HTML 为 `.dsh-test/stage4f-third-pricing-20260912.html`，curl 退出 0。高峰 Flash 未命中输入 2 元/百万，缓存命中 0.04 元/百万，输出 8 元/百万。

发送前保守上界为 2.228224 元，加用户反馈前两次 0 元，小于累计 10 元。按本次报告用量及高峰费率计算约 0.123898 元（当日非高峰适用价更低），仅估算，不是实扣、账单或退款证据；未访问用户账单。

## 验证与保全

- `node .dsh-test/stage4f-third-once.mjs send`：退出 0，仅一次 UI 勾选及点击；独占 `dispatch-once.json` 阻止同脚本重发。
- `node .dsh-test/stage4f-third-once.mjs capture`：退出 0，一条新运行，11 个旧任务业务字段一致。
- 实际 UI 截图和 ARIA、运行快照、前后基线及保全报告保存在 `.dsh-test/stage4f-third-20260912/`，未输出密钥。
- 候选通过 Browser.close 关闭；`stage4f2-processes.ps1` 退出 0，候选进程及 9231/43120 端口为空。
- `stage4f-third-profiles.mjs after`：退出 0；两真实 Profile 共 20540 条目内容变化 0，11 个旧任务业务字段不变，旧 Skill 编写资源及原保存正文不变。旧 unknown/failed 未解锁、删除或改写。
- 本轮未修改业务源码/模型配置/密钥，没有提交、推送、发布，也未重跑整套替身测试。

## 后续最小范围（尚未实施）

停止真实重试。先只读核对内置 Skill 输出约定与 `createUnifiedResult` 的实际要求，寻找明确冲突；只对有证据的冲突做一个最小离线复现。若需本次失败正文，而现有记录未保留，就如实列为缺证，不用更多替身推断实际正文、不通过额外付费调用补证。修复范围另行制定；不扩展诊断服务，不放宽业务成功门槛。
