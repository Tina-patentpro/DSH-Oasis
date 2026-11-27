# 05 来源绑定、输出契约、规则状态与边界（OP-GOV-A）

> 对应需求：横跨 M06-N01/N02/N03 的治理规则。状态：`READY_AFTER_CURRENT_SOURCE_BINDING`（本文件即当前绑定结果）。
> 本文件解决 R03-F01（当前来源字节态过期）、R03-F06（历史限制具名保留），并按 R19-F01/F02/F03/F04/F06/F07 重写输出契约、四 CUR 绑定与派生 wire 效力表述。

## 1 规则与目标身份（只作绑定，不代表授权）

| 项 | 值 |
|---|---|
| 目标 | M06（`target-specifications/M06.json`，77076 字节，sha256 `b45617dc955e71d9314a1c80f17034543b39fcaaed5d79cbbc8325190ea38c9e`） |
| 业务合同 | Flow-2-6 / V3.4.0 / 路线 B / 范围 1（`m06-production-wire-contract-R01.json`，38799 字节，sha256 `c48eaeb8aa1d821f4b8324e940d057978c7fc61bc4eaea4777bd3bc46d2bad4d`） |
| 规则文档 | `F-2-6权利要求初稿生成物标准_CLAIMS_DRAFT_STANDARD_V0.1.9.md`，77079 字节，sha256 `391b39a1c4e69a0108deb365a9ff96ea31dfae336663aab56faa279121ffd5a0` |
| 规则 UID / 版本 | `6fcd7286-9380-40d3-ba8b-79686eddb1ce` / `0.1.9` |
| 效力 | `formally_effective=false`、`approved_for_trial=true`、`generator_runtime_authorized_by_this_receipt=false` — **试行、非正式生效、不产生新授权**（真实试行收据 10054 字节，sha256 `7fa56a74163ef216b5191414b1ea89e9fd80c2e16370425030c27188117b8f43`；规则创建时的 pending 字段属保留历史，不据此改报本次试行状态） |
| 规则路径 | `oiw-source:dce5a92f2f08f9eced50`（跨库仅路径引用 + sha256，未复制正文） |
| 读取范围 | 只读生产规范**第一部分（§1.1—§1.9）与第二部分（§2.1—§2.3）**及**§3.3 底线**；第三部分其余为评价方法，**未读未用**，评价专用题目/评分/预期答案不进入本载荷 |

## 2 八输入（再次固定，不得增减）

`upstream_md_file`、`disclosure_file`、`disclosure_text`、`drawings_file`、`drawings_text`、`claim_requirements_file`、`claim_requirements_text`、`user_input`。

- `upstream_md_file` 是**唯一**前序基线（实际传入的那一份，含人工修改）；缺失/结构异常时继续输出并登警示，**不回读更早节点**。
- `user_input` 只表达运行/编辑意图（增删改、优先级、范围、偏好），**不是**技术来源、实验事实或人工确认，**也不得**用作 `source_input_id`。
- 输入状态为 `accepted` / `warning` / `not_provided`；一个输入 ID 只承载一项内容，文件与文本不混装，多个独立文件不暗中合并。

### 2.1 有条件合并（F26 §1.2—§1.3；取代「一律上游优先」）

| 情形 | 正确处理 |
|---|---|
| 实际文件与旧结构快照不一致 | **实际传入的（含人工修改的）文件是基线**；保留实际正文，把不一致登记为待人工确认。**不得**用旧结构快照覆盖实际正文 |
| 合法材料提供的补充 / 纠正 | 保留；与同语义文件并存时，文本**只补充或纠正**同一材料，不另起一份技术来源 |
| 未明确要求替换 | **保留差异**及其对来源与范围的影响，不静默择一、不自行挑有利版本 |
| 未解决的实质冲突 | **并列记录**版本、来源与影响，不合并成一句「以某版本为准」 |
| 合法材料 + 明确编辑意图 | 按 §3.2 的**精确行指令**（`替换：<content_id>` / `替换：T4/<row_id>`）做**可实现的对应替换**；不因「怕改坏」把整个替换功能禁用 |
| 明确删除 / 撤回 | 被撤回内容**不得**在新业务正文恢复为有效事实；保留删除事实及其对必要关系、范围和本轮可用性的影响；**同时声明结构记录限制**——历史条目在累计结构中按原样保留，本候选**不做**结构删除同步，**不宣称**「已删除全部历史」或「已全量同步」 |
| 结构删除 / 完整正文表行同步 | 属**范围 2**，**未实现**，不得声称已实现 |
| 技术事实确认 | 本次模型**不伪造确认**：不写 `human_confirmed`、不写 `confirmed_fact` |

