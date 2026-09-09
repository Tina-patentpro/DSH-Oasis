# 阶段 4D：公开样本的普通产品可见性核查

日期：2026-09-08。用户授权：“同意进行4D”。

**状态：PASS_WITH_CONCERNS。** 本次目标为最终 4C 接线的公开样本可见性检查，不是私有 Skill 装配、真实模型防提示复述保证或通用日志下载功能验收。单代理自查，不声称独立审计。

## 结论

在本轮实际读取的客户端脚本/source map、业务历史、对话草稿、原生文件页、原生导出 ZIP、Domain、写回元数据及隔离 Host 日志中，均未检出 `PUBLIC_STAGE4C_INSTRUCTION` 或 `PUBLIC_STAGE4C_ERROR_CANARY`。实际资源中包含当前绿洲构建，ZIP 非空且属于四条本地运行快照记录的同一 Session，不能用空文件/未运行检查解释这一结论。

公开样本的当前接线证据已补齐，可继续 4E 的 Host 资源装配方案与非秘密等价样本核验。**G-SKILL 对最终私有业务资源装配仍不自动通过**：当前指令是公开样本，npm 清单包含 Host 源码；4E 必须先明确受控资源来源、加载及打包边界，用非秘密替身验证该最终布局，再裁决技术门禁。未授权直接放入私有内容、真实模型/API 或发布。

## 证据与分层

证据目录：`output/playwright/stage4d-20260908/`。Shell：cmd.exe；现有隔离启动/关闭脚本通过显式 PowerShell `-NoProfile -ExecutionPolicy Bypass -File` 执行，不改变系统策略。

| 必要获取路径 | 本次实际检查 | 结果与限制 |
|---|---|---|
| 客户端脚本 | 从 Desktop 页面实际 performance 资源列表取得 `/plugins/??...&rev=b37fe62c1c5f`，在该页面同源读取 | HTTP 200，6,233,566 字节；包含当前绿洲 bundle（去除 source map 尾注后逐字匹配）；两个标记均未检出。不是猜 URL 后拿 404 当安全证明。 |
| source map | 跟随上述响应的 sourceMappingURL 读取实际组合 map | HTTP 200，8,925,733 字节，47 个 section；两个标记均未检出。本地 `lib/client.js.map` 也未检出。保留公开客户端 source map，不将其本身视为缺陷。 |
| 普通资源路由 | 读取固定 `dsh-client-modules/lib/index.js:838–857` | 只返回已组合响应表中精确 resourceUrl；不是映射整个插件目录的文件服务器。此项为源码证据，不作无限路径探测或通用安全保证。 |
| 工作台历史 | 实际点击版本 1、2、3、4 | 原始/已审正文可见；错误仅 GENERATION_FAILED，停止仅 unknown/ABORTED；未显示指令/原始错误。`history-visible.json`。 |
| 对话与详情 | 读取原生当前草稿及详情区 | 草稿含已审核产物与哈希，不含业务指令；详情无该业务的工具调用行。导出及版本操作后草稿逐字不变，没有发送。 |
| 已保存文件 | 点击“打开当前文件”，原生 Sidebar 显示预览/编辑和样本正文 | 实际 UI/ARIA 检查退出 0，`history-aria.txt`；正文 SHA-256 与 4C 已审核版本一致。未编辑或再次保存。 |
| 原生导出内容 | 同一原生 `/api/session.export`，对应 Session 且 `includeDescendants=true` | HTTP 200/application/zip，1,496 字节；解压读取父 `session.jsonl` 1,270 字节和一个既有子会话日志 1,093 字节；身份匹配，两个标记均未检出。没有伪造日志或另写过滤导出器。 |
| 原生导出 UI 手势 | 点击“指令”菜单中的 export | 原生会话中确有 command/run、command/done；20 秒内没有观察到下载完成事件，也未出现成功弹窗，**不声称 UI 下载闭环通过**。随后读取同一原生端点的真实 ZIP，用于本次正文可获取性判断；该交互关注项不等于泄露反例。 |
| 持久化/Host 日志 | 读取 Domain、两份写回文件、解压三个原生 session.jsonl.zstd，以及六份隔离 Desktop Host 日志 | 两个标记均未检出；不复制整份 Host 日志或读取凭据。四条运行深比较不变，unknown 未清除。 |
| npm 装配清单 | 包内 `npm pack --dry-run --json --cache ../../.tmp-npm-cache` | 63 项，退出 0；包括 `src/native-offline-runtime.js`（确实含公开标记）。这是 Host 安装内容，不是客户端投射；管理员/解包提取风险已接受，但不得据此宣称正文绝不可取。没有制作或发布安装包。 |

