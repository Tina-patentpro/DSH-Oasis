# Week 3 独立复审 Findings Register

## W3R-01 — P1 — 写回最终目标身份没有在发布时再次闭合验证

- 合同：写回必须限制在 Workspace 内用户确认的新目录，并在目标变化时 fail-closed。
- 代码证据：`writeback-service.js:454-465` 在创建目标目录前执行最后一次 `revalidatePlanTarget`，随后创建目录并直接发布两个硬链接；发布期间没有再次确认目录身份。
- 影响：现有标准测试证明常规冲突和并发行为，但不足以证明目标目录在最终发布窗口内始终仍是刚创建的 Workspace 内目录。
- 状态：未修复；依用户调整后的范围，不再开展对抗性复现或扩展测试。

## W3R-02 — P2 — 文件已提交但暂存清理失败时缺少恢复清单

- 代码证据：`writeback-service.js:468-490` 在文件已经发布后抛出 `WRITEBACK_COMMITTED_CLEANUP_FAILED`；`workbench-service.js:346-364` 只有 `manager.publish` 正常返回后才保存 `publishedRecord` 并生成恢复 manifest。
- 影响：文件可能已经存在，但 Client 只能收到普通 operation error，无法获得与 `WRITEBACK_COMMITTED_INDEX_FAILED` 等价的可核对恢复信息。
- 状态：未修复；既有测试未覆盖该提交后清理分支。

## W3R-03 — P2 — 持久化运行证据只校验哈希格式和互相引用，不复算内容哈希

- 代码证据：`workbench-contract.js:260-292` 只要求 `artifactId == sha256:<declared sha256>`，输入快照也只要求 64 位哈希格式；`parseWorkbenchRecord` 不复算 artifact body 或 canonical input。
- 影响：存储记录若发生局部损坏，重载仍可能把内容与声明哈希不一致的数据当作合法证据，削弱不可变运行历史的损坏检测。
- 状态：未修复；正常生成和写回路径仍会计算或复核哈希。

## W3R-04 — P2 — Week 1 Profile 保护口径与 README 不一致

- 代码证据：`verify-week1-supplement.mjs:18` 默认只比较 `.dsh\\profiles\\web`；`README.md:50` 宣称各验证器比较整个 `C:\Users\TinaD\.dsh`。
- 独立结果：whole-tree 运行因现有 pnpm link fail-closed，exit 1；显式 `profiles\\web` 运行 exit 0。
- 影响：按 README 直接理解会高估 Week 1 默认验证范围，也无法在当前真实 Profile 上复现宣称的 whole-tree 成功。
- 状态：未修复。

## W3R-05 — P2 — closure 审计器以字符串存在性代替行为证明

- 代码证据：`audit-week3-closure.mjs:119-123` 只检查若干源码片段是否存在，即判定 `writeback-new-path-only` 通过。
- 独立结果：实际 tarball 审计仍报告 21 checks / 0 findings，未识别 W3R-01、W3R-02 或 W3R-03。
- 影响：该报告适合作为包清单和静态禁用项检查，不能作为关键业务语义已经闭环的充分证据。
- 状态：未修复。

## W3R-06 — P3 — Week 3 设计文档状态仍停留在待确认

- 代码证据：`docs/plans/2026-08-25-week3-design.md:4` 仍写“待确认”，而总体计划和既有 Week 3 报告已宣称关闭。
- 影响：治理状态互相矛盾，降低计划和报告的可追溯性。
- 状态：未修复。
