# 第三批审计修复与复审 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本任务单代理执行；不创建新任务，不自动提交。

**Goal:** 修复第三批正式审计 F1–F5，随后以独立安全断言复审，保护原工作树和历史审计证据。

**Architecture:** 保持现有 API adapter → Host → Domain/RPC → Client → 两阶段回写结构。新增共享 URL 约束、记录 ID 来源约束、完整流水页验证和按 Workspace/page 管理的观察生命周期；不设计新的后端 API，不改支付语义。

**Tech Stack:** Node v22.19.0、pnpm 11.25.0、JavaScript ESM、Zod、React、tsdown、node:test。

---

## 状态卡与执行边界

- 当前阶段：方案，等待明确开始执行；本轮没有修改业务代码或运行有写入的测试。
- 当前验收状态：FAIL；原审计 1 个 P1、4 个 P2 尚未修复，不建议真实联调。
- 当前 HEAD：`3c2bd5a469b67ed4070b0b9beacc30212cd038e3`；暂存区为空；原第三批 24 个跟踪文件改动和历史证据全部保留。
- 本轮只读复核：原审计基线的 2459 个已有文件哈希零变化，权威文档哈希未变；检查命令退出码 0。
- 权威文档：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md
- 文档 SHA-256：`429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`。
- 审计报告：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\audit-report.md
- 未发现项目 AGENTS.md 或 OpenSpec 目录，采用本目标合同与证据台账；不为修复额外安装治理工具。
- `where dsh` 未找到可调用命令；不安装/修改 PATH/启动 Profile。本地修复不依赖该命令，真实 Host 验证仍单独保留。
- 不修改权威 API 文档、既有审计脚本/结果、锁文件、依赖版本、全局 Skill/记忆、Profile、生产配置；不提交或推送。
- 修复证据新建于：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-remediation-2026-09-02
- 复审证据另建于：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02

## 遗漏复盘与范围收敛

原测试覆盖单个正确来源、正常流水结构和正常页面存活路径，未覆盖输入在筛选前的有效性、来源/ID 的一致性、完整 URL 组成部分以及移除后晚到响应。修复测试必须围绕这些不变量，而不是只增加总测试数。

本轮同时关闭直接相关的观察交叉字段校验和停止按钮误导；标准重建产物并更正新台账。历史 Host 存储 artifact 与预览正文等价性缺口单独保留，不扩大为 Domain 存储格式/迁移重构，也不因此宣称真实测试准备已全部完成。没有足够跨项目复发证据且没有用户授权，不修改共享 Skill 或记忆。

## Task 0：建立红绿证据和变更保护

1. 再次只读校验 HEAD、暂存区、权威文档 SHA 和当前 dirty 文件哈希；与本方案核对，有新变化先停止重定范围。
2. 新建修复证据目录，保存修改前基线和限定文件清单；不 reset、restore、stash、stage 或复制覆盖已有第三批改动。
3. 每个 F 项先增加失败测试，确认失败来自缺陷本身，再修改最小业务代码并跑对应测试。保存逐项命令、时间、退出码和输出。
4. 原审计脚本断言的是“缺陷可以复现”，不能直接作为修复后绿色门禁，也不能改成无条件通过；新建断言安全行为的复审用例。

## Task 1：F1——文件 URL 的入口、存储和回写出口一致拒绝不安全组成部分

修改：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-origin-policy.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\writeback-service.js

测试：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-api-contract.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\workbench-v3-contract.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\writeback-service.test.mjs

确定行为：

- 在已有 origin policy 文件增加纯函数文件 URL 校验；允许绝对 HTTP(S)、非生产来源、合法路径；禁止 username/password、非空 query、非空 fragment。adapter 额外保留 downloadOrigins 白名单检查，不把共享 URL 校验误当成白名单。
- 这是插件本批保守安全策略，不声称 API 文档禁止查询参数。签名链接暂不支持；不删参数后伪称有效，不下载文件，不新增配置开关。
- adapter 上传/结果 URL、Domain 上传/结果 URL 字段和回写 metadata 使用同一校验。不在错误中回显原 URL、用户名、密码、查询参数或片段。
- 旧记录不修改、不删除、不自动迁移；若包含不安全 URL，严格解析应安全拒绝加载/后续操作，而不是带着危险值继续。此类旧 Workspace 可能需要独立人工恢复流程，本轮不修改它的持久化数据。
- metadata provider 改成已有五字段显式投影，拒绝附加字段进入输出；不保留未经白名单选择的 provider 扩展值。
- 不宣称可以识别任意正文或路径中编码的所有秘密；本任务关闭审计证明的结构化 URL 入口。

