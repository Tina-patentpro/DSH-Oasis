# Week 3 Local Professional Loop Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不接入 Dify、收费或真实专业服务的前提下，把现有项目右栏从持久化骨架扩展为“schema 表单 → 材料引用 → 本地 mock 运行 → 结果预览 → 人工审核 → no-overwrite 写回”的可追溯本地闭环。

**Architecture:** 保留 `oasis_workbench` Domain version 1，将记录迁移为 schema v2；`state/replace` 只保存 Client 可编辑投影，材料、运行、审核和写回由 Host 专用命令在 Workspace 队列中提交。Host 通过 `workspaceRegistry` 解析 canonical 项目根，本地适配器生成确定性 mock 产物，两阶段 writeback 只向用户确认的新目录发布新文件。

**Tech Stack:** DeepSeek Harness `0.1.1-rc.2`、`@deepseek-ai/dsh-workspace`、DSH Domain Storage/Connection、Zod 4.4.3、Cordis 4.0.1、React 18.2、Node.js 22.19、pnpm、Node test runner、Playwright、Windows NTFS 文件语义。

---

## 执行规则

- 执行前再次读取 `docs/plans/2026-08-25-week3-design.md`，不得临场扩大范围。
- 每批先运行 `git status --short --branch`；发现无关 dirty/staged 变更即停止，不 reset/restore/stage/commit 它们。
- 每项生产行为先写 RED，确认因缺少目标行为失败，再做最小实现并转绿。
- 所有文件系统测试只写全新 `%TEMP%\oasis-dsh-week3-*`；真实 `C:\Users\TinaD\.dsh` 和当前仓库业务文件只读。
- 仅在目标测试和 `git diff --check` 通过后，按任务列出的文件精确暂存；不使用 `git add .`。
- 建议提交点只在用户已批准执行且工作树边界清楚时使用；每次提交后复查未纳入无关文件。
- 本计划不实现 Dify、收费、账户、报价、异步远程任务、真实下载或专业 Skills。

## Task 1: 建立 Week 3 基线、证据账本和冻结合同

**Files:**
- Create: `docs/evidence/week3-implementation-2026-08-25/evidence-ledger.md`
- Create: `docs/evidence/week3-implementation-2026-08-25/baseline/capture-baseline.mjs`
- Modify: `.dsh/skills/dsh-plugin-development/references/official-contracts.md`
- Modify: `packages/oasis-professional-service/package.json`
- Modify: `packages/oasis-professional-service/pnpm-lock.yaml`

**Steps:**

1. 记录 HEAD、branch/upstream、dirty/staged、Node/pnpm/DSH、`dsh.cmd` 实际路径、包解析路径和真实 DSH Home 全树 SHA-256/lstat 基线。
2. 从本机 `@deepseek-ai/dsh-workspace@0.1.1-rc.2` 类型与 README 固定 `ctx.workspaceRegistry.get(id)`、`Workspace.path/status()`、canonical realpath 合同；记录来源文件和 SHA-256。
3. RED：在 package contract 中要求 `@deepseek-ai/dsh-workspace` 明确固定 peer/dev dependency；运行目标测试，预期因缺少直接声明失败。
4. 只使用现有 pnpm store 增加精确版本，不升级其他依赖；复查 lock diff 只含目标关系。
5. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\package-contract.test.mjs test\host-runtime.integration.test.mjs
   ```

   预期全部通过。
6. 运行 baseline capture，确认真实 Profile 未被写入；证据账本将 static/unit/Host/browser/filesystem/profile 分栏。
7. 建议提交：`chore(week3): freeze workspace and evidence contracts`。

**Stop:** 解析到的 DSH/workspace 版本不是 `0.1.1-rc.2`，或 baseline 需要写真实 Profile 时停止。

## Task 2: 将持久记录升级为 schema v2，并保护 Host 所有证据

**Files:**
- Modify: `packages/oasis-professional-service/src/workbench-contract.js`
- Modify: `packages/oasis-professional-service/src/workbench-domain.js`
- Modify: `packages/oasis-professional-service/src/workbench-repository.js`
- Modify: `packages/oasis-professional-service/src/workbench-rpc.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-model.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Create: `packages/oasis-professional-service/test/workbench-migration.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-contract.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-domain.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-repository.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-model.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-persistence.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-remote.test.mjs`

**Steps:**

