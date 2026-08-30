# Week 3 Task 9 关闭审计证据台账

- 日期：2026-08-26
- Git 起点：`02b3eb7e40ff230689be8cae4218180869de836e`
- 固定运行基线：Node.js `v22.19.0`、DSH `0.1.1-rc.2`
- Git 边界：保留 Week 3 未提交工作树；未暂存、未提交、未重置
- 真实 Profile：`C:\Users\TinaD\.dsh` 只读强基线
- 最终状态：`PASS`

## 目标合同

- package verify、根合同与 Week 1/2/3 隔离回归均以 Task 9 新鲜运行证据为准。
- Task 1～8 证据输入前后哈希一致；Task 9 输出不反向改写旧证据。
- tarball、合同/迁移、所有权、路径/TOCTOU、no-overwrite、隐私、可访问性、Host/browser/Profile 和证据新鲜度均被审计。
- 未解决 P0～P2、真实 Profile 漂移或关键运行证据缺失均会阻断关闭。

## 验证台账

| 层级 | 结果 | 证据 |
|---|---|---|
| before 基线 | product 110 entries；Profile 13711 entries/530 links；Task 1～8 evidence 204 entries | `baseline/baseline-summary-before.json` |
| offline frozen install | exit 0 | `runtime/pnpm-install-offline.txt` |
| 包级 verify | build + 173/173 + pack 33 entries | `runtime/package-verify-final.txt` |
| 根合同 | 29/29 | `runtime/root-contract-tests-postfix.txt` |
| Week 1 | exit 0；Host 有界关闭、浏览器与布局通过 | `runtime/week1-regression-postfix.txt`、`regression/week1-final` |
| Week 2 | exit 0；Host1/Host2 恢复、CAS、A/B/刷新通过 | `runtime/week2-regression-postfix.txt`、`regression/week2-final` |
| Week 3 | exit 0；本地两类工作流、审核、写回、布局通过 | `runtime/week3-regression-final.txt`、`regression/week3-final` |
| Profile | 前后 SHA-256 `6C8DAC...BD97`，equal | Week 2 `runtime/real-profile-compare.json`；Week 3 `filesystem/real-profile-compare.json` |
| Workspace | A 仅 6 个精确 allowlist 新文件；B 0；unexpected 0 | `regression/week3-final/filesystem/workspace-diff.json` |
| 浏览器 | 198 个 loopback 请求；console/page errors 0；原生节点身份保持 | `regression/week3-final/browser` |
| 最终 tarball | 219313 bytes；SHA-256 `392276fc...0488`；33 entries/21 checks/0 findings | `package-final/closure-audit.json` |

## 审计修复

1. Host 关闭改为 `SIGTERM` + 有界等待 + 端口关闭断言。
2. 浏览器可执行路径改为文件/realpath 校验并优先 Edge。
3. Week 1 浏览器断言升级到当前输入/结果 UI。
4. Week 2 fixture 升级为严格 schema v2。
5. 材料隐私披露改为与本机流式哈希事实一致。
6. Host 拥有并释放 tool disposer。
7. Client dispose 等待冲刷已知 Workspace 待保存草稿。
8. status 工具更新到 Week 3 并声明外部系统未调用。

每个修复均保留 `runtime/*-red.txt` 和 `runtime/*-green*.txt`。完整 findings 见 `docs/第三周-全面审计报告.md`。

## 历史证据处置

Task 9 中一次默认输出路径错误覆盖了 9 个 Week 1 历史证据文件。经用户明确批准，仅对这 9 个精确路径恢复到 Git HEAD；恢复命令 exit 0，定向 `git status` 无输出。未触碰其他 Week 3 改动。

## 证据边界

本台账证明本机固定版本的隔离本地闭环，不证明生产、DSH Desktop 正式发布、真实模型、真实专业服务或专业内容正确性。Dify 与收费管理没有参与本轮运行。
