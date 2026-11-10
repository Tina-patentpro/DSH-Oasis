---
name: oasis-m06-claims-draft
display_name: "权利要求初稿（私有待验候选）"
display_name_en: "Claims Draft (Private Unverified Candidate)"
description: "Use when a user explicitly requests a patent claims draft from supplied technical disclosure and claim requirements."
description_zh: "用于用户明确要求依据技术交底及范围要求起草权利要求初稿时；私有待验候选。"
description_en: "Use when a user requests a claims draft from supplied technical materials; private unverified candidate."
version: "0.1.0-prep.1"
author: "OasisIntWrite"
---

# M06 权利要求初稿

此入口是WorkBuddy消费适配候选，尚无WorkBuddy安装、模型行为或专业/用户接受。业务依据为固定M06资源0.1.3、Flow-2-6／V3.4.0及F26 V0.1.9试行范围。来源资源保持原字节；其中旧Host描述只说明DSH原承载，不证明本入口具备该能力。

只有当前任务明确请求起草、材料读取与模型数据/费用范围已有授权时，才处理下列用户提供的输入；缺许可时停在缺件说明。仅加载本Skill可能已涉及Host模型处理，本文不能代替Host在加载前的权限/费用控制。不安装、搜索其他Skill，不调用专业API或工作流，不自动回到前序节点，也不发送任何结果。

## 输入和依据

按本次任务显式提供的以下八个ID区分内容，每ID一项；缺失记`not_provided`。文件名/URL不等正文，未读到的文件不称已读取；无法核实际内容时保留缺件。

| ID | 用途 |
|---|---|
| upstream_md_file | 一个Flow-1-5累计主MD，expected；以实际内容为基线，不自行回读其他节点 |
| disclosure_file | 一个用户修订/补充技术交底文件；替换按明确指令，其余补充保留差异 |
| disclosure_text | 一块交底补充/纠正文本 |
| drawings_file | 一个附图文件或单一附图文档 |
| drawings_text | 一块图示关系/更正说明 |
| claim_requirements_file | 一个范围/层级/表达要求文件；不作为技术事实支持 |
| claim_requirements_text | 一块范围/层级/表达要求文本；不作为技术事实支持 |
| user_input | 一段真实用户运行指令；不代文件或补写为用户已要求 |

固定参考资料：

- @references/m06-source/SKILL.md
- @references/m06-source/references/01-official-basis.md
- @references/m06-source/references/02-n01-feature-and-independent-claim.md
- @references/m06-source/references/03-n02-claim-graph-and-fallback.md
- @references/m06-source/references/04-n03-support-terms-parameters.md
- @references/m06-source/references/05-source-and-output-contract.md
- @references/m06-source/references/output-schema.json
- @references/m06-source/THIRD-PARTY-NOTICE.md

01中的规范坐标、02—04的编辑方法和05的来源限制保持各自效力。来源文件中的本机绝对路径仅作追溯，不是读取指令或自动访问许可。未解析依赖不补定义，排除的六载体正文/评价答案不补取。读取或引用失败时明确给出缺件，不能凭相似名称改用其他资料。

## 产出合同

模型候选输出为一个JSON对象，严格沿output-schema.json的`/output_schema`，包含且仅包含以下七字段：

1. `summary`
2. `core_result_markdown`
3. `updates`
4. `tables`
5. `terms_master`
6. `warnings`
7. `model_completions`

按固定业务方法形成独权/从权、必要特征、回退及支持检查；技术事实限用户材料，范围要求不能升级为事实。保留稳定feature_id、来源位置、全部继承警示及新增警示，假设/模型补全保持待人工确认。材料不足仍按原合同给带具体警示草稿；权限或结构缺件不通过补造事实修成成功。未评价的内容写未评估。

模型不生成真实run UID、系统时间/文件名、技术事实已证、审核批准、持久化或完成状态。七字段JSON不是已装配完成的累计主MD，也不是Fast39六字符串或完整申请文件。

## 人工后续与限制

本轮结果是未审候选。专业审阅、用户接受、结构/正文一致性检查、累计文稿装配、无覆盖保存、固定审核版本引用及恢复，须由各自已验证的实际流程办理；本Skill不认证这些状态。

编辑后旧审核失效；人工选择准确版本再审。保存/引用前核项目、正文与来源hash，引用仅准备资料草稿，不发送。没有已核的公共接口时，只交待审内容及具体缺口，不用聊天声明模拟保存成功、跨进程互斥或恢复完成。

本包不含运行脚本或Connector；这不构成Host禁用所有工具、一次模型调用、离线或免费保证。实际工具权限、读取范围、调用次数及费用由目标Host独立验证；原DSH接受、writer租约及存储不能转移为WorkBuddy已通过。
