# Fast39结果合同候选2（C2-R1，2026-11-05）

状态：限定用途的静态设计候选；未实施、未部署、未获专业／用户接受。父件为候选1及P0技术自评，原件与旧FAIL保持不变。本版替代的是未来评审提案，不替代任何现行线上合同或既有请求。

配套：`schemas.json`、`code-abi.json`、`transition-table.json`、`capacity-policy.json`、`限定用途与设计采用说明.md`、`adoption-scope.json`、`changes-from-candidate1.json`、`examples.json`、`validation-cases.json`及`delivery-binding.candidate.json`。冻结清单见`FREEZE.json`，不自含其哈希。

## 1. 版本、范围与F01

拟议版本分别为`flow26-source-trace-2`、`flow26-quality-2`、`flow26-fast-result-2`，不得以候选1版本发送本版语义。Dify仍保留八个legacy外部输入、六个字符串输出：`output/claims_text/dependency_tree/pending_confirmation/quality_report/quality_status`；后台仍保留原`answer_text/file_url`，另选一返回`structured_result`或`structured_result_error`。新增字段只针对明确绑定本版的服务，其他服务不受影响。

增强入口**仅限**：一份`Technical_Disclosure_file`，提取文本完整解析为`m06-workarea-material-packet-2`、`Flow-2-6`、`v340-1`及原R2约束；六个直接字段`technical_field/background_art_TD/technical_solutions/beneficial_effects_TD/embodiments_TD/drawings_explain_TD`均为精确空字符串。未传、null、空白串不自动充当空字符串。材料收据、prepared输入快照及实际`User_input`须与当前任务冻结身份一致。`eligibility_request`是检验用逻辑输入，不增加服务外部字段。

直接／混合文本、普通交底文件、多文件、packet1及不完整packet2不进入增强通道。发起前禁用该增强动作并说明范围；不改共同表单，不猜ID、不自动转来源、不调用旧通道代偿。既有legacy服务行为仍按原合同；已返回后才发现范围错误则记录`FAST39_SCOPE_MISMATCH`，不重发。当前merge节点直接值优先于标题提取、再优先语义提取的事实保留，不能在增强中用六个语义字段冒充原材料来源。

## 2. 来源登记与F03逻辑ABI

具体端口、原selector和类型见`code-abi.json`。新增节点仅有逻辑名，实际节点ID和新DSL哈希均待候选真正产出后固定；不要求不存在节点提供运行证据。

SOURCE_REGISTRY消费原提取节点`1770000100002.text`、Start八输入及调用方冻结prepared凭证。registry内部保留原材料正文，禁止先compact、换行规范化或Unicode归一化后再定位。文件输入取`materialValues[id].body/filename`，文本取原字符串；缺项不造正文。八共同输入ID恰好各一条，角色由输入合同固定：`claim_requirements_*`为output_requirement，`user_input`为manual_instruction，其余为technical_material；upstream原警示仍独立继承，technical_material也不表示所有句子都是技术事实。

`source_sha256`为原正文UTF-8哈希，`receipt_sha256`原样记录凭证，文件字节哈希与解码正文哈希不得混用。User_input是含R2包装的实际指令，单独哈希；原手动输入未在packet的materialValues中，registry的manual条目不从分隔符反解正文，只保留原receipt与`text=null/source_sha256=null`。requirements／manual从不进入技术source_map。packet原`inputWarnings`（含对象全部字段）、`limitations`、`requiredMissingInputLines`按JSON值完整旁路；当前客户端再与本地prepared凭证比较。包自述hash和role不是可信授权，也不能解除系统约束。

Outline仍由`1764588108416`产生业务分析。ANCHOR_ADAPTER在原Outline对象路径分配`plan:core`、`plan:parallel:<1起序号>`、`plan:cluster:<1起序号>`，分别为core_root、parallel_root、dependent_cluster；原对象ID另留original_id，原feature_id保留，workflow本地ID不得冒充T2继承ID。冻结原outline_quality/error、全部计划角色和source_map。每个core_root/parallel_root的preamble_features及characterizing_features的全部feature_id形成保留目标集合；这只是确定性保留目标，不是代码判断法律上的必要技术特征。

