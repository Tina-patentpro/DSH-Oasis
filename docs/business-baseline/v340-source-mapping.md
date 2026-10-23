# 阶段5 B：V3.4.0双来源证据与映射冻结

核对日期：2026-10-23。14节点、28来源格均已登记；这是静态资源及缺口台账，真实可执行格为0。所有source.enabled、dispatchEnabled及realCallVerified均为false。台账与校验器不被生产catalog导入，不会派发、联网或执行资源指令。

## 共同合同与本地资源

以同目录V3.4.0原文和固定包为准。本地正文按 `common` → 对应 `node.instruction` → `tables`，以两个换行装配。每段UTF-8哈希、装配哈希及输入schema哈希逐节点记录于[JSON台账](v340-source-mapping.json)；完整输入ID、通道、单项边界、重要性和处理规则从固定包原样冻结。

一个ID对应一项明确文件/文本/配置；`user_input`是手动运行指令，不是文件材料，不由模型补造。文件与文本同时存在时按原合同补充/纠正，不静默覆盖。累计文件只读取实际传入的一份，不扫描旧稿或猜最新文件。

| Node | Title | Input IDs | Local | API |
|---|---|---|---|---|
| Flow-1-1 | 技术背景研究 | research_request_file, research_request_text, research_scope_config, user_input | STATIC_ONLY | BLOCKED |
| Flow-1-2 | TRIZ问题分析 | upstream_md_file, technical_analysis_material_file, technical_analysis_material_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-1-3 | 概要专利检索 | upstream_md_file, search_target_file, search_target_text, max_fetch, user_input | STATIC_ONLY | BLOCKED |
| Flow-1-4 | 技术方案筛选 | upstream_md_file, solution_selection_basis_file, solution_selection_basis_text, application_type, user_input | STATIC_ONLY | BLOCKED |
| Flow-1-5 | 技术交底书与要素建模 | upstream_md_file, technical_disclosure_file, technical_disclosure_text, drawings_file, drawings_text, supplemental_data_file, supplemental_data_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-2-6 | 权利要求初稿 | upstream_md_file, disclosure_file, disclosure_text, drawings_file, drawings_text, claim_requirements_file, claim_requirements_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-2-7 | 说明书初稿 | upstream_md_file, claims_file, claims_text, disclosure_file, disclosure_text, drawings_file, drawings_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-3-8 | 全文深度复检 | upstream_md_file, claims_file, claims_text, specification_file, specification_text, search_material_file, search_material_text, comparison_doc_1_file, comparison_doc_1_text, comparison_doc_2_file, comparison_doc_2_text, comparison_doc_3_file, comparison_doc_3_text, comparison_doc_4_file, comparison_doc_4_text, comparison_doc_5_file, comparison_doc_5_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-3-9 | 专利撰写计划 | upstream_md_file, claims_file, claims_text, specification_file, specification_text, comparison_doc_1_file, comparison_doc_1_text, comparison_doc_2_file, comparison_doc_2_text, comparison_doc_3_file, comparison_doc_3_text, comparison_doc_4_file, comparison_doc_4_text, comparison_doc_5_file, comparison_doc_5_text, strategy_file, strategy_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-3-10 | 技术内容沟通确认 | upstream_md_file, technical_feedback_file, technical_feedback_text, supplemental_data_file, supplemental_data_text, drawings_file, drawings_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-4-11 | 权利要求正式稿 | upstream_md_file, claims_file, claims_text, specification_file, specification_text, confirmation_file, confirmation_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-4-12 | 说明书正式稿 | upstream_md_file, claims_file, claims_text, specification_file, specification_text, disclosure_file, disclosure_text, drawings_file, drawings_text, supplemental_data_file, supplemental_data_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-5-13 | 申请文件终检 | upstream_md_file, claims_file, claims_text, specification_file, specification_text, drawings_file, drawings_text, check_requirements_file, check_requirements_text, user_input | STATIC_ONLY | BLOCKED |
| Flow-6-14 | 审查意见答复 | upstream_md_file, oa_notice_file, oa_notice_text, original_application_file, original_application_text, current_application_file, current_application_text, comparison_doc_1_file, comparison_doc_1_text, comparison_doc_2_file, comparison_doc_2_text, comparison_doc_3_file, comparison_doc_3_text, comparison_doc_4_file, comparison_doc_4_text, comparison_doc_5_file, comparison_doc_5_text, response_requirements_file, response_requirements_text, user_input | STATIC_ONLY | BLOCKED |