1. RED：精确合法 v1 迁移为 v2；任意合法旧 `inputRefs` 无损包入只迁移的 `legacy-v1` 引用且不得冒充路径/哈希；v1 合法的部分工作流三元组逐值保留但不可修改，新 task 只能全空或完整选择；Domain version 仍为 1；只读迁移不 put；下一次明确写入落 v2；未知版本拒绝。
2. RED：v2 task 的 material/run/order/map/active ID 不变量、8-run 上限、writeback 归属、256 KiB artifact 和 1 MiB 根预算。
3. RED：`WorkbenchEditableDraftV2` 不允许 `inputRefs`、`runs`、`runOrder`；已有 task 保存标题/表单时 Host 合并证据；Client 尝试篡改多余字段为 bad request；关闭 task 是唯一整 task 删除路径。
4. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\workbench-migration.test.mjs test\workbench-contract.test.mjs test\workbench-repository.test.mjs
   ```

   预期 RED 原因为 v2/migration/merge 尚不存在，而非 fixture 语法错误。
5. 实现严格 v1/v2 storage union、`migrateWorkbenchRecordV1ToV2()`、v2 response schema 和 v2 editable draft schema。
6. 将 repository 的 `replace` 改为 `replaceEditable`：同一 Workspace 队列中读取 current、检查 revision、合并证据、校验完整 v2、put 后发布。
7. 增加仅供 Host 服务调用的 `mutate(workspaceId, expectedRevision?, mutator)`；mutator 不能跳过 parse/预算/revision，不能向 Client 导出。
8. 更新 Client record/model 转换；页面可读取 Host 证据，但 `workspaceStateToDraft` 只输出 editable 字段。
9. 逐个运行上述目标测试，再运行 `node --test test\workbench-*.test.mjs`，预期全绿。
10. 建议提交：`feat(week3): migrate workbench records to schema v2`。

**Stop:** 任一当前合法 v1 fixture 不能确定性迁移，或必须改变 Domain name/version 才能打开时停止。

## Task 3: 建立版本化工作流目录、Host 表单校验和 Client 目录 RPC

**Files:**
- Create: `packages/oasis-professional-service/src/workflow-catalog.js`
- Modify: `packages/oasis-professional-service/src/workbench-contract.js`
- Create: `packages/oasis-professional-service/src/workbench-service.js`
- Modify: `packages/oasis-professional-service/src/workbench-rpc.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Create: `packages/oasis-professional-service/test/workflow-catalog.test.mjs`
- Create: `packages/oasis-professional-service/test/workbench-service.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-remote.test.mjs`

**Steps:**

1. 先创建空的 `workbench-service.js` 组合根；不把目录逻辑塞进 RPC。
2. RED：目录 schemaVersion 1、两个 workflow、版本 `'1'`、受限控件集合、字段 ID 唯一、select options、工作类型过滤和深冻结。
3. RED：技术和专利 form 的必填、额外键、单项/总量、空白、select 非法值和边界长度；错误精确指向 `fieldId`。
4. RED：`workflow/catalog` strict payload/response；unknown workType 为 bad request；Client 对 malformed response fail-closed。
5. 运行目标测试确认 RED。
6. 实现静态冻结目录、由同一目录编译的 Host 校验器和 strict RPC；React 不拥有第二份工作流常量。
7. 确保目录不含价格、服务 URL、鉴权、Dify 字段或“可正式使用”标记；标注 `executionMode: local-mock`。
8. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\workflow-catalog.test.mjs test\workbench-service.test.mjs test\workbench-rpc.test.mjs test\workbench-remote.test.mjs
   ```

9. 建议提交：`feat(week3): add versioned local workflow catalog`。

## Task 4: 实现 Workspace 材料引用、流式哈希和运行前复检

**Files:**
- Create: `packages/oasis-professional-service/src/workspace-materials.js`
- Modify: `packages/oasis-professional-service/src/workbench-service.js`
- Modify: `packages/oasis-professional-service/src/workbench-rpc.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Modify: `packages/oasis-professional-service/src/index.js`
- Create: `packages/oasis-professional-service/test/workspace-materials.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-service.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`
- Modify: `packages/oasis-professional-service/test/host-runtime.integration.test.mjs`

**Steps:**

