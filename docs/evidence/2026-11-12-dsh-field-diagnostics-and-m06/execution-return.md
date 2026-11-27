# 字段级拒绝诊断与原 B M06 接续回执

2026-11-12，北京时间。按 R9 推进两条独立工作。现场费用 ¥0.00，模型生成和专业 API 请求均为 0。 [执行前复核](execution-preflight.json) · [R9](../../plans/2026-11-12-dsh-oasis-next-development-plan-r9.md)

## 字段级拒绝诊断

在 R3 隔离候选上补充 JSON 语法、结果结构和文档组装诊断。现有结果页可显示字段路径及拒绝代码。持久化只接受 Host 固定字段名、受限索引和原因码，模型原文、动态键和值留在解析过程。原粗粒度阶段、既有组装代码、通过判据和旧回执均可继续读取。 [候选源码补丁](candidate-source.patch)

| 离线反例 | 路径 | 原因码 |
| --- | --- | --- |
| M01 来源哈希不符 | `$.updates[0].source_hash` | `source-hash-mismatch` |
| M01 原文定位不符 | `$.updates[0].source_locator` | `source-locator-mismatch` |
| M02 表格行 ID 重复 | `$.tables.T1[1].row_id` | `duplicate-table-row` |
| M02 表格行 ID 类型错误 | `$.tables.T1[0].row_id` | `invalid-type` |
| M05 缺正文 | `$.core_result_markdown` | `missing-field` |
| M05 警示对象带未知字段 | `$.warnings[0]` | `unexpected-field` |
| M05 JSON 不完整 | `$` | `invalid-json` |

实际隔离 DSH NEXT Host 回放 3 条正例、7 条反例。正例完成审核、保存与预览，反例拒绝写入，重启后逐项读回。原文和动态键的合成标记在持久化存储中未出现。定向测试 80/80，客户端构建通过。反例由合成材料构造，历史真实 M01、M02 的具体拒绝字段仍未知。 [完整验证](verification.json) · [Host 回放](offline-host.log) · [重启回读](observe-host.log)

## 原 B 的 M06

固定原运行 `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d` 和原正文 SHA-256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`。在原隔离开发安装取得单 writer，以实际安装版 SDK、WorkspaceRegistry、业务 RPC 和持久化服务核权属、四项部件与原警示，再提交对原版本的工程审核。保存前确认实际项目根和两个目标路径均可排他创建。 [原稿与审核](m06-intent.json) · [实际保存目标](m06-save-intent.json)

保存 `claims_20261110114450_89dd69c1.md` 及同名 `.oasis.json`，回读两文件指纹，安全解析已存路径并准备固定版本引用文本。保存脚本首次将清单字段读成顶层字段，在提交保存前停止；复查已持久化审核、尚无保存回执及目标文件后，从保存准备继续，实际保存一次。 [保存回执](m06-save.json)

另一进程通过同版单 writer 冷读审核、两份文件及临时未提交草稿，并清除临时草稿。revision 从 90 到 94，原正文、其他运行和工作区不变，安装检查通过。实际证据范围为已装 SDK/RPC 和冷进程，桌面界面操作、专业审阅及用户接受尚未取得。 [恢复回执](m06-restore.json) · [装机检查](m06-installation-check.log)

## 下一次真实验证待批

建议只验证 M05 修订版一次。材料为原公开合成交底、附图标号文本和访谈，目的地为 DeepSeek 官方模型 API。请求标识、候选、Prompt 和输入指纹已固定。隔离回放保守计数 8,879 输入 token。按 32,000 输入、16,384 输出、高峰未命中计算最高 ¥0.195072，拟授权上限 **¥0.20**，零工具、零重试。失败或未知只查询原标识。 [具名待批单](single-run-proposal.json) · [DeepSeek 官方费率](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)
