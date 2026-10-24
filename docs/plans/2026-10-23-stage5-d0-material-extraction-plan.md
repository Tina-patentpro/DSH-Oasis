## 2026-10-24 D0执行记录：已核对/冻结，D1 BLOCKED

- [x] 核对主包/锁、固定工具与本地候选版本/路径/hash/许可；主包没有解析依赖，Codex附带库单列。
- [x] 公开合成PDF/DOCX功能烟测8/8；固定3.14读取PDF通过、DOCX因lxml CPython3.12 ABI实际失败；textutil无结构定位，不作部署替代。
- [x] 冻结原/提取hash、UTF-16定位、Host证据/确认、有限容量目标及新编码与旧v1兼容合同；3个单流边界及5组例子/旧读者核对通过。
- [x] 形成D1解阻与接线计划并做单代理作者复审，明确部署/ABI/完整资源机制未就绪，D1为BLOCKED。
- [ ] D1准入前仍须取得产品运行时/原始分发件/闭包/许可与实际冻结装配，以及完整限额/预检执行依据。目标数值不是已通过的产品保护，D0收口不等于D完成。

交付：[候选核对](../business-baseline/v340-material-extraction-candidates.md)、[冻结合同](../business-baseline/v340-material-extraction-contract.md)、[D1计划](2026-10-23-stage5-d1-material-extraction-plan.md)、[执行及复审](../evidence/2026-10-23-stage5-d0-material-extraction-closeout.md)。执行跨2026-10-23—24，原计划/证据目录命名保持；没有安装、生产接线、Desktop或真实调用。下方原计划全文原字节保留，原“未执行”是制定时记录。

---

# 阶段5 D0：非文本材料解析可行性与合同冻结 Implementation Plan

> **For agentic workers:** 后续取得执行指令后，按项目单代理规则使用superpowers:executing-plans执行本计划；结论前使用verification-before-completion。本轮只制定计划，全部待办未执行。不启用子代理、不提交Git；不自动进入D1。

**Goal:** 为可提取文本的PDF/DOCX确定可部署的离线解析路径、输入与证据合同、具体资源限额及D1实施准入结论，避免仅凭扩展名或本机工具声称产品已支持。

**Architecture:** 延用Workspace安全读取及单项输入，先绑定原二进制再提取文本，进入同一冻结输入和确认摘要。保留旧md/txt路径与完整/values-v1编码；新材料必须分别保存原文件身份与提取文本身份，不以原文件hash冒充文本hash。D0不接入产品、不开放来源。

**Tech Stack:** 当前固定Node24.21.0、pnpm11.8.0、DSH0.2.0-rc.2、Cordis4.0.4、zod4.4.3。解析器及其版本尚未选定；主包manifest/lock没有已声明的PDF/DOCX解析依赖，不能自动安装补齐。

**Spec:** [14节点原文](../business-baseline/14节点清单V3.4.0.md)、[原A—H计划D节](2026-10-23-stage5-follow-up-plan.md)、[最新完成/剩余清单](../evidence/2026-10-23-stage5-progress-and-remaining.md)、[C围栏修复全面复审](../evidence/2026-10-23-stage5-c-fence-reaudit.md)。本计划是D的前置切片，PDF/DOCX接线、OCR及其它非文本目标不因拆批删除。

## Global Constraints

- 本轮仅写计划；执行D0也不启动Desktop/实际DSH，不新增真实模型/API、网络、上传、登录或费用。
- 不安装/升级依赖、改manifest/lock/pin/Profile/活跃lib、日常HOME或全局PATH，不提交/推送/发布。确需新依赖时，先完成具体版本、来源、部署、许可及影响清单，保留阻塞结论。
- 维持文稿1MiB、单个现有文本读取1MiB、材料合计2MiB、输入快照2MiB、Workspace记录8MiB、模型/普通字段300000字符及固定引用150000字符。二进制、解包和解析工作集是不同预算；不能沿用某个数字而声称已保护所有层。
- 保留B原文/台账/资源hash及全部来源禁用，旧v1、synthetic、完整/values-v1、草稿/unknown/审核/保存/FAIL原字节，不重算旧摘要迁移。
- 一个文件ID一份文件；upstream_md_file仍是唯一实际累计Markdown，不扩展为PDF/DOCX。user_input仍是用户手动指令，不作为材料或由模型补造。
- 不扩展为通用解析服务、Provider框架、Agent循环、云OCR或新增UI设计。需要新设计或依赖时，以具体可审材料交接，不能用“继续阶段5”推定允许改变固定组合。

