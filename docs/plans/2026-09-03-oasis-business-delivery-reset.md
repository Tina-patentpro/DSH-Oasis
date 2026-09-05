# 插件业务交付优先计划（取代诊断优先顺序）

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让用户在非生产环境通过产品界面完成一次真实文字类专业任务，并把审核结果安全保存到当前 Workspace。

**Architecture:** 保留已实现的九端点适配和本地闭环；在现有绿洲工作台内补最小连接配置区，复用公共 settingsScope/credentials，不增加 DSH Slot。先验证一条业务闭环，再补本次闭环真正暴露的缺陷。

**Tech Stack:** 当前 DSH 0.1.1-rc.2、现有 React/Node/构建与业务测试；不新增依赖、诊断器、监管器、观察器或自动审计系统。

**状态：STATIC_ONLY。此文为调整后的计划；本轮没有实施业务补丁、启动浏览器/DSH 或调用业务 API。**

## 一、这次纠偏的决定

1. 停止尚未执行的 LocalAppData 对照计划 E0–E4；后续“下一步”默认指本文的业务任务，不自动恢复目录实验、N3 或旧 A–E 全套流程。保留历史代码/报告，不删除、不改写成功或失败记录。
2. 测试是验收手段，不是业务进度。里程碑只记录用户是否能配置、选服务、提交、取得结果、审核保存，以及实际证据层级。
3. 不再把六类 live Slot 枚举、双布局全矩阵、两次冷启动、完整原生进程调查或反复全库审计作为首个业务闭环的前置条件。
4. 安全底线不减：真实 Profile/既有文件保全、非生产来源、秘密不外泄、显式费用/外传确认、创建不确定不重发、人工审核及无覆盖写回。
5. 只新增本文，不另建规划监管/测试/多层证据目录。后续每个业务里程碑用一张验收表，复用已有工具输出。

## 二、三个问题的现状答案

### 1. 已完成哪些业务能力？

| 用户能力 | 已有实现和证据 | 当前可声明范围 |
|---|---|---|
| 按 Workspace 管理任务、填写研发/专利表单、登记本地材料、保存并恢复 | 2026-08-29 修复后本地 Host/浏览器记录；当前对应模块仍在 | 历史版本本地闭环已验证；当前新增 API 版本需针对受影响路径复验 |
| 本地演练生成、预览、人工审核、保存 Markdown + .oasis.json，拒绝覆盖 | 历史真实浏览器写出文件及 Host 重启恢复；不是单纯测试计数 | 能演练，不是真实研发/专利专业生成；材料正文不参与 local-mock |
| 查看非生产服务/余额/项目，按 schema 填表、价格/外传确认后提交 | 九端点适配器、Host/RPC/Store/UI 已实现，有合成输入的本地链路证据 | 尚未证明当前用户经界面完成真实非生产提交 |
| 原 key 查询、停止本地等待、远程文本/URL 预览、人工审核安全写回 | 当前实现与第三批复审有本地证据 | 不等于服务端取消、保证恢复正文、下载原文件或财务结算 |
| 安装运行 | 2026-09-02 standalone 副本构建、离线安装、官方 Host 启动已有证据 | Host 启动不代表 Client 界面加载；Better Sidebar 本轮未验证 |

结论：已拥有本地工作台和专业 API 集成主体，但尚不能交付为“普通用户已能完成真实专业任务”的产品。不得把历史本地浏览器通过套到当前 API 新功能。

### 2. 对照权威文档，还缺什么？

唯一业务权威：
D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md
SHA256：429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。

文档中 2026-09-01 的真实验证快照只证明其中列明的登录、项目只读等操作，不是插件九端点的真实端到端验证。保留 legacy 方法/字段和后端转接 Dify 的边界，不退回旧 PRD 的 /v1 设想，也不补做全站 176 个接口。

