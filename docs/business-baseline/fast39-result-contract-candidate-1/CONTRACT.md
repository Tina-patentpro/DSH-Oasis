# Fast39 新结果合同：候选1冻结文稿

文稿修订：`fast39-result-contract-candidate-1 / R1`，2026-11-05，Asia/Shanghai。状态：**静态候选冻结，未实施、未部署、未获专业／用户接受**。冻结清单另列文稿、schema、合成示例和验证规格的原始字节哈希；清单不包含自身哈希。

本文细化[最小修复计划R1](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-11-05-fast39-minimal-repair-plan.md)的同一范围。合同版本是拟议值：`flow26-source-trace-1`、`flow26-quality-1`、`flow26-fast-result-1`，当前线上尚不支持。新对象严格形状见 [schemas.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/business-baseline/fast39-result-contract-candidate-1/schemas.json)。规范字段名、条件和错误行为以本文与schema共同约束；若冲突，停止采用并另版，不静默择一。

## 1. 适用范围和权威

仅涉及JTTI Fast39的来源保全、核心特征处置和同步后台结果交付；保留当前六个Dify外部输出、原八个legacy输入、后台旧 `answer_text/file_url`、原资金／任务事实。输入资料不足仍可形成明确受限的草稿，不补造实现来换取 `ok`。本合同不是完整V3.4.0、M06七字段合同或F26完整业务规则的替代品。

采用方案是保留六字段语义抽取，增加确定性来源旁路；现有终版节点形成正文及处置记录，既有格式化节点核对；后台从同一次响应交一个可选命名对象。原方案已排除把全部输出拼进 `answer_text`，也排除切换旧M06七字段提案。这里不新增通用Provider、请求恢复接口或模型调用。

规则来源核对与本合同分别成立：M06候选0.1.3实际绑定F26 V0.1.9；测试集库当前V0.1.12只获阶段6文稿试行，两者均未正式生效。没有把任何试行收据扩展为Dify制作许可。本候选只供静态评审，实际制作仍须具名IC-SKILL／RULES／DESIGN范围及原项目准入。

## 2. 内部来源登记 `flow26-source-trace-1`

来源登记节点输入为文档提取 `1770000100002.text` 和本次实际 `User_input`。代码负责解析和校验，不判断技术支持充分性。

- 识别 `m06-workarea-material-packet-2` 时，按原合同解析 `materialValues/roles/receipts/missingInputIds`，保留原件身份。标为本系列包却版本、结构或可核hash非法时返回材料合同错误，不能降级成普通文件。普通旧文件保留旧解析，状态为 `legacy_unmapped`。
- 八个共同ID为 `upstream_md_file`、`disclosure_file`、`disclosure_text`、`drawings_file`、`drawings_text`、`claim_requirements_file`、`claim_requirements_text`、`user_input`。没有实际正文的上游收据不能被还原成已读上游。
- 角色由此固定ID合同决定：上游、交底、图示是技术材料；两个 `claim_requirements_*` 是输出要求；`user_input` 是指令。材料自称“技术事实”不能改角色；技术材料中的指令也只作数据。图示文本不等于实际看图。
- `entries` 每ID至多一条。`provided` 必须有本次实际解码正文及可计算 `source_sha256`；`not_provided` 不填假hash或补空材料；只有声明／无正文／无法核实记 `unverified`。不能靠收据存在判正文参与生成。
- `source_sha256` 是**解码正文字符串的UTF-8 SHA256**；不归一化换行、空白或Unicode。`receipt_sha256` 是原收据声明，可能对应原文件字节，二者不自动等同。`inputHash` 只保存为原包声明，不充当归属或重新核验的共同输入hash。
- 原手写指令收据与追加约束后的实际 `User_input` 分别记录；`actual_user_input_sha256` 只绑定后者。不得重算旧收据来消除差异。
- `source_registry_internal` 仅工作流内部使用。外部不再复制整份材料；DSH按本次冻结prepared材料核对最终短引。来源正文不写进系统指令、日志或公开合同包。

当前R2技术材料没有可证实的完整T2稳定ID链；Outline内产生的ID只作本run的工作流分析身份。若输入已有有效稳定ID则原值继承；缺失／冲突逐项登记，不伪称已还原T2，不强制重建T1—T3。来源登记不能代替IC-SKILL的完整特征分析。