红灯用例：含合成 userinfo、token query、fragment 的允许来源 URL，以及回写出口绕过 adapter 输入；三层均拒绝、无目标文件、错误无秘密。正控覆盖普通文档 URL、多个结果文件、生产/非白名单来源仍拒绝、原两阶段管线不变。

## Task 2：F2/F4——绑定环境并记录 ID 来源

修改：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js

测试：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-remote-service.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\workbench-v3-contract.test.mjs

确定行为：

- 为现有 execution 增加可选、可空的 `recordIdSource`，唯一非空值为 `create`；旧记录缺失可读，不做迁移、不推断来源。
- 只有 create 响应/receipt 在原请求 key 校验成功、ID 为非负安全整数后，才能写入 recordId 与 recordIdSource。缺失 ID 不触发猜测或补填。
- `complete` 显式区分 create/query 来源；query 的额外 ID 只作为非权威冲突提示，不补空、不覆盖、不升级来源。已有 create ID=90、query 提示=91 时保留 90，返回安全错误 `REMOTE_RECORD_ID_MISMATCH`，不得生成新的已完成结果或关联结论。query 只提示 ID、没有 create 来源时保持不可验证。
- 已有但没有来源标记的历史 recordId 不参与确定关联；缺少可信锚点返回 unverifiable，不发流水请求。
- 观察发请求前验证 active origin == execution origin == run provider origin，不等则 `REMOTE_ENVIRONMENT_MISMATCH`，零流水请求、零记录改写。
- 同一环境守卫应用到 continuation 的首个远端请求之前，关闭审计已指出的同根因旧路径；不改变一次提交、不重复上传、按原 key 等待的既有规则。
- 不增加后端端点，不把 8.7 未定义的 ID/完成结果描述成权威契约，不扩展异步能力。

红灯用例：A 完成/B 观察同号；A prepared/B continue（详情/上传/create/query 调用均为 0）；create90/query91；无 create ID/query 有 ID；历史缺少 source；同 ID 正常完成；错 key 不得先写 recordId。

## Task 3：F3——先验证完整流水页，再形成候选观察

修改：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-remote.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js

测试：上述模块对应的 oasis-api-contract、oasis-remote-service、workbench-remote、panel-local-loop-ui 测试文件，以及新增观察 schema 断言。均位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test。

确定行为：

- 两种已记录 envelope 继续兼容；所有 items 在 `.find/filter` 前验证。id/linkId 非负安全整数；type 为现有上限内非空字符串；money/balance 有限数值，不做字符串强转、不推测退款金额正负；createTime 缺失可为 null，提供时必须为有界非空字符串。
- total 为非负安全整数且不少于 items.length；不依赖未声明的总排序或稳定时间格式。不允许一个正常项掩盖另一个异常项。
- raw API 的 uid/username 等非输出字段不透传；Host 对正规化页再校验，防止测试桩/其他 client 绕过 adapter；错误固定、无原始 payload。
- 同 linkId 多候选时安全报错 `RUNNING_WATER_AMBIGUOUS`，不任取第一条；不偷改为过滤充值/退款后声称完整观察。
- 保留三态以及 current-page 边界；观察响应增加 required `associationStatus: 'unverified'`。observed 仅表示“本页观察到一个同 link_id 候选”，UI 明示关联未验证，不宣称账务关联或结算；文档没有提供 link_id 与 create.id 的跨接口唯一性保证。
- observation schema 校验 observed 时 item.linkId==recordId、total>=1；not-observed 要求合法 total 且 item=null；unverifiable 继续三者均 null。Client wrapper 再校验响应 runId 等于请求 runId。
- 不增加自动轮询、翻页、余额扣费推断、流水持久化或后端 type 过滤。