| 九端点/业务组 | 实现现状 | 缺口与优先级 |
|---|---|---|
| GET /api/user/detail；GET /api/apicategories/detail；POST /api/apicategories/apidetail | 余额、目录、动态 paragraph/string/file 表单已有 | 首要：用户配置入口与真实鉴权/目录/schema/价格验证；只接受 Workflow、is_async=0 |
| GET /api/user/user/folderlist；GET /api/user/user/folderdetail/{id} | 当前返回页选择、提交前整数 ID 及详情核对已有 | 没有 page/parent_id/搜索参数接线，不能保证可选到全部项目；首个验收用返回页内批准项目，UI 明示当前页；若目标不可见才补现有端点分页 |
| POST /api/user/upload | multipart file，单文件字段转换为 document/remote_url；空字段省略已有 | 实际上传未验证；多个独立单文件字段不等于 files 数组输入。首个文字任务不依赖上传，第二个业务案例再覆盖一份合成材料 |
| POST /api/apicategories/create | 固定 id/key/inputs/api_process/folder_id；双确认、快照、一次创建已有 | 真实成功响应、价格/权限、文本及文件结果形态未验证；是首个业务验收核心 |
| GET /api/apicategories/queryprocess/{key} | 有界查询、原 key 继续等待已有 | 文档 8.7 只展示进度，不保证完成响应含正文/id。不得承诺丢失 create 响应后必能恢复结果；未取得正文保持未完成，不重发 create |
| GET /api/user/runningwater/list | 当前页只读候选观察已有 | 文档未确立 create.id 与 link_id 的唯一对应；非对账/结算功能，不阻塞首个文字交付 |

**确定的产品缺口：** Host 已注册设置并解析凭据，但 Client 没有 Oasis 配置组件或连接公共设置服务的路径；“请在凭证界面配置”的提示不是可操作闭环。远程 file_url 仅展示，未下载/校验原文件。签名 query/fragment URL 被保守拒绝，不是后端契约要求；不能据此声称全面兼容。

**首个版本的明确缩小范围：** 一项同步、文字类服务，返回非空 answer_text；产物为用户审核的 Markdown，不承诺 DOCX/PDF 原件。多文件数组、远程原文件下载、完整项目导航、异步/Chatflow、退款/扣费对账、历史数据迁移及全插件组合兼容进入后续清单，不因此宣称完整产品已交付。

### 3. 浏览器到底挡住哪项验收？

- 已观察失败发生在浏览器建立连接、打开 DSH 页面之前，不是专业 API 请求报错。后续原生目录调用只支持环境假设，未证明 Edge 根因或修复。
- 真正被挡住的是：当前包的 Client 渲染；配置/凭据保存和生效；选择、确认、提交、预览、审核、写回的可操作性；刷新恢复及原生 UI 未被破坏。
- 不被挡住的是：业务源码/契约核对、最小配置区实现、定向业务测试、打包，以及不带秘密的接入信息准备。
- 原自动化路径另有 CIM 权限、POST/WS 禁止策略尚不适合 DSH 业务通信、Client peer 实际加载版本未核实等限制；不能以“补一个目录”声称全部解决。它们是旧验收路径的问题或待验证兼容项，不自动变成新的诊断研发任务。

## 三、调整后的交付顺序

### D1：先补用户可操作的最小连接配置

**用户结果：** 打开现有绿洲工作台即可看到连接状态，保存非生产 API origin，并更新 JWT；无需编辑文件或调用内部 RPC。

- 配置区放在 OasisWorkbenchSurface 的自有面板内，不新增 settings.plugin.item 或其他 Slot，不写原生 DOM。
- 使用公共 settingsScope.bind({namespace:'oasis-professional-service'})；读取 getSnapshot/subscribe，经 set 保存字段。地址和下载 origin 清单分别保存并明确各自结果，不伪装成跨字段原子保存；environmentKind 固定 non-production，credentialRef 固定 OASIS_USER_JWT。
- 凭据通过 connection.api.credentials.describe({refs:[ref]}) / set({ref,value})；严格检查 result.ok。与普通设置分开提交；空值不更新/删除；已有凭据 configured 不等于本次更新成功。密码输入只在组件短期内存，完成/关闭时清空，无日志/trace/Domain/localStorage/聊天。
- 配置保存按既有 applies=restart 提示手工重启隔离 Host；凭据更新按 Host 每次操作解析生效。重连/更新后刷新连接状态，不自动提交业务任务。
- 公共服务用可选生命周期绑定；不可用只禁远程配置/提交，保留本地工作流。处理断连、保存冲突/失败和晚到响应，不建立通用配置框架。
- 保留当前来源限制和下载策略；首个任务若返回被拒绝的 URL，记为真实兼容缺口并停止，不静默去参或放宽源。

