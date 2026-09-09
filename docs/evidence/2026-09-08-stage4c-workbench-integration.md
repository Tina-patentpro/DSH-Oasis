# 阶段 4C：工作台接入与隔离 Desktop 离线验收

日期：2026-09-08。授权：用户“同意进行阶段 4C”及“继续”。

质量状态：`PASS_WITH_CONCERNS`。**4C 按原生离线切片收口；不开放真实生成，也不代表技术 G-SKILL 已通过。**

## 用户已经能完成什么（本次离线候选）

- 在 DSH 原生模型菜单选择“绿洲离线文字”，在原七字段页面选择“本地 Skills”，提交文字并看到正文。
- 编辑正文产生新版本；新版本重新审核后，无覆盖保存 Markdown 与元数据；通过 Sidebar 原生文件页打开保存结果。
- 切换原生 Workspace 时显示各自绿洲任务，返回后原任务和版本仍在。
- 提供方错误仅显示固定 `GENERATION_FAILED`，不显示原始错误；慢速调用停止后进入 `unknown/ABORTED`，来源开关锁定，未自动重发。
- 当前对话已有草稿时，插入动作禁用，旧草稿保持不变。续验中正常重启后输入框为空，未执行清空；已审核版本 2 成功放入原生对话草稿，未发送，随后再次插入被禁用。
- 正常关闭并重启隔离 Desktop 后，四个版本及 unknown/ABORTED 保留，没有自动重发。未决运行锁定生成与修改，但不妨碍历史版本查看、已审核结果引用和已保存文件打开。

以上只使用公开样本、原生 `llm` 单次调用和本进程离线提供方；不是原生 Skill 工具/Agent 子任务，也不是业务私有 Skill 或真实模型生成。真实 API 未绑定且此隔离组合禁用旧远程入口。

## 最小实现

1. Host 通过固定 SDK 的 Workspace/Session 归属、Session cwd、原生 modelSelection 投影及原生默认模型读取配置，不接收客户端路由/指令，不恢复 Agent 或自动选模型。
2. `dsh-local` 与 `unified-fixture` 分开记录；新记录包含 `executionVersion=1`、`evidenceKind=native-offline`、输入与路由快照及指令版本/指纹，不存指令正文。保留现有 v4 容器，旧记录及哈希规则不重写；旧版本软件不保证读取新增 mode，回退/发行迁移仍须另验。
3. 先持久化 prepared，再调用一次适配器；结果写入按原运行身份校验。重复请求不重发，取消/超时/中断保持未决；观察恢复只将无活跃调用的 prepared 标为 unknown，不启动生成。队列仅保证当前 Host；验收启动脚本要求进程/端口独占，不宣称跨进程互斥。
4. 复用统一预览、编辑后再审、审核、无覆盖写回和对话资料准备路径。API 开关不触发请求，未绑定来源不降级到本地。
5. 仅在精确隔离 DSH_HOME 且 `OASIS_NATIVE_OFFLINE=1` 时装配离线提供方并声明所需原生依赖。普通 Profile 不启用该入口；没有新增用户模型/凭据设置。

## 实测暴露并修复的问题

- 整体验证的固定依赖清单断言缺少新增 `@deepseek-ai/dsh-llm@0.1.2-rc.1`，补齐精确断言，不放宽版本校验。
- 实际 Cordis 装配拒绝未声明的 `ctx.llm` 访问：为隔离模式声明 `llm/sessions/sessionProjections/agentDefaultModel`；补充先红后绿测试，重新启动后工作台实际可用。
- 原生模型菜单拒绝离线目录缺少 `provider` 的条目：按固定 LlmRuntime 合同补齐 provider/文本模态；实际原生目录集成先红后绿，Desktop 菜单中三个离线模型均可选。
- 两组测试改为共用不注册测试的 harness，避免从另一个 test 文件导入而重复计数；未新增诊断/监管框架。
- 续验发现未决运行过度锁定历史版本及引用：分离只读访问与生成/修改锁，不改未决状态。首次修复的可选 `generationUncertain` 产生 undefined，触发旧 disabled 回退；按实际 PanelPages 默认值复现后改为显式布尔判断。两次均有先红后绿记录，最终在实际 Desktop 完成正向引用。

## 新鲜证据与边界

Shell：cmd.exe；PowerShell 启动/关闭使用显式 `-NoProfile -ExecutionPolicy Bypass -File`，仅进程级策略，不修改系统执行策略。