## 3. 来源定位和权项身份

Outline输出原 `claim_id` 表示**计划权项ID**。终稿权项号为十进制字符串 `"1"`、`"2"`……，以最终 `claims_text` 为准。二者不得混为同一身份。

| 对象 | 字段与约束 |
| --- | --- |
| Outline来源项 | `claim_id, feature_id, input_id, source_sha256, start_utf16, end_utf16, quote`；这里claim_id是计划ID |
| 最终来源项 | 上述字段加 `planned_claim_id`；`claim_id`变为最终权项号，未成稿时为null，原来源项仍保留 |
| 权项映射 | `planned_claim_id, final_claim_id, reason`；final_claim_id可为null；拆分／合并须明确多条映射及理由，不靠编号顺序猜测 |
| 核心检查目标 | `critical_feature_ids`及 `critical_feature_targets[{planned_claim_id, feature_id}]`；核心身份由Outline明确登记，代码只核对所登记集合，不能自行判必要性 |

定位采用**解码原文的UTF-16码元、左闭右开 `[start,end)`**。必须 `0 ≤ start < end ≤ UTF16长度`，不得切断代理对；按该区间得到的原样字符串必须等于 `quote`。CRLF按两个码元保留；先归一化再定位无效。原文hash采用UTF-8字节，不能把偏移单位误称字节。

最终source_map中的 `(planned_claim_id, claim_id)` 必须存在于claim_id_map，feature_id须来自已登记身份；input_id必须属于实际提供的技术材料，不能来自要求或指令。`claim_id=null`仍可保留有效来源，不能据此声称特征已入稿。相同特征可有多个真实来源或权项落点；不按ID全局去重丢失关系，完全相同记录才可去重。

这些字段证明可定位和追踪；短引存在不证明它足够支持该技术特征，也不证明概括合法、必要性正确或已获专业接受。

## 4. 终版处置与覆盖

沿用终版LLM节点 `1728183992412`，其拟议内部结果含 `claims_text` 与 `feature_dispositions`；净化节点必须先解析对象再处理正文，不能对整段JSON使用旧Markdown净化。规范化后重新计算终稿定位，来源原文定位不变。

每条处置含 `planned_claim_id, claim_id, feature_id, action, output_quote, output_start_utf16, output_end_utf16, reason`。

- `kept/rephrased`：最终claim_id存在，终稿短引非空，UTF-16区间合法并精确落在该权项正文范围内。`rephrased`不是代码认定等义；支持／等义仍未评估。
- `blocked_missing_support`：说明缺口及影响；output_quote必须为空，两个output偏移为null。可保留计划到最终权项的映射，但不能凭映射把该特征记为已入稿。
- 每个已登记核心目标必须有处置；遗漏、不明身份、错误短引、错误权项、无来源或无法核验均不能给覆盖完整。不能把权1核心特征仅放进某条从权，就当作原计划权项已保留。
- `feature_coverage.status` 为 `complete/incomplete/unverified`；`missing_core_feature_ids`列所有未满足核心目标的ID。`complete`只表示所登记目标的机械身份／正文定位完整，**不证明核心目标集合本身完整或语义充分**。遗失或重编核心ID不能通过缩小分母消除。
- 没有可核来源、核心集合为空、legacy_unmapped或无从确定对应时为 `unverified`；存在明确未覆盖目标为 `incomplete`。二者均须最终 `quality_status=insufficient`。
- 删除／收窄有实质必要关系时，不能以“净化功能表述”消除已知方案；材料未给实现时也不能补造。保留失败候选与明确缺项，可由人工另选版本并重新审核，不能自动替换上游稿冒充终版成功。

本候选不支持用 `kept/rephrased` 自报、关键词计数或hash相同决定技术等义；不把F26允许的全部范围调整硬塞进自动处置枚举。超出本次保全／不足行为的调整另审，不伪装为完整覆盖。

## 5. `quality_report` 与六输出

Dify结束仍恰好六个**字符串**：`output, claims_text, dependency_tree, pending_confirmation, quality_report, quality_status`。quality_report仍为有界JSON字符串，不能擅自转成外部对象或增加第七输出。