| Node | Instruction SHA256 | Assembled SHA256 |
|---|---|---|
| Flow-1-1 | ac28bcdc4001225d0ecd418c42d8544f802d1a045eb1e259f4e416d84b5f21c6 | 5f244adea7faa822f1e9f58376ffe5789f80d0f27c0a06ee15949dd757ec2759 |
| Flow-1-2 | 1044a87cc711894f1e13e4d2f106ebffe24f80f292a084a48b40b64da15c9db6 | bca14ed2c6be09cdb03a479dbbdab8040a3d55d1787c498bbdfc8f4901af34f8 |
| Flow-1-3 | a4bd5bfc9addd89319adbc774715037b9521939ae54bf40eae8f9f1f9711557c | 0a7b1d2ee98e8632547a7aed845df2fa2a2f4ae40ead009e6cd7906b7e33282d |
| Flow-1-4 | 2e2027252d1cd5625c2fe47aadb7dd5f4a92669d8ce582445da8144fd4dd0f34 | 0127b92ea445f29232fa0faf4fd172217db8f1aa32b80265f8f6e79926a53c2c |
| Flow-1-5 | 6e8d7bf3731231dc34c8e8b15fc23e0ec6c88184ea2fdc5cadc310fef09eaa18 | f1eeca4f538bd9b639b8353c81df141c10bb4166b16667291f42be756ee5faaf |
| Flow-2-6 | c1a8885cc90f4953a1fa80264cf29675f92b3a93c00b798e547cabf874087954 | 72205d5a7cfb7b1aff85cfdeef75ed82888d38567e9d7e3d3024c47aa1ec9325 |
| Flow-2-7 | 057c6d4c3e763d1f99dee8cc41c14b330472edfd7e79b02725280d4e503cdfa2 | bd905588523f59cf844e12aeabaa7779550048bbf64afa06dfaa77dee8cca6fb |
| Flow-3-8 | 395daf74baad03eb136842e61b3d917d73f244c5b4e070838341192e54ba02ee | 6aab017dca665e664299094675b645ced37947256df1f8cfdf928c4db3ed4f96 |
| Flow-3-9 | 987d8147fe881b7210c7ed84de06062f178ba87b9a9210b4928bb13964dc423f | 86356d423bbf2af4e4dbfc4b8cb2a4ac776c4441999300e1444f3225c5151203 |
| Flow-3-10 | 42e8ea440f4e1bb1cad32643ec2eead47ec3938c8ffd286cd09c4f3671f46184 | 75b735e15f22ce0a64b669f5c96e805eed0d3654498439bf8ae08d04807e2eb4 |
| Flow-4-11 | 11289f13235fca61e65674dc73b32307e5dd27dbee7b5b862b7c8278ab46504b | 6e55f23fcdd91ed9e1e6be7a6986568507a349e230df63b0d40babb004f6d224 |
| Flow-4-12 | 3eba586f79581ca8e673b2180f6f83c0f8fccaa10afa74bd1588c6d5d409aec4 | 82bc2778221b04f25b75e35d323903c5019cb5e5619984ccd6de1a1498c68efe |
| Flow-5-13 | d58267366d0fd923d8bb0e57b4da94ec9545be53eccee19749d5f44b858584f5 | eca18b55058474e04eae1b4cd7cc40a21002c1cd8fe39deb1b776fe53f9849b9 |
| Flow-6-14 | 7819f8bd2036e8c66dc67a209fd12b127beae1f3321993321f50f8f4255627b7 | 3b842056e2b9afa06c497f77bd60d3fb39867e174f383de994895a5a11322a98 |

| Evidence ID | Explicit path | SHA256 | Scope |
|---|---|---|---|
| business | `docs/business-baseline/14节点清单V3.4.0.md` | a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6 | V3.4.0-business-original |
| pack | `packages/oasis-professional-service/src/v340-contracts.json` | 6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761 | V3.4.0-fixed-host-pack |
| catalog | `packages/oasis-professional-service/src/v340-catalog.js` | e8d45a8984b1909b303fce0ef9c2bb879744dd2de56710c8f46cb708435217cb | assembly-order-and-disabled-sources |
| legacy-manifest | `packages/oasis-professional-service/src/builtin-skills/flow-2-6/0.2.2/manifest.json` | f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706 | legacy-only-not-V3.4.0 |
| legacy-loader | `packages/oasis-professional-service/src/builtin-skill-loader.js` | f60f09dc80c54b52f1178ffa117e9493dd20c1414acbbac5b530bb248aa9e94e | legacy-loader-only |
| api-baseline | `packages/oasis-professional-service/docs/api/oasis-professional-service-baseline.json` | 01051469cfb66bf829e4fb18ac71a80f7401444ec89b5fbfe1c92b366fa0b6a8 | legacy-endpoints-only-no-node-binding |
| api-contract | `packages/oasis-professional-service/src/oasis-api-contract.js` | 8b56d9374c508304bef84d6f2bf5b7257b633230af5a118532e8e031653f785f | legacy-normalization-not-deployment |
| workspace-binding | `packages/oasis-professional-service/src/oasis-workspace-binding.js` | 1c848580a357c6e705fb5746d7898c85459cbba4fc97e9077c1709957ae506bf | binding-requirements-not-actual-account |

