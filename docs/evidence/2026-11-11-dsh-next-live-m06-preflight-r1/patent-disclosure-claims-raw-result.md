# V3.4.0累计文稿

## 文档信息

- business_version: V3.4.0
- node_id: Flow-2-6
- workflow_run_uid: a35508d7-10a2-4e35-b35f-a404083a3d87
- generated_at: 2026-11-11T20:37:41+08:00
- filename: claims_20261111203741_a35508d7.md
- upstream_run_uid: none
- upstream_filename: none
- upstream_file_sha256: none
- workflow_status: completed_with_warnings
- deliverable_status: model_completed_pending_confirmation

## 核心结论

已基于交底起草一项产品独立权利要求。因缺少上游5.1/5.2分类、附图、锁止件细节和权利要求撰写要求，未设置从属权项，返回受限草稿并列出待确认项；未运行审计工具，不声称已通过形式审计或授权评估。

## 核心结果

````text
# 权利要求初稿（受限草稿）

## 一、application_plan.yaml

```yaml
application_type: 待确认
one_sentence: 问题：滑块的移动状态需要被允许或限制；手段：在底座上设置沿第一方向延伸的导向槽、与导向槽配合的滑块以及具有两种状态的锁止件；效果：锁止件可允许或限制滑块移动。
claim_tree:
  independent:
    - id: CL1
      claim_no: 1
      category: 产品
      title: 一种滑移组件
      features:
        - id: F1
          text: 底座
          basis: disclosure_file 第3段
        - id: F2
          text: 导向槽设置于底座上，并沿第一方向延伸
          basis: disclosure_file 第3段
        - id: F3
          text: 滑块与导向槽配合，能够沿第一方向移动
          basis: disclosure_file 第3段
        - id: F4
          text: 锁止件设置于底座上，并具有允许滑块移动的第一状态和限制滑块移动的第二状态
          basis: disclosure_file 第3段
  dependents: []
open_questions:
  - 未提供上游5.1必要技术特征/5.2优选特征分类，无法按Fk编号核对；本稿仅使用交底明确记载的组成。
  - 未提供图纸或附图说明，权要未写附图标记。
  - 未提供锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节，无法形成有交底支持的从属权项。
  - 未提供权利要求撰写要求，申请类型（发明/实用新型）待确认。
  - 未运行审计工具，不能声称已通过形式审计。
```

## 二、权利要求书.md

```markdown
# 权利要求书

1. 一种滑移组件，其特征在于，包括：
底座；
导向槽，设置于所述底座上，并沿第一方向延伸；
滑块，与所述导向槽配合，能够沿所述第一方向移动；
锁止件，设置于所述底座上，并具有允许所述滑块移动的第一状态和限制所述滑块移动的第二状态。
```

## 三、待确认事项（不进入权要正文）
- 申请类型及权项组合：交底仅描述产品，未提供方法步骤或系统模块关系；本稿只写产品独立权项，未写方法权项或第二条系统独立权项。
- 锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节均未提供，不能写入权要。
- 未提供5.1/5.2分类、附图、公式和权利要求撰写要求；从属树为空，不表示已评估从属权项布局。
- 未进行检索，未评估新颖性、创造性或授权前景；未运行audit_claims.py，不能声称APPLICATION_CLAIMS为ok。

## 四、起草限制
本稿仅使用交底明确记载的底座、导向槽、滑块、锁止件及两种状态；未补入交底未记载的驱动、形状、内部结构、尺寸、材料、连接关系、附图标记或实验数据。本稿为受限草稿，需补充材料后复核。
````

## 下游读取区