1. RED：未知 Workspace、missing dir、绝对/UNC/drive/`..`/ADS/NUL/尾点路径、目录、symlink/junction、Workspace 外 realpath、扩展名、50 MiB 上限。
2. RED：正常文件使用流式 SHA-256；状态只含相对路径/元数据；读取期间变化返回 `MATERIAL_CHANGED`；错误和日志不含正文。
3. RED：`material/add` 要求 explicit confirmation，`refresh` 只能更新同一 ref 的观察证据，`remove` 不改变历史运行快照；三个命令均使用 revision 并在 Workspace 队列提交。
4. 运行目标测试确认 RED 后，实现 path segment validator、WorkspaceRegistry resolver、read-only file handle hashing 和 post-stat 检查。
5. Host `inject` 加入 `workspaceRegistry`；fixture 显式提供真实服务，不以假的 cwd 猜 Workspace。
6. 实现 strict material RPC 和 Client remote；所有响应通过 shared schema。
7. 添加“运行前重新哈希所有引用”服务函数；变化时不自动刷新引用。
8. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\workspace-materials.test.mjs test\workbench-service.test.mjs test\workbench-rpc.test.mjs test\host-runtime.integration.test.mjs
   ```

9. 建议提交：`feat(week3): add host-verified material references`。

**Stop:** Windows 路径最终落点或 reparse 边界无法 fail-closed 证明时，不实现写回，先修复路径原语。

## Task 5: 实现确定性 local mock、不可变运行历史和审核门

**Files:**
- Create: `packages/oasis-professional-service/src/local-mock-runner.js`
- Modify: `packages/oasis-professional-service/src/workbench-service.js`
- Modify: `packages/oasis-professional-service/src/workbench-rpc.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Create: `packages/oasis-professional-service/test/local-mock-runner.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-service.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-repository.test.mjs`

**Steps:**

1. RED：canonical JSON/hash 对 key 顺序稳定；同一 snapshot 得到同正文/artifact hash；不同关键输入得到不同 input/artifact hash。
2. RED：主 Markdown 恰有八个必备 H2；技术输出含五类结果；专利输出含术语、支持矩阵、权利要求/说明书骨架和问题；用户 HTML/Markdown 不执行。
3. RED：技术结果为 warning；专利含未确认事实为 blocked；blocked 不能 approved；mock 永不 ready，且 UI/正文 disclaimer 必需。
4. RED：`task/create` 只接受 task/revision/requestKey，从 Host 权威草稿捕获输入；材料先复检；同键同快照幂等；同键异快照冲突；第 9 个运行拒绝且前 8 个不变。
5. RED：修改草稿创建新运行后，旧 snapshot/result/review 字节等价；review 只改目标 run，changes-requested note 必填。
6. 实现纯 runner，不访问 repository、时钟、随机数、fs 或网络；服务层注入 clock/id，提交完整运行。
7. 实现 `task/create`、`task/review` strict RPC 和 Client remote；返回提交后的权威 record/revision，沿用冲突语义。
8. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\local-mock-runner.test.mjs test\workbench-service.test.mjs test\workbench-rpc.test.mjs test\workbench-repository.test.mjs
   ```

9. 建议提交：`feat(week3): add traceable local mock runs and review gate`。

## Task 6: 实现两阶段 no-overwrite 写回

**Files:**
- Create: `packages/oasis-professional-service/src/writeback-service.js`
- Modify: `packages/oasis-professional-service/src/workbench-service.js`
- Modify: `packages/oasis-professional-service/src/workbench-rpc.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-remote.js`
- Create: `packages/oasis-professional-service/test/writeback-service.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-service.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-rpc.test.mjs`

**Steps:**

1. RED：prepare 只接受 approved、非 blocked、属于该 run 的 artifact；相对新目录合法；manifest 含绝对目标、两个文件、大小/hash/过期时间；token 不进入 record。
2. RED：目标目录已存在、父目录越界/缺失/symlink/junction、保留名、路径过长全部在写入前拒绝。
3. RED：token 10 分钟过期、单次消费、Host 重启失效；prepare 后目标出现时 commit 拒绝且目标内容不变。
4. RED：两个 token 并发同一目标最多一个成功；最终发布不覆盖；暂存/主文件/元数据/link/Domain index 各故障点有确定语义。
5. RED：失败只清理本次已知临时文件和空新目录，不递归删除；既有相邻文件前后 SHA-256 相同。
6. 实现 token store（128 上限和过期清理）、canonical target lock、同父目录 staging、`fsync`、最终 `mkdir` 和 hard-link publish。
7. 生成相邻 `.oasis.json`，不写全局 lineage；成功后通过 repository Host mutation 追加 WritebackRecord。
8. 对“文件已提交但 Domain 索引失败”返回 `WRITEBACK_COMMITTED_INDEX_FAILED`，保留产物和 manifest，不伪报全失败。
9. 实现 strict prepare/commit RPC 和 Client remote；token/绝对路径不得出现在日志或持久状态。
10. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\writeback-service.test.mjs test\workbench-service.test.mjs test\workbench-rpc.test.mjs
   ```