## API证据边界

每个共同输入都有一条待核实映射；`apiField/required/transform`为null，表示未取得实际schema，不能解释为可省略或已无损匹配。`serviceId/method/path/schemaSHA256/projectAccountEvidence`均为null。旧`POST /api/apicategories/create`只证明历史接口合同，不证明14节点服务已部署或绑定。结果正文/URL字段未知；URL不等于正文已交付。

本批未发现可明确绑定到这14节点的实际脱敏服务详情/结果夹具，因此不引用同名或合成fixture作为绑定证据。历史API合同、代码要求与实际服务/账户证据分别记录；没有读取凭据、真实Profile或外部目录。

## 旧Flow-2-6兼容边界

旧资源保持`flow-2-6/0.2.2`、`claims-disclosure-2`、`claims-cumulative-2`、`single-call-cumulative-1`身份；manifest及4项明确资源各自核对原哈希，完整路径/角色/指纹见JSON的legacyReference。

旧模板与V3.4.0同名不构成版本等价。新版Flow-2-6有8个共同输入：累计上游、交底文件/文本、附图文件/文本、权项要求文件/文本、手动指令；正文来自新版固定包。旧资源只供历史对照，不改名、替换或迁移，不把旧运行许可、模型结果或审核结论外推到新版。

## 缺口与一次性补证需求

- 每个本地格：`LOCAL_ADAPTER_UNWIRED`、`LOCAL_REAL_CALL_UNVERIFIED`。静态资源可交给C，不证明专业质量、原生派发或真实调用通过。
- 每个API格：`API_SERVICE_COORDINATES_MISSING`、`API_SCHEMA_MISSING`、`API_INPUT_MAPPING_UNVERIFIED`、`API_RESULT_BODY_UNVERIFIED`、`API_PROJECT_ACCOUNT_BINDING_MISSING`、`API_REAL_CALL_UNVERIFIED`。
- 全局：`NON_TEXT_EXTRACTION_UNVERIFIED`（PDF/DOCX/图片/OCR仍需D）、`CURRENT_DESKTOP_UNVERIFIED`（F需当前配对候选与启动授权）。共114项逐格/全局缺口，不是114个新增缺陷。
- E一次性补证：逐节点脱敏服务详情（明确ID、同步方法/路径/版本）、完整必需输入/输出schema及指纹、共同字段转换与不可无损项、含正文的脱敏结果/错误/未知结果夹具、权威Workspace与origin/账户/folder_id/服务/schema绑定证明。名称、同名ID、合成fixture或文件URL不足以替代。台账不存实际凭据，不为补满表格联网。

## 离线校验与C/E交接

运行 `tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json`。校验器只接受本批冻结快照，核对明确白名单内的原始字节、装配顺序、单项输入、历史身份、缺口及禁用声明；拒绝未经复审的资源/schema/ready变化及路径越界/符号链接。不输出资源正文，不加载生产代码、不修改生产路由。未来取得真实schema后须重新冻结并正式回放，不能直接填写本台账而声称通过。

C可先基于新版Flow-2-6三段资源、8输入及装配指纹实施禁用适配候选，继续复用Host累计结果、T1–T6、警示/来源、编辑再审与保存合同；后续节点按组核对。静态装配与机械hash不等于专业语义审阅。原合同要求的缺失/冲突应保留警示，不给假支持标记。

E目前0个节点具备完整实际证据，14格全部阻塞，不进入API执行器接线。B完成不代表C/D/E/F/G/H完成；下一批建议C的Flow-2-6禁用适配候选，仍需后续执行指令。Desktop、长稿冻结文件引用芯片、正常重启、真实双来源和升级/降级验收另列。

容量保护、旧数据、unknown、审核/保存、原16/16/28回归和活跃lib保持。未启动Desktop/DSH，未登录、真实模型/API、上传/费用或发布。