`outline_anchor`含`basis`和其SHA256。canonical算法为对象键按Unicode标量值排序、数组原顺序、无空白、Unicode原字符、有限数、整数十进制（本anchor无浮点）；SHA256取UTF-8，禁止NaN、重复JSON键、孤立代理项。source_map引用计划ID+feature_id；无有效支持则登记缺口，不补造原文。冻结anchor与registry的旁路变量来自同一运行，不能从终稿模型回读／替换；report仅复制该快照，客户端以原旁路哈希核对。

终稿LLM`1728183992412`只提交候选权文和逐特征处置，不得写入或删改冻结旁路。`1769301001008`解析模型JSON；`1769301001100`清理编号与正文；最终`1769301001101`消费规范化后权文、依赖树节点`1769151800001`的原edges/count/status、冻结anchor/registry、处置和明确plan→final映射。

规范化后定位以最终`claims_text`为唯一坐标系：先按最终编号划定权项区间，再在该权项内精确匹配模型声明的非空output_quote。恰好一次才由代码计算全局UTF-16半开区间；不沿用模型坐标，不选重复匹配的第一个，不猜改写等价。零／多次匹配用`locator_status=unverified`、两个offset=null，保留原quote、要求复核；禁止把它算作覆盖。blocked_missing_support的claim_id、quote及offset均为空／null。原材料source locator则始终在原正文上核验，不能使用终稿坐标或merge文本。

每个计划恰一条claim_id_map，可映射一个最终编号或null并说明理由；本限定版不支持拆分、合并计划。每个最终编号恰一计划，core_root/parallel_root映射不同且必须在依赖图无parent；dependent_cluster映射有parent。任何未映射编号、非法／循环／自指／缺失节点的edges、根降为从属、映射不唯一均为内容错误，不能任意选取一支。合法遗漏用null且质量不足。每个计划feature恰一处置；同键重复、相互矛盾、未知目标或未知最终编号为内容错误。source_map必须与冻结Outline来源按原始tuple逐项一致，仅附上本次映射的最终claim_id；不得用新来源替换不支持的特征。

coverage逐`(planned_claim_id,feature_id)`计算；core目标只有映射到其原计划对应root、处置kept/rephrased、唯一定位有效且有通过原文角色／hash／quote检查的冻结来源才计入。任何目标blocked或plan=null为incomplete；其余定位／来源未核为unverified；全部符合才为complete。优先级incomplete高于unverified。缺失列表保留二元tuple，不能因不同计划重用feature_id而合并。coverage=complete仍不证明来源语义支持；`support_review_status=not_assessed`永不由这些检查升级。

保留原quality_report九键（outline_quality、outline_error、marker_warnings、dependency_warnings、dependency_parse_status、dependency_edges、claim_count、quality_status、acceptance）。新增版本、anchor、source_map、claim_id_map、feature_dispositions、feature_coverage、原材料警示／限制／缺项及support_review_status。原Outline内容／警示不重写；quality_status在原状态基础上只能降级：coverage非complete或source_status非mapped或依赖解析非ok为insufficient；其余原警示／缺项／限制或工程提示至少partial。外层quality_status须等于解析后的report字段。

Outline新增旁注形状为`outline_analysis_metadata`：source_hints按原对象path（core_independent_claim、parallel_independent_claims/从0起index、sub_claim_clusters/从0起index）关联feature_id及原文定位，missing_support登记缺口；adapter再转换为plan IDs，不能让模型分配权威计划角色。所有已列原文来源的role/hash/quote/区间必须匹配原registry，失败为内容错误。任何kept/rephrased特征必须至少有一条有效原文来源；没有则必须blocked，不准仅靠insufficient标签把无原文定位的特征写进权文。output_quote歧义可标unverified，但这不同于原材料无来源。原文定位有效仍保留专业语义未评估。

