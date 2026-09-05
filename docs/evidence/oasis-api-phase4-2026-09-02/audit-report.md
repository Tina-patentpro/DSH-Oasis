# 第四批本地隔离验证：停止报告

状态：**BLOCKED_WAITING_FOR_USER**

执行日期：2026-09-02。第四批未完成，不构成隔离 Host、真实浏览器或真实业务验收。

## 1. 已执行范围

- 冻结本轮开始时 2,684 个已有仓库文件；第三批冻结的 83 个包文件无漂移。
- 冻结并复算权威 API 文档：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA256 为 `429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1`。
- 对 C:\Users\TinaD\.dsh 的 13,883 个文件/链接条目计算强基线；文件只读并哈希，链接只记录目标、不遍历目标；不解析或复制凭据内容。
- 新增 loopback 模拟 API、隔离门禁与 19 个合同测试，实际调用原 adapter 的 HTTP 客户端，覆盖九端点、五字段 create、安全日志、回执/响应丢失、401、两种流水 envelope、空/坏/重复流水及不安全 URL。
- 初始 RED 为新验证模块不存在；实现后的第一轮 16/19，因 fixture 将流水 type 写为数值而失败。仅修正新 fixture 为字符串，后续 19/19。没有修改业务合同来让测试转绿。
- attempt-001 保存冻结、RED/GREEN 和收尾记录；正式 runner 使用全新 attempt-002，既有 attempt 不复用。
- 在 C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-rSYbJi 中创建 standalone 副本并尝试构建；失败后停止，保留现场。

## 2. 停止原因

### A. 隔离复制没有保持 pnpm 依赖解析拓扑

`standalone-build` 退出 1：`Cannot find package 'ansis'`。

源 tsdown 是指向 `.pnpm/tsdown@0.22.14/node_modules/tsdown` 的链接，其 ansis 4.3.1 已在源安装中存在。runner 使用 dereference 复制后，将顶层 tsdown 变成真实目录；其依赖仍在副本 `.pnpm` 中，但不再位于 tsdown 的可见祖先 node_modules 下。因此这是本次新验证器的复制问题，不是业务源码失败，也不是已证明缺少离线下载材料。

证据：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-002\standalone-build.txt
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-001\copy-topology-diagnosis.json

没有在线安装、升级或改动锁文件。没有为绕过错误而改用原包原地构建。

### B. 真实 Profile 强基线出现两处变化

初始/最终比较及 attempt-002 独立比较均发现：

1. C:\Users\TinaD\.dsh\sessions\--D-OneDrive-3~3001~5927~5730~7269~6D41~88C5~5907-ZPC~8F6F~4EF6--\session-180ca71d-58ae-4f46-9695-ebf64e7b3377\session.jsonl.zstd
2. C:\Users\TinaD\.dsh\storages\session_projcache.json

两项均为已有文件内容变化，没有新增/删除项。不能据此宣称真实 Profile 零变化。本次 runner 在副本构建阶段就失败，命令台账没有执行 DSH CLI 安装、dump-config 或 Host 启动；变化可能来自同时使用的 DSH，但本轮没有完成归因，不能将推测写成结论。

没有停止用户已有进程，没有还原、覆盖或删除上述文件。需要用户使真实 DSH 写入静止后重新建立强基线，不得给这两个动态文件加忽略名单来冒充保护验证。

证据：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-002\profile-preservation.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-001\final-profile-comparison.json

## 3. 新鲜验证结果

以下 node:test 命令由 evidence helper 枚举对应 glob 文件，再以 shell:false 传入绝对 Node executable；具体 argv/cwd/开始结束时间/退出码见 final-commands.json。

| 命令/检查 | 实际结果 | 证明边界 |
| --- | --- | --- |
| `node --test tests/scripts/oasis-api-phase4-contract.test.mjs` | 19/19，退出 0 | 新隔离门禁 + 原 adapter 到本地 HTTP fixture |
| `node --test tests/scripts/*.test.mjs` | 55/55，退出 0 | 根脚本测试，包含上述 19 项，不重复计数 |
| `node --test packages/oasis-professional-service/test/*.test.mjs` | 271/271，退出 0 | 原包单元/合同及既有 in-process Host 集成，不是新 CLI Host 验证 |
| 新增三个源码 `node --check` | 全部退出 0 | 语法检查 |
| `git diff --check` | 退出 2 | 仍仅原 lib/client.js 的 2082/2090/2125/2133 四处模板空白 |
| 源码限定 `git diff --check` | 退出 0 | scripts/tests/src/test 已跟踪变更 |
| 新增未跟踪源码逐行空白检查 | 0 项 | 补足 git diff 不检查 untracked 的限制 |
| 2,684 个原有仓库文件后检 | 0 变化 | 第三批源码/产物/旧证据均保持原样 |
| HEAD/暂存区/API 文档 | 均未变化 | 未提交、未暂存 |
| 真实 Profile 后检 | 两个已有文件变化 | 保护验收未成立，不能宣称零写入 |

最终原文件后检：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02\attempt-001\final-protected-files.json。

## 4. 未完成层级与资产状态

- 副本标准构建、map 对比、43 项打包：未通过/未到达；原 bundle 合同测试绿色不替代副本构建。
- 隔离 CLI 安装、Host、Client 模块加载、live Slot 树：未执行。
- 真实浏览器、公共 Settings/Credentials 配置、双模式兼容、写回及重启恢复矩阵：未执行。
- 真实非生产/生产业务 API：未执行；仅合同测试中的 127.0.0.1 合成服务有调用。
- 本轮无长驻 Host/浏览器进程；合同测试 fixture 均在 finally 中关闭，构建子进程已退出。未停止用户原有进程。
- 新增业务外源码只有三个：scripts/verify-oasis-api-phase4.mjs、tests/fixtures/oasis-api-phase4-server.mjs、tests/scripts/oasis-api-phase4-contract.test.mjs（均位于本项目绝对根目录下）。计划中的 browser.test.mjs 尚未创建。
- runner 后续安装/浏览器分支尚未实际验收，且引用尚未实现的浏览器模块；当前仅为未完成的验证资产，不能作为第四批完整入口交付。
- runner 的 finally 在 Profile 比较失败后提前离开同一检查块，跳过其仓库/HEAD 后检；本轮通过独立 close-evidence.mjs 完成了这些检查。后续应修复为各保护项独立执行并聚合失败，不能只修构建。

## 5. 恢复执行的最小方案

1. 用户先暂停会向真实 DSH Profile 写入的任务，确认可开始一个静止验证窗口；不删除会话、不由代理终止用户进程。
2. 仅修复新 runner：先增加真实 pnpm 拓扑 RED 测试；复制物理包内容后重建**仅指向新运行根内部**的依赖链接/解析拓扑，检查每个 reparse target，不能链接回仓库或真实 Profile；继续离线。
3. 将后检改为逐项 try/catch 聚合，加入 Profile 漂移时其余后检仍执行的回归测试。
4. 完善缺失的浏览器驱动；先核实公共 Settings/Credentials 能提供所需控件，不能以内部 Store/RPC 写凭据冒充产品 UI。若需要业务源文件变化，另提修复计划，不扩大本批。
5. 新建 attempt-003，重算所有输入/真实 Profile 基线；依原批准计划从副本构建继续，通过门禁才进入安装和双模式 Host/浏览器。

上述恢复步骤尚未执行；所有已有 attempt 和临时目录均保留。
