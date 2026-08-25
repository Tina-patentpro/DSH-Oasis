# 第一周补充需求追溯

| ID | 需求 | 来源 | 第一周补充交付 | 证据门 |
|---|---|---|---|---|
| UI-01 | DSH 左栏和中栏保持原有产品行为 | 用户确认 | 非替换式右栏挂载 | `NATIVE_UI_PRESERVATION_GATE` |
| UI-02 | 右栏具有 hidden / normal / expanded 三状态 | 用户确认及 V5 预览 | Panel 状态机与浏览器回归 | `CLIENT_POSTCONDITION_GATE` |
| UI-03 | 使用确认的 Codex 显示、隐藏、展开、还原图标 | 用户确认 | 精确 SVG path 与图标合同测试 | `CLIENT_POSTCONDITION_GATE` |
| UI-04 | 右栏可有多个任务页 | 用户确认 | 第一周补充建立最小页签状态 | `PROJECT_ISOLATION_GATE` |
| UI-05 | 新页先选工作流，选择后原位显示材料与结果预览 | 用户确认 | 第一周补充建立 chooser/workspace 骨架 | `CLIENT_POSTCONDITION_GATE` |
| PRJ-01 | 右栏与 DSH 当前项目关联 | 用户确认 | 仅按 Workspace `sessionIds` 解析 | `PROJECT_ISOLATION_GATE` |
| PRJ-02 | 同项目换会话保持；换项目整体切换 | 用户确认 | Workspace-keyed store | `PROJECT_ISOLATION_GATE` |
| SCOPE-01 | 通用技术研发辅助 | 用户确认 | `technical-rd` 工作类型 | `REQUIREMENT_SOURCE_GATE` |
| SCOPE-02 | 中国发明专利撰写 | 用户确认 | `cn-invention-patent` 工作类型 | `REQUIREMENT_SOURCE_GATE` |
| SCOPE-03 | `benchmarkDomains` 不属于已确认范围 | 第一周审计 | 删除字段、schema、测试和文档承诺 | `REQUIREMENT_SOURCE_GATE` |
| AUDIT-01 | HTTP 200 仍需 `result.ok=true` | 第一周审计 P2-01 | RPC 负向测试与非零退出 | `RPC_OK_GATE` |
| AUDIT-02 | 按钮必须有真实 UI 后置条件 | 第一周审计 P2-02 | `shell.overlay` 消费者 | `CLIENT_POSTCONDITION_GATE` |
| AUDIT-03 | DSH binary 不得固定到单机 npm shim | 第一周审计 P2-03 | `DSH_BIN` / PATH 解析器 | `DSH_BIN_RESOLUTION_GATE` |
| AUDIT-04 | 安装与版本必须冻结 | 第一周审计 P2-04 | 精确版本与 frozen lockfile | `FROZEN_INSTALL_GATE` |
| AUDIT-05 | 只公开有来源的能力范围 | 第一周审计 P2-05 | 两个 approved work types | `REQUIREMENT_SOURCE_GATE` |
| AUDIT-06 | 自动测试须覆盖真实后置条件 | 第一周审计 P2-06 | Host/Browser 回归 | `EVIDENCE_LAYER_GATE` |
| AUDIT-07 | Host 工具需要真实 registry/call 证据 | 第一周审计 P2-07 | 真实 Tools service 集成门 | `HOST_TOOL_RUNTIME_GATE` |
| AUDIT-08 | DSH 写操作前后保护真实 Profile | 第一周审计 P2-08 | before/after 全树 SHA-256 | `PROFILE_PRESERVATION_GATE` |

## 2026-08-24 裁决

| ID范围 | 状态 | 证据说明 |
|---|---|---|
| UI-01 | CLIENT-RUNTIME/BROWSER已证 | live Slot确认绿洲仅占用additive入口与Overlay；DSH左栏、中栏和原生details保留 |
| UI-02/UI-03 | BROWSER已证 | 三状态实际宽度、隐藏/恢复、Codex图标与焦点已验证 |
| UI-04/UI-05 | BROWSER已证 | 两页、两工作流、chooser原位转workspace骨架已验证 |
| PRJ-01/PRJ-02 | UNIT/BROWSER已证 | Workspace唯一归属与隔离状态6项测试通过；A-1→A-2保持、B独立、返回A恢复均通过 |
| SCOPE-01/SCOPE-02 | STATIC/UNIT已证 | Host状态、UI与Skill均只公开两类工作 |
| SCOPE-03 | STATIC/UNIT已证 | 代码、schema和测试不再包含`benchmarkDomains` |
| AUDIT-01至AUDIT-05 | 已关闭 | 详见证据账本与补充验证报告 |
| AUDIT-06 | 已关闭 | Host、live Slot、三状态、多页、两工作流与A/A/B切换后置条件均通过 |
| AUDIT-07/AUDIT-08 | 已关闭 | 真实Cordis Tools组合通过；Profile 113行清单前后`fc /b`退出0 |

`PROJECT_ISOLATION_GATE`、`NATIVE_UI_PRESERVATION_GATE`及AUDIT-01至AUDIT-08均已关闭；允许按总计划进入第二周，但第二周持久化仍需自己的重启恢复与冲突处理证据。
