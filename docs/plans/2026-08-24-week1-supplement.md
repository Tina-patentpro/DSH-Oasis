# 第一周补充工作 Implementation Plan

**执行状态：** 历史阶段已结束，但其“全部P2关闭”结论已被后续全面审计撤回；当前不得用本文作为第二周准入证据。

> 方案替代说明（2026-08-24）：本文保留当时的执行记录，但其中“固定右轨且禁止任何DSH DOM写入”的几何方案已由`docs/plans/2026-08-24-week1-audit-remediation.md`取代。当前合同是：`shell.overlay`仅作生命周期锚点，Portal承载面板，固定版本最小布局适配器在严格DOM预算内推挤`#root`并负责完整恢复。

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在第二周功能开发前关闭第一周审计中的全部本地 P2 缺口，并用真实 DSH Host 与浏览器证据证明已确认的项目关联右栏方案可行。

**Architecture:** 保留第一周的 Bundle、Host、Client 和 Skill 骨架，按 TDD 修复 RPC、二进制解析、依赖冻结和构建新鲜度；Client 从“事件生产者”升级为 `shell.overlay` 面板消费者，并通过 DSH `useSessions/useWorkspaces` 建立按 Workspace 隔离的最小状态模型。本补充阶段不接外部专业服务、不做完整表单和生成能力。

**Tech Stack:** DeepSeek Harness `0.1.1-rc.2`、Cordis、React 18、DSH Slots/Layout、Node.js 22.19+、pnpm、tsdown、Node test runner、Playwright、Windows cmd。

---

## 0. 补充工作的退出定义

第一周补充不是重做第一周，而是将审计发现转成第二周前置门禁。完成时必须同时满足：

1. 审计 P2-01 至 P2-08 均被修复、删除错误承诺或形成可重复门禁；P3 项要么修复，要么在报告中明确保留。
2. “研发 / 专利”按钮点击后出现真实右栏，不再只派发无人消费的浏览器事件。
3. normal、expanded、hidden 三状态可转换，图标与已确认预览一致。
4. 右栏按 DSH Workspace 切换；同项目换会话不丢状态，不同项目不串状态。
5. 右栏不注册到 `details`，隐藏后 DSH 原生详情能力仍在。
6. 当前阶段只有“工作流选择占位页 + 已选择后的材料/结果骨架”，不得宣传为完整专业工作台。
7. 全部验证使用新临时 `DSH_HOME`，真实 Profile 前后强哈希一致。
8. 只有静态或 mock 证据时最终状态必须是 `STATIC_ONLY`；存在未解决本地 P2 时必须是 `FAIL`。

### 预计工作量

| 优先级 | 内容 | 预计 |
|---|---|---:|
| P0 | 基线、RPC、DSH 解析、冻结依赖、状态契约、clean build | 1.0 天 |
| P0 | live Slot 合同与右栏 Host/项目状态 TDD | 1.5 天 |
| P0 | 隔离 Host + 浏览器自动回归 + Profile 保护 | 1.0 天 |
| P1 | Skill 校验器、文档与最终补充审计 | 0.5 天 |

未通过 P0 项时不得进入第二周。

## Task 1: 冻结补充基线与证据账本

**Files:**
- Create: `docs/evidence/week1-supplement-2026-08-24/evidence-ledger.md`
- Create: `docs/evidence/week1-supplement-2026-08-24/environment.txt`
- Create: `docs/evidence/week1-supplement-2026-08-24/source-hashes-before.txt`
- Create: `docs/evidence/week1-supplement-2026-08-24/profile-hashes-before.txt`
- Create: `docs/evidence/week1-supplement-2026-08-24/requirements-traceability.md`

**Step 1: 记录工具链与工作区状态**

在 Windows cmd 中运行并保存 stdout、stderr 和退出码：

```cmd
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研
where dsh
dsh --version
node --version
pnpm --version
git status --short
```

Expected: DSH 为 `0.1.1-rc.2`；Git 命令明确报告当前目录不是仓库，不据此初始化 Git。

**Step 2: 建立源文件 SHA-256 基线**

只纳入 `.dsh/skills`、`packages/oasis-professional-service`、`scripts`、`tests`、`README.md` 与 `docs` 的源文件，排除 `node_modules`、`.pnpm-store`、`.dsh-test`、构建产物和本次证据目录。

**Step 3: 建立真实 Profile 只读基线**