## Review Focus

1. 同名/同hash跨项目、父目录重定向、A→B→A、解析中移出或换文件：始终绑定已接受字节与Workspace身份，禁止解析器自行按原路径重读。
2. PDF有文字但仅部分页可提取、扫描混合页、缺字体映射、DOCX表格/页眉/脚注/修订：必须声明读取范围和局限，不能以非空字符串冒充完整正文。
3. ZIP/XML解包爆炸、加密/损坏文件、嵌入对象/宏、外部关系/远程资源：不执行或联网，限额前置，失败不返回可提交的部分正文。
4. 原二进制hash与提取文本hash、解析器/策略指纹、定位和确认失效：各自有明确含义，旧user_file来源校验不能被错误替换。
5. 提取文本合法但共同字段/文稿/快照/记录超限，或只在当前机器工具齐全：明确拒绝/未支持，保留原草稿与证据，不能借本机环境冒充包部署能力。

## D0交付文件

只新增文档，更新当前状态索引；不改运行src/test或B冻结台账。

| 文件 | 内容 |
|---|---|
| `docs/business-baseline/v340-material-extraction-candidates.md` | 只读本地候选清单、实际路径/版本/hash、包内与外部工具区别、部署/许可/依赖影响、可行/阻塞结论 |
| `docs/business-baseline/v340-material-extraction-contract.md` | 格式范围、单项输入、读取/提取证据、字段/hash含义、限额、失败语义及兼容决定 |
| `docs/plans/2026-10-23-stage5-d1-material-extraction-plan.md` | 基于已选方案的精确模块/接口、正式红绿用例、包验证和退出条件；方案未就绪则只写阻塞及解阻材料，不伪造可执行设计 |
| `docs/evidence/2026-10-23-stage5-d0-material-extraction-closeout.md` | 本轮实际证据/未执行项、作者复审、D1 GO或BLOCKED；D0完成不等于D完成 |

## Task D0-1：核对可部署的离线解析路径

**只读入口：** `packages/oasis-professional-service/package.json`、同目录`pnpm-lock.yaml`和已解析依赖元数据；`tools`中明确已登记的工具清单/封装；`src/workspace-materials.js`、`src/v340-preparation.js`。不扫描用户文档或凭据目录。

**产出：** 候选文档中每个PDF/DOCX方案给出`available/blocked`及理由；可用声明必须同时覆盖解析功能与产品安装/部署，不以Codex运行环境自带库替代产品依赖。

- [ ] 核对固定版本、HEAD、已有修改和保护文件摘要，读取最新复审及D0约束。
- [ ] 记录实际找到的候选版本、来源路径、sha256、平台/依赖/许可和包部署方式；找不到时如实记缺失，不下载或安装。
- [ ] 比较包内离线库与固定离线工具两类可行路径的维护/部署代价；排除云端及运行时自动下载。没有可部署候选则登记阻塞，不强选。
- [ ] 对已具备且无需变更环境的候选，用小型公开合成PDF/DOCX做离线能力核对；如候选不存在，明确未执行，不拿假解析器输出证明真实解析能力。
- [ ] 输出每种格式的支持边界及D1依赖影响；若需要改变固定依赖，交付具体待决定材料后止步。

## Task D0-2：冻结输入、来源和容量合同

