# flow-2-6 · 输出合同 claims-cumulative-2

此文件为 `flow-2-6 / 0.2.1` 的输出格式资料，不是可执行脚本。沿用既定合同2字段，不新增第二套模型返回格式。模型只返回本模板约定的 JSON，由 Host 装配累计 Markdown；不得以自由文本替代结构化返回。

## O1. 单次模型返回

返回一个 JSON 对象，不使用包围整个对象的代码围栏，不附加对象外文字。以下十个顶层字段全部返回；字符串中的 Markdown 换行、引号按 JSON 正确转义。

| 字段 | 类型与内容要求 |
|---|---|
| summary | 字符串；本次已形成内容、主要技术判断、首要限制和补齐范围。摘要不代替全文 |
| draftMarkdown | 字符串；一份编号连续的权利要求初稿全文；没有可起草技术手段时说明未形成条款及原因，不编造完整草稿 |
| featureMatrixMarkdown | 字符串；独权技术主线与逐权项/特征矩阵，具体见O2 |
| fallbackMarkdown | 字符串；从权附加特征、贡献、引用树和回退价值，具体见O3 |
| supportMatrixMarkdown | 字符串；T4权项侧初版及各类初检结论，具体见O4 |
| snapshotUpdates | 数组；每项包含contentId、operation、contentMarkdown、sourceInputId、sourceLocator、contentOrigin、revisionReason；operation仅add或replace，replace须有明确替换依据，不包含删除授权 |
| warnings | 数组；每项包含warningId、inheritedFrom、problem、affectedContent、currentHandling、modelCompletion、deliverableImpact、recommendedAction、status；新增警示status仅open，继承警示不自行关闭 |
| modelCompletions | 数组；每项包含contentId、contentOrigin=model_completed、completionBasis、assumptions、confidence、affectedSection、humanConfirmationStatus=pending |
| workflowStatus | completed或completed_with_warnings；业务产出建议，不是技术运行状态 |
| deliverableStatus | ready、ready_with_warnings、model_completed_pending_confirmation、not_recommended_for_filing之一 |

保持既有camelCase字段名；不要在同一个模型返回里另造workflow_status、model_completed等平行字段。Host主文档中的snake_case元数据是其成文映射，不是第二套模型响应。

`snapshotUpdates` 只表达本节点建议变化；未变化的上游不能因为不在数组中就被删除。`sourceInputId/sourceLocator` 指向实际材料，不能把主指令或案例当作用户输入来源。`contentOrigin` 表达实际来源身份，不把文字润色误写为实质技术补齐，也不把新增技术方案冒充原文。

没有补齐且经逐特征检查时 `modelCompletions` 才能为空；开放警示必须继承，不能因为本轮没有新增问题就把 `warnings` 清空。输入未提供、事实未核验、专项资料缺失时具体写出影响，不用空数组表示无风险。

## O2. 独权分析和特征矩阵

`featureMatrixMarkdown` 分为两部分：

### 独权技术主线

每项独权一行，列为：权项编号/类型、主tp_id及技术问题、必要特征组合、对应te_id及效果、效果证据状态、当前布局依据。

“必要特征组合”须同时包括有关实体、关系和步骤，不只抄产品名称；“效果证据状态”区分交底说明、实际试验、推断或缺失，不捏造测试证明。

### 逐特征矩阵

列为：权项编号、feature_id或明示临时ID、特征原文/简述、实际输入ID与段落定位、内容来源、主问题与技术作用、必要性/附加贡献、关联warningId或补齐contentId。

一项权利要求含多个不同技术特征时分行；同一特征被从权继承可指向已有行，但新增的关系/范围限定须单列。矩阵必须覆盖正文中所有实质特征和重要组合关系，不用“一般机械知识”笼统盖过来源缺口。

## O3. 从属回退

`fallbackMarkdown` 至少包含：

1. 引用树：每个独权根节点与其从权分支，标出多项择一引用；不按编号顺序臆造依赖。
2. 逐从权表：编号、所引用权项、附加特征及来源、解决的进一步问题/技术贡献、范围如何收窄、作为回退的价值、剩余限制。
3. 布局说明：为什么并列分支或串联；哪些具体结构保留为窄层，哪些拓展因无支持没有进入正文。

不将增加“最好、精准、可靠”等形容词视为范围收窄。没有从权的有效短稿明确说明原因，不为填满表格造条款。备选建议放在此处并明确非当前权利要求，不混入 `draftMarkdown` 的正式编号。