### 实际命令与结果

- `node .dsh-test/stage4d-ui.mjs open-workbench`、`commands`、`history`：退出 0；普通页面/菜单/历史/原生文件页证据。
- `node .dsh-test/stage4d-ui.mjs export`：退出 1，下载完成事件超时；保留该失败，未重复触发 export 或删除日志。
- `node .dsh-test/stage4d-ui.mjs resources`：最终退出 0。首次独立 request 客户端被 HTTP 403 拒绝；改为已打开 Desktop 页面的正常同源 fetch，不读取/复制凭据，不伪造请求头。分别获取实际脚本、map 和原生 ZIP，不将此替代描述为 UI 下载成功。
- `node .dsh-test/stage4d-read-evidence.mjs`：退出 0；ZIP 可解析、父子日志非空、Session 对应、四条 runs 未变化，保存正文哈希仍为 `c596d96019c3f45ec554195a23533b8e5285d40dba1a1f5a27b37b234ed5715a`。
- `node .dsh-test/stage4c-ui.mjs close`、`powershell -NoProfile -ExecutionPolicy Bypass -File .dsh-test\stage3-check-closed.ps1`：退出 0；DesktopProcesses=0、IsolatedPortListeners=0。
- `node .dsh-test/stage4c-baseline.mjs before 4d` / `after 4d`：退出 0；两处真实 Profile 共 20,533 个条目前后比较 changes=[]。原基线文件不覆盖。
- `node .dsh-test/stage4d-final.mjs`：退出 0；关闭后四条运行仍不变，六份隔离日志标记命中数 0，记录九个相关文件指纹。
- 产品代码和构建未修改；本地 bundle SHA-256 `b3be7e5ad2340b432a2f4b491486f6fbd10d3d9cf7a76f5b5dbcf6685158744b`，与 4C 最终证据一致。未重跑整批 verify，不以测试数量累加作为进度。

## 源码数据流核对

- `src/local-generation-service.js` 从 Host runtime 取 instruction；准入仅持久化 version/SHA-256，正文作为短期调用参数送给适配器。
- `src/dsh-generation-adapter.js` 将指令放入原生 llm 的 system，消费正文并丢弃 reasoning，错误映射为固定码；没有构造原生 Skill 工具结果或子任务 persona。
- `src/workbench-rpc.js:248–251` 使用严格 create-local 入参合同，不提供指令读取/导出 RPC。
- 此次 ZIP 的子会话为隔离环境既有记录；本轮未创建子任务。不能把它当作 4C 使用了子 Agent 的证据。

## 未通过本轮自动开放的事项

1. **正式业务资源装配**：4E 先以非秘密等价资源验证 Host-only 加载、客户端/原生文件范围、打包和错误边界，再决定 G-SKILL；不立即把真实业务指令放进当前公开样本模块。
2. **模型复述风险**：当前离线提供方不会证明真实模型永不复述 system。真实调用前说明实际数据去向和这一剩余风险；不能用字符串过滤、混淆或已读样本替代承诺边界。
3. **原生下载交互关注项**：命令执行与 UI 下载反馈未形成闭环，本次已取得同一导出端点的真实内容，足以检查当前日志可见性。不扩展诊断工具链；若以后交付范围要求修复该普通下载动作，再单独定位处理。

本轮不建议直接进行真实私有 Skill/模型验收；下一步只推进 4E 资源装配设计及非秘密替身核验。没有修改真实 Profile、业务代码、旧日志或用户草稿，没有生成请求、会话发送、Git 暂存/提交/推送或发布。既有未提交变更全部保留。
