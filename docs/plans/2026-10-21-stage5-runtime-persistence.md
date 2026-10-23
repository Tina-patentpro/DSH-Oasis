# 阶段5新版运行、持久化及旧记录兼容执行计划

> 按用户本次明确执行指令，使用executing-plans、TDD及完成前核验；遵循项目单代理、沿用mac/continuity-v2、不提交/推送规则。计划细化既有阶段5后续第一项，不引入新UI或真实调用。

**Goal:** 在现有Workspace仓库中交付V3.4.0任务输入、运行快照、结果及编辑草稿持久化，合成验证未决/重开保护，旧记录及证据保持。

**Architecture:** 根记录继续schemaVersion=4；仅新版任务具有可选的v340.schemaVersion=1，旧任务不补字段。复用repository revision/队列和Workspace操作互斥；新模块专供V3.4.0，不建设通用Provider框架。Host提供任务/草稿/观察/停止接口，执行器只在测试注入synthetic；生产不注入执行器、不开放run/create RPC，真实来源保持禁用。

**Tech Stack:** 固定Node24.21.0、pnpm11.8.0、zod4.4.3；无新增依赖。

**Spec:** docs/business-baseline/14节点清单V3.4.0.md及docs/plans/2026-10-21-stage5-v340-expansion.md；本批设计决定如下。

## 合同和约束

- 新任务明确nodeId/V3.4.0身份，不能将旧claims或历史任务改标为新版；旧v1–v4读取沿用原迁移，不自动写回或重算旧输入/产物hash。
- 新版任务输入单份draft，source默认local-skill、文件/文本/配置分ID；输入草稿可不完整，保存不调用准备/模型。准备时由现有Workspace读者读取明确文件并冻结实际正文/hash。
- 每次运行保存requestKey、UUID、项目/任务/节点/来源、资源及输入快照/hash，再允许合成执行。prepared及unknown阻止Workspace新派发，与旧本地/API未决互相保护。
- prepared→completed/failed/unknown；没有明确终态或停止/丢失所有者均unknown，不重试、不换来源。观察不派发，重建service只观察原运行；迟到响应不能覆盖unknown或其他运行。
- completed保存现有累计组装器的主Markdown/双业务状态/来源警示及指纹；结果编辑草稿另存、绑定原结果hash，不能改原产物或自动审核。
- 新版Host字段不接受普通replaceEditable写入；旧编辑草稿不能擦除已有v340、运行或结果编辑草稿。相同revision竞争只准一次提交。
- 保留旧记录1MiB上限；带新版数据时，旧字段部分仍1MiB，总记录上限8MiB，单draft及单输入快照2MiB，最多8次运行；超限拒绝、不截断、不淘汰旧证据。累计文稿继续现有1MiB上限。
- 新版真实来源禁用；synthetic标签不能冒充本地Skills/API能力。Desktop、真实模型/API、认证、Profile/准入、依赖升级、发布均不执行。

## Review Focus

1. 老客户端省略新版字段、伪造Host运行、删除未决任务或旧unknown时不得丢证据。
2. prepared/unknown跨仓库重开、跨来源及旧API未决必须相互阻止新派发。
3. revision冲突、幂等请求碰撞、相同runId跨Workspace和迟到响应不能串写或重发。
4. 草稿/快照/产物损坏必须拒绝，不用重算hash掩盖；缺正文或超限不能伪造completed。
5. 关闭、停止、存储失败时保持可观察未决；不等待忽略abort的执行器无限挂起。

## Task 1：合同与仓库存储

**Files:** 新增src/v340-runtime-contract.js、src/v340-runtime-integrity.js；修改generation-contract.js、workbench-contract.js、workbench-domain.js、workbench-repository.js；新增test/v340-runtime.test.mjs。
**Interfaces:** v340TaskStateSchema；hasPendingV340Run(task)；assertV340Integrity(record)；新版字段Host专属，普通editable合并保留。

- [x] 红测旧v1–v4读取/原证据不变、新任务schema、Host字段防伪、revision竞争、输入/hash损坏及体积边界。
- [x] 实现可选版本化状态和完整性校验，沿用现有旧记录迁移与仓库。
- [x] 运行合同、domain、repository及草稿受影响测试，确认原断言不删改。

## Task 2：新版生命周期与重开保护

**Files:** 新增src/v340-runtime-service.js、扩展同一测试。
**Interfaces:** createV340RuntimeService({repository,preparation,workspaceOperations,executor,clock,uuidFactory})，返回createV340Task、updateV340Draft、createV340Run、observeV340Run、stopV340Run、saveV340ResultDraft、closeV340Runtime。

- [x] 红测完整合成运行、输入/结果草稿重开、幂等/冲突、旧新运行互斥、异常unknown、停止/迟到/关闭及储存失败。
- [x] 实现durable admission、现有累计组装与精确settle；执行器仅接受synthetic。
- [x] 运行新版及旧本地/统一流相关回归。

## Task 3：Host及安全RPC边界

**Files:** 修改workbench-service.js、workbench-rpc.js、workbench-connection.js、index.js、v340-catalog.js及对应Host/RPC/路由测试。
**Interfaces:** workflow/v340/task/create、workflow/v340/task/draft、workflow/v340/run/observe、workflow/v340/run/stop、workflow/v340/result/draft；无run/create路由。原prepare保持只读。

- [x] 红测真实Workbench服务及RPC新接口、严格入参、Host专属结果不可伪造、正式执行器缺失拒绝、旧prepare无写入。
- [x] Host共享同一仓库/互斥，dispose关闭新版工作；不新增用户生成入口。
- [x] 更新精确路由计数，保留所有旧路由断言。

## Task 4：集成回归与审计

- [x] 固定Node运行主包全量；Mac相关26项；干净构建及114基础上的实际新包清单；两种check只读预期拒绝漂移。
- [x] 审计旧记录/unknown、输入冻结、晚到/竞争、来源标签与草稿持久化；修复真实发现并补回归。
- [x] 保存新鲜日志、哈希/退出码、剩余未验项；前置状态摘要保留旧字节后缀，不覆盖失败材料。

本地账本：.local/stage5-runtime-20261021/progress.md。保留当前隔离开发副本，不创建新工作树或并行代理；阶段5整体、真实原生生成及Desktop验收不由本批合成测试自动关闭。
