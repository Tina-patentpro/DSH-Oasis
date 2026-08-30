# Week 3 第一批实施证据台账

- 日期：2026-08-25
- 当前范围：Task 1～3，基线、schema v2/迁移/数据所有权、版本化本地工作流目录
- 明确排除：材料正文读取、mock运行、审核、写回、右栏功能实现、Dify、收费管理
- 起始Git基线：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`，跟踪`origin/main`

| 层级 | 证据 | 当前结果 | 证明边界 |
|---|---|---|---|
| 执行前Git | 当前任务开始时`git status --short --branch` | 仅两份Week 3计划为untracked；无tracked/staged改动 | 证明本批未继承其他工作树修改；计划文档是本任务上一阶段产物 |
| 依赖合同RED | `node --test test\\package-contract.test.mjs` | RED：4/5；精确缺少`@deepseek-ai/dsh-workspace`直接dev依赖 | 证明新增测试命中缺失行为，不证明依赖可安装 |
| 依赖恢复 | frozen/offline尝试、官方registry frozen install输出 | 初次offline metadata失败；CI重建遇Windows EPERM并造成残缺依赖树；残缺树完整移动到包内固定备份，随后官方registry按现有lockfile重建成功，116/116均从store reused、downloaded 0 | 只证明当前依赖树恢复和锁文件可解析；备份在全包验证通过前不删除 |
| 依赖合同GREEN | `node --test test\\package-contract.test.mjs test\\host-runtime.integration.test.mjs` | PASS：6/6 | 当前包清单固定workspace依赖，现有Host组合未回归 |
| Workspace官方合同 | 本机package/types/README哈希与`official-contracts.md` | PASS：版本`0.1.1-rc.2`，四个来源SHA-256已冻结 | 证明当前本机公开Host合同；不证明未来DSH版本兼容 |
| 项目文件基线 | `baseline/*-before.*`、`baseline/*-after.*` | PASS：before source 80 项，after 86 项；workspace contracts 4 项哈希未漂移；toolchain failures 0 | 证明项目计划范围内内容有可比较哈希；源码变化仍以Git diff为准 |
| 真实Profile基线 | `baseline/profile-hashes-before.tsv`、`profile-hashes-after.tsv`、`profile-diff-summary.json` | STOP：执行期间出现并发外部变化，共13044项（added 13035、removed 0、modified 9），主要为`profiles`，并含`backups\\better-sidebar-install-20260825-210729` | 本批未执行真实Profile写命令，但基线证明环境并非静止；不能宣称真实Profile未变，也不能继续Host/浏览器验证 |
| schema v2 RED/GREEN | `runtime/schema-v2-red.txt`、`runtime/schema-v2-green.txt` | PASS：初始RED 23项中17项失败；实现后focused 37/37、完整workbench 49/49；补充历史部分三元组RED 12/14 后 GREEN 14/14 | 单元合同、迁移和repository数据所有权；RED文件为会话转录摘要 |
| catalog RED/GREEN | `runtime/catalog-service-red.txt`、`runtime/catalog-service-green.txt` | PASS：初始RED 12项中7项失败；最终focused 19/19；可选字段一致性补充RED 4/6 后 GREEN | 本地目录、表单校验、service、RPC和Client response；不证明浏览器已渲染目录 |
| 第一批全包验证 | `runtime/package-verify.txt`、`runtime/package-verify-green.txt` | PASS：隔离cache重跑 build成功、108/108 tests、dry-run pack 26 entries；默认用户cache尝试仅在pack阶段因EPERM失败并保留原始输出 | package静态/Node运行层；不证明DSH Desktop或浏览器Week 3闭环 |

## 基线时间边界

执行前已在对话内记录Git HEAD、upstream和工作树，随后才修改依赖合同。文件系统`before`捕获器在Task 1依赖固定之后运行，因此：

- 既有tracked文件的实施前内容以Git HEAD为强基线，当前变化由`git diff`追踪；
- 真实`C:\Users\TinaD\.dsh`在本批所有DSH动作之前捕获，可作为Profile before；
- 两份Week 3计划在本批开始前已存在，其SHA-256由计划验收记录；
- 不把此`before`误称为Task 1依赖编辑前的工作树快照。

## 已批准计划的原子性修正

Task 2 原文件清单漏列了 `workbench-rpc.js`、`workbench-remote.js` 及对应测试。schema v2 response 与 editable draft 必须在同一任务内同时升级 Host/Client wire，否则 Task 2 结束会形成混合版本并使全量 `workbench-*` 回归必然失败。现已把这四个现有文件纳入 Task 2；未增加新能力、endpoint 或外部系统范围。

同时补充v1迁移裁决：Week 2 合法schema允许任意JSON `inputRefs`，因此不能假设为空或猜测为新材料证据。迁移器将其逐项包入只迁移的`legacy-v1`引用，原JSON无损保留，但后续运行必须阻断，直到用户移除或重新登记。

审计再补充一项：Week 2 合法schema允许部分工作流三元组。迁移逐值保留；repository 只允许该历史状态原样落盘升级，禁止修改；新 task 及原来全空的 task 只能是全空或完整三元组。这样同时满足兼容性与新写入 fail-closed。

## 第一批执行结果

- Task 1：固定 `@deepseek-ai/dsh-workspace@0.1.1-rc.2`，冻结本机公开合同与哈希；真实 Profile 仅做只读基线。
- Task 2：完成 schema v2、严格 v1/v2 union、无损迁移、Client 可编辑投影、Host 证据合并、CAS/Workspace 串行化及预算。
- Task 3：完成两个 `local-mock` 工作流目录、受限表单 DSL、由目录编译的 Host 校验器、service 组合根及 strict catalog RPC/Client response。
- 依赖恢复临时目录在全包验证成功后已安全删除；验证隔离 npm cache 也已删除。
- 本批没有实现 Task 4～7，没有读取材料正文、运行 mock、审核或写回；实施命令未以真实 DSH Profile 为写目标，但 after 基线已证明 Profile 被并发外部动作改变。

## 当前判定

`STATIC_ONLY`

Task 1～3 的项目本地实现和包级验证已完成。用户于 2026-08-26 确认 `better-sidebar` 安装是有意操作，因此该外部变化不再构成待决阻断；未对其执行覆盖、回滚或清理。Task 4 使用新的 before 基线继续，路径见 `docs/evidence/week3-implementation-2026-08-26/task4/`。第一批结果仍未提升为 DSH Desktop/浏览器运行证据。

## 停止条件

- 真实Profile基线发生意外变化；
- 当前DSH/workspace实际版本或公开合同漂移；
- v1合法记录不能确定性迁移；
- Client可通过editable payload篡改Host证据；
- 目录/表单schema需要引入Dify、收费或服务端内部字段；
- 目标测试RED原因错误，或GREEN需要放宽严格schema与预算。
