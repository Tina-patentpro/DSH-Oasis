# Flow-2-6 / M06 专业API合同候选1

版本：`flow26-m06-api-candidate-1`，2026-10-29。状态：**消费端合同候选；未获后台/Dify接受，未部署，未启用来源**。依据用户本轮“补齐新版Flow-2-6的API合同、最小改动”执行。本文将原[缺项包](../evidence/2026-10-29-flow26-remote-contract-request-r2.json)补成可实施的具体提案，不修改旧服务39/46的实际含义，不给它们补认新版能力。

共同业务合同仍为V3.4.0 / `v340-1` / Flow-2-6，业务资源固定M06 `0.1.3`，producer manifest `7ec58d41d870b122f763657ab983ad0a45d9f266a466983775b8d066dc8c63b9`。不新建表单、账户页面、上传流程或调用路径。字段、固定资源与实现身份见[机器可读合同](flow-2-6-m06-api-contract-candidate-1.json)。

## 1. 请求：八项输入逐项无损传递

沿用 `POST https://lzhxpy.oasisintwrite.com/api/apicategories/create`，JSON外层仍只有现有 `id`、`key`、`inputs`、`api_process`、`folder_id`。id/api_process/folder_id必须来自经接受的实际服务/账户/Workspace绑定；本候选不填猜测值。key沿用运行前保存的原请求标识，不产生新幂等承诺。

`inputs`内使用下表**同名八字段**，新服务的元数据应逐项声明为paragraph；文件字段在传输层承载JSON字符串，业务层仍是文件输入。这个元数据形状是待提供方实现的提案，不是对网站现状的描述。

| 共同输入ID / 远程inputs键 | 传输值 | 业务解释 |
|---|---|---|
| upstream_md_file | JSON.stringify完整文件值 | 唯一明确前序Flow-1-5累计MD；保留结构/来源异常警示，不另找历史文件 |
| disclosure_file | JSON.stringify完整文件值 | 技术交底文件，原正文与hash保留 |
| disclosure_text | 原字符串 | 补充/纠正技术交底，与文件并存 |
| drawings_file | JSON.stringify完整文件值 | 独立附图材料通道；文字说明不冒充真实图像 |
| drawings_text | 原字符串 | 附图关系/修改说明，与文件并存 |
| claim_requirements_file | JSON.stringify完整文件值 | 范围/层级/表达要求，不能覆盖技术事实 |
| claim_requirements_text | 原字符串 | 要求补充/纠正；不合并进user_input |
| user_input | 原字符串 | 用户手动指令，与材料事实分离 |

当前文字文件值严格为 `{filename,body,sha256}`；sha256为UTF-8正文hash。JSON.stringify只做JSON转义，解码一次后必须与Host冻结值逐项相等；不trim、拼接、摘要、转换成URL、base64或把多个文件塞到一个字段。文件与同义文本同时存在时，两项全部发送并保持独立来源；是否替换由明确用户指令决定。三个文件通道互不覆盖。

缺失值及共同准备后被归为not_provided的空文本不发送该键；不发null、空对象或自动默认值。缺前序属于expected警示，不能被远程服务改成必填而悄悄拦截；所有八项均可缺省，原共同准备警示和质量限制保留。已提供且body为空的文件仍是一个明确文件值，不转换成缺失；保留原共同合同的异常/空内容处置。若提供方不能支持这些语义，该来源保持禁用，不能改共同表单来迁就它。

Host先完成权威Workspace读取、共同prepare和输入冻结，再编码。原prepared.inputHash按现有实现保留；另冻结实际完整HTTP请求正文SHA256、绑定指纹、输入快照、费用确认和key，不把两种hash混称为同一值。不增加未经证明的HTTP顶层字段。

单个普通正文仍同时受300000 UTF-16码元/1048576 UTF-8字节约束；累计前序MD按现有1048576字节合同，不能错误压成普通正文字符上限。全部正文、完整输入快照仍分别受原2097152字节限制。**转义后的实际HTTP JSON正文也设2097152字节拒绝上限**，包含外层开销；超限在派发前拒绝，不截断、不扩大原额度。该传输上限是候选新增准入要求，当前客户端未实现此候选适配，不宣称已有执行保证。

## 2. 输出：同一个七字段结果合同

首切片只接同步Workflow：`is_async=0`。新服务的输出元数据为一个paragraph `m06_output_json`，由后台按现有响应封装投影成 `data.answer_text`。这个名称同样属于新服务候选，不把旧output字段重命名后当成兼容。