| 验证 | 结果 |
|---|---|
| 包内 `npm run verify`，日志 `.dsh-test/stage4c-verify.log` | 构建成功；测试 346/347，退出 1；唯一失败是上述依赖清单断言。没有把该次全量运行标为通过。 |
| `node --test test/package-contract.test.mjs` | 修复后 6/6，退出 0。 |
| `node --test test/local-generation-service.test.mjs test/unified-generation-service.test.mjs` | 12/12，退出 0；包含独立本地准入、停止/迟到结果、恢复未知、篡改拒绝、RPC 字段拒绝、共享编辑/审核/保存，以及旧合成回归。 |
| `node --test test/native-offline-runtime.test.mjs test/host-tool.test.mjs test/host-runtime.integration.test.mjs` | 注入修复后 10/10，退出 0。 |
| 根目录 `node --test tests/integration/stage4a-native-llm.test.mjs` | 目录修复后 2/2，退出 0。真实固定包的目录/投影/单次调用；该测试的 Workspace registry 为替身，不单独证明 Desktop 归属。 |
| 实际候选 Desktop 2.0.5 + 内置 DSH rc1 + Sidebar 0.18.0 | 原生选择 text/error/slow，页面生成、编辑、再审、保存、打开、错误及停止分别操作；无模拟视口。保存和停止截图已查看。 |
| 停止候选后重新读取 Domain、验证其合同/哈希 | 4 条本地记录分别 completed、completed/approved、failed、unknown；保存正文哈希与审核版本相同。不是重启 UI 恢复证据。 |
| 检查隔离持久化内容 | Domain/写回元数据及解压后的 3 个 `session.jsonl.zstd` 未发现公开指令/错误 canary；不据此声称所有 UI/导出面或真实 Skill 已保密。 |
| 真实 Profile 强基线 | 两处共 20533 个条目，前后内容比较 changes=[]，退出 0。 |
| 候选关闭检查 | DesktopProcesses=0；IsolatedPortListeners=0，退出 0。 |
| 最终 `npm pack --dry-run --json --cache ../../.tmp-npm-cache` | 63 项，退出 0；`.dsh-test/stage4c-pack-final.json`。没有创建发布包或发布。 |
| `git diff --check` | 退出 0；仅已有换行提示，无空白错误。未暂存或提交。 |
| 续验 `node --test test/unified-generation-ui.test.mjs test/unified-generation-service.test.mjs test/local-generation-service.test.mjs` | 最终 18/18，退出 0；覆盖历史只读访问、修改锁、已有草稿/能力阻断、保存中/操作中禁止切换及原服务回归。 |
| 续验 `npm run build` | 退出 0；最终 bundle SHA-256 见 evidence-closure.json。没有重新运行整批 verify。 |
| `node .dsh-test/stage4c-closure-ui.mjs` | 最终退出 0；实际重启后的候选，版本 2 准备原生草稿，未发送；四条 runs 深比较不变，unknown/ABORTED 与生成锁保留。 |
| `node .dsh-test/stage4c-ui.mjs closure-file-visible` | 退出 0；已保存结果在 Sidebar 原生文件页显示预览/编辑及正文，ARIA 留证。此次文件截图两次超时，未称为新截图证据，不扩展图形排障。 |
| 续验关闭及强基线 | Browser.close 后 DesktopProcesses=0、IsolatedPortListeners=0；两处真实 Profile 共 20533 个条目前后比较 changes=[]，命令均退出 0。 |

本轮只运行一次集成候选 verify；其后针对已定位失败复验，不重复整批。npm pack dry-run 不是发布。pnpm 曾要求重建依赖目录，已拒绝清空；只为锁文件已存在的固定 SDK 建立项目 node_modules 本地链接，没有升级/下载依赖。默认 npm 缓存权限失败后改用项目缓存。

## 可核对产物

- Desktop 操作记录及截图：`output/playwright/stage4c-20260908/`；主要为 `generate.png`、`commit-save.png`、`open-file.png`、`error.png`、`stop.png`。
- 精简磁盘证据：该目录 `evidence-v2.json`。初版 `evidence.json` 仅扫描未压缩 JSONL、覆盖数为 0，不可用于会话排查结论；v2 实际解压读取 3 个 zstd 文件。
- 真实 Profile 比较：`.dsh-test/stage4c-baselines/protected-comparison.json`。
- 新保存结果：`.dsh-test/stage2-workspaces/workspace-b/stage4c-native-20260908/patent-claims.md`，SHA-256 `c596d96019c3f45ec554195a23533b8e5285d40dba1a1f5a27b37b234ed5715a`。
- 新任务 `c35dc011-7f9e-47b1-9687-337511cf1141`；未决运行 `run-8500d461-543c-4745-85a8-6ea46a7d3141`。禁止为继续测试删除记录、改状态或自动解锁。
- 续验：`closure-ui.json`、`closure-conversation-draft.png`（已查看）、`closure-conversation-draft.txt`、`closure-unknown-preserved.png`、`closure-native-file-aria.txt`、`evidence-closure.json`；旧 evidence-v2 保留为当时的部分证据。
- 续验真实 Profile 比较：`.dsh-test/stage4c-closure-baselines/protected-comparison.json`。

## 续验收口与仍未开放的能力

1. 原剩余的对话正向插入、实际重启恢复已取得上述证据。无需清空草稿，没有删除或解锁未决运行，没有新增生成请求。
2. 续验中权限审查再次发生服务连接中断；只读复核原脚本、隔离路径和进程/端口独占后，重试同一审批命令获准，未更换通道绕过。一次刷新等待 networkidle 超时不计成功证据，最终修复是 UI 默认状态布尔值，不是浏览器缓存改造。
3. 最终磁盘合同/哈希复读退出 0：仍为原四条运行，保存正文哈希未变化；Domain、元数据及解压后三个原生会话文件无公开指令/错误 canary。该抽样不能证明真实私有 Skill 的全部普通产品可见路径安全。

环境最小处理已用：沙箱内 GPU 子进程启动失败后，经批准在沙箱外启动同一项目隔离候选；不再扩展浏览器排障。G-SKILL、真实模型/API、安装包发行与升级仍未通过。真实调用须另行确认数据去向、费用预算及验收边界；不得拿本轮离线证据直接装入私有 Skill。本轮没有提交、推送或发布，原有未提交 4A/4B 变更保持保留。
