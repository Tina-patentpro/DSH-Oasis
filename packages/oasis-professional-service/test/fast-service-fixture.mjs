// Sanitized service metadata observed via website UI on 2026-09-27. No credentials/materials.
export const fastCatalog = { 专利撰写: [{ id: 6, name: '权利要求书生成', group: '专利撰写', is_active: true, apis: [
  { id: 211, sub_category_id: 6, ai_model_id: 1, aimodel: 'fast', api_endpoint: '权利要求书生成-Fast',
    api_process: '输入内容整理,核心独立权利要求撰写,权利要求架构搭建,从属权利要求撰写,审查权利要求书初稿,权利要求' },
] }] }
export const fastDetail = {
  id: 39, name: '权利要求书生成-Fast', api_type: 'Workflow', price: 3, model_name: '', is_async: 0,
  input_schema: [
    { type: 'paragraph', cn_name: '技术方案', content: '用于生成“技术方案”主体的核心构思、关键结构/步骤、技术要素及其协同关系输入。', en_name: 'technical_solutions' },
    { type: 'paragraph', cn_name: '技术领域', content: '用于生成“技术领域”段落的所属技术方向、应用场景与分类线索（可含关键词/IPC意向）。', en_name: 'technical_field' },
    { type: 'paragraph', cn_name: '背景技术', content: '用于生成“背景技术”段落的现有技术情况、痛点问题与改进需求描述输入。', en_name: 'background_art_TD' },
    { type: 'paragraph', cn_name: '有益效果', content: '用于生成“有益效果”段落的性能提升、成本/效率优势与可验证效果点输入。', en_name: 'beneficial_effects_TD' },
    { type: 'paragraph', cn_name: '具体实施方式', content: '用于生成“具体实施方式/实施例”段落的实现细节、参数范围、流程与可选替换方案输入。', en_name: 'embodiments_TD' },
    { type: 'paragraph', cn_name: '附图说明和标记', content: '用于生成“附图说明”段落的各图编号、图名及图中要素对应关系的说明输入。', en_name: 'drawings_explain_TD' },
    { type: 'file', cn_name: '技术交底书文件', content: '完整的技术交底书文件', en_name: 'Technical_Disclosure_file' },
    { type: 'paragraph', cn_name: '用户指令', content: '请在这里填写你对本次输出的额外要求，例如重点关注内容、表达风格或需要避免的问题。   不要把正文、原始材料或核心业务内容直接写在这里。   主要输入内容应填写到对应的主材料输入字段，否则系统可能无法正确识别和处理。   没有补充要求时可填写“无”。', en_name: 'User_input' },
  ],
  output_schema: [{ type: 'paragraph', cn_name: '生成内容', content: '', en_name: 'output' }],
}
