# Week 3 Independent Re-audit Remediation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** 以最小、可验证的修改关闭独立复审 W3R-01～W3R-06，并重新建立 Week 3 的本地关闭证据。

**执行状态：已完成。** 2026-08-29 已通过最终修复报告和 Task 6 证据重新关闭 Week 3；修复开始到 Task 6 确认基线之间的外部 Profile 漂移作为剩余关注项披露，不改写历史证据。

**Architecture:** 将写回从“创建目标目录后逐文件 hard-link 发布”改为“在目标同级完整暂存、校验后一次性目录 rename 发布”，从根因上消除目标创建后的逐文件发布窗口和提交后暂存清理分支。持久记录读取时复算 canonical input 与 artifact body 哈希；三个阶段验证器统一对整个真实 `.dsh` 使用 lstat/readlink 不跟随链接的强基线。closure 脚本只保留静态包检查职责，不再宣称关键业务语义已被证明。

**Tech Stack:** Node.js 22 ESM、`node:test`、`node:fs/promises`、Zod 4、pnpm、DSH `0.1.1-rc.2`、本地 Edge/loopback Host。

---

## 执行边界

- 当前 Week 3 工作树包含大量既有未提交修改；不得 reset、restore、暂存、提交或吸收无关变化。
- 修复仅修改本计划列出的生产、测试和治理文件；每批后用定向 `git diff` 复核。
- 不运行或扩展 `week3-comprehensive-reaudit-2026-08-26/findings` 下的对抗性探针。
- 只运行项目已有标准测试、普通故障注入单元测试、loopback Host/浏览器验证和只读 Profile 基线。
- 不调用 Dify、收费管理、真实模型、外部专业服务或生产系统。
- 真实 `C:\Users\TinaD\.dsh` 只允许 lstat/readlink/read/hash；任何变化立即停止。
- 修复证据只写入新目录：`docs/evidence/week3-reaudit-remediation-2026-08-27`。
- 当前脏工作树不能安全拆成独立提交；除非用户另行明确授权精确文件集合，否则本轮不提交。

## 根因与修复决策

| Finding | 根因 | 采用方案 | 不采用方案 |
|---|---|---|---|
| W3R-01 | 暂存完成后先创建空目标目录，再逐文件发布；目标身份在最终发布期间不是单一原子裁决 | 在目标同级建立完整暂存目录，校验两个文件后直接 `rename(stageDirectory, target)`；目标已存在时失败 | 不在逐文件 hard-link 前后继续堆叠路径复检；复检仍不能消除检查与使用之间的窗口 |
| W3R-02 | 文件提交后还执行删除暂存文件/目录，导致可能出现“已提交但 cleanup 抛错且无 record” | rename 成功即返回预先构造的 WritebackRecord；成功后不再执行任何文件系统操作 | 不新增第二套 committed-cleanup 恢复错误；避免继续保留该不可判定后置状态 |
| W3R-03 | Zod 只验证声明哈希格式和互相引用，Domain parse 未复算实际内容 | 导出 canonical input hash 计算函数；`parseWorkbenchRecord` 在结构解析后复算每个 run 的 input/artifact 哈希 | 不升级 schemaVersion；合法现存 v2 记录已经满足该不变量，损坏记录应 fail-closed |
| W3R-04 | Week 1 保留了早期 `profiles/web` 默认值和“遇 link 即失败”的私有 hashTree | 默认改为整个 `.dsh`；复用 `baseline-capture-core.mjs` 的 lstat/readlink、不跟随 link 策略 | 不把 README 降格为只保护 web 子树；Week 2/3 和总体合同已经采用 whole-tree |
| W3R-05 | closure 工具把字符串 marker 当成行为证明，并输出容易被理解为总体验收的状态 | 删除正向语义 marker 检查；输出 `scope: STATIC_PACKAGE_ONLY`、`semanticProof: false`、`result: CLEAN/FINDINGS` 和限制清单 | 不增加更多源码字符串；关键行为由 node:test 与 Host/browser 后置条件证明 |
| W3R-06 | 设计、总体计划、旧报告和独立复审结论未形成 supersession 链 | 更新设计/总体计划状态，给旧报告加 superseded 提示，新增独立修复报告 | 不改写历史证据文件和旧运行输出 |

## Task 0：冻结修复前基线和变更合同

**Files**

- Create: `docs/evidence/week3-reaudit-remediation-2026-08-27/baseline/capture-remediation-baseline.mjs`
- Create: `docs/evidence/week3-reaudit-remediation-2026-08-27/evidence-ledger.md`

**Steps**

