# 第二周项目工作台持久化 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 使用 DSH Domain Storage 为每个 Workspace 提供可恢复、可检测冲突的多任务页状态，并让现有右栏在刷新与 Host 重启后恢复。

**Architecture:** Host 以 `oasis_workbench` version 1 Domain 的 `workspaces` 表作为唯一业务事实源，通过 DSH Connection 专用 loopback channel 提供 `state/get` 与 `state/replace`。Client 保留瞬态渲染状态，按 Workspace hydrate 和串行保存，使用 Host revision 检测冲突；不使用 localStorage、不直接写 JSON、不进入 Dify/收费管理。

**Tech Stack:** DeepSeek Harness `0.1.1-rc.2`、`@deepseek-ai/dsh-storage-domain`、DSH Client Connection RPC、Zod 4、Cordis、React 18、Node.js 22.19、pnpm、Node test runner、Playwright。

---

## 执行约束

- 当前仓库没有 commit，全部既有项目文件是 untracked 基线；本计划不暂存、不提交、不重置。
- 每个生产行为先写失败测试并确认失败原因，再写最小实现。
- 所有 Host/Browser 重启验证使用 `%TEMP%\oasis-dsh-week2-*`；真实 `C:\Users\TinaD\.dsh` 只读。
- 不引入 Typert 应用级 BFF：当前 DSH 明确提供 `ctx.connection.rpc.handle()` / `call()` 的 generic logical channel，外部分发插件用独立 channel 可避免修改 DSH `api-remotes` 固定能力集合。
- 不实现专业生成、材料正文、下载、写回、Dify 或收费管理。

### Task 1: 基线与固定版本合同

**Files:**
- Create: `docs/evidence/week2-implementation-2026-08-25/baseline/capture-baseline.mjs`
- Create: `docs/evidence/week2-implementation-2026-08-25/evidence-ledger.md`
- Modify: `.dsh/skills/dsh-plugin-development/references/official-contracts.md`
- Modify: `docs/plans/2026-08-24-dsh-beta-overall-plan.md`

**Steps:**
1. 记录 Git、DSH/Node/pnpm、官方 Node CLI、产品源文件和真实 DSH Home SHA-256/lstat 基线。
2. 把 `storageDomain`、Domain close、JSON backend、Connection RPC channel、loopback authority 和单进程限制写入项目合同。
3. 将总计划实际 Domain 名从非法的 `oasis-workbench-v1` 纠正为 `oasis_workbench` version 1，保留产品展示名不变。
4. 运行基线捕获；预期真实 DSH Home 只读且没有 follow-link。
5. 不执行 Git add/commit，只记录 `git status --short --branch`。

### Task 2: 持久 schema 与 Repository

**Files:**
- Create: `packages/oasis-professional-service/src/workbench-domain.js`
- Create: `packages/oasis-professional-service/src/workbench-repository.js`
- Create: `packages/oasis-professional-service/test/workbench-domain.test.mjs`
- Create: `packages/oasis-professional-service/test/workbench-repository.test.mjs`
- Modify: `packages/oasis-professional-service/package.json`
- Modify: `packages/oasis-professional-service/pnpm-lock.yaml`

**Steps:**
1. 写 RED：Domain 名/版本/表、空状态、完整记录不变量、未知 schemaVersion、孤儿/重复 task、Workspace 身份不一致。
2. 运行 `node --test test/workbench-domain.test.mjs`；预期因模块不存在失败。
3. 固定 peer/dev dependency：`@deepseek-ai/dsh-storage-domain@0.1.1-rc.2`、`zod@4.4.3`；仅用既有 store 更新 lock/install，不升级其他包。
4. 实现 Zod schema、`oasisWorkbenchDomainSpec`、深克隆/冻结和 revision 0 空状态。
5. 运行领域测试；预期全绿。
6. 写 RED：缺失行读取不物化、首次 save revision 1、并发同 revision 只有一个提交、冲突带 current、跨 Workspace 隔离、存储失败不更新内存、close 拒绝新写并排空已入队写。
7. 实现 Workspace promise queue 与 repository；仅使用 `table.get/put`，不原地修改记录。
8. 运行两个测试文件并复跑 package 全测试。

### Task 3: Host 生命周期与 loopback RPC