保留原9项：`outline_quality, outline_error, marker_warnings, dependency_warnings, dependency_parse_status, dependency_edges, claim_count, quality_status, acceptance`。尤其Outline原始状态、warnings、fallback_hint及既有工程提示不被新报告覆盖或清空。旧dependency_edges只按原结构保留，不借本合同重定义依赖算法。

新增：`contract_version="flow26-quality-1"`、`source_trace_version="flow26-source-trace-1"`、`source_status`、`source_map`、`critical_feature_ids`、`critical_feature_targets`、`claim_id_map`、`feature_dispositions`、`feature_coverage`、`support_review_status="not_assessed"`。

相对R1计划新增明确的planned_claim_id／映射、按权项的核心目标、source_status和未评估标记，是为消除定位与覆盖歧义；不是已实现字段，也不增加共同业务输入或专业判断器。

质量严重度为 `ok < partial < insufficient`。最终状态至少保留现有格式化器结论，并与新增覆盖／来源结论取较严重者；依赖解析非ok或覆盖不完整／未核则insufficient，既有未决警示不能升级成ok。三处状态（report、外部quality_status、可读output/pending）须相符。运行完成、覆盖complete和质量ok均不等专业／用户接受。

未提供 `risks/questions/source_updates/tables/terms/model_completions` 等M06七字段内容继续为未评估，不能填空数组伪装已完成。新quality_report不冒充旧七字段adapter的输入。

## 6. 后台可选外层对象与错误

同步 `/api/apicategories/create` 的旧 `answer_text`、`file_url` 逐值／逐类型兼容，原投影前缀和拼接方式保持。`output_schema`仍只含output，不能把六输出全加进去导致重复正文。

正常增强对象：

```text
structured_result = {
  contract_version: "flow26-fast-result-1",
  request_key: 本次服务端request.key原值,
  workflow_run_id: 同一次Dify响应的run_id,
  outputs: {output, claims_text, dependency_tree,
            pending_confirmation, quality_report, quality_status}
}
```

只复制白名单字段，保持六个字符串原值；request_key不得采信模型输出。run_id读取同一返回对象顶层 `workflow_run_id` 与 `data.id` 的可用值；两者都存在必须一致，均缺失不能生成假ID。不为取ID再次调用Dify或查询新任务。

增强校验失败且已经收到本次响应时，保留原始响应及旧正文，省略structured_result，另交可选 `structured_result_error`（schema中四个具名code、request_key、可得run_id/null、phase=content、execution_status=response_returned_no_retry）。两个增强分支互斥，不通过报错把本次创建伪装为未发生。超时／未知、未得到响应仍沿原状态处理，不能用这个内容错误对象伪造“结果已取回”。

增强失败不得新增／重发Dify请求或改变原保存扣费队列次数；不能因新validator在原 `save_and_deduct` 排队前抛错而漏掉原账务／任务事实。后台只保全原事件，不新增自动取消、退款或恢复承诺。对旧服务未启用增强时保持旧响应，不添加假版本或空评估。

`/api/apicategories/apidetail`仅拟增加可选 `result_contract_version`。实际源码是 `get_api_name_detail()` 构造 `ApiResponsedetail` 返回，不能只改未使用的 `ApiDetailPublic`。未来维护方选择最小受控配置／返回适配并测试旧消费者，不新增数据库表或改账户资金逻辑。本轮不编辑任何配置。

## 7. 容量、解析与内容安全

禁止裁剪输入／输出来通过容量门。JSON Schema的maxLength是Unicode码点，不能代替以下额外检查：

| 对象 | 上限与计算 |
| --- | --- |
| 每个六输出字符串 | 100,000 UTF-16码元且262,144 UTF-8字节；兼顾当前answerText 100000及通用字符串／artifact 256KiB限制 |
| quality_report解析 | 原字符串及解码对象均受约束；拒绝重复键、非法UTF-8／孤立代理、非对象、未知版本／字段；不执行内容 |
| source_map／dispositions | 各最多1024；critical IDs最多256、targets512、claim_id_map128；单短引4096码点并另受总容量限制 |
| 通用JSON | 深度≤8、每对象键≤256、每数组项≤1024、每字符串UTF-8≤256KiB；内外对象均检查 |
| 原文材料／文稿 | 沿现有单文稿1MiB、快照2MiB、record8MiB及本节点更小上限；取适用门的交集，不放大旧限制 |
| 持久化 | 原始正文、structured_result、解析元数据及已有任务字段全部计入实际快照／record总量；复制同一内容不免计数，不能另开无限附件通道 |