**实施文件范围（不触碰诊断 scripts）：**
新增：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisConnectionSettings.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\oasis-connection-settings.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-connection-settings.test.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-connection-settings-ui.test.mjs

修改仅限接线与说明：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\OasisWorkbenchSurface.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-store.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\lib\client.js.map

复用现有公共服务，不加包/锁文件或跨插件私有 import。单元测试先红后绿，只覆盖上述行为和秘密/误提交风险；新代码单独冻结，与原 dirty 差异区分。若运行时服务缺失、需要变更依赖或其他 Host 文件，先报告实际缺口，不临场扩围。

**验证命令：** Shell=cmd.exe，工作目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service；先运行下列业务范围测试，再用既有 verify 一次完成标准构建、包测试和打包检查（不重复跑构建）。

~~~bat
C:\Progra~1\nodejs\node.exe --test test\oasis-connection-settings.test.mjs test\oasis-connection-settings-ui.test.mjs test\oasis-runtime-config.test.mjs test\client-panel-contract.test.mjs test\panel-local-loop-ui.test.mjs test\workbench-store.test.mjs
pnpm --config.verify-deps-before-run=false run verify
~~~

执行前只读核对具体 Node/pnpm 指向现有版本；不可用则停，不联网安装或修全局 PATH。预期均 exit=0，记录失败但不滚动增加诊断测试；不重跑 N3 或 root 全部诊断集合。

### D2：用最短可控路径完成一次真实界面操作（loopback 合成后端）

**首选人工验收，不先修自动化。** 使用全新隔离 DSH Profile/Workspace 和独立浏览器数据目录，由用户在可用的交互会话访问本次 loopback Host；不接管现有浏览器、不复用 cookies/真实 Profile、不模拟“已通过”。启动安装继续使用已经审查过的官方隔离 CLI；不为了验收改变机器策略/全局权限/依赖。

- 优先使用已有隔离启动资产和本地 mock，不新增监管器或专用总验证器。保留必要的真实 Profile 前后保全、临时根边界、单写入者及本次进程收尾；不按名称杀进程。
- 人工路径是新的明确验收方式，不删旧验证器 gate，不把旧 phase4Complete 改成 true。记录人工操作、当前包 hash、关键界面/非敏感错误和生成文件即可；无需全量请求 trace、所有槽树或新进程监控。
- 只有人工路径确实受同一环境问题阻断时，环境修复预算最多 30 分钟、一次最小改动与一次启动复验；只改本次隔离目录/启动参数，不做原生 API 对照实验，不增加工具链。候选只限已观察的隔离用户目录准备问题；无法在既有隔离/收尾边界内修复就停自动化，由用户处理可用交互环境。到点不自动转入第二轮诊断。
- 浏览器无论手工或自动，若隔离/进程归属无法满足，停止该运行；保留 D1 可交付代码和明确阻塞项，不谎称业务 UI 已验收。

**只验以下用户场景，不做二维全矩阵：**
1. 未配置/无凭据：能看到下一步操作，上传/创建次数为零，本地工作流可用。
2. 用户从配置到选择同步文字服务、填写输入、选择当前页项目、双确认、提交一次、看到文字结果、批准、新目录保存 Markdown/.oasis.json；正文与预览一致。
3. 刷新或正常重启恢复草稿/已完成运行；切换 Workspace 不串数据；原生聊天/侧栏仍可用。
4. 网络/create 响应不确定时，不重发 create，不显示伪成功；可停止本地等待，明确服务器结果未确认。
5. 未审核、输入改动使确认失效、目标已存在时均不发布/覆盖；凭据更新失败不显示成功。