## 3. 执行、关联与内容状态（F02）

完整矩阵见`transition-table.json`。后台不能只凭HTTP200或正文非空判增强成功。`data.status`区分succeeded、failed、stopped、running、missing/unknown；provider状态只从收到的provider对象取得，不接受模型质量字段声明。

原request_key由本次后台请求上下文绑定；run_id只取顶层workflow_run_id或data.id的合法UUID。两者存在须一致；缺失、非法、矛盾均产生关联错误，run_id=null，原响应哈希保留。只存在一处合法ID可采用。状态和ID都来自同次响应；禁止用历史run补齐。

HTTP200且有效关联：failed/stopped→已知执行失败；running→非终态；无状态／未知值→未知；仅succeeded才进入内容校验。成功执行但内容、容量、来源或格式不合法属于content错误，保留execution_outcome=succeeded，不伪称未执行。关联错误不抹掉observed provider_status，但不把未确认归属的执行事实归到当前任务。无响应／超时／HTTP异常本地记录未知，401/403也不反推未执行，不伪造返回过的structured_result_error。

只对实际收到JSON响应的增强返回构造互斥fragment：正常structured_result含provider_status=succeeded；错误含phase、provider_status、execution_outcome、raw_response_sha256及retention。不得把failed、running或missing包装为正常对象。原响应按原分支交原保存／扣费路径，增强校验不得新增请求、保存／扣费任务或提前抛错改变原分支排队事实；原分支可能0或1次，未来替身验证逐分支比较，不能声称原后端有exactly-once事务。错误路径也记录原enqueue事实（queued/not_queued/unknown），不推断已持久化、扣款、退款或取消。

DSH不以增强错误新建completed产物run。已有状态最小投影：已关联provider failed/stopped→failed；running/missing/未知及关联错误→submission-unknown；provider succeeded内容错误→failed并在元数据保留执行成功事实；全校验成功才按既有完成规则写completed。safeError与时间沿原schema要求，状态名不是远端取消。无自动重试、补调用、恢复端点或换来源。

排队保全的精确定义是沿原响应处理分支比较0／1／unknown事实，不是对任何畸形响应强行补入原本没有的队列任务；原分支未排队仍记not_queued或unknown，不能为了增强“保全”新建财务事务。

## 4. 三节原格式（F04）

本版选择**保留原R2要求**，不修改原材料包6675字节、User_input或旧格式接受对象。正常output由确定性renderer组合且只含以下三个二级标题，各一、顺序固定、有正文：

1. `## 权利要求草稿`：claims_text，随后dependency_tree（仅正文或三级标题）。
2. `## 材料缺项与未确认事项`：pending_confirmation（正文，不自带二级标题）。原requiredMissingInputLines逐行原文出现，可加`- `列表前缀；原inputWarnings的problem、全部限制、Outline原警示及新降级状态逐项保留。结构化原警示对象在report中完整保留，不以显示文本代替。
3. `## 技术特征来源`：从最终source_map和全部dispositions生成可读表，含最终／计划权项、feature_id、input_id、正文hash、原文短引、区间和处置／未核。无来源明确标未核，不写“无风险”。

正文各字段不能注入额外二级标题；带Markdown控制符的引用在显示表中作转义、换行显示为`〈换行〉`文字，不能执行HTML或取远程资源；report中的原quote不转义不改字节。冻结缺项行若自身与三节语法冲突则拒绝内容，不静默修改原行。最终核验三标题、缺项行及renderer重建值相等，旧三节检查不替代来源语义检查。

## 5. 存储owner与新容量策略（F05）

未来S1拟在`oasisRemoteExecutionSchema`增加可选`fast39Result`，唯一落点`tasks[taskId].remoteExecutions[executionId].fast39Result`；现行strict schema尚不接受它。正常产物run沿既有executionId引用该执行，不在run再复制新metadata；不伪造M06七字段，不写入v340.result冒充正式M06接线。正式M06 API门禁保持关闭。