## 3 七字段契约与实际装配约束

### 3.0 逐字段精确类型：以只读派生 schema 为准

- `references/output-schema.json` 是**已固定 wire 的 output_schema 的只读提取件**，不是新 wire、不是新资源、不是运行实现：其 `provenance.kind = READONLY_DERIVED_EXACT_EXISTING_HOST_CONTRACT_NOT_NEW_RESOURCE_OR_RUNTIME`，来源路径/字节/sha256 与派生方式逐项记在该文件内。
- 该文件只解决「字段类型 / 枚举 / 上限 / 必填」的**查阅**；**主要禁止值与装配前提仍必须写在 `SKILL.md` §3 与本文件**，不能只丢一个 schema 让模型自己猜。
- 若该派生件与 wire 原件不一致，**以 wire 原件为准**，并把差异登记为待修；不得据派生件放宽约束。

### 3.1 顶层七字段

1. **只允许七个顶层字段**：`summary`、`core_result_markdown`、`updates`、`tables`、`terms_master`、`warnings`、`model_completions`；`additionalProperties=false`，七个全部必填。
2. `updates`、`warnings`、`model_completions` **不是字符串列表**；字段不全即不合规。无技术更新时 `updates=[]` 合法。
3. `tables` **只有 T1–T6**，每表是 **row 数组**（≤500），行结构 `{row_id, data}`；**不是** Host 快照的 `{status, rows}` 对象。
4. `terms_master` 每项是「术语名 → 任意 JSON」的对象，数组 ≤500，单对象键数 ≤64。
5. 不得新增 wire 字段、不得发明输入 ID、不得改 T1–T6 既有职责。操作记录放在**适用表的 `data`** 或正文里表达，不另开字段。
6. Host 负责：运行 UID、累计装配、真实时间与文件名、双状态、审核、持久化。模型**不写**这些元数据，也不写接受状态。

### 3.2 `updates`：本次允许值与来源前提（R19-F02）

**快照枚举 ≠ 本次允许值。** `content_origin` 的 6 个枚举、`trust_status` 的 5 个枚举是全快照（含历史与 Host 侧）的取值范围；本次模型的写入受下列限制：

**禁用（写即装配失败）**

| 项 | 禁用值 |
|---|---|
| `content_origin` | `upstream_snapshot`、`human_confirmed` |
| `trust_status` | `confirmed_fact` |
| `content_id` | 以 `host/` 开头的任何值（Host 保留空间） |
| `last_updated_flow` | 任何非 `Flow-2-6` 的值（含空串、别的节点名、版本号） |
| 本次内重复 | 同一 `content_id` 出现两次 |

**来源前提（按 origin 分别）**

| `content_origin` | 必备前提（装配逐条比对，任一不满足即失败） |
|---|---|
| `user_file` / `user_text` | ①材料**实际收到且非空**；②收据 `content_origin` **等于**本条 `content_origin`；③本条 `source_hash` **等于**该输入的实收 sha256（64 位小写十六进制；**`none` 不满足**）；④`source_locator` 为**实收正文的子串**（必须是真正取到的那段 body 里能找到的定位） |
| `workflow_analysis` / `model_completed` | **不得**报 `trust_status=source_fact`（非用户材料不升为来源事实） |
| 任意 origin | `source_input_id` **不得**为 `user_input`、**不得**为上游文档中由 `user_input` 生成的指令审计 `content_id`、**不得**为歧义引用 ID；并且应指向本次实际提供的输入 |

