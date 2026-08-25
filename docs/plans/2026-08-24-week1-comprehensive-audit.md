# 第一周全面审计执行计划

> **执行方式：** 按 `质量打磨 → executing-plans → code-review-excellence → dsh-plugin-development → verification-before-completion` 执行。

**Goal:** 独立验证第一周及补充工作的需求追溯、代码、测试、Host、Client、浏览器、供应链、安全与证据结论，判断是否具备进入第二周的条件。

**Architecture:** 审计不修改产品代码。先冻结源文件和真实 DSH Profile 的强基线，再依次执行静态审查、隔离构建与测试、隔离 Host/Slot/Browser 复验，最后复核源文件、Profile、进程和临时目录并形成 findings-first 报告。

**Tech Stack:** DeepSeek Harness、Cordis、React 18、Node.js、pnpm、tsdown、Node test runner、Playwright、Git、Windows cmd/PowerShell。

---

## 1. 范围

纳入 `.dsh/skills`、`packages/oasis-professional-service`、`scripts`、`tests`、PRD、第一周计划/报告及其证据目录。Dify 和收费管理作为稳定外部系统，不进入内部实现复验；不测试生产部署，不安装到真实 Profile，不发布 npm 包，不自动修复审计发现。

## 2. 新增产物

- `docs/evidence/week1-comprehensive-audit-2026-08-24/`
- `docs/第一周-全面审计报告.md`

历史审计报告与证据只读保留，不覆盖。

## 3. 执行任务

### Task 1：冻结基线

1. 记录 Git、DSH、Node、pnpm、DSH 包路径和版本。
2. 生成审计纳入源文件的相对路径、大小、修改时间和 SHA-256。
3. 只读生成 `C:\Users\TinaD\.dsh\profiles\web` 全树 SHA-256；遇链接、junction 或异常根立即停止。
4. 记录监听端口、DSH/Node/Edge 进程与临时目录基线。

### Task 2：需求、代码和历史结论静态审计

1. 将用户确认、PRD、总体计划、补充计划、P2-01 至 P2-08 和追溯表逐项映射到实现与证据。
2. 审查 Bundle/Profile/Host/Client/Slot 生命周期、Workspace 隔离、状态机、几何、焦点、ARIA、错误处理和清理。
3. 审查 loopback/allowlist、凭据脱敏、路径边界、依赖冻结、clean build 和 pack 白名单。
4. 审查测试是否验证真实后置条件，原始证据是否支持报告结论。

### Task 3：隔离验证

1. 运行 package clean build、全部测试和 pack dry-run。
2. 运行根级 RPC、隔离包装器和两个 Skill 合同测试。
3. 使用官方校验器验证两个项目 Skill。
4. 在新临时 `DSH_HOME` 中安装 Bundle 和验证夹具，启动 loopback Host。
5. 复验 Cordis 工具、Skill 发现、完整/精确 Slot 树和浏览器 normal/expanded/hidden、多页、两工作流、A/A/B 项目隔离。
6. 保存 TAP、RPC、Slot、网络、console、pageerror、截图和清理证据。

### Task 4：关闭审计

1. 重新计算真实 Profile 和产品源文件哈希。
2. 确认真实 Profile 与产品源文件未被审计修改。
3. 确认无遗留 Host、监听端口或隔离临时目录。
4. 形成按 P0-P3 排序的 findings-first 报告。
5. 最终只给一个 V4.1 状态：`PASS`、`PASS_WITH_CONCERNS`、`STATIC_ONLY`、`BLOCKED_WAITING_FOR_USER` 或 `FAIL`。

## 4. 停止条件

- 任何命令将真实 Profile 解析为写目标。
- 真实 Profile 或产品源文件出现无法解释的变化。
- 目标根包含符号链接、junction 或越界路径。
- 发现凭据泄露、跨项目串数据、原生 UI 被替换或清理范围不安全。
- 同一关键验证连续失败三次且无法在不修改产品代码的前提下继续。

## 5. 裁决门

- P0：真实数据/Profile/密钥/越权或原生 UI 破坏。
- P1：核心 DSH 合同、项目隔离、真实加载或清理失效。
- P2：假绿灯、关键需求缺失、证据不支持结论或分发不可复现。
- P3：不阻断第一周目标的环境、维护性或体验风险。
- 任何未关闭 P0-P2 均不得进入第二周。