```oasis-v340
{
  "schema_version": "oasis-v340-1",
  "node_id": "Flow-2-6",
  "workflow_run_uid": "a35508d7-10a2-4e35-b35f-a404083a3d87",
  "generated_at": "2026-11-11T20:37:41+08:00",
  "filename": "claims_20261111203741_a35508d7.md",
  "upstream_run_uid": "none",
  "upstream_filename": "none",
  "upstream_file_sha256": "none",
  "application_type": "undetermined",
  "terms_master": [
    {
      "term": "第一方向",
      "definition": "导向槽的延伸方向，也是滑块能够移动的方向。",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea"
    },
    {
      "term": "导向槽",
      "definition": "设置于底座上并沿第一方向延伸、与滑块配合的结构；交底未给出具体形状、截面和尺寸。",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea"
    },
    {
      "term": "滑块",
      "definition": "与导向槽配合并能够沿第一方向移动的部件。",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea"
    },
    {
      "term": "锁止件",
      "definition": "设置于底座上、具有允许滑块移动和限制滑块移动两种状态的部件；交底未给出其驱动方式、形状、内部结构、尺寸、材料和连接细节。",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea"
    }
  ],
  "tables": {
    "T1": {
      "status": "generated",
      "rows": [
        {
          "row_id": "CL1",
          "data": {
            "claim_no": 1,
            "type": "独立权利要求",
            "category": "产品",
            "title": "一种滑移组件",
            "status": "受限草稿",
            "dependent_count": 0
          }
        }
      ]
    },
    "T2": {
      "status": "generated",
      "rows": [
        {
          "row_id": "F1",
          "data": {
            "feature_id": "F1",
            "feature": "底座",
            "basis": "disclosure_file 第3段"
          }
        },
        {
          "row_id": "F2",
          "data": {
            "feature_id": "F2",
            "feature": "导向槽设置于底座上，并沿第一方向延伸",
            "basis": "disclosure_file 第3段"
          }
        },
        {
          "row_id": "F3",
          "data": {
            "feature_id": "F3",
            "feature": "滑块与导向槽配合，能够沿第一方向移动",
            "basis": "disclosure_file 第3段"
          }
        },
        {
          "row_id": "F4",
          "data": {
            "feature_id": "F4",
            "feature": "锁止件设置于底座上，并具有允许滑块移动的第一状态和限制滑块移动的第二状态",
            "basis": "disclosure_file 第3段"
          }
        }
      ]
    },
    "T3": {
      "status": "missing",
      "rows": []
    },
    "T4": {
      "status": "missing",
      "rows": []
    },
    "T5": {
      "status": "not_yet_generated",
      "rows": []
    },
    "T6": {
      "status": "not_yet_generated",
      "rows": []
    }
  },
  "contents": [
    {
      "content_id": "application_plan_claim_tree",
      "content_markdown": "application_type: 待确认\none_sentence: 问题：滑块的移动状态需要被允许或限制；手段：在底座上设置沿第一方向延伸的导向槽、与导向槽配合的滑块以及具有两种状态的锁止件；效果：锁止件可允许或限制滑块移动。\nclaim_tree:\n  independent:\n    - id: CL1\n      claim_no: 1\n      category: 产品\n      title: 一种滑移组件\n      features:\n        - id: F1\n          text: 底座\n          basis: disclosure_file 第3段\n        - id: F2\n          text: 导向槽设置于底座上，并沿第一方向延伸\n          basis: disclosure_file 第3段\n        - id: F3\n          text: 滑块与导向槽配合，能够沿第一方向移动\n          basis: disclosure_file 第3段\n        - id: F4\n          text: 锁止件设置于底座上，并具有允许滑块移动的第一状态和限制滑块移动的第二状态\n          basis: disclosure_file 第3段\n  dependents: []\nopen_questions:\n  - 未提供上游5.1必要技术特征/5.2优选特征分类，无法按Fk编号核对；本稿仅使用交底明确记载的组成。\n  - 未提供图纸或附图说明，权要未写附图标记。\n  - 未提供锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节，无法形成有交底支持的从属权项。\n  - 未提供权利要求撰写要求，申请类型（发明/实用新型）待确认。\n  - 未运行审计工具，不能声称已通过形式审计。",
      "content_origin": "model_completed",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段（滑移组件组成及连接关系）",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea",
      "trust_status": "reasoned_inference",
      "last_updated_flow": "Flow-2-6",
      "revision_reason": "首次基于交底组织claim_tree，并记录缺失上游分类、附图和锁止件细节。"
    },
    {
      "content_id": "claims_draft_md",
      "content_markdown": "# 权利要求书\n\n1. 一种滑移组件，其特征在于，包括：\n底座；\n导向槽，设置于所述底座上，并沿第一方向延伸；\n滑块，与所述导向槽配合，能够沿所述第一方向移动；\n锁止件，设置于所述底座上，并具有允许所述滑块移动的第一状态和限制所述滑块移动的第二状态。",
      "content_origin": "model_completed",
      "source_input_id": "disclosure_file",
      "source_locator": "values.disclosure_file.body 第3段（滑移组件组成及连接关系）",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea",
      "trust_status": "reasoned_inference",
      "last_updated_flow": "Flow-2-6",
      "revision_reason": "首次起草产品独立权利要求；因缺少5.1/5.2和附加结构细节，未生成从属权项。"
    },
    {
      "content_id": "host/a35508d7-10a2-4e35-b35f-a404083a3d87/Flow-2-6/input-disclosure_file",
      "content_markdown": "# 公开合成技术交底：导向滑块与锁止件\n\n本材料为独立编写的测试夹具，仅用于核对权利要求初稿的生成、保存和来源追溯。\n\n一套滑移组件包括底座、导向槽、滑块和锁止件。导向槽设置于底座上，并沿第一方向延伸。滑块与导向槽配合，能够沿第一方向移动。锁止件设置于底座，并具有允许滑块移动和限制滑块移动两种状态。\n\n本材料未给出锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节、真实附图或实验数据。请依据已知关系编写权利要求初稿，对缺失信息列出待确认项，不把推测写成技术事实。\n",
      "content_origin": "user_file",
      "source_input_id": "disclosure_file",
      "source_locator": "public-disclosure.md",
      "source_hash": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea",
      "trust_status": "source_fact",
      "last_updated_flow": "Flow-2-6",
      "revision_reason": "Host逐字保留实际输入/节点正文；技术语义未自动确认"
    },
    {
      "content_id": "host/a35508d7-10a2-4e35-b35f-a404083a3d87/Flow-2-6/core",
      "content_markdown": "# 权利要求初稿（受限草稿）\n\n## 一、application_plan.yaml\n\n```yaml\napplication_type: 待确认\none_sentence: 问题：滑块的移动状态需要被允许或限制；手段：在底座上设置沿第一方向延伸的导向槽、与导向槽配合的滑块以及具有两种状态的锁止件；效果：锁止件可允许或限制滑块移动。\nclaim_tree:\n  independent:\n    - id: CL1\n      claim_no: 1\n      category: 产品\n      title: 一种滑移组件\n      features:\n        - id: F1\n          text: 底座\n          basis: disclosure_file 第3段\n        - id: F2\n          text: 导向槽设置于底座上，并沿第一方向延伸\n          basis: disclosure_file 第3段\n        - id: F3\n          text: 滑块与导向槽配合，能够沿第一方向移动\n          basis: disclosure_file 第3段\n        - id: F4\n          text: 锁止件设置于底座上，并具有允许滑块移动的第一状态和限制滑块移动的第二状态\n          basis: disclosure_file 第3段\n  dependents: []\nopen_questions:\n  - 未提供上游5.1必要技术特征/5.2优选特征分类，无法按Fk编号核对；本稿仅使用交底明确记载的组成。\n  - 未提供图纸或附图说明，权要未写附图标记。\n  - 未提供锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节，无法形成有交底支持的从属权项。\n  - 未提供权利要求撰写要求，申请类型（发明/实用新型）待确认。\n  - 未运行审计工具，不能声称已通过形式审计。\n```\n\n## 二、权利要求书.md\n\n```markdown\n# 权利要求书\n\n1. 一种滑移组件，其特征在于，包括：\n底座；\n导向槽，设置于所述底座上，并沿第一方向延伸；\n滑块，与所述导向槽配合，能够沿所述第一方向移动；\n锁止件，设置于所述底座上，并具有允许所述滑块移动的第一状态和限制所述滑块移动的第二状态。\n```\n\n## 三、待确认事项（不进入权要正文）\n- 申请类型及权项组合：交底仅描述产品，未提供方法步骤或系统模块关系；本稿只写产品独立权项，未写方法权项或第二条系统独立权项。\n- 锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节均未提供，不能写入权要。\n- 未提供5.1/5.2分类、附图、公式和权利要求撰写要求；从属树为空，不表示已评估从属权项布局。\n- 未进行检索，未评估新颖性、创造性或授权前景；未运行audit_claims.py，不能声称APPLICATION_CLAIMS为ok。\n\n## 四、起草限制\n本稿仅使用交底明确记载的底座、导向槽、滑块、锁止件及两种状态；未补入交底未记载的驱动、形状、内部结构、尺寸、材料、连接关系、附图标记或实验数据。本稿为受限草稿，需补充材料后复核。",
      "content_origin": "workflow_analysis",
      "source_input_id": "none",
      "source_locator": "本节点核心结果",
      "source_hash": "none",
      "trust_status": "reasoned_inference",
      "last_updated_flow": "Flow-2-6",
      "revision_reason": "Host逐字保留实际输入/节点正文；技术语义未自动确认"
    },
    {
      "content_id": "host/a35508d7-10a2-4e35-b35f-a404083a3d87/Flow-2-6/summary",
      "content_markdown": "已基于交底起草一项产品独立权利要求。因缺少上游5.1/5.2分类、附图、锁止件细节和权利要求撰写要求，未设置从属权项，返回受限草稿并列出待确认项；未运行审计工具，不声称已通过形式审计或授权评估。",
      "content_origin": "workflow_analysis",
      "source_input_id": "none",
      "source_locator": "本节点核心结论",
      "source_hash": "none",
      "trust_status": "reasoned_inference",
      "last_updated_flow": "Flow-2-6",
      "revision_reason": "Host逐字保留实际输入/节点正文；技术语义未自动确认"
    }
  ],
  "warnings": [
    {
      "warning_id": "host-Flow-2-6-missing-upstream_md_file",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "未提供：upstream_md_file",
      "affected_content": "本次输入及下游累计快照",
      "current_handling": "保留实际材料并继续输出",
      "model_completion": "未评估",
      "deliverable_impact": "需人工核对",
      "recommended_action": "核对实际输入及其来源",
      "status": "open"
    },
    {
      "warning_id": "host-Flow-2-6-professional-review",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "仅核对结构、来源和累计传递；技术语义及专业质量尚待人工审核。",
      "affected_content": "本次输入及下游累计快照",
      "current_handling": "保留实际材料并继续输出",
      "model_completion": "未评估",
      "deliverable_impact": "需人工核对",
      "recommended_action": "核对实际输入及其来源",
      "status": "open"
    },
    {
      "warning_id": "host-Flow-2-6-m06-limited-a35508d7-10a2-4e35-b35f-a404083a3d87",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "本版本仅核对已识别的指令来源；正文与表格、依据的一致性尚未核对，未执行结构删除。",
      "affected_content": "本节点正文、结构表和来源",
      "current_handling": "保留原输入、结构记录和历史，仅形成受限稿",
      "model_completion": "未评估",
      "deliverable_impact": "不能据此认定完整同步、结构删除或专业审阅已完成",
      "recommended_action": "核对当前正文、相关表格与依据；完整变更另行处理",
      "status": "open"
    },
    {
      "warning_id": "host-Flow-2-6-missing-table-T3",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "T3已到生产节点但未取得表内容；未伪装为尚未生产或验证通过。",
      "affected_content": "本次输入及下游累计快照",
      "current_handling": "保留实际材料并继续输出",
      "model_completion": "未评估",
      "deliverable_impact": "需人工核对",
      "recommended_action": "核对实际输入及其来源",
      "status": "open"
    },
    {
      "warning_id": "host-Flow-2-6-missing-table-T4",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "T4已到生产节点但未取得表内容；未伪装为尚未生产或验证通过。",
      "affected_content": "本次输入及下游累计快照",
      "current_handling": "保留实际材料并继续输出",
      "model_completion": "未评估",
      "deliverable_impact": "需人工核对",
      "recommended_action": "核对实际输入及其来源",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-UPSTREAM-CLASSIFICATION",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "未提供上游5.1必要技术特征/5.2优选特征分类，缺少Fk编号及对应关系。",
      "affected_content": "application_plan.yaml 的 claim_tree；权利要求书.md 第1项",
      "current_handling": "未自行判断必要性，仅将交底明确记载的底座、导向槽、滑块、锁止件写入产品独立权项；从属树为空。",
      "model_completion": "按受限草稿处理，不声称已完成5.1/5.2核对。",
      "deliverable_impact": "独立权项范围可能过宽或缺少优选层次；从属权项布局未完成。",
      "recommended_action": "补充5.1/5.2分类后，按Fk编号复核独权并补齐从属树。",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-DRAWINGS",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "未提供图纸或附图说明，无法核对附图标记和结构对应关系。",
      "affected_content": "权利要求书.md；application_plan.yaml",
      "current_handling": "权要未写附图标记，也未按附图组织结构关系。",
      "model_completion": "按无附图受限草稿处理。",
      "deliverable_impact": "后续说明书撰写和附图引用缺少核对基础。",
      "recommended_action": "补充图纸或附图说明后，统一权要、说明书和附图标记。",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-LOCK-DETAILS",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "交底明确未给出锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节。",
      "affected_content": "权利要求书.md 第1项及从属权项布局",
      "current_handling": "未将上述缺失内容写入权要，避免把推测写成技术事实。",
      "model_completion": "锁止件仅保留两种状态的功能性限定。",
      "deliverable_impact": "无法形成有交底支持的锁止件从属限定；相关保护范围不确定。",
      "recommended_action": "补充锁止件结构、连接或驱动细节后，再增加从属权项。",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-REQUIREMENTS",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "未提供权利要求撰写要求，claim_requirements_file 与 claim_requirements_text 均为 not_provided。",
      "affected_content": "application_plan.yaml 的 application_type；权利要求书.md",
      "current_handling": "按固定权要策略起草产品独立权项，未自行扩展方法权项或第二条系统独立权项。",
      "model_completion": "申请类型和权项组合仍待确认。",
      "deliverable_impact": "格式、申请类型和权项组合可能不符合后续要求。",
      "recommended_action": "提供撰写要求并确认发明或实用新型类型后复核。",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-DEPENDENTS",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "交底未给出可区别于独立权项的附加技术特征，且缺少5.2优选特征。",
      "affected_content": "application_plan.yaml 的 claim_tree.dependents",
      "current_handling": "从属树为空，未编造从属权项。",
      "model_completion": "仅保留一项产品独立权利要求。",
      "deliverable_impact": "权要集仅一项，保护层次不足。",
      "recommended_action": "补充5.2或实施例细节后建立从属树。",
      "status": "open"
    },
    {
      "warning_id": "W-CLAIM-AUDIT",
      "first_flow": "Flow-2-6",
      "inherited_from": "none",
      "problem": "未运行audit_claims.py，无APPLICATION_CLAIMS审计结果。",
      "affected_content": "权利要求书.md",
      "current_handling": "未声称机器通过或形成授权结论。",
      "model_completion": "以受限草稿交付，等待允许运行工具时审计。",
      "deliverable_impact": "形式缺陷尚未机器核验。",
      "recommended_action": "在允许运行工具时执行审计并修正。",
      "status": "open"
    }
  ],
  "model_completions": [
    {
      "content_id": "application_plan_claim_tree",
      "content_origin": "model_completed",
      "completion_basis": "依据 disclosure_file 第3段明确记载的底座、导向槽、滑块、锁止件及两种状态，按权要策略组织claim_tree；未补充交底未记载的驱动、形状、尺寸、材料或连接关系。",
      "assumptions": "交底未给出5.1/5.2分类、附图、公式和权要撰写要求；因此仅保留一项产品独立权项，从属树为空，并将缺项列入开放问题。",
      "confidence": "medium-low",
      "affected_section": "application_plan.yaml 的 claim_tree 与 open_questions",
      "human_confirmation_status": "pending"
    },
    {
      "content_id": "claims_draft_md",
      "content_origin": "model_completed",
      "completion_basis": "将交底第3段明确记载的底座、导向槽、滑块、锁止件及两种状态写入产品独立权利要求1；未写入从属权项、附图标记、数值参数或推测结构。",
      "assumptions": "申请类型尚未确定；产品权项可先作为受限草稿，后续需按发明或实用新型要求复核。",
      "confidence": "medium-low",
      "affected_section": "权利要求书.md 第1项",
      "human_confirmation_status": "pending"
    }
  ],
  "manual_edit_manifest": [],
  "revisions": [],
  "input_history": [
    {
      "node_id": "Flow-2-6",
      "workflow_run_uid": "a35508d7-10a2-4e35-b35f-a404083a3d87",
      "input_sha256": "72ffc44a10739e8fbcd71afed761e73f4962c91eca1701867548fe90cb09a2ec",
      "inputs": {
        "upstream_md_file": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "disclosure_file": {
          "status": "accepted",
          "sha256": "796f7f4d8b160ad4eb1fd4695d7b050a387daf437bba53df83dc2500299f1cea",
          "filename": "public-disclosure.md",
          "content_origin": "user_file"
        },
        "disclosure_text": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "drawings_file": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "drawings_text": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "claim_requirements_file": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "claim_requirements_text": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        },
        "user_input": {
          "status": "not_provided",
          "sha256": "none",
          "content_origin": "none",
          "filename": "not_provided"
        }
      }
    }
  ],
  "current_result": {
    "summary": "已基于交底起草一项产品独立权利要求。因缺少上游5.1/5.2分类、附图、锁止件细节和权利要求撰写要求，未设置从属权项，返回受限草稿并列出待确认项；未运行审计工具，不声称已通过形式审计或授权评估。",
    "core_result_markdown": "# 权利要求初稿（受限草稿）\n\n## 一、application_plan.yaml\n\n```yaml\napplication_type: 待确认\none_sentence: 问题：滑块的移动状态需要被允许或限制；手段：在底座上设置沿第一方向延伸的导向槽、与导向槽配合的滑块以及具有两种状态的锁止件；效果：锁止件可允许或限制滑块移动。\nclaim_tree:\n  independent:\n    - id: CL1\n      claim_no: 1\n      category: 产品\n      title: 一种滑移组件\n      features:\n        - id: F1\n          text: 底座\n          basis: disclosure_file 第3段\n        - id: F2\n          text: 导向槽设置于底座上，并沿第一方向延伸\n          basis: disclosure_file 第3段\n        - id: F3\n          text: 滑块与导向槽配合，能够沿第一方向移动\n          basis: disclosure_file 第3段\n        - id: F4\n          text: 锁止件设置于底座上，并具有允许滑块移动的第一状态和限制滑块移动的第二状态\n          basis: disclosure_file 第3段\n  dependents: []\nopen_questions:\n  - 未提供上游5.1必要技术特征/5.2优选特征分类，无法按Fk编号核对；本稿仅使用交底明确记载的组成。\n  - 未提供图纸或附图说明，权要未写附图标记。\n  - 未提供锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节，无法形成有交底支持的从属权项。\n  - 未提供权利要求撰写要求，申请类型（发明/实用新型）待确认。\n  - 未运行审计工具，不能声称已通过形式审计。\n```\n\n## 二、权利要求书.md\n\n```markdown\n# 权利要求书\n\n1. 一种滑移组件，其特征在于，包括：\n底座；\n导向槽，设置于所述底座上，并沿第一方向延伸；\n滑块，与所述导向槽配合，能够沿所述第一方向移动；\n锁止件，设置于所述底座上，并具有允许所述滑块移动的第一状态和限制所述滑块移动的第二状态。\n```\n\n## 三、待确认事项（不进入权要正文）\n- 申请类型及权项组合：交底仅描述产品，未提供方法步骤或系统模块关系；本稿只写产品独立权项，未写方法权项或第二条系统独立权项。\n- 锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节均未提供，不能写入权要。\n- 未提供5.1/5.2分类、附图、公式和权利要求撰写要求；从属树为空，不表示已评估从属权项布局。\n- 未进行检索，未评估新颖性、创造性或授权前景；未运行audit_claims.py，不能声称APPLICATION_CLAIMS为ok。\n\n## 四、起草限制\n本稿仅使用交底明确记载的底座、导向槽、滑块、锁止件及两种状态；未补入交底未记载的驱动、形状、内部结构、尺寸、材料、连接关系、附图标记或实验数据。本稿为受限草稿，需补充材料后复核。"
  },
  "workflow_status": "completed_with_warnings",
  "deliverable_status": "model_completed_pending_confirmation"
}
```

## 风险与待确认事项

```text
[
  {
    "warning_id": "host-Flow-2-6-missing-upstream_md_file",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "未提供：upstream_md_file",
    "affected_content": "本次输入及下游累计快照",
    "current_handling": "保留实际材料并继续输出",
    "model_completion": "未评估",
    "deliverable_impact": "需人工核对",
    "recommended_action": "核对实际输入及其来源",
    "status": "open"
  },
  {
    "warning_id": "host-Flow-2-6-professional-review",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "仅核对结构、来源和累计传递；技术语义及专业质量尚待人工审核。",
    "affected_content": "本次输入及下游累计快照",
    "current_handling": "保留实际材料并继续输出",
    "model_completion": "未评估",
    "deliverable_impact": "需人工核对",
    "recommended_action": "核对实际输入及其来源",
    "status": "open"
  },
  {
    "warning_id": "host-Flow-2-6-m06-limited-a35508d7-10a2-4e35-b35f-a404083a3d87",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "本版本仅核对已识别的指令来源；正文与表格、依据的一致性尚未核对，未执行结构删除。",
    "affected_content": "本节点正文、结构表和来源",
    "current_handling": "保留原输入、结构记录和历史，仅形成受限稿",
    "model_completion": "未评估",
    "deliverable_impact": "不能据此认定完整同步、结构删除或专业审阅已完成",
    "recommended_action": "核对当前正文、相关表格与依据；完整变更另行处理",
    "status": "open"
  },
  {
    "warning_id": "host-Flow-2-6-missing-table-T3",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "T3已到生产节点但未取得表内容；未伪装为尚未生产或验证通过。",
    "affected_content": "本次输入及下游累计快照",
    "current_handling": "保留实际材料并继续输出",
    "model_completion": "未评估",
    "deliverable_impact": "需人工核对",
    "recommended_action": "核对实际输入及其来源",
    "status": "open"
  },
  {
    "warning_id": "host-Flow-2-6-missing-table-T4",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "T4已到生产节点但未取得表内容；未伪装为尚未生产或验证通过。",
    "affected_content": "本次输入及下游累计快照",
    "current_handling": "保留实际材料并继续输出",
    "model_completion": "未评估",
    "deliverable_impact": "需人工核对",
    "recommended_action": "核对实际输入及其来源",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-UPSTREAM-CLASSIFICATION",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "未提供上游5.1必要技术特征/5.2优选特征分类，缺少Fk编号及对应关系。",
    "affected_content": "application_plan.yaml 的 claim_tree；权利要求书.md 第1项",
    "current_handling": "未自行判断必要性，仅将交底明确记载的底座、导向槽、滑块、锁止件写入产品独立权项；从属树为空。",
    "model_completion": "按受限草稿处理，不声称已完成5.1/5.2核对。",
    "deliverable_impact": "独立权项范围可能过宽或缺少优选层次；从属权项布局未完成。",
    "recommended_action": "补充5.1/5.2分类后，按Fk编号复核独权并补齐从属树。",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-DRAWINGS",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "未提供图纸或附图说明，无法核对附图标记和结构对应关系。",
    "affected_content": "权利要求书.md；application_plan.yaml",
    "current_handling": "权要未写附图标记，也未按附图组织结构关系。",
    "model_completion": "按无附图受限草稿处理。",
    "deliverable_impact": "后续说明书撰写和附图引用缺少核对基础。",
    "recommended_action": "补充图纸或附图说明后，统一权要、说明书和附图标记。",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-LOCK-DETAILS",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "交底明确未给出锁止件的驱动方式、形状、内部结构、尺寸、材料、连接细节。",
    "affected_content": "权利要求书.md 第1项及从属权项布局",
    "current_handling": "未将上述缺失内容写入权要，避免把推测写成技术事实。",
    "model_completion": "锁止件仅保留两种状态的功能性限定。",
    "deliverable_impact": "无法形成有交底支持的锁止件从属限定；相关保护范围不确定。",
    "recommended_action": "补充锁止件结构、连接或驱动细节后，再增加从属权项。",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-REQUIREMENTS",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "未提供权利要求撰写要求，claim_requirements_file 与 claim_requirements_text 均为 not_provided。",
    "affected_content": "application_plan.yaml 的 application_type；权利要求书.md",
    "current_handling": "按固定权要策略起草产品独立权项，未自行扩展方法权项或第二条系统独立权项。",
    "model_completion": "申请类型和权项组合仍待确认。",
    "deliverable_impact": "格式、申请类型和权项组合可能不符合后续要求。",
    "recommended_action": "提供撰写要求并确认发明或实用新型类型后复核。",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-DEPENDENTS",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "交底未给出可区别于独立权项的附加技术特征，且缺少5.2优选特征。",
    "affected_content": "application_plan.yaml 的 claim_tree.dependents",
    "current_handling": "从属树为空，未编造从属权项。",
    "model_completion": "仅保留一项产品独立权利要求。",
    "deliverable_impact": "权要集仅一项，保护层次不足。",
    "recommended_action": "补充5.2或实施例细节后建立从属树。",
    "status": "open"
  },
  {
    "warning_id": "W-CLAIM-AUDIT",
    "first_flow": "Flow-2-6",
    "inherited_from": "none",
    "problem": "未运行audit_claims.py，无APPLICATION_CLAIMS审计结果。",
    "affected_content": "权利要求书.md",
    "current_handling": "未声称机器通过或形成授权结论。",
    "model_completion": "以受限草稿交付，等待允许运行工具时审计。",
    "deliverable_impact": "形式缺陷尚未机器核验。",
    "recommended_action": "在允许运行工具时执行审计并修正。",
    "status": "open"
  }
]
```
