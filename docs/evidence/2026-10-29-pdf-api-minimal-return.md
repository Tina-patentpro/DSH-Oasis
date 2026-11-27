# PDF正式接入与M06 API合同最小接续

2026-10-29，Asia/Shanghai；单代理作者自查。沿既有DS-03及新版Flow-2-6合同工作执行，用户要求“最小改动、不再扩大实验范围”。[执行前复核](2026-10-29-pdf-api-minimal-preflight.json)绑定整体1.3.1、协同1.2.1、NS1-R1/P28、当前入口与原30项未提交文件。

本轮补成[新版API合同候选1](../business-baseline/flow-2-6-m06-api-contract-candidate-1.md)及[机器可读schema/映射](../business-baseline/flow-2-6-m06-api-contract-candidate-1.json)：八输入逐项同名，四文件值按完整正文/hash的JSON字符串传输，四文本原样传输；缺失、空值、文件/文本并存、七字段结果、容量、权威归属、UNKNOWN和费用规则均明确。沿用现有HTTP外层和路径，没有把旧39/46服务绑定成新版服务。实际ID/endpoint/api_process、Dify版本/DSL、权威项目/账户绑定、报价和提供方接受尚未取得，因此状态是可审阅候选，来源未启用。

[PDF兼容接续R1](../business-baseline/v340-pdf-integration-compatibility-r1.md)明确：原提取目标v3名称已被现行M06身份v3占用，后续新提取候选预留v4；现有v1/v2/v3及其序列化/摘要不动，不能只改版本号或给旧数据补签。保留extraction完整证据、原容量和确认失效规则；文字API候选不自动覆盖带PDF证据的新编码。该补充尚非已实现产品协议。

离线核对用当前生产prepare、输出校验、API客户端及现有Zod完成18项检查，包括公开R2七输入、显式合成前序的完整八输入往返，三个文件与同义文本不覆盖，转义/超限拒绝、旧字段/旧输出拒绝、候选元数据/同步响应，以及旧v3拒绝extraction和未实现v4。实际命令为 `tools/bin/node .local/pdf-api-minimal-integration-20261029/verify-contract.mjs`，exit0；[验证记录](2026-10-29-pdf-api-minimal-verification.json)保存范围、结果及产物hash。创建请求仅一次注入fetch离线回放，实际网络请求0；合成结果不是专业质量样本，也不会作为后续真实生成输入。

核对脚本首轮误用累计文稿返回字段 `filename`，实际为 `fileName`，在本轮私有脚本内修正后重跑；产品函数没有该问题。此离线参考编码器未接入产品，不把它记成API适配器已实现。

**PDF正式入口尚未接通，U1/D1/G0保持OPEN。** 仍缺完整文字profile与有界对象/XRef/解码、严格执行限制及取消回收、实际可分发闭包/通知，之后才可做Host新旧编码接线。已有两项容器试验不替代这些条件；本轮未新增或扩大运行实验，也未把DOCX专有缺件设为PDF前置。

本轮只新增合同与接续文件、三状态入口前置说明和验证证据。未改产品源码、依赖锁、固定资源/pin、日常DSH或既有Profile；未启动VM/容器/Host，未发模型/API/上传请求，未产生费用、跨项目投递、提交、推送或发布。正式远程消费仍待backend/Dify提供实际合同身份和接受回执，具名责任人没有被本轮推定。