11. 建议提交：`feat(week3): add confirmed no-overwrite writeback`。

## Task 7: 将右栏骨架转换为 schema 原生专业工作区

**Files:**
- Create: `packages/oasis-professional-service/src/client/WorkflowForm.js`
- Create: `packages/oasis-professional-service/src/client/MaterialReferences.js`
- Create: `packages/oasis-professional-service/src/client/RunPreview.js`
- Create: `packages/oasis-professional-service/src/client/WritebackPanel.js`
- Modify: `packages/oasis-professional-service/src/client/PanelPages.js`
- Modify: `packages/oasis-professional-service/src/client/OasisPanelHost.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-store.js`
- Modify: `packages/oasis-professional-service/src/client/workbench-model.js`
- Modify: `packages/oasis-professional-service/src/client.js`
- Create: `packages/oasis-professional-service/test/panel-local-loop-ui.test.mjs`
- Modify: `packages/oasis-professional-service/test/panel-persistence-ui.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-store.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-persistence.test.mjs`
- Modify: `packages/oasis-professional-service/test/client-panel-contract.test.mjs`

**Steps:**

1. RED：chooser 来自 remote catalog；选择后同一 page/task DOM 身份原位转为 workspace；没有硬编码卡片常量。
2. RED：四种字段控件、必填/边界/错误焦点；本地状态立即更新；400 ms 保存合并；run/切项目/关闭/隐藏前 flush。
3. RED：材料 add/refresh/remove 的 confirmation、短 SHA、大小、正文未读取说明和错误动作。
4. RED：生成按钮在保存未 settle、材料变化、form invalid 或 operation in-flight 时禁用并给出原因；requestKey 在同一次重试中保持。
5. RED：运行历史切换、草稿偏离、旧运行不变；结果通过 React 文本节点渲染，无 `dangerouslySetInnerHTML`。
6. RED：blocked 无批准/写回；changes-requested note；approved 文案不宣称专业/法律结论。
7. RED：prepare 后显示绝对路径和两文件 hash，用户再次勾选确认才可 commit；成功/冲突/index-warning 均有不同反馈。
8. RED：有运行历史的关闭 task 显示二次确认；A/B 临时操作状态互不串用；sync conflict 保留草稿。
9. 实现小组件和 store operation 状态；normal 纵向、expanded 双列只改 CSS grid，不复制 store 或 DOM 业务树。
10. 检查 label、keyboard、`aria-live`、alert focus、disabled reason、缩放和窄屏回退。
11. 运行：

   ```text
   Workdir: packages\oasis-professional-service
   node --test test\panel-local-loop-ui.test.mjs test\panel-persistence-ui.test.mjs test\workbench-store.test.mjs test\workbench-persistence.test.mjs test\client-panel-contract.test.mjs
   npm run build
   ```

12. 建议提交：`feat(week3): turn panel skeleton into local professional loop`。

## Task 8: Host1/Host2、文件系统与真实浏览器闭环验证

**Files:**
- Create: `scripts/verify-week3-local-loop.mjs`
- Create: `tests/integration/week3-local-loop-browser.test.mjs`
- Create: `tests/fixtures/oasis-week3-loop-probe/README.md`
- Create: `tests/fixtures/oasis-week3-loop-probe/materials/technical.md`
- Create: `tests/fixtures/oasis-week3-loop-probe/materials/patent-disclosure.txt`
- Update: `docs/evidence/week3-implementation-2026-08-25/evidence-ledger.md`
- Create/Update: `docs/evidence/week3-local-loop-2026-08-25/*`

**Steps:**