成功响应须保留原 `data.key`，`data.answer_text`为**单个JSON对象的字符串**，严格包含：summary、core_result_markdown、updates、tables、terms_master、warnings、model_completions。不接受Markdown围栏、仅claims_text、仅URL、仅100%进度或把旧正文填入core_result_markdown再补六个空字段。`file_url`缺省或为空；本切片交付MD，不依赖远程DOCX。

七字段完整嵌套schema直接引用已固定资源的 `references/output-schema.json` 内 `.output_schema`，其资源SHA256为 `8eeb5986504e353293ded5ed582cd516b2b731f0ba2eeb7be664d226eb3c9975`；同时须通过当前Host `parseV340ModelOutput`、来源/更新/累计文稿检查。JSON Schema不能表达的trim非空、UTF-16/字节上限、最多64键等约束由Host运行时检查补足。资源schema与Host校验是两层，不互相替代。

warnings、模型补全、术语、表格状态必须由实际评估支持；未评估明确记录“未评估”，不能把空数组解释成无风险。输入侧Host警示保留，不因服务返回空warnings消除。结果进入现有同等预览、编辑再审、审核和无覆盖保存流程；API文件沿现有 `_OIW.md`规则，引用仅准备草稿，不发送。

## 3. 实际绑定与权限

启用记录必须同时锁定：workspaceId、权威workspacePath、environmentKind、固定apiBaseOrigin、当前accountId、folderId、apiId、catalogEntryId、apiEndpoint、apiProcess、实测schemaHash、本合同SHA256、八字段映射指纹、业务资源manifest、实际Dify应用/工作流版本及DSL hash。字段含义或实际schema变化即禁用该来源并使旧确认失效；只换expected hash不能修复不兼容。

服务端按当前认证账户验证folder归属和服务权限，客户端字段及内容hash不授予权限。前端不按同名目录或网站302单独猜绑定，不沿用旧手填JWT。凭据只经原credentials机制。账户/origin/Workspace变化后的迟到结果只归原冻结运行，不能写入新任务或新项目。

实际服务ID、endpoint名、api_process、Dify实例/DSL、权威项目绑定、价格和提供方接受记录目前均**未取得**；分别为backend（IC-API/ACCOUNT）及Dify（IC-WORKFLOW）待交付对象，具名负责人尚未指定。本地候选不代签这两方。

## 4. 失败、UNKNOWN与费用

schema/映射不符、输入超限、权限不足、结果JSON或来源校验失败均保留原输入/原响应/审核和任务身份，禁用或拒绝受影响动作；对用户只给安全固定说明。不创造新的服务端错误码，当前传输错误分类沿原客户端合同，新增业务分类待实际错误样本固定。

收到仅回执、断线、超时、取消等待、401/403或未取得可用正文时，不能推定未执行。保留key/id和UNKNOWN，只在现有已证明的观察能力内查询原运行；queryprocess不升级为已证明的同步结果恢复接口。不自动重发、换来源、退款或声称服务端取消。对旧未知运行不新增创建。

价格/币种/账务以实际服务端合同和当前确认作准。Fast39的3元、Basic46的5元不作为新服务报价；旧一次额度不续用。正式请求前重新绑定准确数据外传和费用确认；本候选没有发起请求的授权。缺usage/结算为未知，不填0。不得因完善合同自动派发校准样本。

## 5. PDF衔接与兼容

当前候选可离线核对的编码为 `prepared-text-v1`，对应现行.md/.txt准备值。PDF进入正式prepare后必须保留[提取合同](v340-material-extraction-contract.md)及[版本接续](v340-pdf-integration-compatibility-r1.md)规定的extraction完整证据；不能为沿用此文字文件schema删掉证据。

含extraction的请求尚需提供方接受独立的新材料编码能力及完整schema/容量回执，不能默认为本候选或旧服务已支持。因此“API文字合同候选可复核”不等于“API PDF已接入”。PDF与DOCX分别准入；本轮不扩DOCX或容器试验。

旧39/46、旧本地0.2.2、旧v1/v2/v3记录和审核hash均保持，不自动迁移或给旧请求补签新版身份。此合同不增加/v1、直接Dify、异步、流式、取消、自动退款、幂等或新结果恢复接口。

## 6. 候选核对与正式出口

本轮只做现有函数的离线合同回放：公开R2七项输入往返、八项完整合成输入往返、同语义文件/文本不覆盖、拒绝旧字段/未知字段和结果形状、现有创建外层/响应解析。合成输出仅用于结构核对，不进入真实生成上下文或专业质量接受。

提供方交付实际服务元数据、上述绑定、工作流/schema/export身份、报价/错误/容量能力及接受回执后，消费端再做最小适配与实际权限/失败核对；实际模型/API、专业质量、用户接受和发布仍分别成立。本轮离线结果不替代这些出口。
