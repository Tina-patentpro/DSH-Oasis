# Week 3 Task 8 实施证据台账

- 日期：2026-08-26
- 范围：隔离 DSH Host1/Host2、schema v1→v2、临时 Workspace A/B、材料/运行/审核/回写、真实浏览器、布局与网络审计
- 明确排除：Dify、收费管理、外部模型调用、生产环境、专业正确性与法律结论
- Git 起点：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`；保留同一 Week 3 Task 1～7 尚未提交改动
- Profile 规则：只读捕获 `C:\Users\TinaD\.dsh` 强基线；所有 DSH 命令必须使用 `%TEMP%\oasis-dsh-week3-*` 下的新 Home

## 目标合同

- 所有可写测试根必须解析到 `%TEMP%\oasis-dsh-week3-*`，不得接受仓库或真实 DSH Home。
- Host1 完成本地领域闭环并停止；Host2 复用同一隔离 Home 恢复状态，Host1 未使用 token 必须失效。
- Workspace 既有文件的 lstat、长度与 SHA-256 不变；只允许新增已声明且哈希核对过的回写文件。
- 浏览器必须验证 chooser 原位转换、schema 字段、材料、运行历史、草稿偏离、blocked/approved、prepare/commit、刷新与 A/A/B/A 恢复。
- normal/expanded/hidden、窄屏自动 expanded、原生 details 均不得替换左栏或中栏 DOM 节点；console/pageerror 为零。
- HTTP(S) 请求只能指向当前 loopback Host，不得出现 Dify、收费或第三方业务请求。
- 真实 Profile 前后全树强基线不一致时保持失败并保留临时证据，不得清理或宣称完成。

## 当前结论

`PASS`：Task 8 的隔离 Host、真实浏览器和文件系统闭环已完成；该结论只覆盖 Task 8，不代表 Week 3 全部关闭。

## 新增实现

- `scripts/verify-week3-local-loop.mjs`：在新建 `%TEMP%\oasis-dsh-week3-*` 根下编排 bootstrap、Host1、Host2、Workspace A/B、v1→v2、领域闭环、浏览器与强基线检查。
- `tests/integration/week3-local-loop-browser.test.mjs`：验证右栏多页、工作流输入与结果、项目关联、会话切换、布局模式、原生 DOM 身份、网络与浏览器错误面。
- `tests/fixtures/oasis-week3-loop-probe/`：复制到临时 Workspace 的确定性材料；材料正文标记不得进入 local-mock 结果。
- `tests/fixtures/oasis-session-visibility-probe/`：只装入临时 DSH Home，为测试会话追加一对空的完成 turn，使原生侧栏可显示会话；不产生用户/助手消息、不调用模型、不使用凭据，非产品依赖。

## 新鲜验证

| 层级 | 命令/证据 | 结果 | 边界 |
|---|---|---|---|
| 目标 RED | `node --test tests\integration\week3-local-loop-browser.test.mjs` | 退出 1；缺少显式 Host2/Workspace/session 环境 | 证明浏览器测试拒绝隐式或未知 Host；转录：`runtime/browser-contract-red.txt` |
| Task 8 主闭环 | `node scripts\verify-week3-local-loop.mjs` | 退出 0；Host1→停止→Host2 恢复→浏览器→停止→清理 | 运行证据：`docs/evidence/week3-local-loop-2026-08-26/` |
| 浏览器 | `runtime/browser-tap.txt` | 1/1 通过，11.5 s；console 0、pageerror 0 | 真实本地 Edge/Chrome + loopback DSH Web；不是生产或 DSH Desktop 证明 |
| 包验证 | `pnpm --config.verify-deps-before-run=false run verify` | 退出 0；171/171 tests、dry-run pack 33 entries | 首次沙箱内仅 npm cache 写入被 EPERM 阻止；同命令获准在沙箱外重跑通过 |
| 根合同 | `node --test tests\scripts\... tests\skills\...` | 26/26 通过 | 覆盖基线、隔离 Home、loopback API 和项目 Skill |
| 网络 | `browser/browser-requests.json` | 198 个 HTTP(S) 请求；唯一来源 `http://127.0.0.1:10789`；禁用业务请求 0 | 端口为本次临时 Host；无 Dify、billing、payment、charge |
| Workspace | `filesystem/workspace-diff.json` | A 仅新增 6 个声明回写文件，unexpected 0；B changes 0 | 每个新增文件均按最终 Domain 记录核对 SHA-256；原材料未修改 |
| 真实 Profile | `filesystem/real-profile-compare.json` | 13711→13711，digest 相同，changes 0 | `C:\Users\TinaD\.dsh` 全树 lstat/长度/哈希；未执行写命令 |
| 临时根 | `filesystem/temporary-root-cleanup.txt` | 最终成功根 `oasis-dsh-week3-8rIRrP` 已删除 | 只在全部断言通过、Host 端口关闭且路径复核后递归清理 |

## 领域与交互覆盖

- v1 读取只在内存迁移为 v2；显式编辑后才落盘为 v2。
- Workspace A：材料 SHA、两次不可变运行、草稿偏离、人工批准、正常回写、同目录冲突、prepare 后目标抢占、并发提交仅一个成功、revision conflict。
- Workspace B：专利工作流先 blocked 且无批准入口，补充事实后 warning 运行并人工批准。
- Host2 精确恢复 A/B；Host1 未使用确认 token 在 Host2 被拒绝。
- 浏览器覆盖 chooser 原位转换、5 个技术字段、材料、两次运行、刷新、A/A/B/A 会话切换、normal/expanded/hidden、原生 details、900 px 自动 expanded。
- 所有布局阶段的原生 sidebar/conversation DOM 节点身份保持不变；隐藏、展开、原生 details 与卸载路径均清理布局所有权和 CSS 变量。

## 调试证据与最终修正

- 早期隔离尝试分别暴露：空会话不可见、材料选择器不确定、重命名顺序、Typert `#` 端点路径截断，以及命令事件不改变 DSH `blank` 状态；对应临时根按失败策略保留。
- 曾得到一次功能通过但中栏显示缺凭据错误的截图；未将其作为最终证据。最终改用临时 session visibility probe，重新完整运行并覆盖规范证据，当前中栏为空且浏览器错误面为零。
- 成功路径会删除规范证据目录内过期的 `runtime/failure.txt`；失败临时根仍保留诊断，不冒充最终通过结果。

## 未证明事项

- 未证明生产部署、DSH Desktop 外壳、真实模型或 Dify 运行、收费链路、技术结论正确性或中国专利法律质量。
- Week 3 尚需 Task 9 汇总审计、文档一致性检查和阶段关闭。