**Files:**
- Create: `packages/oasis-professional-service/src/workbench-rpc.js`
- Create: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`
- Modify: `packages/oasis-professional-service/src/index.js`
- Modify: `packages/oasis-professional-service/src/status.js`
- Modify: `packages/oasis-professional-service/test/host-tool.test.mjs`
- Modify: `packages/oasis-professional-service/test/host-runtime.integration.test.mjs`
- Modify: `packages/oasis-professional-service/package.json`
- Modify: `packages/oasis-professional-service/pnpm-lock.yaml`

**Steps:**
1. 写 RED：只注册 `/oasis-workbench` + `loopback`；仅接收 `state/get`、`state/replace`；unknown/额外字段/身份错配为 bad-request；revision 冲突作为成功载荷返回；基础设施错误 reject。
2. 运行目标测试确认失败。
3. 增加固定 `@deepseek-ai/dsh-client-connection@0.1.1-rc.2` peer/dev dependency。
4. 实现严格 Zod payload dispatcher，并让 Host `apply` 注入 `tools/storageDomain/connection`、打开/关闭 repository、注册 channel 与状态工具。
5. 更新状态为 `week-2` / `durable-workbench-state`，不得输出业务状态。
6. 运行 RPC、Host、真实 Cordis 组合测试；确认 disposer 排空写入并关闭 Domain。

### Task 4: Client hydrate、串行保存与冲突状态

**Files:**
- Create: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Create: `packages/oasis-professional-service/src/client/workbench-model.js`
- Create: `packages/oasis-professional-service/test/workbench-remote.test.mjs`
- Modify: `packages/oasis-professional-service/src/client/workbench-store.js`
- Modify: `packages/oasis-professional-service/src/client.js`
- Modify: `packages/oasis-professional-service/src/client/OasisPanelHost.js`
- Modify: `packages/oasis-professional-service/src/client/PanelChrome.js`
- Modify: `packages/oasis-professional-service/src/client/PanelPages.js`
- Modify: `packages/oasis-professional-service/package.json`

**Steps:**
1. RED：首次 Workspace hydrate 前不保存空状态；快速连续动作按 revision 串行；刷新 hydrate；冲突保留草稿/current；A/B 队列隔离；transport fault 显示 error。
2. 实现 `ctx.connection.rpc.call('/oasis-workbench', ...)` 适配器和纯 reducer。
3. 把 page ID 改为 `crypto.randomUUID()` task ID；补齐 rename/close/选择工作流持久动作。
4. UI 添加 loading/saving/conflict/error 的可访问状态；冲突仅提供重新载入，不自动覆盖。
5. 完成组件与 store 单测，复跑 package tests/build。

### Task 5: 隔离 Host 重启与浏览器 E2E

**Files:**
- Create: `scripts/verify-week2-persistence.mjs`
- Create: `tests/integration/week2-persistence-browser.test.mjs`
- Create: `tests/fixtures/oasis-week2-state-probe/*`
- Update: `docs/evidence/week2-implementation-2026-08-25/*`

**Steps:**
1. 新建临时 `DSH_HOME`，安装产品与最小验证 fixture；比较真实 DSH Home 前基线。
2. Host-1 写入 A/B 不同页签/工作流/面板状态，验证同 revision 并发冲突，正常停止。
3. Host-2 使用同一临时 Home 重启；通过 RPC 和浏览器证明状态恢复、A/A/B/A 不串数据、刷新恢复、rename/close 可持久。
4. hidden 后实际打开原生 Details；normal/expanded/窄屏布局回归不退化；console/pageerror 为 0。
5. 比较真实 DSH Home 后基线；安全清理临时根并确认端口关闭。

### Task 6: 全量审计与第二周报告

**Files:**
- Create: `docs/第二周-持久化验证报告.md`
- Update: `docs/evidence/week2-implementation-2026-08-25/evidence-ledger.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-08-24-dsh-beta-overall-plan.md`

**Steps:**
1. fresh frozen install、build/test/pack、根级测试、两个 Skill 官方校验。
2. 检查分发包不含测试、临时 Profile、证据或凭据。
3. 比较产品源文件和真实 DSH Home 前后强基线。
4. findings-first 审计：无本地可行动 P0-P2 才允许关闭第二周；剩余 P3 明确列出。
5. 更新总体计划，但不开始第三周。
