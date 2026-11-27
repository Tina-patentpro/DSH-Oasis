# Fast39 字段传递与材料解析链路：无费用核对返回

2026-11-05，Asia/Shanghai；执行者 Codex，单代理作者自查。执行[后续计划任务1](../plans/2026-11-05-project-progress-and-next-plan.md)，授权仅为“无费用核对……查清问题后再决定如何修复”。[EXEC-R2复核](2026-11-05-fast39-chain-preflight.json)绑定整体1.3.1／NS1-R1／P30、协同1.2.1、当前分支/HEAD及131份预存修改。没有实施修复。

**结论：所核本地编码和客户端序列化没有丢弃材料或 `User_input`；远端材料解析、关键节点消费和最终结果投影仍缺原运行证据，不能确定唯一根因。** 本次任务1按“链路事实＋准确缺件”出口交付，状态为 `STATIC_ONLY_REMOTE_CAUSE_UNRESOLVED`，不表示Fast39已修复、完整链路通过或G0关闭。正式新版API来源继续禁用。

## 核对到了哪里

| 层次 | 已确认的事实 | 证据及边界 |
|---|---|---|
| 共同输入→材料包 | R1/R2的全部已提供材料值与receipts可逐项重建；缺前序明确保留。要求文件/文本标为输出要求，不是技术事实 | 当前纯编码器重建字节与已存文件完全一致。只证明本地编码完整 |
| 指令→API字段 | R1 `User_input` 为131 UTF-8字节，R2为1388字节；R2含禁补造、三节、逐特征来源及缺前序确认行 | 与冻结请求快照、当前编码器逐字一致；未发现本地截断、改名或删除 |
| 上传/创建准备 | 材料包4322/6675字节；单文件字段是 `Technical_Disclosure_file`，文件对象为 `document` / `remote_url`；地址与各自历史上传回执一致 | 在当前生产客户端的内存适配器中验证了multipart文件字节及创建JSON。没有发真实请求；历史快照在调用前保存，不冒充服务器收包或原始网络抓包 |
| workarea当前源码比较 | 按输入schema生成字段，普通字段原样保留，文件转换成相同remote_url对象，再POST后台create；不是重新封装绿洲材料包的解析层 | 仅本地源码，HEAD `e4fdfc61ebb50ac31380be25c87692d48e600cf2`。R1/R2由DSH原生账户临时入口直接调后台，浏览器网站不是这两次调用的中间代理 |
| 后台本地快照 | `WorkflowRunRequest.inputs`为任意字典；同步create传整个 `request.inputs`；`run_dify_workflow`只追加 `server_key` 并将该字典放入下游payload | 2026-10-17-qingdao源码快照，不是10月31日部署一致性证明；未读凭据/数据库/生产日志，未运行服务 |
| 文件保存→内容解析 | 快照上传服务校验扩展名、保存文件并返回地址，没有JSON反序列化或材料角色拆分 | `.txt`可被保存不等于下游提取/语义消费成功；远端实际下载字节和提取文本未取得 |
| Dify节点→最终API正文 | 两次客户端最终正文均存在补造事实、缺项警示/来源缺失；原FAIL不改 | 没有原运行的提取器输出、关键LLM实际输入/输出、完整workflow outputs，不能断定是在解析、提示接线、生成阶段还是API结果投影发生 |

## 两次请求及八项输入的实际去向

两次均为服务详情39、目录211、项目302，采用同一共同inputHash `a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b`。R1/R2仅材料编码/指令约束不同，没有新增技术事实。

| 共同输入 | 实际本地编码/外层传输 | 尚未证明的远端行为 |
|---|---|---|
| upstream_md_file | 未提供；receipts及missingInputIds保留；R2另有inputWarnings和User_input缺项行 | 下游是否读取、保留这项缺失警示 |
| disclosure_file | JSON文件的materialValues.disclosure_file，含正文/文件名/hash | 是否完整提取并进入技术事实上下文 |
| disclosure_text | materialValues.disclosure_text | 是否与交底文件共同消费 |
| drawings_file | materialValues.drawings_file；这是文字附图说明，不是图像 | 是否按文字资料处理、保留无真实图像限制 |
| drawings_text | materialValues.drawings_text | 是否保留未完成视觉核验说明 |
| claim_requirements_file | materialValues.claim_requirements_file，role为output_requirement_not_technical_fact | 是否按要求处理而不建立新事实 |
| claim_requirements_text | materialValues.claim_requirements_text，同上 | 同上 |
| user_input | 从materialValues分离，传外层User_input；原receipt保留；R2附加已冻结约束 | 是否进入关键生成/复核节点、是否被后续模板覆盖 |

这些嵌套材料合为一个普通JSON文本文件，通过既有“完整技术交底书文件”字段传输。其余六个legacy段落字段 `technical_solutions`、`technical_field`、`background_art_TD`、`beneficial_effects_TD`、`embodiments_TD`、`drawings_explain_TD` 均为空字符串。这是已存请求事实；没有证据说明该服务专门理解 `materialValues`、`roles`、`semanticContract`。可逆编码不能替代业务映射接受，也不能据此认定这六个空字段应被猜测填充。

实际请求标识与北京时间：

