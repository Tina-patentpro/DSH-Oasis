# DSH-Oasis后续开发：首批接收、缺件与消费规格

任务`DSH-FOLLOWUP-20261026-01`；日期2026-10-26，Asia/Shanghai。消费[后续开发计划](../plans/2026-10-26-dsh-oasis-follow-up-development-plan.md)任务1—4。当前Git根`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支`mac/continuity-v2`，HEAD`035fe82b3f97b983bb561fbefff9ae1ea9d42862`；存在未提交成果，逐件输入身份见[本次源清单](2026-10-26-dsh-oasis-readiness-inputs.json)。

**首批材料可交接；全目标尚未完成。** 此处交的是具体缺件与消费规格，不是U1、D1、Skill装配、真实API或发行通过。具体DSH provider、最终依赖分发/机制证据及实际服务绑定缺失，PDF/DOCX继续BLOCKED。后续工程及第三方审计独立记录，不从本文件补认。

## 1. 承接范围与责任

用户本次要求按计划持续推进全部工作并由GPT-6.1 Max子代理审计；本次先执行计划可独立推进部分，不续用旧调用预算、不向其他聊天或WorkBuddy投递、不为缺件编造接口。沿项目要求保留当前根及分支；`.local/oasis-follow-up-20261026/baseline.json`保存本批开始前3471个既有受控文件摘要，原未提交内容不清理、不顺手提交。

同版协同1.2.1及规划1.3.1保持。旧Mac/Python/XPC是历史验证/供应候选，不是统一产品前置；本次不新建通用provider框架或Host私有执行器。未具名责任人按角色列出，未自动发出外部请求。

| 工作 | 提供/复核角色 | 本批出口 | 下一实际动作 |
|---|---|---|---|
| 任务1：DSH公共执行能力 | 具体DSH provider/发布维护方提供；DSH-Oasis消费核对 | 下表给准确能力/版本与缺件；维护人姓名、具体provider包仍待提供 | 取得具体交付后冻结实际组件，不以接口定义替代机制 |
| 任务2：逐格式材料 | 实际provider、解析依赖及分发维护方提供；DSH-Oasis逐格式核对 | 共享/PDF/DOCX分别列缺与READY判定 | 只有对应材料及范围满足才U1，再D1 |
| 任务3：资源/规则消费 | PD-01/02、TL-01/02/05提供；DS-01/02消费 | 已接到Host八输入/范围1工程规格，尚无本批业务Skill | 工程按明确规格可先做合成接口验证；Skill装配仍等待具名包 |
| 任务4：API/网站入口 | BE-02/03、WA-01/04提供；DS-04消费 | 原端点/字段、八输入待映射及禁用/入口说明 | 脱敏schema/绑定就绪后E；F本地部分不等API |

## 2. 具体公共能力与provider缺件

重新读取前批明确列出的8份package/公共类型/插件入口文件，当前SHA全部与原清单匹配。只读固定本地依赖目录中sandbox/ptc相关包名，见到`dsh-sandbox`、`dsh-sandbox-policy`、`dsh-ptc-runtime`，没有据此查到可承担全部提取约束的具体执行provider。该观察仅限本地集合，不否定外部或其它版本可能有实现；没有启动Host或读取日常Profile。

| 已核包/版本/入口 | 已有公共语义 | 尚缺的具体能力及证据 |
|---|---|---|
| `@deepseek-ai/dsh-scope@0.2.0-rc.2`；createScope/scopeTarget | 注册归属和路由 | 不是进程隔离或内存上限；不可作为worker执行世界 |
| `@deepseek-ai/dsh-sandbox@0.2.0-rc.2`；Context.sandbox / SandboxProvider.confine | 文件效果策略与包装argv，full/partial | 具体provider包/版本/commit/hash及挂载配置；严格读取白名单、网络/exec/后代限制不由该词汇证明 |
| `@deepseek-ai/dsh-ptc-runtime@0.2.0-rc.2`；Context.ptcRuntime.resolve/run | 抽象程序、binding、timeout/abort/result | 实际provider、执行世界、支持环境；硬内存/native/后代总量、binding/各输出流预算、终止回收及分发责任 |
| 业务包`src/index.js`和package peer组合 | DSH 0.2.0-rc.2、Cordis 4.0.4及当前插件装配边界 | 没有材料提取provider的实际挂载证据；源码存在不能证明当前Desktop已配对运行 |

原8份文件实际路径/解析路径/长度/SHA收在源清单，不复制整份SDK或改动固定包。具体provider包、commit、执行世界、维护方姓名、受支持环境、公共权限配置、解析依赖树和分发/更新/回退owner均**待提供**；不得用上述抽象包填写这些空项。

| 要求 | 必须提供的证明 | 影响格式/解除条件 |
|---|---|---|
| 硬内存268435456字节 | 实际机制、粒度及启动/native/子代覆盖；超限实测及真正退出 | PDF/DOCX；RSS采样、JS堆限制不足 |
| 单文件5000ms、总准备15000ms | 包括bootstrap/预检/解析/结果收束的期限与父侧终止回收 | 两格式；AbortSignal或默认timeout不代实证 |
| stdout≤2097152、stderr≤16384字节 | 父侧独立有界收流、超限停止、实际进程退出/句柄释放 | 两格式；不能先全部收集再查长度 |
| 权限/执行世界 | 仅获准输入字节、固定依赖及必要临时资源；隔绝Profile/凭据/其它文件、网络及外部程序 | 两格式；明确stdin/内存交付及公共约束，hash不代权限 |
| 分发、更新/回退 | 实际provider/runtime/parser/guard/adapter/策略/通知文件集、来源/构建身份、owner与确定命令 | 两格式；旧开发缓存或11原件不自动成为产品包 |

下一责任方应返回上述准确材料。当前不能据固定公共接口自行安排U1，也不以缺件为理由重建宿主或要求用户改选最低macOS。

## 3. 三类材料表与逐格式判定

复用[原件身份](../business-baseline/v340-material-extraction-originals.json)、[2061成员候选](../business-baseline/v340-extraction-distribution-candidate.json)、[产品关口](../business-baseline/v340-extraction-product-gates.json)和[原产品收口](2026-10-25-stage5-d1-product-gates-closeout.md)。原1518已证/543缺件、2058拟纳入/3未决是**历史候选状态**，不重写成实际分发通过。283精确Include路径中282份字节对应、pyconfig.h构建来源待证的边界保持；LC-R1/LC-R2已修，不重开、不重取11原件。

| 共享缺件 | 原证据/复用范围 | 提供角色与接受条件 |
|---|---|---|
| 具体执行provider及全部硬资源/访问约束 | 第2节固定公共定义；G1产品方向已确认，具体能力/分发仍OPEN | DSH执行provider维护方提供准确组件与强制机制，消费方可验证 |
| 实际使用的runtime/parser来源、构建/strip/生成差异和最终通知 | 原candidate及543逐成员分类、282补证、12许可副本/27映射仅作供应候选 | 实际分发owner说明本次真正选用哪些组件；不要求无关旧Python候选全闭合，不把新parser暗换入pin |
| G5前置保护、G6可执行交付 | 目标准入常量和材料级责任已明确 | 冻结实际可运行文件/指纹/命令，受限环境证明后才能认为机制通过 |

| PDF专有项 | 当前已知 | 下一必要证据 |
|---|---|---|
| 文字profile与完整性 | 文字PDF子集；非空全文/页定位/双hash/UTF-16合同已明确 | 精确解析依赖及版本；完整读取与拒绝边界，不以扩展名宣称支持 |
| 对象/XRef/解码 | 单流部分离线证据可复用；全程/聚合未证 | 100页/10000对象；单流8388608、实际解码总量16777216字节，以及初始化/重复解码/缓存前置计量 |
| JBIG2/可选环境 | 不允许隐式外部程序/额外依赖 | 实际provider防网络/exec及环境注入证明；扫描/混合/OCR/复杂版式保持后续范围 |

| DOCX专有项 | 当前已知 | 下一必要证据 |
|---|---|---|
| 两XSL/readme/模块边界 | 两转换XSL明确unlicensed、readme许可范围待核；无直接isoschematron导入不等动态路径安全 | 明确模块/包数据整体纳入或排除及合法依据/加载影响；不能只删两XSL后宣布兼容 |
| native及数据 | 7扩展仅旧平台静态ABI匹配；9资源/23模板数据已有hash材料 | 实际所用构建与依赖闭包/通知、对应环境真正加载；旧cp314/arm64材料不替代跨环境接受 |
| OPC/ZIP/实体及编号 | D0编号资格在原范围完成，不是全文提取器 | 256条目、单项1048576/总展开8388608字节、比率100，CRC/重复/外部关系/DTD/实体前置拒绝与有效编号策略；不自动升级lxml |

两格式共同原始字节/正文合计各2097152、单文件1048576字节、单提取正文300000 UTF-16码元/1048576 UTF-8字节、单文件4096定位/65536 JSON字节、总extraction131072字节同时满足。原文稿/快照/Workspace的1/2/8MiB不改；不裁剪原件/正文/定位来通过。

| 格式 | READY_FOR_OFFLINE_PROOF | U1 | D1 | 当前直接阻断 |
|---|---|---|---|---|
| PDF | false | NOT_EXECUTED | BLOCKED | provider/机制、实际依赖及分发通知、完整PDF前置控制/G6缺证 |
| DOCX | false | NOT_EXECUTED | BLOCKED | 共享项及本格式许可/模块/native/实体/完整profile缺证 |

材料齐备且U1范围明确后，先实现并冻结执行级组件，再在受限环境Host外实证；该格式实证通过及D1范围具备后才接线。DOCX私有缺件不阻PDF的材料裁定或独立文本/API工作。

## 4. M06资源、规则与八输入消费规格

已接到PD提供的Host-B v0.1.1工程交接及其明确修订的范围1 v0.2.0规格；后者任务`PD-M06-RANGE1-HANDOFF-20261025-07`、复审`PD-M06-RANGE1-REVIEW-20261025-08`。其原文记录范围1设计已确认，限定可识别指令来源、当前限制警示、受限核心编辑及旧兼容/既有保存恢复；完整同步/删除和真实消费继续开放。它们是**工程规格**，没有本批业务Skill的SKILL.md/manifest/许可批准或真实Host证据，不能当新包装配。

| 顺序/共同字段 | 本地冻结位置 | API inputs映射 | 当前消费边界 |
|---|---|---|---|
| upstream_md_file | filePaths.upstream_md_file，upstream_snapshot | 未提供 | 唯一Flow-1-5累计MD；expected，缺失/结构异常警示，不猜历史文件 |
| disclosure_file | filePaths.disclosure_file，user_file | 未提供 | 一项交底文件；与文本并存独立hash |
| disclosure_text | textInputs.disclosure_text，user_text | 未提供 | 可补充/纠正，不静默覆盖文件 |
| drawings_file | filePaths.drawings_file，user_file | 未提供 | H1仅明确MD/TXT文字资料，不声称视觉读取 |
| drawings_text | textInputs.drawings_text，user_text | 未提供 | 图示关系说明，不等视觉核验 |
| claim_requirements_file | filePaths.claim_requirements_file，user_file | 未提供 | 范围/层级要求不提升为技术来源 |
| claim_requirements_text | textInputs.claim_requirements_text，user_text | 未提供 | 与文件并存，不补造事实 |
| user_input | textInputs.user_input，指令语义 | 未提供 | 不得作为技术事实；工程规格要求修正既有标签/新updates准入，当前尚未修复 |

八ID、顺序、七optional/一expected、configuration={}和v340-1保持；prepare返回`prepared={nodeId,values,receipts,warnings,upstream,inputHash}`、dispatchEnabled=false。新结果沿原模型七字段与Host累计T1—T6、五分区、来源/警示装配，不把原旧0.2.2身份或模型结果直接当完整申请文件。

B台账当前Flow-2-6装配SHA `72205d5a7cfb7b1aff85cfdeef75ed82888d38567e9d7e3d3024c47aa1ec9325`、input schema SHA `be1572d08ad974f76a3b33859df9c8d2a910b4f0e028c0934d34b7aebcd5d61f`。运行时须再次核实际资源，不能根据文档摘要自动启用来源。原14/28/136/114台账不改。

**规则现态已按权威入口核对。** 阶段6状态的current_trial_rule指向F26 V0.1.9，UID `6fcd7286-9380-40d3-ba8b-79686eddb1ce`，SHA `391b39a1c4e69a0108deb365a9ff96ea31dfae336663aab56faa279121ffd5a0`；原件和真实试行批准收据SHA实际匹配，formally_effective=false。不是按最高版本/文件名选取规则。生产方拟采用映射R01—R14及R04a—e共19单元，仍是PROPOSED_LOCATIONS_ONLY；精确源/收据在本次输入清单中。

生产可见拟落点为R01—R10的任务/八输入/来源、权项初检与必要性/回退/概括、修改影响、矩阵与T4、自检、容量/成本；R11/R12评价端、R13 evaluation_only、R14准入/交付侧分开。后续真实包需逐单元记录正文/references/assets准确位置/hash、条件/例外/不适用理由及实际加载，不把拟映射写成已采用100%。六载体18 UID许可待核、RULE-08-12-001-v1.1未解析定义沿原处置，不新追索或自行执行依赖；原知识封存不代用途许可。

向PD-01交的装配约束：只用既有Host加载具名SKILL.md/references/assets与固定顺序/hash，不注册DSH/Codex原生Skill，不增脚本/自动发现/Agent循环；候选先交TL/DSH受测，消费接受后分别记结果，不等最终接受才提供受测对象。本批无业务Skill候选，当前可独立处理其已确认的Host范围1合成工程差异；不能据此关闭DS-02真实资源装配或DS-05。

## 5. 后台字段、结果与账户入口

准确实现位置：`src/oasis-api-contract.js`的createOasisApiClient/normalizeApiDetail/buildWorkflowCreateBody；`src/oasis-workspace-binding.js`的workspaceApiBindingSchema。原业务基线与实际部署仍须分栏，以下只证明本地合同和消费逻辑，不证明生产服务可用。

| 方法/完整路径（沿已定origin） | 原字段/结果消费 | 对应缺件 |
|---|---|---|
| GET /api/user/detail | user detail/余额事实，不在DSH构建财务页 | 实际账户与环境、金额/权限依据 |
| GET /api/apicategories/detail；POST /api/apicategories/apidetail | detail请求{name}；规范化Workflow/is_async=0、input_schema/output_schema、id/price等 | 具名M06 service ID/endpoint、实际schema/指纹，不能以同名代绑定 |
| GET /api/user/user/folderlist；GET /api/user/user/folderdetail/{id} | 原目录对象、folder_id权威绑定 | Workspace、账户与目录归属的实际证据 |
| POST /api/user/upload | multipart file；消费saved_path或url并核允许origin | 文件接收合同、大小/类型和实际下载权限；URL不等已取到正文 |
| POST /api/apicategories/create | {id,key,inputs,api_process,folder_id}；answer_text/file_url/key/id→已解或未解receipt | 八字段的实际inputs转换、同步正文及文件/错误夹具；不伪造缺省或直接调Dify |
| GET /api/apicategories/queryprocess/{key} | 只观察原key的状态/进度 | 不能当已证明同步结果恢复、取消或退款；不再POST创建 |
| GET /api/user/runningwater/list | 原流水观察 | 账务事实仍后台权威，不由本地状态推定扣退 |

项目绑定严格字段仍为workspaceId/workspacePath/environmentKind/apiBaseOrigin/accountId/folderId/apiId/apiEndpoint/apiProcess/schemaHash（catalogEntryId可选）及folderName/confirmedAt；设置命令另有expectedSettingsRevision、confirmed=true。改变origin/账户/资源/输入使旧绑定/确认失效；不猜同名目录、不向不同目的地带旧凭据。本次未读取真实凭据/绑定。

### 5.1 准确URL及字段字典（补首轮审计A01）

权威摘要为`packages/oasis-professional-service/docs/api/oasis-professional-service-baseline.json`，绑定原API文档SHA `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`。其历史spike scope是non-production-only；现产品origin由`src/oasis-account-contract.js:OASIS_PRODUCT_ORIGIN`及`oasis-origin-policy.js`固定为`https://lzhxpy.oasisintwrite.com`。以下给该固定origin的完整目标，不表示本轮已调用或生产部署/权限已验；获准非生产范围仍需准确非生产origin及同版服务证据。