首轮仅 standalone。Better Sidebar 共存验证保留为后续兼容里程碑；未经验证不得把候选包装到包含该插件的真实组合并宣称可用。无需在其完成前阻塞上述独立环境的业务验收。

### D3：取得一次真实非生产文字业务结果

**入口：** D2 主链通过；用户单独授权并提供确切非生产 origin、测试账号/允许项目和费用上限。JWT 只由用户在 D1 界面输入，不发到聊天或脚本。本轮规划没有这些新授权，不调用真实服务。

- 从真实目录选择一项明确 Workflow/is_async=0、文字字段可满足且用户确认的业务服务；不硬编码目录 ID，不按历史 PRD 价格假定收费。
- 使用一组预先确认的合成/脱敏文字，不传真实客户材料。最多一次 create；上传为零。先记录无秘密的服务、schema、项目 ID、参考价格和授权上限，超过上限不提交。
- 接受 create 返回正文，人工审核后写入全新本地目录。若只返回文件、响应丢失、仅有完成进度而无正文或 API 不兼容，记录实际结果并停止；不换 key 重发，不补造契约。
- 不修改既有远端数据、不做退款/删除/重部署/生产测试；仅本次批准的新测试任务。非生产端点未具备时，明确停在“界面模拟闭环已验证”，不把它当真实专业交付。

**交付物：** 用户实际看到的一份文字成果、审核意见、对应本地 Markdown/.oasis.json；包 hash 和一行无秘密的真实调用结果。业务正确性由用户/领域负责人评阅，不用 HTTP 成功替代内容质量。

### D4：根据实际使用障碍补下一项，而不是默认扩围

优先下一条为“用户选择一份合成材料并完成同样闭环”，复用已实现上传。只有真实目标案例需要时才处理项目分页、多文件数组、文件原件下载/签名 URL。进度接口补正文、流水关联等需取得权威契约，不由插件猜测。每次新增能力只追加对应用户验收案例；真实现有数据或历史记录迁移另行批准。

## 四、业务验收台账（取代测试数量进度）

| 用户结果 | 目前 | 下一证据 |
|---|---|---|
| 能配置并看懂连接状态 | 缺产品入口 | D1 实现，D2 实际操作 |
| 能选服务、填输入、指定项目 | 已实现，API 新 UI 未真实验收 | D2 模拟，D3 真目录 |
| 能一次提交并取得可用正文 | 仅合成本地证据 | D3 一次真实任务 |
| 能审核并安全保存当前结果 | 历史本地闭环 + 当前远程合成证据 | D2/D3 当前包文件与预览一致 |
| 能识别失败且不重复提交/覆盖 | 已有保护实现，不能承诺后端绝不扣费 | D2 确认不重发/不覆盖；D3 只记录实际情况 |

不使用“诊断测试通过数”或虚构完成百分比；不因首个文本 Alpha 通过宣布完整第三方兼容、文件交付、账务或专业质量完成。

## 五、现有证据入口与本轮核对

- 本地业务闭环（2026-08-29 修复后）：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第三周-全面复审修复报告.md
- 当前 API 本地链路及明确缺口：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\audit-report.md
- 当前 Host 安装/启动及浏览器阻塞：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-006\audit-report.md
- 自动化入口的剩余限制：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-browser-remediation-2026-09-03\attempt-001\audit-report.md
- 已核对权威 API hash；当前 lib/client.js hash 与第三批产物一致：009546E17BB871F33C43768AEE90A4FB759067950C9BFACBDC6BD551D641B604。读取历史原始浏览器节点身份、Workspace 文件新增与 Host 恢复记录；没有将它们冒充当前重跑。
- 当前 Client 配置源码不存在，旧完整浏览器集成测试也不存在。只读检查不等于执行测试，本轮不引用测试计数作为进度。

**下一次建议只批准 D1（最小业务配置入口）；D2 的隔离启动/人工验收和 D3 的真实非生产费用/外传分别确认。诊断工具链保持冻结。**