metadata只存一份原六字符串structured_result或小错误fragment、验证摘要、原响应hash／enqueue事实／交付绑定hash；解析quality仅作校验内存视图，不重复持久化整对象，原legacy answerText／artifact等真实重复仍计入全记录。`raw_response_sha256`仅证明哈希，不证明全文已留存；backend原响应继续交原队列，但其保存成功未核实。

详见`capacity-policy.json`。新增受控限制为每个外部输出字符串≤100000 UTF-16码元且≤256KiB UTF-8，增强证据envelope紧凑JSON≤512KiB；这不是原M06现有上限的“交集”。单独Schema maxLength按Unicode码点，只是第一层；字节和UTF-16、有效Unicode、无NUL、容器及汇总另外检查。解析report的对象／数组嵌套以report根=0、每容器+1计≤8；每数组≤1024、每对象≤256键；metadata自身同样独立根计≤8。原formValues通用JSON限制不因此扩宽。

既有约束继续：legacy answer/artifact各自256KiB（正文受此路径限制时不放宽）；去除各task.v340后的legacyValue全体≤1MiB；全workspace≤8MiB；V340文档1MiB／snapshot2MiB仍按其原owner执行，不挪作此metadata预算。原材料包1MiB不因此缩小。容量须按实际冻结序列化后的记录与剩余空间逐层检查，六串各达上限不保证总量可容纳。

超限不裁剪／覆盖旧原件、不截断quality JSON。小收据只留hash、错误和创建事实，retention=`hash_only_not_persisted`，明确本地未持久化完整增强数据；符合预算才为`enhanced_fragment_preserved`，这也不表示provider原HTTP全文已保存。若连小收据都无法安全落盘，保留已写的提交前记录，当前任务标待人工恢复，UI明确未持久化，不伪造成功；不另建无界sidecar，不自动取结果或重发。旧legacy结果仅在原路径本来可保存时保留，增强失败不静默标成增强通过。

错误证据可以在`evidence_record.received_outputs`保留收到的六字段白名单子集（只保留实际存在的字符串）；它是错误原件证据而非正常outputs，不补默认值。预算不足时整份子集不落盘、仅留hash；hash_only错误不得同时声称保留received_outputs。正常fragment已有六串，不再另复制received_outputs。

## 6. 零可支持权项的边界（F06）

正常合同仍要求至少一条有效编号权项。材料不足但仍有可支持权项可形成insufficient受限草稿；**零可支持权项不属于正常产物形状**。provider已failed/stopped先按执行矩阵，不猜是零权项；provider succeeded且claims空、count=0或明确无可支持权项则`FAST39_NO_SUPPORTED_CLAIM`内容错误，保留执行成功与缺口，按预算保存原可用输出／hash，不写completed产物。禁止凑造权项或空数组伪装已评估。单独零权项报告、任意混合输入和全F26合规是后续另定合同，不在本版泛化承诺。

正常anchor至少有唯一plan:core；core/parallel计划必须有非空feature_ids，角色与ID路径一致。空核心不得用空目标集合换取complete；无法形成有效anchor是内容错误，零可支持权项优先走上段出口。更广的空核心／并列保留策略需另定版本，不能据本版泛化。

## 7. 复核与实施解除条件

`schemas.json`须用既有离线Draft202012引擎check_schema并逐层校验：外层fragment→六字符串→解析quality_report→ABI对应对象→确定性跨字段／角色／原文／coverage／格式／容量规则。离线探针只验证合同示例和参考断言，不执行业务代码，不证明运行实现存在。

另版候选与本地Schema复核不解除：规则生产端工程／Dify用途授权、源设计Batch及受控candidate登记、实际DSL/代码节点与后台/DSH改动身份、独立技术复审（如门禁要求）、专业与用户接受、真实调用及发布授权。新实现仍须另获用户明确指示，保持原资金／数据／未知不重发约束。