| 消费函数（oasis-api-contract.js） | 固定origin下最终URL/方法 | 请求字段、类型和本地约束 |
|---|---|---|
| getUserDetail | GET https://lzhxpy.oasisintwrite.com/api/user/detail | 无业务body；只接受options.signal |
| getCategoryCatalog | GET https://lzhxpy.oasisintwrite.com/api/apicategories/detail | 无业务body |
| getApiDetail | POST https://lzhxpy.oasisintwrite.com/api/apicategories/apidetail | name:string，非空，来源为实际endpoint；不按业务显示名猜测 |
| getFolderList | GET https://lzhxpy.oasisintwrite.com/api/user/user/folderlist | 无业务body |
| getFolderDetail | GET https://lzhxpy.oasisintwrite.com/api/user/user/folderdetail/{id} | id:number安全整数；参数在路径，实际权限由后台验证 |
| uploadFile | POST https://lzhxpy.oasisintwrite.com/api/user/upload | 本地{bytes:Uint8Array,fileName:string非空,mediaType:string非空}→multipart字段file；不新增后端字段 |
| createWorkflow/buildWorkflowCreateBody | POST https://lzhxpy.oasisintwrite.com/api/apicategories/create | id:number安全整数；key:string非空；inputs:object（undefined项被省略）；api_process:string；folder_id:number安全整数，来自已核绑定 |
| queryProcess | GET https://lzhxpy.oasisintwrite.com/api/apicategories/queryprocess/{encodeURIComponent(key)} | key:string非空，只使用原任务key；不发送创建body |
| getRunningWater | GET https://lzhxpy.oasisintwrite.com/api/user/runningwater/list | 无业务body；观察既有流水 |

