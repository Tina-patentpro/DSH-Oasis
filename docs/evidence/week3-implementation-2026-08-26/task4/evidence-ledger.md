# Week 3 Task 4 实施证据台账

- 日期：2026-08-26
- 范围：Workspace 材料相对路径校验、流式 SHA-256、材料 add/refresh/remove、运行前复检、Host/Client RPC
- 明确排除：读取材料正文用于生成、Task 5 mock、审核、写回、Dify、收费管理
- Git 起点：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`；工作树包含同一 Week 3 Task 1～3 尚未提交的已验证改动
- Profile 裁决：用户已确认 2026-08-25 的 `better-sidebar` 安装为有意操作；Task 4 不修改、回滚或测试该插件

| 层级 | 证据 | 当前结果 | 证明边界 |
|---|---|---|---|
| Task 4 before | `baseline/*-before.*` | PASS：source 86、Profile 13708/530 links、workspace contracts 4、toolchain failures 0；Profile SHA-256 `3B5AADD3C5A26B200F0D673EE94A0FDE38C5B45A5FB49169D12537061A14EEB5` | 用户确认外部安装后的新只读基线；不证明后续无并发变化 |
| 材料原语 RED/GREEN | `runtime/workspace-materials-red.txt`、`runtime/workspace-materials-growth-red.txt`、`runtime/workspace-materials-green.txt` | PASS：先证明缺失模块；增长/设备名补强 RED 为 5/7，修复后 7/7 | 路径、redirecting reparse、50 MiB、增长流上限、流式哈希、post-stat、变化复检；不宣称 Windows 内核级 TOCTOU 已被形式化消除 |
| Service/RPC RED/GREEN | `runtime/material-service-rpc-red.txt`、`runtime/material-service-rpc-green.txt` | PASS：严格端点/注入初始 RED；最终 29/29 | repository revision/Workspace 队列、add/refresh/remove、历史 run snapshot 不变、strict wire、Client remote、`workspaceRegistry` 注入 |
| Task 4 全包验证 | `runtime/package-verify.txt` | PASS：build；122/122 tests；`npm pack --dry-run --json` 发布清单 27 项 | 本地 Node、真实临时文件系统与包合同；不证明 Desktop/浏览器、Task 5～7 或专业结果质量 |
| Task 4 after | `baseline/*-after.*`、`baseline/profile-diff.json`、`baseline/source-diff.json` | PASS：source 88、Profile 13708/530 links、Profile SHA-256 与 before 完全一致；14 项源码/测试/生成 bundle 变化全部命中精确 allowlist，unexpected 0；workspace contracts 完全一致；toolchain failures 0 | 本批对真实 Profile 为只读，未修改或回滚 `better-sidebar`；只证明采样时点的文件系统状态 |

## 实现结果

- Host 只接受 Workspace 内相对路径；拒绝绝对路径、UNC、drive-relative、`..`、ADS、NUL、尾点/尾空格、Windows 保留设备名及 redirecting symlink/junction。
- 材料以只读句柄分块计算 SHA-256，流本身最多接收 `maxFileBytes + 1` 字节用于越界判定；返回与持久化仅含相对路径和元数据，不含正文。
- `material/add` 强制显式确认；`refresh` 保留同一 `referenceId`/`confirmedAt` 并更新观察证据；`remove` 只改当前 task 引用，历史 run snapshot 不变。
- 三种材料写操作均通过 repository 的 revision 检查和同 Workspace 队列；运行前复检重新计算全部当前引用且不自动刷新持久化证据。
- Host 注入 `workspaceRegistry`，RPC/Client 只暴露 strict material 命令；已知材料错误结构化返回，基础设施异常不伪装为业务成功。

## 当前结论

`STATIC_ONLY`：Task 4 的本地实现、Node 测试、构建和打包证据完整；尚未执行 DSH Desktop/浏览器中的人工材料选择与交互验收，也未开始 Task 5 的 mock 运行链。

## 停止条件

- `workspaceRegistry.get(workspaceId)` 公开合同与冻结的 `0.1.1-rc.2` 类型不符；
- canonical Workspace 根或 Windows reparse/ADS/尾点边界不能 fail-closed；
- 哈希实现需要将文件正文整体载入内存或写入日志/状态；
- add/refresh/remove 绕过 repository revision/Workspace 队列或可修改历史 run snapshot；
- 真实 Profile 出现未归因的新变化且用户尚未裁决；
- 静态/Node 证据被误作 Desktop、浏览器或专业结果证据。