1. 脚本开始时解析所有临时根的绝对路径并证明位于 `%TEMP%\oasis-dsh-week3-*`；禁止接收当前仓库或真实 DSH Home 作为写根。
2. 复制 fixture 到全新 Workspace A/B，捕获每个既有路径的 SHA-256/lstat；另捕获真实 DSH Home 强基线。
3. Host1：验证 v1 fixture hydrate→显式 mutation 落 v2；A 材料/hash/技术 run1→编辑→run2；B patent blocked→补充→warning→approved。
4. Host1：prepare/commit 新目录，核对主 Markdown 与 `.oasis.json` hash；再次同目录、prepare 后冲突和并发 commit 全部 no-overwrite。
5. 停止 Host1；Host2 同一临时 Home 重启，核对 A/B、运行历史、review、writeback；Host1 token 必须失效。
6. Playwright：真实右栏 chooser 原位转换、schema 字段、材料、两运行、草稿偏离、blocked 审核、批准和 prepare/commit；刷新与 A/A/B/A 恢复。
7. 回归 normal/expanded/hidden、窄屏 expanded、原生 details、左栏/中栏 node identity；console/pageerror 为 0。
8. 记录浏览器 request host，预期只有 loopback DSH 资源/RPC，无 Dify、收费和第三方业务请求。
9. 比较 Workspace A/B 基线：只允许声明的新 writeback 目录和文件；全部其他既有路径 hash/lstat 不变。
10. 比较真实 DSH Home 前后全树强基线；验证端口关闭后再清理已解析、已核对的临时根。
11. 运行：

   ```text
   Workdir: repository root
   node scripts\verify-week3-local-loop.mjs
   node --test tests\integration\week3-local-loop-browser.test.mjs
   ```

12. 任一层失败即保留该次证据根，不将 Week 3 标为完成。
13. 建议提交：`test(week3): prove isolated local professional loop`。

## Task 9: 全量验证、审计、报告与路线图关闭

**Files:**
- Create: `docs/第三周-本地闭环验证报告.md`
- Create: `docs/第三周-全面审计报告.md`
- Modify: `docs/evidence/week3-implementation-2026-08-25/evidence-ledger.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-08-24-dsh-beta-overall-plan.md`

**Steps:**

1. 先运行工具链 preflight，记录 `generated_at`、输入 hash、命令和 exit code，禁止复用旧绿灯。
2. package fresh verification：

   ```text
   Workdir: packages\oasis-professional-service
   pnpm install --offline --frozen-lockfile
   pnpm run verify
   ```

3. 根级回归：

   ```text
   Workdir: repository root
   node --test tests\scripts\*.test.mjs tests\skills\*.test.mjs
   node scripts\verify-week1-supplement.mjs
   node scripts\verify-week2-persistence.mjs
   node scripts\verify-week3-local-loop.mjs
   ```

4. 扫描 package tarball，确保不含 test、evidence、临时 Profile、材料 fixture 正文、token、绝对用户路径或密钥。
5. 静态扫描 `localStorage`、`dangerouslySetInnerHTML`、Dify/收费 URL、Client secret、宽泛递归删除、覆盖写 flag 和非本机监听。
6. findings-first 全面审计：合同/迁移、数据所有权、路径/TOCTOU、no-overwrite、隐私、可访问性、Host/browser/Profile 和证据新鲜度分别列 finding。
7. 只有无未解决 P0-P2 且全部 Week 3 必需证据齐全时，报告使用唯一状态 `PASS` 或 `PASS_WITH_CONCERNS`；缺 Host/浏览器时为 `STATIC_ONLY`，不能关闭路线图。
8. 更新 README 的能力边界；总体计划第三周仅在退出门通过后改为“已关闭”，并链接新报告。第四周仍保持未开始。
9. 运行 `git diff --check`，核对 `git status --short --branch` 和 staged diff；只提交 Week 3 文件。
10. 建议提交：`docs(week3): close verified local professional loop`。

## 执行批次建议

为便于审计和回滚，确认执行后分三批：

1. **第三周第一批：领域合同**——Task 1～3；schema v2、所有权和 catalog。
2. **第三周第二批：本地闭环**——Task 4～7；材料、mock、审核、写回和右栏 UI。
3. **第三周关闭批：证据与审计**——Task 8～9；Host/browser/Profile/no-overwrite 证据和最终裁决。

每批结束都先提交审计结果供用户确认；未获下一批确认，不跨批继续。