1. 记录 Git HEAD、完整 `git status --short --branch`、Node/pnpm/DSH 版本、官方 Workspace 合同哈希。
2. 对产品源码、测试、验证器、README、Week 3 计划/报告生成逐文件 before TSV。
3. 对全部既有 evidence 根（包含独立复审根）生成冻结摘要；新 remediation 根必须排除自身。
4. 对整个真实 `C:\Users\TinaD\.dsh` 以 lstat/readlink 不跟随策略生成 before TSV 和摘要。
5. 将允许变化路径精确写入 ledger；若 HEAD、历史证据或真实 Profile 与独立复审末态不同，停止执行。

**Command**

```cmd
node docs\evidence\week3-reaudit-remediation-2026-08-27\baseline\capture-remediation-baseline.mjs before
```

**Expected:** exit 0；记录当前基线，不修改产品或真实 Profile。

## Task 1：以原子目录发布同时修复 W3R-01 与 W3R-02

**Files**

- Modify: `packages/oasis-professional-service/src/writeback-service.js:1-22,190-218,386-507`
- Modify: `packages/oasis-professional-service/test/writeback-service.test.mjs:1-75,225-340`
- Modify: `docs/plans/2026-08-25-week3-design.md:355-386`

### Step 1：写 RED

在 `writeback-service.test.mjs` 中先改变/新增下列行为测试：

1. “publish atomically renames one verified staging directory into a new target”：注入 `rename` 记录器，要求只调用一次目录 rename，目标含两份已校验文件，record 不含绝对路径或 token。
2. “target created at final rename is preserved”：在普通 `rename` 包装器中创建一个现有目标目录和 sentinel，再调用原生 rename；期望业务错误且 sentinel 不变。
3. “staging write or directory rename failure cleans only operation-owned staging paths”：覆盖主文件写入、元数据写入、目录 rename 三个普通故障点；邻近文件保持字节一致。
4. 源码合同不再含 `WRITEBACK_COMMITTED_CLEANUP_FAILED`，因为成功 rename 后不得再有文件系统步骤。

### Step 2：确认 RED

```cmd
cd packages\oasis-professional-service
node --test test\writeback-service.test.mjs
```

**Expected:** 新 rename 测试因 `fileSystem.rename` 未实现、旧 hard-link 行为仍存在而失败；失败原因必须与目标行为一致。

### Step 3：最小实现

1. `DEFAULT_FILE_SYSTEM` 和 option contract 用 `rename` 替换 `link`。
2. 继续在目标同级创建唯一 staging directory，以 `wx` 写入、fsync 并读取复核两个文件。
3. 在 rename 前执行现有 `revalidatePlanTarget(plan)`。
4. 在 rename 前调用 `clock()` 并构造冻结的 WritebackRecord；若 clock 失败，尚未提交。
5. 执行且只执行一次 `fileSystem.rename(stageDirectory, target)`；成功后立即返回预构造 record。
6. rename 失败时只清理 staging files/directory；如果目标此时存在，映射为 `WRITEBACK_TARGET_EXISTS`，且绝不删除目标。
7. 删除 publishedFiles、targetCreated、逐文件 hard-link、提交后 hash readback 及 `WRITEBACK_COMMITTED_CLEANUP_FAILED` 分支。
8. 更新设计文档为“同父目录完整暂存 + 单次目录 rename；既有目标为失败裁决”。

### Step 4：GREEN 与相邻回归

```cmd
cd packages\oasis-professional-service
node --test test\writeback-service.test.mjs test\workbench-service.test.mjs test\workbench-rpc.test.mjs test\workbench-store.test.mjs
```

**Expected:** exit 0；没有 committed-cleanup 分支；已有并发、过期 token、prepare 后冲突、index failure 语义仍通过。

## Task 2：复算持久证据哈希，修复 W3R-03

**Files**

- Modify: `packages/oasis-professional-service/src/local-mock-runner.js:34-105,287-292`
- Modify: `packages/oasis-professional-service/src/workbench-domain.js:1-70`
- Modify: `packages/oasis-professional-service/test/workbench-fixtures.mjs:1-90`
- Modify: `packages/oasis-professional-service/test/workbench-domain.test.mjs:1-100`
- Modify if assertions use fixture placeholder hashes: `packages/oasis-professional-service/test/workbench-service.test.mjs`

### Step 1：写 RED

1. 用真实 canonical input 和真实 artifact body hash 构造合法 v2 fixture。
2. 新增测试：合法记录可 parse；只修改 artifact body 时 parse 必须拒绝；只修改 formValues 或 inputRefs 时 parse 必须拒绝。
3. 错误信息必须定位 taskId/runId，并区分 input snapshot 与 artifact integrity。

### Step 2：确认 RED

```cmd
cd packages\oasis-professional-service
node --test test\workbench-domain.test.mjs
```