显式解析并核对 `C:\Users\TinaD\.dsh\profiles\web`；记录每个文件的相对路径、大小和 SHA-256。若目标解析到符号链接、junction 或非预期根，立即停止。

**Step 4: 建立需求追溯表**

至少包含以下来源：用户确认的 UI 三状态、项目关联、多任务页、工作流选择原位转换、两类工作类型、第一周审计十项门禁。将旧 `benchmarkDomains` 标为 `UNSUPPORTED/REMOVE`，不得再次写成已确认范围。

**Step 5: 检查证据账本**

Expected: 每条证据包含命令、时间、退出码、文件路径、证据层和不能证明的内容。

## Task 2: 修复 RPC 假绿灯与 loopback 边界

**Files:**
- Modify: `scripts/dsh-local-api-smoke.mjs`
- Create: `tests/scripts/dsh-local-api-smoke.test.mjs`

**Step 1: 写失败测试**

测试必须覆盖：

```js
test('HTTP 200 with result.ok=false exits non-zero')
test('rejects non-http protocols')
test('rejects non-loopback hosts')
test('rejects endpoints outside the fixed allowlist')
test('rejects dot-segment endpoint traversal')
test('fails when the RPC envelope has no boolean result.ok')
test('accepts a valid skill.list response with expected skills')
```

允许的 endpoint 先固定为第一周真实使用集合：`skill.list`、`session.create`、`workspace.list`。新增 endpoint 必须先更新需求与负向测试。

**Step 2: 运行 RED**

```cmd
node --test tests\scripts\dsh-local-api-smoke.test.mjs
```

Expected: 至少 `result.ok=false`、协议和 endpoint 测试失败，证明测试命中旧行为。

**Step 3: 最小修复**