**做不到时的正确写法**

- 真实材料哈希取不到：保留**待核**并继续给可写初稿；**不编造哈希**；**不把 `none` 当 `user_text`/`user_file` 的真实更新哈希**（会导致来源不实）；**也不因一条哈希取不到把整个起草判为不能做**。
- 无技术更新：`updates=[]`，Host 仍逐字保留实际输入与节点正文（下游不因空更新丢失累计）。
- 合法材料 + 明确替换：在 `user_input` 写**精确整行** `替换：<content_id>` 或 `替换：Tn/<row_id>`（按行 trim 后逐行比对，不做模糊匹配）；没有该行指令时，改同 ID/同 row 会被装配拒绝。

**字段长度**（以 §3.0 派生件为准）：`content_id` / `source_input_id` 形态 `^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$`；`content_markdown`、`source_locator`、`revision_reason` 均 1–300000 且非空；`source_hash` 为 64 位小写十六进制或 `none`。

### 3.3 `warnings`：本次只新增（R19-F01）

1. 本次 `warnings` **只承载本轮新增警示**；十字段全为 string：`warning_id`、`first_flow`、`inherited_from`、`problem`、`affected_content`、`current_handling`、`model_completion`、`deliverable_impact`、`recommended_action`、`status`。
2. **常量**：`status=open`、`first_flow=Flow-2-6`、`inherited_from=none`。
3. **禁止**：新造 `confirmed`/`resolved`/`accepted`（四状态是 Host / 历史状态范围，不是模型写入许可）；重发或复用继承 `warning_id`（继承警示由 Host 克隆传递，本次不复报、不关闭）；占用 Host 保留前缀（新 ID 以 `m06-` 起头，不得以 `host-` 起头，不得等于 `host-Flow-2-6-m06-limited-<运行 UID>`）；与已知继承 ID 冲突。
4. **关闭建议**：写进既有文字字段——`current_handling`（现在怎么处理）+ `recommended_action`（建议人工做什么），**不改 `status`、不加字段、不新增状态 wire**。
5. 生成了新草稿**不自动关闭**警示；「已写进正文」不等于「警示已解决」。
6. 上限：数组 ≤128；各文字字段 1–300000；`first_flow` ≤32；`inherited_from` ≤128。

### 3.4 `model_completions`：类型、常量与双向联动（R19-F02）

七字段**全部 string**：`content_id`（形态同上）、`content_origin`（常量 `model_completed`）、`completion_basis`（1–300000）、`assumptions`（1–300000，**用字符串写假设**）、`confidence`（1–128）、`affected_section`（1–300000，**用字符串写位置**）、`human_confirmation_status`（常量 `pending`）。

**双向联动（缺一即装配失败）**

1. 每条 completion → 本次必须存在**同 `content_id` 且 `content_origin=model_completed`** 的 update；
2. 反向：每条 `model_completed` update → 必须有对应 completion；
3. completion 的 `content_id` 本次内**不重复**；
4. `human_confirmation_status` **恒 `pending`**，不得写 `confirmed` 或其他值。

**不硬造**：普通文字组织、标题改写、推理表述**不建** completion；只有**模型补齐了材料中没有的技术内容**才建，并同时写对应 `model_completed` update。无此类技术补齐时 `updates=[]` 与 `model_completions=[]` **同时为空是合法的**。

**空数组不等于不待确认**：当前装配先克隆上一节点快照再向后追加，本轮 completion 只**追加**、不替换既有项，最终 `deliverable_status` 按**累计** `snapshot.model_completions.length` 判定，包含此前节点继承下来的补齐。因此本轮两个数组为空只表示**本轮没有新补齐登记**，**不保证**不会得到 `model_completed_pending_confirmation`；也**不得**以清空继承补齐、补假确认或伪造状态来规避该状态。

