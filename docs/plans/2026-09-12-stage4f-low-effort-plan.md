# 4F 推理参数核对与单变量复验方案

## 已确认的只读事实

本轮未修改配置、业务代码或旧运行，未启动Desktop、未调用模型。并发维护的AGENTS、开发Skill和当前状态索引保持不动。

固定候选包 @deepseek-ai/dsh-llm-deepseek/lib/index.js：
- 26–40行只接受off/low/high/max。off映射thinking.type=disabled，不发送reasoning_effort；low/high/max均显式启用thinking并原样传递effort。
- 237–246行：reasoningEffort写入reasoning_effort，maxTokens写入max_tokens；不是专门留给最终正文的单独参数。
- 1564–1582行：模型条目maxTokens优先于连接级默认值；模型目录提供支持的推理档位。
- 绿洲dsh-generation-context.js先取当前会话pending模型选择，再取会话header，最后才取默认模型。因此只改默认设置可能不改变已有会话的high；须在实际目标会话选择并核对确认摘要。

当前官方说明实读：https://api-docs.deepseek.com/guides/thinking_mode/ 。默认thinking enabled/high；low映射low，medium映射high。因此不能建议改成medium来降低推理。官方支持关闭thinking，但本次优先保留推理能力，仅降低强度。

第四次真实记录为max-tokens，输出全部报告为推理tokens；这是此次终止依据，不回溯第三次result-contract。现有high/16384组合不保证留出正文容量，不能据此认定原生参数丢失或密钥异常。

## 推荐：只改 high → low（尚未执行）

1. 在隔离Desktop的当前目标原生会话模型菜单选择同一deepseek-official/deepseek-v4-flash模型的low；实际提供方仍为已接受的V4.1-Flash。只改变reasoningEffort，不改模型、温度、maxTokens16384、Host120s或maxRetries0，不改变Skill0.2.2/输入1111字符/无上游附件，不修改绿洲校验。
2. 先复用既有原生序列化测试接点做一次无网络检查，确认低档请求确实为thinking enabled、reasoning_effort low、max_tokens16384。实际UI核对摘要必须显示low，若仍high或不支持low即停止，不绕过宿主或偷偷改为off。
3. 若用户明确批准新增唯一一次真实调用，发送前刷新官方人民币价格及累计预算；保持10元总上限，无自动重试。新建独立任务，助手经正常确认UI代点一次，保存唯一发送标记。此前四次许可不复用。
4. 按新授权范围复用第四次的临时合同失败正文捕获与原SHA恢复，不扩展为常驻诊断；不保存推理内容/密钥。失败或unknown即停止，无第六次；不能因low仍失败而自动加maxTokens。
5. 有效正文须按既定质量清单检查条款、引用关系、特征依据和缺项。降低推理强度可能影响质量，不保证low能够成功或保证正文长度。用户对可修改基线的确认仍不能冒充已取得。
6. 质量合格后复用该产物做4G编辑再审、无覆盖保存、原生打开、重启恢复、正确Workspace对话草稿（不发送）；最后关闭、恢复临时改动并核对旧任务/Profile。

## 为什么不同时调其他参数

- 增大输出上限会同时扩大耗时及费用，且120s等待仍可能触发；本轮先不改变第二个变量。
- off可完全关闭独立推理，但对起草质量的影响更大，不作为隐式降级。
- 不用删除Skill规则、缩减应交付正文、放宽JSON校验来规避输出预算问题。

## 本轮证据边界

已完成固定源码与官方参数映射核对；未做low实际发送或质量验收。该方案不新增调用授权。待用户批准配置调整和新增唯一调用后实施；不提交推送发布。