所有请求由request()在Host取token并放Authorization header，禁止renderer/普通配置/URL传凭据；redirect:error。这里只列字段名和约束，不记录任何token。最终URL用new URL(以/api开头的绝对路径,origin)，不能重复拼接/api。

| 输入/输出字段组 | 本地解析的类型/必需性及缺省 | 消费位置、未核语义 |
|---|---|---|
| catalog分组/categories/apis | 顶层data为object，各group值必须array；category.id为安全整数、name非空string、apis必须array；is_active仅false或0时跳过；group非空string则采用，否则沿顶层groupName；description可选string否则空串 | normalizeCategoryCatalog；api.id安全整数、api_endpoint非空string必需，api_process/api_description可选string否则空串。目录存在不代实际服务schema/权限/部署就绪 |
| detail.id/name/api_type/is_async/price | id安全整数、name非空string；api_type必须Workflow、is_async必须数值0；price有限且≥0 | normalizeApiDetail；拒绝其它类型/异步。实际价单位/政策及服务身份仍需后台合同 |
| detail.input_schema/output_schema | 必须array；成员en_name/cn_name/type为非空string，content缺失则空串 | normalizeSchemaField映射input paragraph/string/file到长文本/短文本/单文件；output paragraph/string/file到文本/文件。legacy normalizer没有required/expected/null/空串业务语义载体，必须取得实际schema补证，不能从字段存在推必填 |
| detail.model_name | 可选string，否则空串 | 仅展示元数据，不作真实模型身份或已部署证明 |
| 目录结果 | 数组可直接消费；或对象{items:array,total:非负安全整数} | normalizeFolderList；getFolderDetail保留原data，不从同名目录确认归属 |
| upload.saved_path/url | data对象，优先非空saved_path:string，否则url:string非空 | uploadFile→assertAllowedUrl；须满足环境和下载origin白名单，仅得地址，不是已下载/已参与生成 |
| create.answer_text/file_url | 可直接非空string；或data.answer_text:string（缺省空）、file_url:string或string[]（过滤非string）；两者均无可用值时UNRESOLVED_RESPONSE | normalizeWorkflowCreateResult；正文有值/文件URL有值分别记录，文件取得/保存再验，不将空数组当成功正文 |
| create.id/key | id可选安全整数；key可选string，存在非空时必须匹配原key；未返回则沿原key | createWorkflow→{resolved:true,result:{recordId?,key,answerText,fileUrls}}；缺正文文件时只返回{resolved:false,receipt:{recordId?,key}}，不得另建任务 |
| progress.key/status/error_message | key沿原key且不允许不匹配；status:string小写比较；failed/error/cancelled/canceled或任意string error_message均判执行失败 | normalizeWorkflowProgress→REMOTE_EXECUTION_FAILED；状态字符串不构成退款/后端取消证明 |
| progress.progress_percent/is_completed | progress_percent有限number，否则0，规范到0—100；is_completed仅true触发终态，或status completed/succeeded/success、或进度≥100 | 未终态返回{key,status:running,progressPercent,result:null}；终态仍须按正文/文件解析，100%无结果不会变已取得正文，也不证明可用此接口恢复同步结果 |
| usage/费用实耗 | 现有以上normalize函数未建立usage字段映射 | 明确缺项：服务返回结构、计量单位、与资金流水对应。不能从price、模型名、进度或请求次数推定实际扣费 |
| 流水items/total | 对象items:array、total:非负安全整数；item规范id/link_id/type/money/balance/create_time并过oasisRunningWaterPageSchema，create_time可缺省null | normalizeRunningWater；精确金额/权限约束沿workbench-contract.js。未对账/未访问线上，不由观察结果推定本次已扣/已退 |