### 3.5 五章职责（R19-F03）

Host 最终唯一累计主文件固定五章（顺序固定）：

| 二级标题 | 内容来源 | 模型职责 |
|---|---|---|
| `文档信息` | Host `render()` **实际**渲染的固定 metadata：`business_version`、`node_id`、`workflow_run_uid`、`generated_at`（带时区）、`filename`、`upstream_run_uid`、`upstream_filename`、`upstream_file_sha256`、`workflow_status`、`deliverable_status` | **不写** |
| `核心结论` | `summary` | 只写 summary 文本 |
| `核心结果` | `core_result_markdown` | 只写业务内容（可用三级小节） |
| `下游读取区` | Host：完整当前快照 `snapshot`（contents / tables / terms_master / warnings / model_completions / **input_history** / manual_edit_manifest 等） | 通过五个结构化字段提供，**不自己拼** |
| `风险与待确认事项` | Host：`snapshot.warnings` | 通过各条 `problem`/`affected_content`/`deliverable_impact`/`recommended_action` 表达 |

- **「文档信息」不含全部输入身份**：上面列的是当前 `render()` 实际渲染的字段集。运行 UID 的**短码**只出现在 `filename` 末段，不是独立字段；**全部输入的 ID / 来源 / 哈希 / 状态**（每一件输入一条 receipt）的实际可读位置是**下游读取区**里的 `snapshot.input_history[*].inputs`，以及 `snapshot.contents` 中以 `host/<uid>/<nodeId>/input-*` 保留的逐件正文条目。F26 期望的「文档信息」内容更宽（含派生短码等），属**目标描述**，**不声称**当前 metadata 已完整显示；模型**不需要**补写 Host 元数据，也**不新增** wire。

- **返工五含义的落点**：`recommended_rework_flow` / `affected_content` / `reason` / `recommended_action` / `expected_improvement` 写成 `core_result_markdown` 内**三级小节「人工返工建议」**的文字记录，或写进既有 `warnings[].recommended_action`（配 `problem`/`affected_content`/`deliverable_impact`）。**禁止**当顶层字段输出、**禁止**给 warnings 增属性、**禁止**新增状态 wire。
- **双状态由 Host 判（按累计快照）**：`workflow_status` 看**累计** `snapshot.warnings` 里是否有 `status=open`（含继承警示）→ `completed_with_warnings`；`deliverable_status` 看**累计** `snapshot.model_completions.length`（含继承补齐）→ `model_completed_pending_confirmation`，否则看开放警示 → `ready_with_warnings`，再无则 `ready`。当前 Host **没有**把重大风险映射到 `not_recommended_for_filing` 的算法。因此本候选**不声称**已实现 F26 的重大风险交付优先级：F26 的双状态语义与风险优先序只作**业务解释**与 `deliverable_impact` 的**影响建议**。
- **业务建议 ≠ 完成保证**：本 Skill 的风险判断与建议是编辑口径，与 Host 的状态算法不是同一件事。

### 3.6 T1–T6 职责（照此映射，不改）

| 表 | 名称 | 必备列要点 |
|---|---|---|
| T1 | 技术问题表 | `tp_id`、技术对象/场景、现有缺陷、原因或机理、改进目标、指标/测量方法、来源状态 |
| T2 | 完整技术要素表 | `solution_id`/`macro_id`/`feature_id`、关联 `tp_id`、元实体、元关系、元手段、元功能、元效果、必要性、来源状态 |
| T3 | 技术效果及证据表 | `te_id`、关联 `tp_id`、关联特征、作用机理、成立条件和边界、指标/测量方法、证据状态 |
| T4 | 权利要求—说明书支持表 | 权项号/特征序号、`feature_id`、说明书支持（段落/实施例/附图/表格）、技术作用、概括层级、支持结论 |
| T5 | 创造性论证表 | 权利要求、最接近现有技术候选（含置信度与人工判断状态）、区别特征或组合、效果、实际解决的技术问题、技术启示分析、结论强度 |
| T6 | 修改依据表 | 修改对象、修改前后、原申请依据、技术理由、超范围检查、处理建议 |