- URL 协议只允许 `http:`。
- hostname 规范化后只允许 `127.0.0.1`、`localhost`、`::1`。
- endpoint 在拼接前按精确 allowlist 校验，拒绝 `/`、`\`、`..` 和百分号编码的路径字符。
- HTTP 成功后仍必须解析 JSON；`result.ok !== true` 时打印 RPC error 并设置非零退出码。
- `skill.list` 在给出 `expectedSkillNames` 时逐项断言。
- 日志不得打印 token、Authorization 或完整敏感材料。

**Step 4: 运行 GREEN 与全量回归**

```cmd
node --test tests\scripts\dsh-local-api-smoke.test.mjs
node --test tests\scripts\dsh-local-api-smoke.test.mjs tests\skills\dsh-plugin-development.test.mjs tests\skills\dsh-plugin-development-discovery.test.mjs
```

Expected: 0 failed；保存 TAP 输出到证据目录。

## Task 3: 消除固定 npm shim 与非冻结安装

**Files:**
- Create: `scripts/dsh-isolated.mjs`
- Modify: `scripts/dsh-isolated.cmd`
- Create: `tests/scripts/dsh-isolated.test.mjs`
- Modify: `.dsh/skills/dsh-plugin-development/SKILL.md`
- Modify: `.dsh/skills/dsh-plugin-development/references/official-contracts.md`
- Modify: `README.md`
- Modify: `packages/oasis-professional-service/package.json`
- Verify: `packages/oasis-professional-service/pnpm-lock.yaml`

**Step 1: 写 DSH 解析失败测试**

```js
test('DSH_BIN override has highest precedence')
test('falls back to dsh on PATH')
test('fails closed when no executable is found')
test('print-home resolves inside the declared isolated root')
test('passes all arguments without shell re-parsing')
```

**Step 2: 运行 RED**

```cmd
node --test tests\scripts\dsh-isolated.test.mjs
```

Expected: 旧 `.cmd` 无法满足跨路径解析测试。

**Step 3: 实现跨机器入口**

- `.cmd` 只负责调用同目录 `dsh-isolated.mjs`。
- `.mjs` 按 `DSH_BIN` → 当前 PATH 的 `dsh`/`dsh.cmd` → 报错退出 的顺序解析。
- `DSH_HOME` 默认仍指向工作区隔离根，但支持测试通过显式参数指定一个已验证的临时根。
- `--print-home` 和 `--print-bin` 只输出规范化绝对路径。
- 启动前断言真实 Profile 不位于目标写根之内。

**Step 4: 冻结依赖**

- 将 DSH prerelease、Cordis、React 和 tsdown 的 dev 版本固定为本次已验证解析版本。
- peer 依赖使用明确的兼容边界，不允许无意跨越 DSH prerelease。
- 文档安装命令改为：

```cmd
pnpm install --frozen-lockfile
```

- 锁文件变化必须由显式升级任务触发，不得由普通验证命令刷新。

**Step 5: 运行 GREEN**

```cmd
node --test tests\scripts\dsh-isolated.test.mjs
cd packages\oasis-professional-service
pnpm install --frozen-lockfile
pnpm list --depth 0
```

Expected: 解析测试 0 failed；冻结安装不改动 lockfile。

## Task 4: 校正 Host 状态契约与真实工具运行门

**Files:**
- Modify: `packages/oasis-professional-service/src/status.js`
- Modify: `packages/oasis-professional-service/src/index.js`
- Modify: `packages/oasis-professional-service/test/status.test.mjs`
- Modify: `packages/oasis-professional-service/test/host-tool.test.mjs`
- Create: `packages/oasis-professional-service/test/host-runtime.integration.test.mjs`

**Step 1: 写失败测试**

```js
test('status exposes only approved work types')
test('status contains no benchmarkDomains field')
test('real Cordis tools service lists oasis_workbench_status')
test('registered tool returns the same validated status contract')
```

期望公开字段：

```js
supportedWorkTypes: ['technical-rd', 'cn-invention-patent']
phase: 'week-1-supplement'
capabilityLevel: 'panel-shell'
```

**Step 2: 运行 RED**

```cmd
node --test packages\oasis-professional-service\test\status.test.mjs packages\oasis-professional-service\test\host-runtime.integration.test.mjs
```

Expected: 旧 `benchmarkDomains` 断言失败；真实 service 集成测试尚不存在或失败。

**Step 3: 最小实现**

- 删除 `benchmarkDomains` 常量、schema、返回值和测试。
- 状态工具只报告当前已完成能力，不报告第二周及以后能力。
- 集成测试挂载真实 Cordis 与 DSH Tools 服务，再挂载插件；从真实 registry 获取并调用工具，不以手写 mock 代替。

**Step 4: 运行 GREEN**

```cmd
node --test packages\oasis-professional-service\test\status.test.mjs packages\oasis-professional-service\test\host-tool.test.mjs packages\oasis-professional-service\test\host-runtime.integration.test.mjs
```

Expected: registry 可见、调用成功、返回 schema 一致，0 failed。

## Task 5: 清理构建输出并建立分发合同

**Files:**
- Modify: `packages/oasis-professional-service/tsdown.config.mjs`
- Modify: `packages/oasis-professional-service/package.json`
- Modify: `packages/oasis-professional-service/test/client-build-contract.test.mjs`
- Create: `packages/oasis-professional-service/test/package-contract.test.mjs`

**Step 1: 写失败测试**

```js
test('build removes stale files from lib')
test('package dry-run contains only declared runtime files')
test('client artifact is lazy-CJS with the exact package id')
test('package scripts expose test and verify entrypoints')
```

**Step 2: 运行 RED**

在 `lib` 写入测试专用 `stale-sentinel.txt`，执行 build 后断言其不存在。Expected: 当前 `clean:false` 导致测试失败。

**Step 3: 最小实现**

- `clean: true`。
- 增加 `test`、`test:unit`、`test:integration`、`verify` 脚本；`verify` 顺序执行 frozen preflight、clean build、测试和 pack dry-run。
- `files` 继续使用显式白名单，不把测试、锁文件、证据或本地状态打入包。

**Step 4: 运行 GREEN**

```cmd
cd packages\oasis-professional-service
pnpm run build
pnpm test
npm pack --dry-run --json
```

Expected: stale sentinel 被删除；测试 0 failed；pack 文件清单只有预期运行文件。

## Task 6: 固化运行时 Slot 合同与非替换原则

**Files:**
- Modify: `.dsh/skills/dsh-plugin-development/SKILL.md`
- Modify: `.dsh/skills/dsh-plugin-development/references/official-contracts.md`
- Create: `docs/evidence/week1-supplement-2026-08-24/slot-tree-summary.json`
- Create: `docs/evidence/week1-supplement-2026-08-24/slot-conclusions.md`
- Create: `packages/oasis-professional-service/test/slot-contract.test.mjs`

**Step 1: 写静态合同测试**

测试项目 Skill 必须明确要求：先调用 `Slots.listSubTree` 全树，再对目标 Slot 调用带 `root` 的精确查询；禁止猜测 slot options；禁止默认注册 `root/sidebar/conversation/details`。

**Step 2: 运行 RED**

```cmd
node --test packages\oasis-professional-service\test\slot-contract.test.mjs
```

Expected: 旧 Skill 缺少完整 live Slot 决策规则时失败。

**Step 3: 查询真实 Slot 树**

在全新隔离 DSH Profile 中获取：

- `conversation.input.right`
- `shell.overlay`
- `details`

记录 purpose、kind、scope、options、standard props、owner props、current occupants、replacement risk 和 descendants。无法取得 live 工具原始返回时，本 Task 只能标 `STATIC_ONLY`，不得继续声称右栏合同已验证。

**Step 4: 写入硬性结论**

- 入口使用 `conversation.input.right` 的 list 协议。
- 工作台使用 `shell.overlay` 的 list/root 协议。
- 禁止将绿洲工作台注册到 `details` single 槽。
- normal 使用插件自有固定右轨；真实浏览器证明 `ctx.layout.openDetails/closeDetails` 会产生阻断交互的原生遮罩，因此禁止借用 DetailsPanel 几何。expanded 只读测量侧栏边界；禁止替换原生 DetailsPanel、复制 AppFrame 或写 DSH DOM。

**Step 5: 运行 GREEN**

```cmd
node --test packages\oasis-professional-service\test\slot-contract.test.mjs tests\skills\dsh-plugin-development.test.mjs tests\skills\dsh-plugin-development-discovery.test.mjs
```

Expected: 0 failed，且原始 live 查询保存在证据目录。

## Task 7: 建立按 Workspace 隔离的 Client 状态机

**Files:**
- Create: `packages/oasis-professional-service/src/client/workbench-store.js`
- Create: `packages/oasis-professional-service/src/client/project-resolution.js`
- Create: `packages/oasis-professional-service/test/workbench-store.test.mjs`
- Create: `packages/oasis-professional-service/test/project-resolution.test.mjs`

**Step 1: 写失败测试**

```js
test('maps current session to workspace only through sessionIds membership')
test('does not fall back to matching cwd')
test('keeps pages when switching sessions inside one workspace')
test('switches to an independent page set when workspace changes')
test('keeps hidden normal expanded state per workspace')
test('rejects task creation when no workspace owns the session')
```

第一周补充状态仅需：

```js
{
  panelMode: 'hidden' | 'normal' | 'expanded',
  activePageId: string | null,
  pages: [{ pageId, title, workflowId, view: 'chooser' | 'workspace' }]
}
```

不在本 Task 提前实现材料持久化、服务运行或项目写回。

**Step 2: 运行 RED**

```cmd
node --test packages\oasis-professional-service\test\workbench-store.test.mjs packages\oasis-professional-service\test\project-resolution.test.mjs
```

Expected: 模块不存在或行为未实现而失败。

**Step 3: 最小实现**

- Store 在 `apply(ctx)` 内创建，不使用模块全局单例，避免 HMR 后跨实例泄漏。
- `resolveWorkspaceId(currentSessionId, workspaceItems)` 只检查 `sessionIds.includes`。
- 所有 action 显式接收 `workspaceId`；未知 Workspace 拒绝写入。
- 页面切换和面板状态为纯函数，可在无浏览器环境测试。

**Step 4: 运行 GREEN**

```cmd
node --test packages\oasis-professional-service\test\workbench-store.test.mjs packages\oasis-professional-service\test\project-resolution.test.mjs
```

Expected: 0 failed。

## Task 8: 将 Client 入口升级为真实右栏消费者

**Files:**
- Modify: `packages/oasis-professional-service/src/client.js`
- Create: `packages/oasis-professional-service/src/client/WorkbenchEntry.js`
- Create: `packages/oasis-professional-service/src/client/OasisPanelHost.js`
- Create: `packages/oasis-professional-service/src/client/PanelChrome.js`
- Create: `packages/oasis-professional-service/src/client/PanelPages.js`
- Create: `packages/oasis-professional-service/src/client/panel-geometry.js`
- Create: `packages/oasis-professional-service/src/client/codex-icons.js`
- Create: `packages/oasis-professional-service/test/client-panel-contract.test.mjs`
- Create: `packages/oasis-professional-service/test/panel-geometry.test.mjs`
- Modify: `packages/oasis-professional-service/package.json`

**Step 1: 写失败合同测试**

```js
test('registers entry in conversation.input.right')
test('registers panel host in shell.overlay')
test('never registers oasis in details')
test('entry opens a visible normal panel without a window CustomEvent')
test('hidden normal expanded transitions preserve page state')
test('normal uses its own right rail without opening the DSH details modal')
test('expanded geometry starts after the rendered sidebar')
test('uses the approved Codex show hide expand restore SVG paths')
```

**Step 2: 运行 RED**

```cmd
node --test packages\oasis-professional-service\test\client-panel-contract.test.mjs packages\oasis-professional-service\test\panel-geometry.test.mjs
```

Expected: 旧代码只有事件生产者，且无 `shell.overlay` 注册，测试失败。

**Step 3: 实现最小可见面板**

- Client 依赖声明加入 DSH Layout；`apply(ctx)` 创建一个 workbench store 并向入口和面板闭包共享。
- Entry 直接调用 store action，不再通过 `window.dispatchEvent` 建立无类型全局总线。
- Panel Host 使用 `useSessions` 和 `useWorkspaces` 解析当前 `workspaceId`。
- hidden 返回空面板；normal 使用插件自有360px右轨，不调用 `ctx.layout.openDetails()`；expanded 宽度只读跟随侧栏右边界。
- expanded 的左边界只读跟随 AppFrame 第一个子项的实际右边界，覆盖中栏和右栏；不得修改 DSH 元素。
- ResizeObserver 只更新绿洲组件自身状态；dispose 时断开 observer、关闭本次打开的几何并释放 Slot 注册。
- 图标 path/viewBox 复制自已确认 SVG 资产并保留来源注释，不用相似字符或第三方替代图标。
- 初始页面只实现两张工作流卡片；选中后原位显示“输入材料”和“生成结果预览”的只读骨架。

**Step 4: 加入无障碍后置条件**

- 所有图标按钮有中文 `aria-label` 和 tooltip。
- 页签使用 `tablist/tab/tabpanel` 语义；键盘左右键切换，Delete/关闭前遵守未保存确认。
- 打开后焦点进入标题；隐藏后焦点回到触发按钮；expanded/restore 不丢焦点。
- `prefers-reduced-motion` 下禁用面板位移动画。

**Step 5: 运行 GREEN 与 build**

```cmd
node --test packages\oasis-professional-service\test\client-panel-contract.test.mjs packages\oasis-professional-service\test\panel-geometry.test.mjs packages\oasis-professional-service\test\workbench-store.test.mjs packages\oasis-professional-service\test\project-resolution.test.mjs
cd packages\oasis-professional-service
pnpm run build
```

Expected: 0 failed；build exit 0；产物不包含 `oasis-professional-service:open` 字符串。

## Task 9: 自动化隔离 Host 与浏览器后置条件

**Files:**
- Create: `scripts/verify-week1-supplement.mjs`
- Create: `tests/integration/week1-supplement-browser.test.mjs`
- Create: `output/playwright/week1-supplement/.gitkeep`
- Output: `docs/evidence/week1-supplement-2026-08-24/runtime/`
- Output: `output/playwright/week1-supplement/`

**Step 1: 写浏览器失败测试**

在测试内定义稳定的 `data-testid` 后置条件：

```js
await expect(panel).toHaveAttribute('data-mode', 'normal')
await expect(panel).toHaveAttribute('data-workspace-id', workspaceA)
await expect(panel).toHaveAttribute('data-mode', 'expanded')
await expect(panel).toBeHidden()
```

并覆盖：

1. 项目 A 新建两页。
2. A 内切会话，页签保持。
3. 切项目 B，页签为空。
4. 回到 A，页签恢复。
5. normal → expanded → normal → hidden → normal。
6. 隐藏后查询 live Slot 树，原生 `details` occupant 未变化。
7. console error 0、未处理 promise rejection 0、Client 请求 200。

**Step 2: 运行 RED**

```cmd
node --test tests\integration\week1-supplement-browser.test.mjs
```

Expected: 在自动启动能力未实现前失败，而不是 skip 或空通过。

**Step 3: 实现一键隔离验证器**

验证器顺序必须固定：

1. 创建 `%TEMP%` 下全新、路径已规范化的 `DSH_HOME`。
2. 记录真实 Profile 全树哈希。
3. 通过已解析的 DSH binary 安装本地 Bundle 并 `--dump-config`。
4. 启动 loopback Host 到已确认空闲端口。
5. 执行 RPC 正/负场景与 Skill 发现。
6. 使用用户允许的测试浏览器执行项目与面板场景，保存 screenshot、trace、console 和 request log。
7. 关闭浏览器与 Host，确认端口不再监听。
8. 再次哈希真实 Profile，逐字节比较。
9. 仅在确认临时根仍位于 `%TEMP%` 且无 junction/symlink 后清理。

任一步失败必须停止后续写操作、保留诊断并返回非零；不得用 finally 抹掉原始错误。

**Step 4: 运行 GREEN**

```cmd
node scripts\verify-week1-supplement.mjs
```

Expected: exit 0；生成 normal、expanded、hidden 和 A/B 项目切换截图；真实 Profile before/after 哈希完全一致。

若当前环境没有用户允许的测试浏览器或 live Slot 工具，保存静态与 Host 结果并将状态保持为 `STATIC_ONLY`，不得伪造浏览器证据。

## Task 10: 修复 Skill 校验链并发布补充审计报告

**Files:**
- Modify: `.dsh/skills/dsh-plugin-development/SKILL.md`
- Modify: `.dsh/skills/oasis-rd-intake/SKILL.md`
- Modify: `README.md`
- Modify: `docs/第一周-DSH插件技术验证记录.md`（只追加补充结果，不改写历史段落）
- Create: `docs/第一周-补充工作验证报告.md`
- Create: `docs/evidence/week1-supplement-2026-08-24/source-hashes-after.txt`
- Create: `docs/evidence/week1-supplement-2026-08-24/profile-hashes-after.txt`

**Step 1: 修复 Codex Skill validator 前置**

不得向全局 Python 静默安装 PyYAML。优先使用工作区已配置运行时或声明清晰的隔离环境；执行：

```cmd
python C:\Users\TinaD\.codex\skills\.system\skill-creator\scripts\quick_validate.py .dsh\skills\dsh-plugin-development
python C:\Users\TinaD\.codex\skills\.system\skill-creator\scripts\quick_validate.py .dsh\skills\oasis-rd-intake
```

如果实际系统路径不同，先通过 Skill 根解析，不硬编码不存在的路径。缺少依赖且未获安装许可时记录工具链缺口，状态不能写成全部通过。

**Step 2: 运行全量验证**

```cmd
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service
pnpm run verify
cd /d D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研
node scripts\verify-week1-supplement.mjs
```

Expected: 两条命令均 exit 0；不得只截取末尾绿灯。

**Step 3: 生成 after 基线与差异**

- 源文件差异必须全部追溯到本文 Task 2-10。
- 真实 Profile before/after 必须逐文件完全一致；任何差异按 P0 处理并立即停止。
- 工作区无 Git，因此不执行 `git add`/`git commit`；报告以文件清单和 SHA-256 代替提交证据。

**Step 4: 编写 findings-first 报告**

报告顺序：

1. P0-P3 未解决发现。
2. 第一周原审计 P2-01 至 P2-08 的逐项裁决。
3. 三状态 UI、项目关联和原生 UI 保护证据。
4. 单测、构建、Host、Browser、外部服务各自的证据边界。
5. 第二周是否允许开始。
6. 唯一 V4.1 状态。

**Step 5: 第二周准入判定**

- `PASS`：全部必需门禁通过且没有 P0-P2。
- `PASS_WITH_CONCERNS`：仅余不影响第二周的已披露 P3。
- `STATIC_ONLY`：缺 live Slot、真实 Host 或浏览器证据。
- `FAIL`：任一可执行 P0-P2 未关闭。

`STATIC_ONLY` 或 `FAIL` 时，不得开始第二周多任务页持久化和外部适配器工作。

## 最终执行顺序与停止条件

执行顺序固定为：

```text
Task 1 基线
  -> Task 2-5 审计缺口修复
  -> Task 6 live Slot 合同
  -> Task 7 项目状态机
  -> Task 8 最小右栏
  -> Task 9 Host/Browser E2E
  -> Task 10 补充审计
```

立即停止条件：

- 任何命令解析到真实 Profile 作为写目标。
- live Slot 结果显示 `shell.overlay` 不存在、不允许交互内容或当前实现会替换原生 occupant。
- normal/expanded 需要修改 DSH DOM、复制 AppFrame 或覆盖 `details` 才能实现。
- 源文件或 Profile baseline 出现无法解释的变化。
- 需要真实生产凭据、远程写入、发布或部署才能让测试通过。
- 浏览器测试仅能通过降低断言、skip 或屏蔽 console error 实现。