- R1：`611d0493-72a8-4c0e-bd66-11d53ea9d26c`，2026-10-31 14:35:34.708至14:36:07.836；文件SHA256 `08fc183cf6f2482151d31105cfd22dbe151908b2bba9f4aaf628ef099d540c16`。
- R2：`adc63f7e-1905-49cc-9753-b3488773ae4d`，2026-10-31 21:00:41.525至21:01:21.216；文件SHA256 `ea2f8c0c03a4ca7cde4760906dd6bf0a736b6a5f1b15774f41bb3c8130251a79`。

上述是本地请求键，不是已取得的Dify run_id或服务端独立回显。两个归一化结果仅含key、answerText、fileUrls，没有recordId或workflow_run_id。

## 两个容易误判的证据缺口

1. **上传回执中的SHA256是本地写入。** 历史临时入口在上传返回URL后，把 `intent.packet.sha256` 写入本地 `upload-receipt.json`。它绑定本地拟上传字节，不能证明服务器保存、Dify实际下载或解析的是相同字节。本次内存核对也不能补成历史远端文件验真。
2. **最终正文没有警示，不足以断定模型从未生成警示。** 后台快照只遍历 `api_info.output_schema`，读取对应workflow outputs后拼接 `answer_text`；当时Fast39可见metadata只公布一个 `output`。如果内部警示放在其他输出键而未被公布，可能在投影中未交付；如果警示从未产生，则问题更早。缺原始outputs，不能在这两种解释中任选一种。

同理，当前客户端序列化回放通过只支持“当前函数保留字段”。它不补认历史线上部署、服务器接收、下游文件可达或模型消费。

## 仍需哪四项既有证据

以下为本地缺件清单，未发送给其他项目或WorkBuddy，也不要求用户登录管理控制台。下一接收方是现有服务维护方，由其按本来的权限提供脱敏证据；不新建服务或重跑旧请求。

| ID | 提供方及确切材料 | 能解决的问题 |
|---|---|---|
| FE01 | 后台服务维护方：两原requestKey/时间关联的既存接收、转发inputs摘要及当时部署源码身份 | User_input与文件对象是否实际传给对应服务；10月17日快照能否适用 |
| FE02 | 现有服务维护方：原运行文件下载字节hash、提取节点身份/状态和完整提取文本 | 是文件读取/提取问题，还是文本已到达而角色未被理解 |
| FE03 | 现有服务维护方：原关键LLM节点的实际输入变量/渲染提示及输出，标出材料、User_input、缺项和要求的绑定位置 | 变量未接线、阶段间丢失、提示冲突或生成不遵守的区别 |
| FE04 | 后台服务维护方：原始workflow outputs及映射到output/answer_text的记录 | 警示未产生，还是已产生但未对客户端交付 |

取证应先用上面两个原请求键和时间关联既有运行；移除认证头、密钥与无关用户信息。若没有保存原始节点证据，如实登记缺失，不能为补证自动重派或将一次新运行当成旧请求的证明。

本次未取得足以指向唯一故障节点的证据，因此**暂不选择修复方案**。JSON角色不被消费、User_input接线/后序覆盖、生成补造及输出投影遗漏均保留为待验证解释，不把任何一个写成已确认根因。不追加R3提示调参，不切Basic46试错。

## 离线核验、代码定位与保全

本轮执行：`tools/bin/node .local/fast39-chain-20261105/offline-replay.mjs`，退出0；R1/R2两例本地保全断言通过。脚本先禁止global fetch及http/https/net/tls连接，再注入纯内存transport：2次模拟上传、2次模拟create，只核FormData/JSON，不连接本机服务器或远端；网络尝试0、真实上传0、真实create0、模型0、费用动作0、真实凭据读取0。这不是新业务运行或完整回归。

脚本及原始回放在 `.local/fast39-chain-20261105`；[结构化分析](2026-11-05-fast39-chain-analysis.json)包含逐输入映射、历史请求身份、17个来源的绝对路径/hash/实际读取范围、四项缺件与命令。[最终保全核对](2026-11-05-fast39-chain-verification.json)另存，不重签旧回执。

关键源码位置（完整文件hash见结构化分析）：

- DSH `packages/oasis-professional-service/src/m06-workarea-material-packet.js:14`：材料/指令分离；`:42`：R2约束；`oasis-api-contract.js:206`：外层请求；`:345`：序列化；`:405`附近：上传；`:426`附近：create归一化。
- 历史实际校准入口 `.local/m06-fast39-r2-20261031/temporary-entry-archived.mjs:59`：上传；`:61`：八字段映射；`:63`：调用前快照；`:65`：唯一create。未运行该入口。
- workarea `src/modules/workspace/hooks/content-sections/generation-request.ts:17`、`generation-actions.ts:169`、`src/api/services/ai.service.ts:67`：网站当前调用链，仅比较。
- 后台快照 `app/schemas/api.py:93`、`app/api/v1/apiconfig.py:119`、`app/services/workflow_service.py:37`、`app/services/file_service.py:58`：字典透传、下游payload和文件保存；`app/api/v1/apiconfig.py:135`：结果投影。

只新增本轮证据/私有诊断脚本，在原三状态入口前置本次结论并保全旧完整字节后缀；计划、业务源码、依赖锁、固定资源、安装/Profile及既有失败/产物不改。未进入网站/后台/Dify控制台，没有业务网络请求、进程启动、数据库/日志/凭据读取、上传、生成、退款、对话发送、Git提交/推送或发布。作者自查不称独立审计。