**T4 的两层区分（不得混写）**：

- `说明书支持` 列**只有实际取得说明书位置**时才可作现有定位；尚无说明书时写「**待 Flow-2-7 建立**」，并列当前交底依据与预期支持内容。
- `支持结论` 列必须写明这是**当前交底/已有材料的初检**，**不等于**未来说明书已经支持。
- **不造段号、不造实施例编号、不造图像核验**；T5/T6 未到生产节点时保持 `not_yet_generated`，不提前制造创造性表或正式修改依据表。

### 3.7 T4 的 `feature_id` 稳定追踪（F26 §1.3／§1.6，0.1.3 补强）

F26 §1.3 要求保留 `feature_id`，原 ID 缺失/冲突或确需修订时记录旧值、新值、原因、节点及影响；§1.6 的矩阵必备列要求 `feature_id` **对应 T2 稳定技术要素，新建或缺失按 §1.3 登记**。本节把这两句落成可逐条检查的输出结构，**不新增业务输入、不新增第七字段以外的字段**。

#### 3.7.1 两个 ID 不是一件事（不得互换）

| 维度 | `feature_id`（稳定身份） | `row_id`（表行定位） |
|---|---|---|
| 含义 | F26 §1.3 的稳定技术要素身份，可跨轮、跨表被引用 | 表行的装配/替换定位（`替换：Tn/<row_id>` 用的就是它） |
| 来源 | 上游累计值继承，或本轮按 §1.3 有据新建并登记 | 本轮生成，随表重建可重新生成 |
| 可否变动 | **不得静默改号**；确需修订按 §1.3 记旧值/新值/原因/节点/影响 | 可随重建变化，**不承载技术身份** |
| 禁止用法 | 拿表行 `row_id`、术语名、裸序号或「特征N」当 `feature_id` | 拿 `feature_id` 当 `row_id` 去写替换指令 |

一个 `feature_id` **可以**出现在多行（同一特征被多项权项引用）；一个 T4/T2 行只承载**一个** `feature_id`。二者混用即为追踪缺陷。

#### 3.7.2 正向输出结构（四段，缺一段即未成立）

本轮被 T4 或权项矩阵引用的**每一个** `feature_id`，都必须让读者按下列四段读出：

1. **ID**：实际引用值（不是「某个特征」这类指代）。
2. **锚点位置**：在**累计** T2 中按**同一 `feature_id` 值**查到的行 → 写该 T2 的 `row_id` ＋ 该行来源状态；查不到则写**按 §1.3 登记的位置**（3.7.3 分支 C）。
3. **来源/依据与状态**：该 T2 行的实际来源（`source_input_id` / `source_locator` / `source_hash`，或历史继承标注）与 `trust_status`。**原样抄，不升级**；`reasoned_inference` 不得写成 `source_fact`。
4. **对本轮矩阵/下游的影响**：该 ID 出现在哪条权项/哪个从权路径、是否影响支持结论与回退覆盖，以及缺失时对下游的具体影响。

四段写在**既有落点**里（3.7.4），不另建表、不新增字段。

#### 3.7.3 三分支处置（不强制重建 T1—T3，不设停止门）

| 分支 | 触发条件 | 本轮动作 | 禁止 |
|---|---|---|---|
| **A 已有对应** | 累计 T2 中已有同值 `feature_id` 行 | 沿用原值；T4 指向该 T2 `row_id`；来源状态原样抄 | 重编号、改来源状态、把旧行当本轮新事实 |
| **B 有据新增** | 当前材料**足以识别**该特征（有锚点、有来源、有技术问题关联） | 在既有 `tables.T2` 给出**有据行**（`feature_id`、关联 `tp_id`、元实体/元关系/元手段/元功能/元效果、必要性、来源状态），再在 T4 引用**同一值**；按分析/推理标 `content_origin` 与 `trust_status` | 把补表当「新增结构」；伪造实体、参数、实验或已确认状态 |
| **C 无法确认** | T2 无对应、ID 原不存在、或对不上 | 按 §1.3 登记：旧值（确无则写「无」）、新值**或**「暂不新建」的处置、原因、Flow 节点、影响、待补指向 | 声称追踪已闭合；把缺 T2 一律设为**停止生成门**；用裸 ID 充数 |