上述“本地必需”是当前解析器约束，不补认服务端部署schema。八个M06业务字段的apiField/required/transform目前全部未提供；请求inputs不能因为是object就把八字段直接原名发送。项目绑定另须非负安全整数accountId/folderId/apiId、规范origin和64位十六进制schemaHash；未满足仅禁该来源。

| 异常 | 实际消费位置/错误码 | 后续行为 |
|---|---|---|
| 401/403 | request→AUTH_REQUIRED | 重新获得账户状态前禁相关动作；不能证明之前创建未执行，不自动重发 |
| 非JSON、结构/类型不符、key不匹配 | request/normalize→INVALID_RESPONSE | 保留原任务与证据，区分接收/解析失败；不填空正文成功 |
| HTTP非成功或业务code非0/200 | request→REMOTE_ERROR | 保留原状态，不推断取消/退款 |
| 无结果正文/文件 | normalize→UNRESOLVED_RESPONSE；同步create转未解receipt | 只观察已有运行，停止新增创建；query终态无正文也不得当恢复成功 |
| 敏感字段/不允许下载地址 | assertNoForbiddenCredentialFields→FORBIDDEN_CREDENTIAL_FIELD；URL→UNTRUSTED_REMOTE_URL | 拒绝消费，不把秘密或地址塞入界面/普通日志 |
| 不支持API类型/异步/schema字段 | normalizeApiDetail→UNSUPPORTED_API_TYPE/ASYNC_NOT_SUPPORTED/UNSUPPORTED_SCHEMA_FIELD | 保持对应模板来源禁用，不降级猜字段、不自动直连Dify |

