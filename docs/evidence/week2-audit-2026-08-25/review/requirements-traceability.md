# 第二周第一批与第二批需求追踪矩阵

日期：2026-08-25

| 批次 / 合同 | 实现证据 | 本轮验证 | 结论与边界 |
|---|---|---|---|
| 第一批：`oasis_workbench` v1 / `workspaces` | `src/workbench-domain.js` | 81/81 package tests；Domain 不变量测试 | 本地通过；未证明真实 JSON medium 重启恢复 |
| 第一批：revision CAS、同 Workspace 串行、跨 Workspace 隔离 | `src/workbench-repository.js` | Repository 并发、失败、close 测试 | 本地通过；仅单 Host 进程合同 |
| 第一批：`/oasis-workbench`、`loopback`、严格请求 | `src/workbench-rpc.js`、`src/index.js` | RPC 与 Cordis 组合测试 | 本地通过；未启动真实 DSH Host |
| 第一批：状态工具不输出业务状态 | `src/status.js`、`src/index.js` | 静态扫描 `hostBusinessStateLeak=false` | 通过 |
| 第二批：hydrate 前零写入 | `src/client/workbench-store.js` | persistence 测试 | 本地通过 |
| 第二批：快速连续动作按 revision 串行 | `src/client/workbench-store.js` | same-Workspace queue 测试 | 本地通过 |
| 第二批：A/B 项目隔离 | Store per-Workspace state/runtime | queue isolation 测试 | 本地通过；未做浏览器 A/A/B/A |
| 第二批：冲突保留草稿、显式 reload | Store conflict union、`PanelPages` | persistence + UI 测试 | 本地通过 |
| 第二批：loading/saving/conflict/error、rename/close | `PanelChrome`、`PanelPages` | UI contract tests | 组件级通过；未做真实浏览器可访问性验证 |
| 第二批：generic RPC 返回值可信 | `workbench-remote.js`、`workbench-model.js` | 独立负向探针 | **失败：nested task 字段未完整校验** |
| 禁止项：无 local/sessionStorage、无 details API/Slot | Client 源码与 bundle | 22 文件静态扫描 | 通过 |
| 分发边界 | package whitelist | pack dry-run 23 项 | 通过；无 test/docs/node_modules/.dsh-test/.env |
| 真实 Profile 保护 | audit lstat + readlink + regular-file SHA-256 | 664 项、530 link，前后相同 | 本轮审计期间通过；不能补写此前批次的历史证据 |
| 隔离 Host 重启、真实浏览器 | 原 Task 5 | 本轮未执行 | 尚无证据，不得用本地测试替代 |

## 官方合同复核

- 本机与 npm 当前 `latest` 均为 `@deepseek-ai/dsh 0.1.1-rc.2`。
- 当前官方 Storage 文档确认：record key 可为任意字符串；Domain 写入按一条链串行、先持久化后更新内存；调用方拥有 `Domain.close()`。
- 当前官方 API Gateway 文档把 Typert Remote 作为一般业务服务路径；本项目仍使用本机 `0.1.1-rc.2` 已发布并已核验的 generic Connection `handle/call` 合同，因此必须继续维持固定版本围栏，不能把 master 文档自动提升为本项目运行合同。

官方参考：

- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/storage.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/api-gateway.md
- https://www.npmjs.com/package/%40deepseek-ai/dsh?activeTab=versions