- 分支 B、C 都是 F26 **原有允许路径**，不得被「所有 ID 必须先有完整 T2 行」这种更严的新门替代。
- 材料不足时仍输出**受限草稿 + 精确缺项**，不因缺一条 T2 就拒答。
- 本轮不要求把 T1/T2/T3 从零重建；只处理**本轮实际引用**的这些 ID。

#### 3.7.4 登记在哪（既有七字段内，准确互引）

三处任选其一，或互相引到位（引不到位即视为未登记）：

| 落点 | 写法 |
|---|---|
| `tables.T4` 行 `data` | 在既有「权项号/特征序号」「`feature_id`」「来源/支持依据」列内写锚点或「按 §1.3 登记见 …」的互引文本；**不加列、不加字段** |
| `core_result_markdown` 三级小节 **「稳定特征追踪」** | 逐 ID 四段式一行；与本轮矩阵/方向表互引；不重复外层五章 |
| `warnings[]` | `problem` 写缺什么、`affected_content` 写受影响权项/路径、`deliverable_impact` 写对交付的影响、`recommended_action` 写人工下一步；`status` 恒 `open` |

**不新增**：第八顶层字段、schema 变更、调试字段、运行器、自动补表/确认/删除脚本、自动校验或回流 wire。`references/output-schema.json` 仍是**只读派生**，本版不改它。

#### 3.7.5 边界

- Host 结构检查**不承担**技术实体真实性/专业支持性判定；本节只保证「ID 能被追到锚点或登记」。
- 本节是**生成指引与表达结构**，不产出专业结论，也不代替独立审计。
- 继承、合法替换、警示状态与范围 1 的删除限制继续按 §2.1、§3.2—§3.4 执行。

## 4 当前来源字节态（R03-F01 勘误：不再写成「无原字节」）

采集批次 `SOURCE_CAPTURE_R02`（冻结 `2026-10-26T13:47:36.158069+00:00`，29 成员，清单 9454 字节 sha256 `8246f5c5cd0dc98916ebb944550bb3f91dcc9f29e24feb142d563838b37502a3`，独立审计 28430 字节 sha256 `5944a1e4c0610acecc4d90c32f455b6ac5a0ab1df3280a744c9070feb88fddd4`）。

| 用途 | 文件 | bytes | sha256 |
|---|---|---|---|
| 著作权法（CR）国家版权局原实体 | `source-capture-R02/ncac-copyright2020.response.bin` | 122716 | `e27fccf5c3a0f29439d7e165f09e4e3d148ac301c16f71d0210339c175cca4f3` |
| 同上 decoded | `source-capture-R02/ncac-copyright2020.decoded.html` | 122716 | `e27fccf5c3a0f29439d7e165f09e4e3d148ac301c16f71d0210339c175cca4f3` |
| 著作权法（CR）政府网原实体 | `source-capture-R02/gov-copyright2020.response.bin` | 73600 | `1b77ff9031c099463c9dcd2f8b8f91ccc4e07c6406381cd11b04edc24426d83c` |
| 84 号令原实体（gzip） | `source-capture-R02/cnipa-order84.response.bin` | 15243 | `8b677557e955d47723237912b29f10abcdc907e0d27583497cd81035ac0972df` |
| 84 号令 decoded HTML | `source-capture-R02/cnipa-order84.decoded.html` | 59658 | `4a48579c77f8125757d26bbd5e480c15afceb604e17fe6947032782ae418d157` |
| 84 号令修改对照附件（官方） | `source-capture-R02/cnipa-order84-comparison.pdf` | 655791 | `d7ed04b433d993e9278fd838e01a56e24fa4c84ef378001575f79c2917a3c4bd` |
| 审查指南官方附件（2025 修订） | `source-capture-R02/cnipa-guide2025.pdf` | 4755128 | `b3ff7f907ffc1d52c08d610f63129df2689b98bbba3f4beacb333a7eb6694e7a` |
| 细则官方网页（北京局）原实体 | `source-capture-R02/beijing-rules2023.response.bin` | 144243 | `4ecc67f1f9f4a5fb1aab791c2f527aaefe5bd856c31fa2520c3e07000e714f61` |
| 采集收据（三份） | `source-capture-R02/acquisition-receipts.json` | 4717 | `936ca5185e9d899415a62ea4c3d813b5cc9e2a2f4f30e2f5b91e1529be7eb4d7` |
| 同上 | `source-capture-R02/attachment-acquisition-receipts.json` | 4022 | `6dd3f543817b12e3aeec19a91c73f7660621ee7997bde1afa152deeedb2abd1b` |
| 同上 | `source-capture-R02/beijing-acquisition-receipt.json` | 1177 | `cb0319763b5ca299f98107cdc6581d93ff832315fc6a3ac2f9330a6c22509181` |

