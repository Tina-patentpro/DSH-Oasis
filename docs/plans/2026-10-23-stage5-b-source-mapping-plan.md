## 2026-10-23 B批执行记录

用户“同意执行下一批”后执行本计划；此前规划文字及未勾选框原字节保留于下方，当前结果以本段和[收口报告](../evidence/2026-10-23-stage5-b-source-mapping-closeout.md)为准。用户新提供的AGENTS规则已生效，覆盖下方“旧AGENTS已撤销”历史约束；单代理实施和作者复审，没有独立新上下文复审。B完成仅限离线证据及校验，C/E及真实执行未启动。

### B1实得结果

- [x] 冻结HEAD、Git状态及3318个已有文件哈希。
- [x] 冻结14节点三段资源顺序/指纹和旧0.2.2身份，不替换旧资源。
- [x] 逐节点登记136输入ID、通道、单项边界及待核实API映射。
- [x] 28格均有证据或明确缺口；14个API格缺坐标/schema/归属，保留null及禁用。
- [x] 输出C的新版Flow-2-6静态合同、E的补证需求及全部阻塞边界。

### B2实得结果

- [x] 先见缺功能1红及未实现45红，未将导入异常冒充业务红测。
- [x] 最终46项正式回归覆盖结构、资源、通道、映射变化、URL正文、归属、启用声明及路径；旁置撤去比较后35项实际业务拒绝用例变红。
- [x] 完成单次离线校验；只读明确白名单，入口非清单文件也在读取前拒绝，无网络/资源执行。
- [x] 受影响365项通过；自查入口补修正式1红后最终46/46和全量1135/1135通过。
- [x] 未改包内src/lib/资源或发布白名单，按计划不重复构建/pack，不改活跃lib。
- [x] 依据最新单代理规则调整为作者只读复审，明确没有独立新上下文背书；入口遗漏已补正式红绿，旧保护对象保持。
- [x] 收口台账/测试/缺口及状态；不进入C/D/E/F/G/H。没有Desktop/实际DSH或真实模型/API调用、依赖/Profile/pin/提交发布变更。

---

# 阶段5 B批：14节点来源证据与映射冻结 Implementation Plan

> **For agentic workers:** 后续获执行指令后使用superpowers:executing-plans，工程校验遵循test-driven-development，交付前verification-before-completion。本轮仅制定计划；下列复选框均未执行，不自动启动实现或调用。

**Goal:** 形成14节点×2来源的可追溯离线证据与缺口清单，使C/E知道哪些本地资源或API映射可继续、哪些必须保持禁用。

**Architecture:** 复用当前V3.4.0原文、固定资源包、catalog、旧首模板资源与现有API文档；新增文档台账和单一离线校验器，不接入生产运行或替换旧资源。映射核对完整与来源可真实执行分开记录，所有生产source.enabled及dispatchEnabled保持false。

**Tech Stack:** 当前固定Node24.21.0和已有依赖、ES modules、node:test；不新增依赖、不启动服务器。

**Spec:** `docs/business-baseline/14节点清单V3.4.0.md`（SHA256 `a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6`）、`docs/plans/2026-10-23-stage5-follow-up-plan.md` B节、`docs/evidence/2026-10-23-stage5-progress-and-remaining.md`。

## Global Constraints

- 当前为规划授权，执行B需后续明确执行指令；不把本计划变为C/E接线许可。
- 不启动Desktop/实际DSH、浏览器/loopback，不登录、联网探测目录/schema、上传、真实模型/API、计费或发送。
- 只读本仓库明确路径及清单所列资源；缺服务坐标记录缺口，不扩展生产/用户目录扫描，不猜最新版本/服务ID/账户。
- 不安装/升级依赖，不改Profile/pin/准入、活跃lib、历史资源/记录/unknown/审核/保存/FAIL，不提交推送发布。
- 文件1MiB、材料合计2MiB、输入快照2MiB、Workspace8MiB、引用150000字符和旧数据兼容保持；B不修改容量常量。
- 当前store `c0e6251f4129d8b6ea1639c84d9f7a00adf336d55868295b7ad4685fdab55cfe`及原正式16/16/28为起点保护对象；执行时重新冻结，而非假设工作区没有其他改动。
- 旧AGENTS已撤销，不读取或恢复；沿用当前dsh-lab功能工作区与既有保全方式。