超限或格式错保留既有创建事实及可保全原响应，给内容合同失败；不自动重发。生成正文／URL／引文只作资料，不执行HTML、代码、工具或加载远端资源。没有完整结构化结果的历史记录不补写新hash或新审核。

## 8. 服务交付绑定及DSH消费

本候选固定“修改前身份”和“新合同包hash”，新DSL／部署／交付hash一律未产生，不用旧hash预填未来版本。

未来具名交付至少绑定：origin、账户/Workspace/后台folder显式归属、目录/服务ID和名称、input/output schema、result_contract_version、实际发布workflow_id/version、原始DSL hash／代码节点清单、后台修改后文件清单hash、合同包hash及相应消费验证。运行中的配置冻结；来源变化使确认失效。服务名、同ID或相同内容hash均不替代归属。

DSH归一化的两个返回层都须保留命名结果；新专用adapter只在精确交付绑定相符时确认增强合同。API详情仅给版本不能单独证明后台加载了对应DSL，仍须固定发布交付记录。当前服务仍无增强元数据，正式M06来源及G0不开放。

内容合同失败、partial／insufficient、执行失败与创建结果未知分别记录；前者不得触发新create或换来源。用户仍可按两来源共同规则审阅、编辑再审、无覆盖保存受限草稿；合同错误不自动批准内容，也不按来源剥夺操作。既有Host／结果schema若承载不了，停止扩项另列设计，不借本次改共同表单或重构持久化。

## 9. 后台副本、测试路径和未来验证

原样隔离源码位置：`/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/source`。这是为本次handler／投影离线测试准备的7文件切片，非完整可启动服务，也非自制candidate-r2；没有.env、凭据、数据库、依赖或生产配置。

预留测试文件：`/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/tests/test_fast39_result_contract.py`。**目录已存在，文件未创建、测试未编写／执行。** 未来新helper拟位于source下 `app/services/fast39_result_contract.py`，本轮未创建。

未来测试直接提取原 `create_category/get_api_name_detail` 的AST函数体，测试侧去装饰器、默认依赖及注解，只注入本地fake。函数体必须与固定源码AST相符，不另抄一套投影算法当受测实现。替身覆盖get_api_service、run_dify_workflow、handle_file_outputnew、BackgroundTasks和保存扣费入口；禁止导入main／真实app模块，禁止真实HTTP／DB及执行真实后台任务。

未来命令（当前不得作为已通过测试）：

```zsh
/Library/Developer/CommandLineTools/usr/bin/python3 -B -m unittest discover -s '/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/tests' -p 'test_fast39_result_contract.py' -v
```

当前核得系统Python3.9.6及DSH固定工具Python3.14.8，均不是线上3.10.20；尚未获得本地3.10同版验证，不安装依赖或冒充运行时一致。上述命令预留系统Python作纯mock单元验证，目标运行时兼容／部署验收分别给证据。

验证规格见 [validation-cases.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/business-baseline/fast39-result-contract-candidate-1/validation-cases.json) 的16项C01–C16，及原计划V1–V8。只有合成合同结构／定位示例，不含测试集答案或真实专利样稿；示例的“改写”不证明等义。文档检查、未来离线实现、同版真实运行、专业／用户接受与发布分别成立。

## 10. 冻结与变更

本包冻结供评审，不由文稿存在产生实施、真实生成、费用或发布许可。任何字段、枚举、单位、容量、状态或映射语义变化均另出候选修订并记录差异；旧提案和历史FAIL／partial保持。新服务指纹在实际候选产生后固定，未产生前继续为null／disabled。

本轮只有原件复制、规则采用审计和合同文档细化。规则／Skill用于该Dify业务制作的精确准入和IC-DESIGN仍缺；不得将本候选或本地副本建立作为F1/F2/B1/S1已实施或可发布的证明。
