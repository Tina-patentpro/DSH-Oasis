# Week 3 全面复审修复证据账本

## 证据边界

- 本目录只记录 2026-08-27 全面复审修复的新证据，不修改既有证据目录。
- 实际产品、测试和治理文档以仓库工作区为准；本账本不能替代运行时或浏览器证据。
- 真实 `C:\Users\TinaD\.dsh` 仅通过 `lstat`、`readlink` 和文件读取生成哈希；不写入、不跟随链接目标。
- 本轮不新增、不扩大、也不重跑额外对抗性安全探针；只运行常规单元、故障注入、loopback Host/浏览器与只读基线检查。

## 允许变更清单

1. `packages/oasis-professional-service/src/writeback-service.js`
2. `packages/oasis-professional-service/test/writeback-service.test.mjs`
3. `packages/oasis-professional-service/src/local-mock-runner.js`
4. `packages/oasis-professional-service/src/workbench-domain.js`
5. `packages/oasis-professional-service/test/workbench-fixtures.mjs`
6. `packages/oasis-professional-service/test/workbench-domain.test.mjs`
7. `packages/oasis-professional-service/test/workbench-service.test.mjs`（仅当真实摘要值改变既有断言）
8. `packages/oasis-professional-service/test/workbench-contract.test.mjs`（真实 artifact 摘要改变既有合同夹具）
9. `scripts/verify-week1-supplement.mjs`
10. `scripts/audit-week3-closure.mjs`
11. `tests/scripts/real-profile-baseline-contract.test.mjs`
12. `tests/scripts/week3-package-audit-scope.test.mjs`
13. `tests/integration/week1-supplement-browser.test.mjs`（Task 6 实际浏览器发现字段异步挂载竞态，仅增加 attached 等待）
14. `README.md`
15. `docs/plans/2026-08-24-dsh-beta-overall-plan.md`
16. `docs/plans/2026-08-25-week3-design.md`
17. `docs/plans/2026-08-25-week3-implementation.md`
18. `docs/plans/2026-08-26-week3-reaudit-remediation.md`
19. `docs/第三周-本地闭环验证报告.md`
20. `docs/第三周-全面审计报告.md`
21. `docs/第三周-全面复审报告.md`
22. `docs/第三周-全面复审修复报告.md`（新增）
23. `docs/evidence/week3-reaudit-remediation-2026-08-27/**`（新增证据）

## 明确排除

- 既有 `docs/evidence/**` 中除本修复证据目录以外的全部内容。
- 真实 `C:\Users\TinaD\.dsh` 的任何写入。
- Dify、收费管理、真实模型、真实专利服务或生产环境。
- 与 W3R-01 至 W3R-06 无关的重构、格式化、清理、提交、推送或工作树恢复。

## 停止条件

- Git HEAD 与修复开始值不一致。
- 真实 Profile、既有证据或已安装 DSH workspace 契约发生非预期变化。
- 验证要求写入真实 Profile、访问生产环境或通过额外安全防护。
- 变更超出允许清单，或需要覆盖、吸收、暂存、提交现有无关改动。

## 执行记录