**现有接口：** `materialManager.inspect(workspaceId,relativePath,policy)`和`readForUpload(workspaceId,reference,policy)`；`prepareV340Inputs(nodeId,values)`现有文件值为`{filename,body,sha256}`，sha256绑定body。不得将该sha256改成PDF/DOCX原字节hash而继续通过文本来源校验。

**产出：** 合同定义原文件hash、提取文本hash、解析器版本/hash、解析策略指纹、页/段/表格定位、完整性/局限与支持状态的字段及归属；新字段放置、编码及摘要参与规则在D1前选定。名称是合同决定，不能在实施时各层各造一套。

- [ ] 明确只对普通材料文件ID支持可提取文本的PDF/DOCX；upstream_md_file继续只读现有累计Markdown，文件/文本同时提供不互相覆盖。保持accepted/warning/not_provided原语义，合法缺失不变成新增必填；解析失败/不完整不得伪装accepted或已全文提取，用户明确移除/替换材料后仍可按原缺失警示合同继续。
- [ ] 定义从已绑定原字节提取、归一化及逐段定位规则；扫描/混合扫描、加密、损坏、空文本、未支持结构区分，不能用warning掩盖不完整提取后继续提交。
- [ ] 给原二进制大小、累计材料、PDF页数、DOCX条目数/总解压/XML大小、解析时间/工作集、提取文本字符/UTF-8字节及序列化证据分别确定有限数值、单位和失败行为。数值须有候选实现及夹具证据依据；没有依据的项记阻塞，不填Infinity或留给D1猜测。
- [ ] 规定外部关系/实体、脚本/宏/嵌入对象不执行、不远程加载；定位与提取文本必须可审计，超限或不完整时不发布部分结果。
- [ ] 逐项分析原始hash/提取文本/解析器变化如何使确认失效并进入冻结快照；记录2MiB/8MiB额外开销，旧编码与旧回执保持读取和原hash。
- [ ] 将五项Review Focus逐项映射至D1的正式测试矩阵和负责人模块；缺失即D0合同不完整。

## Task D0-3：形成D1实施计划及进入结论

**预计受影响模块（仅D1候选，不在D0修改）：** `workspace-materials.js`、`v340-preparation.js`、`v340-document.js`、`v340-runtime-contract.js`、`v340-runtime-integrity.js`、`v340-native-model.js`及其确认/来源边界；先检查实际需要，再限定最小变化。新增窄解析模块的签名由选定解析器和D0合同确定。

- [ ] 为D1列出明确新建/修改/测试文件及接口签名，覆盖原二进制读取→提取→证据冻结→原生替身实际准入→人工编辑再审保存→相邻交接。
- [ ] 正式回归必须有真实公开二进制夹具、中文/多页/表格等长文本对照、单ID/上下游/来源hash、文件变化及重定向、五类Review Focus、各容量边界和超限保全；不能仅mock解析器后宣称格式已支持。
- [ ] 指定先受影响正式红绿、再集成一次全量及旁置构建/包清单，另有干净副本检查和修复撤回反例；正式数量按实际，不预设达标数量。
- [ ] 以矩阵复核PDF/DOCX各自能否进入D1，允许一种先行、另一种明确阻塞；不得将一种成功记作D整体完成。
- [ ] 输出收口报告并更新状态：`GO`须有选定可部署解析器、具体限额、完整证据合同和D1测试计划；任一缺失为`BLOCKED`，列精确解阻材料。单代理作者复审，不声称独立新上下文验收。

## 验证与停止点

执行D0时只验证实际变更：文档链接、输入ID/通道、manifest/lock及资源hash引用、候选元数据和获准的离线公开夹具核对。若没有生产代码变更，不重复全量/构建或扩建验证工具链。不得为验证D0调用模型/API、启动Desktop或写真实Profile。

D0之后需后续执行指令才进入D1。D1完成仍只是离线输入候选；图片/扫描PDF OCR、压缩包/复杂结构、非文本结果与新增DOCX/PDF导出、专业API实际映射、F宿主、G真实双来源、H/阶段6继续保留。原B台账的历史gap原字节保留，用新增证据交叉引用，不静默改为已验证。
