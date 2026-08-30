# Week 3 需求—实现—验证追踪矩阵

| Task | 目标合同 | 主要实现 | 独立验证 | 结论 |
|---|---|---|---|---|
| 1 | 冻结合同、依赖、Skill 和证据边界 | `package.json`、`pnpm-lock.yaml`、`.dsh/skills/dsh-plugin-development`、状态合同 | 包级 verify；审计 before 基线 | 已覆盖；工作树仍为未提交 Week 3 集合 |
| 2 | schema v2、v1→v2 迁移、Host 证据所有权 | `workbench-contract.js`、`workbench-domain.js`、`workbench-repository.js` | 包级合同/迁移/持久化测试；Week 3 `migration-v1-to-v2.json` | 主路径通过；持久证据内容哈希语义复核存在缺口 W3R-03 |
| 3 | 版本化工作流目录和严格表单 DSL | `workflow-catalog.js`、catalog RPC、Client chooser/form | catalog/form tests；Week 3 浏览器 catalog 请求和表单闭环 | 通过 |
| 4 | Workspace 材料引用、流式哈希、正文不持久化 | `workspace-materials.js`、material RPC/service/UI | 材料 tests；Week 3 Host/browser/Workspace diff | 通过；仅证明本机既有验证场景 |
| 5 | 确定性 local-mock、不可变运行历史、人工审核门 | `local-mock-runner.js`、`workbench-service.js`、`RunPreview.js` | mock/service/store tests；Week 3 Host1/Host2 与浏览器闭环 | 主路径通过；存储重载完整性见 W3R-03 |
| 6 | prepare/commit、新目录写回、恢复证据 | `writeback-service.js`、service/RPC/store/`WritebackPanel.js` | writeback/service/RPC tests；Week 3 文件系统和浏览器写回；tarball 审计 | 标准场景通过；目标身份复核和已提交清理失败恢复存在 W3R-01/W3R-02 |
| 7 | schema 原生右栏、多页、normal/expanded/hidden、无障碍 | `OasisPanelHost.js`、`PanelPages.js`、表单/预览/写回组件 | UI/store tests；Week 1/2/3 浏览器截图、DOM identity、console/page errors | 通过 |
| 8 | Host1/Host2、真实浏览器、Profile/Workspace 后置条件 | `verify-week1-supplement.mjs`、`verify-week2-persistence.mjs`、`verify-week3-local-loop.mjs` | Week 2、Week 3 exit 0；Week 1 `profiles\\web` exit 0；整个 `.dsh` 口径 exit 1 | 部分通过；Week 1 文档与实现口径不一致 W3R-04 |
| 9 | 全量验证、tarball、审计报告和路线图关闭 | `audit-week3-closure.mjs`、README、计划与既有报告 | 173/173 包测试；29/29 根测试；33-entry tarball、21 checks/0 findings | 自动检查通过但不能覆盖语义缺口；审计器与文档状态见 W3R-05/W3R-06 |

## 独立证据摘要

- 包级：`runtime/package-verify-isolated-cache.txt`，173 tests / 173 pass / 0 fail。
- 根级：`runtime/root-tests.txt`，29 tests / 29 pass / 0 fail。
- Week 1：整个 `C:\Users\TinaD\.dsh` 口径失败；`profiles\\web` 口径通过。
- Week 2：`runtime/week2-verifier.txt`，exit 0。
- Week 3：`runtime/week3-verifier.txt`，exit 0；浏览器 console/page errors 均为空，网络请求均为 `127.0.0.1:3412`。
- tarball：33 entries、219313 bytes、SHA-256 `392276fc9f70a57aec4305b66fe423b3d040a6c82584af95b4a04ff712970488`；现有 closure 审计器报告 21 checks / 0 findings。