## O4. T4初版与初检

`supportMatrixMarkdown` 包含：

### T4权项侧初版

列为：权项/feature_id、当前交底证据及位置、目前能支持的范围、概括/功能/参数/用途风险、预期说明书支持需求、实际说明书位置、缺项/警示。

“实际说明书位置”在尚未生成时明确为“尚未生成”；若用户确实提供了说明书，才引用实际位置。不得根据权项编号编造说明书段落号。

### 初检结论

逐项列出：必要特征完整性、支持性、清楚性、简要性、引用与术语、单一性、申请类型及特殊领域、新颖性/创造性证据范围、来源及补齐一致性。每项写检查对象、可支持的结论、未覆盖范围及关联警示。

结论不能只有“通过/不通过”，也不能把没有检索证据写成“具有新颖性”。初稿缺少未来具体实施方式章节本身不是错，但交底缺少支撑权项的技术手段必须指出。

## O5. 警示与技术补齐的写法

警示必须落到具体问题和动作。示意：

- problem：两次孔位测量的角度基准对应关系未交代。
- affectedContent：权项9及相关定位特征。
- currentHandling：正文保持交底的角度调整意图，未填入标定算法。
- modelCompletion：本项未新增标定技术；若另提方案须关联实际补齐contentId。
- deliverableImpact：尚不能认定孔位比较实现依据充分，不建议直接申报。
- recommendedAction：请发明人补充两坐标系基准关系及误差处理方式。

这只是字段写法，不是必须出现在所有业务中的固定警示。不要复用案例警示ID或把不存在的问题填入当前结果。

模型补齐应逐项说明六项语义：来源身份、依据、假设、置信度、影响位置、人工确认状态。置信度只表达建议可靠程度，不是测量概率或人工签认。可区分“已有技术语言规范化”和“新增结构/参数设想”，但后者必须进入补齐数组并关联警示。

状态按实际内容给出：

- 没有开放警示且完成节点约定时，workflowStatus为completed；其余有业务产物但带限制时为completed_with_warnings。
- 没有可用手段、关键矛盾未解决或存在重大支持缺口时，deliverableStatus为not_recommended_for_filing。
- 关键技术内容含待确认模型补齐但没有上述更严重限制时，使用model_completed_pending_confirmation。
- 其他可继续下游的开放问题使用ready_with_warnings；ready仅指适合下一节点基线，不表示正式申请获准或审核完成。
- 多种问题同时存在时采用不掩盖最重大限制的状态，其他问题全部保留在warnings；不为获得ready而消除警示。

## O6. Host累计成文约定（尚待代码落实）

唯一主文件名为 `claims_<YYYYMMDDHHMMSS>_<run_uid8>.md`。Host提供并校验Asia/Shanghai时间、完整UUID、run_uid8、确切文件名、哈希与实际输入登记，模型不得伪造这些身份。

Host将模型字段和完整有效上游合成为以下五个固定二级章节：

1. `## 文档信息`：节点Flow-2-6、skillId=flow-2-6、skillVersion=0.2.1、三项合同版本、运行UID、时间、文件名、前序身份/哈希、来源及业务/交付状态。
2. `## 核心结论`：summary及必要的未核验范围。
3. `## 核心结果`：draftMarkdown全文、独权技术主线、特征矩阵、从属回退、T4及初检。不以摘要替代任何全文。
4. `## 下游读取区`：完整当前累计快照，包括有效前序内容、当前权项、T1/T2/T3/T4、输入来源、补齐登记与全部开放警示；未到生产节点的T5/T6等保持not_yet_generated。Host按明确更新合并，不仅输出delta，也不以模型摘要替代上游。
5. `## 风险与待确认事项`：逐条继承与新增警示、人工动作、补齐确认状态。只建议返工，不自动回流。

完整上游和有效结果超出上下文/输出能力时，Host应停止不安全的截断或伪完整成文；不能让模型用“其余同上”冒充累计全文。

缺字段、非法类型/状态、无法解析、技术层未完成的响应，由Host按无有效完整产物处理，不自动重发。技术超时、取消或无有效文字不是模型自行改成completed_with_warnings的理由。语义必要性、支持性和创造性不能由简单字符串匹配代替人工判断。

审核、保存、无覆盖文件写入、版本生成和准备DSH对话草稿均是后续独立动作；本次模型返回不声称这些动作已完成。两种生成来源的产物适用同等规则。