**Expected:** 两个 tamper 测试以 “Missing expected exception” 类原因失败，而合法 fixture 通过。

### Step 3：最小实现

1. 将 `computeInputHash` 以明确名称 `computeCanonicalInputSha256` 导出，并让 `createCanonicalInputSnapshot`、`runLocalMock` 复用它。
2. `workbench-domain.js` 在结构 schema parse 后、deepFreeze 前遍历 task/run：
   - 用 run workflow identity、snapshot formValues/inputRefs 复算 input SHA-256；
   - 对 artifact body 复算 SHA-256，并再次核对 artifactId；
   - 不读取材料正文，不增加持久字段。
3. fixture 不再使用 `'b'.repeat(64)` / `'c'.repeat(64)` 伪哈希；所有依赖 fixture 的测试改为引用实际 snapshot/artifact 值。
4. schemaVersion 仍为 2；旧的合法记录无需迁移，损坏记录 fail-closed。

### Step 4：GREEN 与持久化回归

```cmd
cd packages\oasis-professional-service
node --test test\workbench-domain.test.mjs test\workbench-migration.test.mjs test\workbench-persistence.test.mjs test\workbench-repository.test.mjs test\workbench-service.test.mjs
```

**Expected:** exit 0；重启恢复和 v1→v2 迁移仍通过，tamper 测试转绿。

## Task 3：统一 whole-tree Profile 基线，修复 W3R-04

**Files**

- Modify: `scripts/verify-week1-supplement.mjs:1-45,220-290`
- Create: `tests/scripts/real-profile-baseline-contract.test.mjs`
- Modify: `README.md:41-52`

### Step 1：写 RED

新根测试读取 Week 1/2/3 三个 verifier 并要求：

- 默认 `OASIS_REAL_DSH_PROFILE` 均为 `join(USERPROFILE, '.dsh')`；
- Week 1 导入并使用 `baseline-capture-core.mjs` 的 `collectTree`/`writeBaselineTsv`；
- 不存在“Profile 内发现 link 即失败”的私有遍历逻辑；
- 三者均记录 link 自身且不跟随目标。

### Step 2：确认 RED

```cmd
node --test tests\scripts\real-profile-baseline-contract.test.mjs
```

**Expected:** 因 Week 1 默认仍为 `profiles/web` 且未复用 shared baseline 而失败。

### Step 3：最小实现

1. Week 1 默认改为整个 `.dsh`。
2. 删除私有 createHash/readFile/readdir 递归 hashTree，复用 `collectTree` 和 `writeBaselineTsv`。
3. before/after 通过 canonical rows 比较；link 记录 path、size、target text 和 target-text hash，但不跟随。
4. README 明确三个 verifier 的 whole-tree/lstat/readlink 策略。

### Step 4：GREEN

```cmd
node --test tests\scripts\real-profile-baseline-contract.test.mjs tests\scripts\verification-host-lifecycle.test.mjs
```

**Expected:** exit 0。

## Task 4：把 closure 工具降格为静态包检查，修复 W3R-05

**Files**

- Modify: `scripts/audit-week3-closure.mjs:35-146`
- Create: `tests/scripts/week3-package-audit-scope.test.mjs`
- Modify: `README.md:53-70`

### Step 1：写 RED

测试要求脚本：

- 输出 `scope: 'STATIC_PACKAGE_ONLY'` 和 `semanticProof: false`；
- 结果枚举为 `CLEAN/FINDINGS`，不使用 V4.1 的总体验收词；
- 含明确 `limitations`：不证明路径并发、Domain 一致性、Host/browser 或专业质量；
- 不再含 `materials-metadata-only`、`writeback-new-path-only`、`writeback-no-wide-cleanup` 等正向语义 marker 检查；
- 保留 tarball allowlist、秘密/个人路径/fixture 泄漏、浏览器持久化 API、安装 lifecycle 等静态检查。

### Step 2：确认 RED

```cmd
node --test tests\scripts\week3-package-audit-scope.test.mjs
```

**Expected:** 当前脚本缺 scope/limitations 且仍输出 PASS/FAIL，因此失败。

### Step 3：最小实现并 GREEN

```cmd
node --test tests\scripts\week3-package-audit-scope.test.mjs
```

**Expected:** exit 0；脚本职责和输出不再被误读为产品关闭证明。

## Task 5：修复治理状态 W3R-06

**Files**

- Modify: `docs/plans/2026-08-25-week3-design.md:1-8,355-386`
- Modify: `docs/plans/2026-08-24-dsh-beta-overall-plan.md:21,225,243-246`
- Modify: `docs/第三周-全面审计报告.md:1-10`
- Modify: `docs/第三周-本地闭环验证报告.md:1-12`
- Modify: `docs/第三周-全面复审报告.md:1-15,70-100`
- Create at final gate only: `docs/第三周-全面复审修复报告.md`