## Review Focus

1. 同名Flow-2-6旧0.2.2资源不能冒充V3.4.0；B1独立列版本/指纹，B2拒绝错误归属。
2. 一个输入ID只能对应一项明确文件/文本，user_input不能被拼接成材料；B1逐ID登记，B2核验唯一性和通道。
3. 服务名或旧endpoint不等于部署/schema/账户项目证据；B1记录null与gap，B2拒绝虚构runtime-ready/启用标志。
4. 必需字段新增、schema/资源漂移、结果仅URL无正文不能继续声明无损映射；B2以冻结本地变体做拒绝/缺口回归。
5. 台账变化不得启动真实运行、改旧pin或迁移历史记录；B2检查禁用状态及保护对象hash，交接只输出下一批输入。

## 预期文件与证据来源

新增交付：

- `docs/business-baseline/v340-source-mapping.md`：人工可读14节点双来源表、缺口及C/E交接。
- `docs/business-baseline/v340-source-mapping.json`：同一台账的机器可校验冻结记录，不被生产catalog导入。
- `scripts/check-v340-source-mapping.mjs`：单次离线核验CLI及导出函数，不建立常驻审计服务/通用工作流平台。
- `packages/oasis-professional-service/test/v340-source-mapping.test.mjs`：实际核验器与冻结资源的正式回归，不以源代码grep替代行为。
- `docs/evidence/2026-10-23-stage5-b-source-mapping-closeout.md`：仅在B执行完成后创建，记录实得hash/测试/缺口；本轮不生成“已完成”占位报告。

明确只读来源：

- `packages/oasis-professional-service/src/v340-contracts.json`，当前pin `6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761`；`v340-catalog.js`的common→node.instruction→tables装配顺序。
- `src/builtin-skills/flow-2-6/0.2.2/manifest.json`及该manifest明确列出的资源、`src/builtin-skill-loader.js`；旧资源只作历史对照，不直接改名。
- `packages/oasis-professional-service/docs/api/oasis-professional-service-baseline.json`（本次只读SHA256 `01051469cfb66bf829e4fb18ac71a80f7401444ec89b5fbfe1c92b366fa0b6a8`）、`src/oasis-api-contract.js`、`src/oasis-workspace-binding.js`、现有脱敏测试fixture。引用这些文档不等于查询线上服务。

上述src相对路径均在业务包内。未列出的外部资源如确需加入，先给精确路径和用途，不主动扫描。

## Task B1：冻结14节点双来源证据与缺口

**Files:** 新建上述.md与.json，不改v340-contracts.json/catalog/旧资源。

**Interfaces:** JSON含businessVersion、原文/资源包hash及nodes；每节点含nodeId、输入ID/通道/单项边界、本地资源顺序/path/hash和装配hash、API服务/方法/路径/inputs/结果映射/schema指纹/项目归属证据、证据path/hash/date/scope、gaps、dispatchEnabled=false、realCallVerified=false。缺失坐标用null，不用伪ID；区分静态原文、历史合同、脱敏fixture、待核实，不写实际密钥或凭据。

预期完整ID集合：Flow-1-1、1-2、1-3、1-4、1-5、2-6、2-7、3-8、3-9、3-10、4-11、4-12、5-13、6-14；均使用完整Flow-前缀。14节点×2来源共28格必须逐格有证据或明确gap，不要求虚构28个可执行能力。

