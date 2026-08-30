# Week 3 全面复审修复：首批结果

## 范围

- Task 0：修复前基线与证据账本。
- Task 1：W3R-01/02 写回原子发布和失败清理边界。
- Task 2：W3R-03 已存记录摘要重算。

## 结果

1. 写回改为同父目录暂存完成后以单次 `rename(stagingDirectory, targetDirectory)` 最终提交；提交前冻结记录，提交后不执行文件系统操作或清理。
2. 最终目标在 rename 竞态中出现时返回 `WRITEBACK_TARGET_EXISTS`，保留对方目标；写入、元数据和 rename 故障只清理本次已创建的暂存路径。
3. schema-v2 记录在冻结前重算 canonical input SHA-256 与 artifact body SHA-256；错误包含 task/run 身份和 integrity 类型。
4. 测试夹具不再使用伪造的 `b…` / `c…` 摘要，改为真实 canonical input 和正文摘要。

## 证据

- 写回 RED：`task1-writeback/red.txt`，预期 5 项失败。
- 写回 GREEN：`task1-writeback/green.txt`，13/13。
- 完整性 RED：`task2-integrity/red.txt`，预期 1 项失败。
- 完整性 GREEN：`task2-integrity/green-domain.txt` 7/7；`task2-integrity/green-related.txt` 51/51。
- 包级回归：`batch1-package-test-green.txt`，176/176。

## 证据边界

- 当前仅证明本地源码和常规 Node 测试层；尚未执行修复计划的 Week 1/2/3 verifier、loopback Host/浏览器、实际打包和修复后基线比较。
- 修复前 Profile 已相对 2026-08-26 复审结束发生 10 项运行态漂移；本轮已重新捕获成功基线，未读取凭据内容，也未写真实 Profile。