| 阶段 | 状态 | 证据 | 说明 |
| --- | --- | --- | --- |
| 修复前基线 | 已建立 | `baseline/` | 成功捕获时 Profile 为 `3799…5CEC`；相对前次复审的运行态漂移另见 `profile-drift-since-reaudit.json`，本轮后续以成功捕获值为比较基线 |
| W3R-01/02 RED | 已留证 | `task1-writeback/red.txt` | 5 项预期失败，证明旧实现不满足最终 rename 合同 |
| W3R-01/02 GREEN | 通过 | `task1-writeback/green.txt` | 13/13；单次最终 rename、竞态目标保留、三类故障仅清理暂存 |
| W3R-03 RED | 已留证 | `task2-integrity/red.txt` | 篡改 canonical input 未被旧解析器拒绝 |
| W3R-03 GREEN | 通过 | `task2-integrity/green-domain.txt`, `task2-integrity/green-related.txt` | Domain 7/7；相关测试 51/51 |
| 首批包级回归 | 通过 | `batch1-package-test-green.txt` | 176/176；首次回归的夹具摘要失败保留在 `batch1-package-test.txt` |
| W3R-04 RED | 已留证 | `task3-profile-contract/red.txt` | Week 1 默认值和私有 link 拒绝遍历不满足统一合同 |
| W3R-04 GREEN | 通过 | `task3-profile-contract/green.txt` | 3/3；三个 verifier 统一 whole-tree shared core |
| W3R-05 RED | 已留证 | `task4-package-audit/red.txt` | 旧工具缺静态 scope/limitations，且含正向源码 marker 与 PASS/FAIL |
| W3R-05 GREEN | 通过 | `task4-package-audit/green.txt` | 2/2；功能报告为 STATIC_PACKAGE_ONLY、semanticProof false、CLEAN/FINDINGS |
| W3R-06 治理状态 | 通过 | `task5-governance/green.txt` | Week 3 重新打开并修复中；历史 PASS 已标注 superseded；最终修复报告尚未创建 |
| 第二批根级回归 | 通过 | `batch2-root-tests.txt`, `batch2-git-diff-check.txt` | root scripts/skills 33/33；git diff --check exit 0 |
| Task 6 Profile 预检 | 等待 DSH 停止写入 | `task6/runtime/profile-preflight-summary.json`, `task6/runtime/profile-drift-before-task6.json`, `task6/runtime/profile-confirmed-attempt1-comparison.json` | 相对修复开始基线有 34 项漂移；用户继续后再次捕获仍新增/修改 9 个运行态路径，说明真实 Profile 仍在活动；未读取内容，尚未启动 Host/浏览器关闭批 |
| Task 6 旧 Profile 基线归档 | 已保留 | `task6/runtime/profile-baseline-2026-08-27-archive/` | 2026-08-27 的 preflight/confirmed/stable 原始快照在刷新活动基线前复制归档；未删除或改写旧失败证据 |
| Task 6 Profile 重新确认 | 通过 | `task6/runtime/profile-preflight.txt`, `profile-confirmed.txt`, `profile-stable.txt`, `profile-after.txt` | 2026-08-29 确认无 `DeepSeek Harness.exe`；三次前置和最终后置均为 13,746 entries、530 links、SHA-256 `072160A062ECFAE29174BD8222169A270E2FFF18FA64585BCE09C7766F0DED5D` |
| Task 6 包级最终回归 | 通过 | `task6/runtime/package-verify-final.txt` | 隔离 npm cache；176/176，0 fail |
| Task 6 根级最终回归 | 通过 | `task6/runtime/root-tests-final.txt` | scripts/skills 34/34，0 fail |
| Task 6 Week 1 | 通过并保留失败尝试 | `task6/week1-attempt1-readiness-timeout/`, `task6/week1-attempt2-browser-race/`, `task6/week1/`, `task6/runtime/week1-verifier-attempt3.txt` | 第一次冷启动超时、第二次字段异步挂载竞态均保留；最小 attached 等待后完整 verifier 通过 |
| Task 6 Week 2 | 通过 | `task6/week2/`, `task6/runtime/week2-verifier.txt` | Host 重启恢复、真实浏览器、Profile 比较和端口关闭均由 verifier 通过 |
| Task 6 Week 3 | 通过并保留保护性停止 | `task6/week3-attempt1-profile-drift/`, `task6/week3/`, `task6/runtime/week3-verifier-final.txt` | 第一次因后台 DSH 修改真实 Profile 而保护性停止；完全退出 DSH 并重建确认基线后，最终 local-loop verifier 通过 |
| Task 6 实际 tarball | 通过 | `task6/package/oasis-professional-service-0.0.1.tgz`, `task6/package/package-audit.json` | 33 entries；SHA-256 `b921f576bd1d3611d287e9d82c0ee043d203e536e0e5df650dab7bfe7eca95f8`；`STATIC_PACKAGE_ONLY`、`semanticProof=false`、`CLEAN` |
| Task 6 最终基线 | 通过 | `baseline/baseline-summary-after.json`, `baseline/profile-closing-comparison.json`, `task6/final-state-comparison.json`, `task6/runtime/final-state-comparison.txt` | 允许产品变化 20、非预期产品变化 0、历史 evidence 变化 0、Task 6 Profile 变化 0、官方 Workspace 契约和 Git HEAD 相同；相对 Task 0 的 39 项 Profile 漂移单独披露 |
| Task 6 治理关闭 | 通过 | `task6/final-governance.txt`, `docs/第三周-全面复审修复报告.md` | 历史报告裁决链保持；总体计划与详细设计重新关闭 Week 3；当前状态由最终报告单独给出 |