口径（必须照此，不得笼统）：

- **已固定**：指南官方附件、84 号令原实体与 decoded、84 号令修改对照附件、著作权法三源原实体、细则官方网页原实体及其收据。→ 当前证据态写 `BYTES_FIXED`。
- **仍未固定**：专利法 2020 修正版**施行日**的外部核证（不在 R02 采集范围）；逐条语义与阶段适用也**不因字节固定而自动通过**。
- 历史字段（14B 的 43 条引文性质、`C-CR-5` 当时「无本地原字节」）**保持原样不回写**——历史与当前分栏，不互相改写。

## 5 六载体与旧 UID

- 六载体：`CLM` / `CHAIN` / `TMPL` / `CLAIM_FAILURES` / `BODY` / `DX06`——来源「不清楚」、许可 `PENDING`，**正文零字节**进载荷。
- 20 个旧 UID：18 个六载体全部 `EXCLUDE_FROM_PAYLOAD`（只作历史元数据）；2 个 MIT（`KO-CNWRITE-…L00050` `INCLUDE_WITH_MIT_NOTICE`、`KO-CNWRITE-…L00003` `INCLUDE_FOR_N03_EXISTING_SCOPE_ONLY`）。
- `L00003` 的**原 N03 采用关系不变**；本候选对 N01/N02 的引用是**明列的新候选用途**，不静默升级为「已采用」。
- 「历史保留」≠「复制许可」；不得把旧载体正文、方法表达、风险等级或评分搬进输出。
- 六载体 UID **不得**出现在任何 MIT 片段列（含 `mit_fragments` / `mit` / 拟用位置）——混列等于暗示可再分发。

## 6 MIT 通知与随包用途

- LICENSE：`2、源知识库/13、开源参考项目/cn-patent-drafting/LICENSE`，1090 字节，sha256 `010444fa8759a89fc9b6c9d90ecbd331075f75a487fa09dc6802627f9e12c83d`，记录提交 `9be95a93c096d682f1a72613725cda990c2ef594`。
- 完整通知见 `../THIRD-PARTY-NOTICE.md`（围栏内 LICENSE 全文**逐字节**保留 1090 字节；7 片段坐标与拟用位置）。CAND-CNWRITE-03 **按用途分别对应准确行**、不共用一行：必要/可选文体 **L164**、无支持程度词 **L165**、工具/仓库与「自检」「由AI生成」禁语 **L168**；片段整体区间 162—168。
- LICENSE 文件为 21 处真实 CRLF；**不得**因显示转义而改编码、重排或重建——本版该文件与 0.1.0 逐字节相同。
- 允许：复制 / 改写 / 随包分发——**均须随附通知**。
- 不允许推及：六载体内容、法律正确性证明、专利实施权、排版与商标。