逐字段的终端结果消费最终仍须与DSH当前运行/保存合同及BE-02/03实际交付联合验证；本批是脱敏准备，不认为legacy解析行为已满足全部新版14节点。

| 入口观察 | 本次能证明 | 不能推定及下一责任方 |
|---|---|---|
| workarea `src/app/App.tsx` | /auth/*、/workspace/*、/user/profile-reward实际本地路由，后两者需ProtectedRoute | 不等生产origin/部署/返回语义已验；WA-04交精确入口合同 |
| `src/components/SettingsPanel.tsx` | profile、balance、runningWater等为内部currentPage状态；balance调用既有财务组件 | 不能发明`?tab=balance`、`/billing`等深链；需WA-04明确可消费入口/参数 |
| RechargeRecordSection/billing.service | 充值记录由既有service消费；页面归网站 | 本次没有上线验证或重做WA-01；不把service存在当DSH入口接通 |

建议禁用/状态文案是本次消费规格，尚未写入UI：①缺服务/schema：“该模板的专业API映射尚未核实，暂不可生成”；②项目绑定缺项：“当前项目与账户目录未核实，请先完成项目关联”；③100%但无正文：“服务进度已完成，正文尚未取得；保留原任务，不重复创建”；④URL未下载/保存失败分别说明“文件尚未取得/保存未完成”；⑤网站入口缺件：“账户与财务入口尚未核实”。实际UI沿已确认设计及实施范围处理。

| 未满足条件 | 拟提示及精确禁用动作（尚未实施） |
|---|---|
| 必需API字段/语义缺件 | “专业API必需字段尚未核实，暂不可生成”；禁用该模板专业API提交，保留同份草稿，不额外派发或自动换来源 |
| 无法无损映射共同字段 | “该模板输入暂不能完整传递到专业API”；禁该模板专业API提交，保留所有输入及原来源；不能静默省略、编造默认或另开表单 |
| 具体来源不可用/能力未验 | “所选来源暂不可用，请查看缺件说明”；禁对应生成动作，保留草稿；切换只由用户选择，不启动请求 |
| 文件只有URL、下载失败 | “文件尚未取得”；不登记文件交付/保存成功，不开放依赖该文件的原生打开/引用；若已有独立可审核正文，其原有审核/复制权限不被文件失败剥夺 |
| 文件发布前保存失败 | “保存未完成，原版本与草稿仍保留”；不造成功回执，不开放该未保存文件的打开/当前文件引用；已批准固定正文仍按原审核/草稿合同处理 |
| 文件已发布但索引失败 | “文件已发布，回执未写入，请保留恢复清单”；不自动重发/覆盖/再生成，不把恢复清单当成功回执；固定正文操作沿其既有版本，不假装已关联当前文件 |

这些是任务4准备阶段的可审行为规格，不能据此登记客户端禁用提示已接入。

来源开关只改草稿，运行中锁定来源/输入；两来源同表单、同审核保存规则。未完成的API/入口只禁对应动作，本地Skills不等网站页面可用。UNKNOWN/401/403/超时不得自动重发/切来源/扣退，迟到响应不能写新项目；引用只准备草稿，由用户发送。

## 6. 后续全范围核对

| 原阶段/工作 | 当前证据结论 | 继续所需 |
|---|---|---|
| 计划任务1—4 | 本批准确缺件/消费规格交付；第三方审计另记 | 实际提供方交付有变则精确更新 |
| DS-02真实Skill装配 | 本批未有业务包，未装配 | IC-SKILL/IC-RULES、许可/用途、实际包身份及Host范围 |
| DS-03 U1/D1 | 两格式BLOCKED/未执行 | 第2/3节缺件；逐格式实证和接线出口 |
| DS-04 E/F/P1/U13 | 只有本地合同/入口准备 | 实际服务/schema/项目、成对Host及逐文件落地；具体调用/费用范围 |
| DS-05 G0→G1—G5 | 未新增真实双来源/质量/用户证据 | 各节点真实直接输入、当前版本和预算；一模板不代14×2 |
| H及阶段6 | 未收口/未发行 | 六里程碑、14×2矩阵、必要缺口关闭、包级升级/降级/恢复/发布依据 |
| 原P2—P4、长稿引用、OCR/新增导出、E07/E12 | 沿原后续范围保留 | 按各自合同选入/实施；不静默删除、不算本批已完成 |

所有工作完成的目标保持；本批交付不把未来工作改成“仅规划即可完成”。本记录未启动Host/Desktop、加载解析器、真实模型/API/上传/费用、Skills制作、安装升级、提交推送或发布；也未改候选/锁/pin/Profile/正式资源和旧v1/values-v1。