**Steps**

1. 设计文档状态从“待确认”改为“已确认并进入独立复审修复”，并同步 atomic rename 设计。
2. 修复完成前总体计划第三周标记“重新打开/修复中”；不得预先写“已关闭”。
3. 两份旧 PASS 报告顶部增加 superseded 提示，保留历史正文和证据，不改写旧结果。
4. 独立复审报告增加 remediation 链接，但保留其审计时点的原裁决。
5. 只有 Task 6 全部门通过后，才创建修复报告并把总体计划第三周改为“修复关闭”。

## Task 6：全量验证、打包与重新关闭

**Evidence root:** `docs/evidence/week3-reaudit-remediation-2026-08-27`

### Step 1：静态和全测试

```cmd
cd packages\oasis-professional-service
pnpm install --offline --frozen-lockfile
pnpm --config.verify-deps-before-run=false run verify
```

使用 remediation evidence 内的隔离 `npm_config_cache`；不得写用户全局 npm cache。

```cmd
cd ..\..
node --test tests\scripts\*.test.mjs tests\skills\*.test.mjs
git diff --check
```

**Gate:** package/root 0 fail；否则不运行关闭批。

### Step 2：标准 Week 1/2/3 Host 与浏览器回归

三个 verifier 都显式设置：

- `OASIS_REAL_DSH_PROFILE=C:\Users\TinaD\.dsh`
- Edge executable 为系统真实普通文件；
- `OASIS_EVIDENCE_ROOT` 指向 remediation 下互不重叠的新目录。

**Expected:** Week 1、Week 2、Week 3 全部 exit 0；浏览器 console/page errors 为空；请求只到 loopback；Host 端口关闭；真实 Profile before/after 相同。

### Step 3：实际 tarball 和静态包审计

```cmd
npm pack --json --pack-destination <new-remediation-package-directory>
node scripts\audit-week3-closure.mjs <new-tgz> <new-static-audit-json>
```

**Expected:** tarball 仍为显式 33-entry 交付集合；审计输出 `scope=STATIC_PACKAGE_ONLY`、`semanticProof=false`、`result=CLEAN`。该结果不得单独用作 Week 3 关闭结论。

### Step 4：后置基线与 allowlist 比较

1. 捕获 after 源码、真实 Profile、旧 evidence 和官方合同。
2. 源码变化必须仅落在本计划 allowlist；真实 Profile、旧 evidence、官方合同和 Git HEAD 必须完全一致。
3. 记录命令、exit code、测试总数、tarball hash、浏览器/Host 后置条件和未验证边界。

### Step 5：最终报告和状态

只有以下条件同时满足才关闭：

- W3R-01～W3R-06 均有 RED→GREEN 或文档追踪证据；
- 无未解决 P0～P2；
- package/root/Week1/2/3/actual tarball 全部完成；
- Profile、历史 evidence、官方合同无漂移；
- 没有外部系统调用或新增安全测试。

若任一条件不满足，修复报告必须使用与证据相符的单一 V4.1 状态，不能沿用旧结论。

## 计划完成后的预期文件变化

**Production:**

- `packages/oasis-professional-service/src/writeback-service.js`
- `packages/oasis-professional-service/src/local-mock-runner.js`
- `packages/oasis-professional-service/src/workbench-domain.js`

**Tests:**

- `packages/oasis-professional-service/test/writeback-service.test.mjs`
- `packages/oasis-professional-service/test/workbench-fixtures.mjs`
- `packages/oasis-professional-service/test/workbench-domain.test.mjs`
- `packages/oasis-professional-service/test/workbench-service.test.mjs`（仅实际哈希断言需要时）
- `tests/scripts/real-profile-baseline-contract.test.mjs`
- `tests/scripts/week3-package-audit-scope.test.mjs`

**Verification/governance:**

- `scripts/verify-week1-supplement.mjs`
- `scripts/audit-week3-closure.mjs`
- `README.md`
- Week 3 设计、总体计划、三份历史/复审报告
- 新 remediation evidence 根和最终修复报告

## Stop Conditions

- 新测试没有以目标原因 RED；
- atomic rename 在普通 Windows 临时目录测试中不能稳定保持 existing-target/no-overwrite；
- 同一 finding 连续三次修复尝试仍失败；
- 任何真实 Profile、历史证据、官方合同或非 allowlist 文件发生变化；
- 任何验证需要网络下载、真实凭据、外部服务、权限提升或对抗性安全操作；
- Host 不能在有界时间退出或出现非 loopback 请求。