- [ ] 冻结执行起点HEAD/已有改动/保护文件hash，读取明确原文与当前包，核验14行集合和版本。
- [ ] 按节点登记共同规则、专属指令、表合同的实际装配顺序及hash；另列旧2-6/0.2.2差异与缺口。
- [ ] 逐输入ID登记文件/文本/配置/user_input与可能的API inputs映射，无法无损映射写gap；一输入不拆成多份不明材料。
- [ ] 逐节点登记当前已有API证据及范围；没有服务/schema/账户归属时保持null和禁用，不联网补查。
- [ ] 汇总缺失服务坐标/脱敏schema/项目归属证据的一次性需求清单，输出C可用本地资源合同及E可回放候选/阻塞；未具备项明确“不进入接线”。

**Expected:** 14行、28来源格均可追溯；可完整离线映射和真实可执行不混用；不启用任何来源。

## Task B2：离线校验、正式回归及复审交接

**Files:** 新建CLI与正式测试；B1台账在发现缺口时作有记录的补充，不修改旧原文/pin或生产路由。

**Interfaces:** `verifyV340SourceMapping({manifestPath,repoRoot})`只读取显式manifest与允许的仓库资源，返回businessVersion/nodeCount/sourceCellCount/gaps及false的dispatchEnabled/realCallVerified；结构、hash、归属/通道或启用声明错误时拒绝。缺API证据但如实记gap为有效BLOCKED条目，不为填满表发请求。

- [ ] 先写正式失败回归，调用实际校验器，固定“14行有效离线但全部禁用”的正向合同；缺失实现阶段与业务拒绝阶段证据分别记录，不把导入失败冒充业务红测。
- [ ] 覆盖缺节点/重复节点、旧版冒用、资源顺序或hash漂移、重复输入/错误通道、必需API字段新增或schema变化、仅URL无正文、无项目证据却宣称就绪、任意enabled/realCallVerified=true的拒绝；未知坐标如实gap则应通过并保留gap。
- [ ] 实现一次性离线校验器，路径只允许明确仓库资源，拒绝越界/重定向，不读凭据、不输出资源全文、不调用HTTP或执行资源指令。
- [ ] 定点正式回归通过后，重跑受影响v340-workflow/preparation/runtime/legacy、binding/API合同；涉及集成代码时按固定fixture执行一次正式全量，记录实际数量，不预设仍为1089。
- [ ] 如有包内src/lib或包资源变化，使用明确旁置out-dir及候选合同/离线pack核验，记录实际成员数；不得运行会写活跃lib的无参数verify。纯根文档/脚本变更则说明未改运行包，不为凑数重复构建。
- [ ] 执行一次新上下文只读复审：检查映射语义证据是否与机械hash核对区分；发现重要问题先正式红绿补修；旧资源、unknown、审核/保存、原16/16/28保持。
- [ ] 收口写入实际台账/保护hash/测试和缺口，更新阶段状态；不把B完成改成C/E/F/G完成。交付即停，等待后续批次执行指令。

未来定点命令（本轮未运行）：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/v340-source-mapping.test.mjs packages/oasis-professional-service/test/v340-workflow.test.mjs packages/oasis-professional-service/test/v340-preparation.test.mjs packages/oasis-professional-service/test/oasis-workspace-binding.test.mjs
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs
tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json
```

## 退出条件、阻塞处理与下一步

B完成只意味着本地证据与缺口清单、离线校验及复审完成。缺失API实际坐标不会阻塞如实交付清单，但会阻塞对应E适配。若本地专属资源也不够，阻塞对应C节点，不给假支持标记。

首个后续建议是基于B明确可用的Flow-2-6资源实施C的禁用适配候选；E仅进入已有完整证据的节点，D依赖/格式路线另定。F需配对候选及单独Desktop启动授权；G需逐组真实调用与外传/预算授权；H及阶段6仍后置。本计划没有这些执行许可。

本计划自检：14节点、两来源、单项输入、T1–T6/警示/来源、旧2-6版本区别、API证据边界、非文本与真实验收剩余项均保留；本轮没有执行任何B复选框，也不需要现在提供真实账户或启动Desktop。
