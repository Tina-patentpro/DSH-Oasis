# V3.4.0 兼容边界与后续闭合

用户已确认本目录V3.4.0原文为后续业务依据；原文SHA256 a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6。旧V3.2.0原件没有恢复，也没有改写旧历史。本轮只纳入文档、最小追加AGENTS和Mac技术适配；未改业务生成逻辑或受控Skill资源指纹。

| 明显事实 | 依据 | 后续范围 |
| --- | --- | --- |
| 文档描述14节点；当前内置生成Skill仅Flow-2-6/0.2.2，另有研发local-mock | src/claims-skill-pin.js、src/builtin-skills/flow-2-6、src/workflow-catalog.js | 其他节点不能视为已实现，不因本次交接自动扩成全14节点 |
| 新文档要求文件与文本分离输入ID；现有正式claims v2表单为4个text字段加一份upstream，其材料策略acceptedExtensions为空/metadata-only | 文档2.3；src/generation-contract.js:41–48、workflow-catalog.js:10–14 | 逐节点补文件/文本通道合同；不把文件元数据当正文参与生成 |
| 新文档not_provided/warning不影响主文件生成；现有disclosure_text仍required:true，UI对缺材料禁用生成 | 文档2.2/2.3；generation-contract.js:42、既有无模型UI证据 | 需定向决定/测试警示下持续输出，不能仅改标签或放松所有校验 |
| 文档适用发明与实用新型；当前workType只technical-rd/cn-invention-patent | 文档适用范围；workbench-contract.js:44 | 实用新型不能声称受现有枚举/模板完整支持 |
| 五节累计文稿、单上游哈希/UID、双状态、补齐与警示在现有0.2.2资源中已有相近合同 | builtin-skills/flow-2-6/0.2.2/assets/claims-output-template.md | 仍须逐条对照V3.4.0及T1–T6稳定表；版本号不同本身不是已证明冲突，也不是完整一致证明 |

不阻碍继续源码开发：真实Git、用户未提交内容、Mac适配、固定依赖与新候选构建/定向测试已经准备。明确未闭合项是：2026-10-11本地Skills流阶段超时的无模型复盘；上述V3.4.0业务合同切片；新候选真实Desktop/Host验收；真实模型/API/auth/费用验证；正式Codex配对/Handoff。后四类不能把历史GUI报告或文档纳入当成当前生产验收。

候选GUI本轮没有启动。其Profile是必要配置模板而非账号/HOME副本，需先在获得对应恢复许可后物化本地link依赖元数据、复核pin；官方GUI启动会自动生成本地会话签名秘密，本轮禁止新秘密生成，因此没有执行。不要关闭认证或Electron原生沙箱来规避此要求。