红灯用例：字符串 link_id、无效金额、未命中项畸形、total/items 不一致、多候选、交叉字段不一致、错 runId；正控覆盖文档数值及 envelope、空页、无可信 ID 零请求；UI 所有观察分支包含关联未验证说明。

## Task 4：F5——按页面生命周期清理 pending 观察

修改：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-store.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js

测试：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\workbench-store.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\panel-local-loop-ui.test.mjs

确定行为：

- 单独维护 transient pending-observation Map，以 workspaceId/pageId 为键；每次调用拥有独立 entry identity 和 AbortController，不进入 Domain/draft。
- Workspace 被 syncWorkspaces 移除、页面真正关闭和 store dispose 时，取消该观察、移除 entry、清除所属 busy/loading/observation；保留其他页面、dirty draft 和既有持久化逻辑。
- 晚到成功/失败/finally 均先验证 entry 仍为当前、Workspace 已注册、页面存在、store 未关闭。旧结果不得清理新观察、重新创建页面或再次调用要求已注册 Workspace 的错误更新函数。
- 移除再恢复同一 Workspace 后可重新观察；旧请求无论 resolve/reject 都不能污染新请求。
- “停止本地等待”只在工作流提交/继续等待对应 operation 下显示，不在流水读取时显示无效停止按钮；不新增远端取消 API。

红灯用例：移除→响应→恢复，移除→恢复→新观察→旧响应，关闭页面后的 resolve/reject，dispose 后晚到响应；保留并发仅一次、正常错误可重试、跨 Workspace 隔离等正控。

## Task 5：重建、复审、证据与停止条件

1. 各项红绿测试通过后冻结修复 diff/哈希；生成两份新台账：实现验证与独立复审，旧审计保持原样。
2. 使用标准 tsdown 构建重新生成以下派生文件，不手工删除依赖模板字符串中的空白：
   - D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js
   - D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js.map
3. 在新隔离目录再次构建，client.js 必须逐字节一致；map 比较 mappings、sourcesContent 与解析后的 source 路径。source map 相对路径因 out-dir 不同可不同，不将其误报为代码漂移。
4. 跑全量 node:test、聚焦套件、原 in-process Host 集成，以及新独立复审探针；不得预先声称测试数仍为 254，最终以实际输出为准。
5. 独立探针从安全要求编写，不导入测试注册文件、不改旧反例；测试真实 adapter→Host→Domain→RPC→本地文件输出或拒绝，用固定合成数据、临时新目录和 mock fetch。
6. dry-run pack 使用隔离 npm cache、offline、ignore-scripts，检查原白名单且无新增审计文件；不发布、不安装。
7. 执行 git diff --check。若标准生成依赖代码再次报告原审计已定位的 4 处模板字符串行尾空白，保留原始退出码并准确区分生成文件和源文件；不得手工改 JS 字符串、改全局 Git 配置或写“全量 diff-check 通过”。任何源文件新空白问题必须修复；其他新构建差异停止。
8. 比较修改前后基线，所有非修复白名单文件和历史审计证据必须字节不变；检查暂存区仍为空。
9. 复审逐项列 F1–F5 的原反例、修复后观察值、代码位置、测试结果和剩余限制；保留完整字段生产者→消费者→required/fallback 表。

执行时命令固定使用 cmd；普通 Node 测试可用如下绝对路径形式，其他针对文件同式逐项运行：

```cmd
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-api-contract.test.mjs"
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-remote-service.test.mjs"
node --test "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\workbench-store.test.mjs"
```

全量验证助手在新的修复证据目录创建，通过 Node spawn 的 executable/argv 明确调用测试文件全集、原 tsdown 配置和指定新 out-dir、npm pack；记录 cwd 和退出码，不运行会混入未知生命周期写入的命令。

停止条件：权威文档/原 dirty 基线漂移；需要签名 URL 或新的真实接口契约；需要删除/改写已有历史数据；需修改未列出的业务模块来兜底；真实 Profile/网络写入；连续三次同因修复失败；新增 P0–P2。遇到这些条件保留证据，不扩大范围或声称完成。

完成本计划只形成修复与本地复审证据，不是浏览器/真实 DSH/API 验收。真实联调需另行授权，并先补齐关联语义、签名 URL 需求及历史数据处理等适用前提。