## 7 四项具名编辑约束的源绑定（R19-F06）

- 源表：`oiw-source:40385b9b216d027fc498`，**1350831 字节**，sha256 `8892f8a69ff45e3d99bb829b45ede7e1bd5456b0a8b5e89ddc5070bcc9c38355`（顶层是数组，下列 pointer 为数组下标）。
- 四项共同属性：`editorial_id_not_native_rule=true`、`supersedes_entire_prior_card=false`、`professional_acceptance=NOT_EXECUTED`。它们是**编辑约束**，不是原生法规版本，**不**整体替代原卡，**不**私补成原生可执行定义。

| pointer | ID | 源 `current_status`（原样） | 实际落点 |
|---|---|---|---|
| `/71` | `CUR-F08-FACT` | `INVALIDATED_NAMED_FACTS` | `SKILL.md` §0.1 第 1 行 |
| `/72` | `CUR-F08-POLICY` | `WITHDRAWN_PENDING_REVIEW` | `SKILL.md` §0.1 第 2 行 |
| `/73` | `CUR-ROW163` | `POSITIVE_FACT_FOUND_SCOPE_GATED` | `SKILL.md` §0.1 第 3 行 |
| `/76` | `CUR-FLOW-CHECKLIST` | `SCOPED_CONTRACT_PRIORITY` | `SKILL.md` §0.1 第 4 行 |

- `/76` 另有 `original_basis_uids=["KO-FLOW-a0de1ecd22a7-L00066"]`；其余三项 `original_basis_uids=[]`。
- **只读边界**：只提取这四处的 `conclusion` / `current_status` / `affected_tasks` / `supersedes_entire_prior_card` / `editorial_id_not_native_rule` / `evidence_files`；未取得定义的其它对象**不私补**，也不据此新设制作前置或执行未决依赖。
- 独立未决引用 `RULE-08-12-001-v1.1` 与此四项无关：`definition_resolved=false`，只作限定引用，**不执行**，不用近名条文补定义。

## 8 派生 wire 与规则效力状态（R19-F07）

| 项 | 状态 | 说明 |
|---|---|---|
| `m06-production-wire-contract-R01.json` | `kind = READONLY_DERIVED_EXACT_EXISTING_HOST_CONTRACT_NOT_NEW_RESOURCE_OR_RUNTIME`；`formally_effective = null`（**不适用**：它不是获得正式生效批准的规则，而是**现有 Host 结构/合同的精确导出**）；`provenance = DERIVED_FROM_EXISTING_HOST_CODE_AND_CONTRACT` | 技术约束仍然**权威且精确**：八输入、七字段、`additionalProperties=false`、T1–T6、各数组上限、常量值均按它执行；去掉「正式生效」误标**不放松**任何技术约束 |
| `target-specifications/M06.json` | `rule_reference` 指向 F26；本身不是规则效力声明 | 仅作目标规格绑定 |
| F26 V0.1.9 | `approved_for_trial=true`、`formally_effective=false`，UID/hash 见 §1 | **本候选不改变**其试行/非正式状态；也不据本候选把它升为生效 |
| 本候选（0.1.1） | `CONTROLLED_BUSINESS_SKILL_CANDIDATE_NOT_NATIVE_SKILL_NOT_FORMAL` | 候选、未安装、未注册、未发布、未获专业/用户接受 |

## 9 明确不做的输出

- 不写「已检测技术事实」「已同步正文表行」「已完成结构删除」——范围 2 未实现。
- 不写「已获专业接受」「用户已确认」「已发布」「已正式采用」「已通过独立审计」。
- 不把核心文字修改说成正文表行全同步；表行是否同步由 Host 装配机制决定，不由本 Skill 声明。
- 不写运行 UID、真实文件名、生成时间、双状态等 Host 元数据。
- 不引用评估答案、测试 rubric 或他人答案；本候选不据此定制，也不读取 skill-behavior-evaluation 任何文件。
