# 阶段 3 提交后审计与修复复验

日期：2026-09-07。最终状态：**PASS_WITH_CONCERNS**（仅阶段 3 统一界面与隔离合成链路）。

## 目标契约与状态卡

- 来源：用户连续目标授权；先开发提交，再审计、修复复验、修复提交与非强制推送。
- 被审提交：`12afb9dff84a67a6cf2a051b7f29afe4aec55190`；基线：`398e2b5b5cf31d8c8c3d96f094942e39fb1b3ec2`。
- 对象：权利要求书统一七字段/双来源开关、v4 数据迁移、合成运行、审核修订、Markdown 保存、原生文件与对话草稿、原生设置和三项固定上游补丁。
- 成功标准：不丢草稿、不混淆项目或审核版本；合成产物操作同等；不重发未知创建；固定补丁可识别；没有未修复的本轮可行动发现。
- 不修改：真实 Profile、系统 Desktop、真实 API/模型/私有 Skill、远端历史、充值/账务网站；不建立监管器或新的通用框架。
- 当前阶段：提交后审计及修复复验完成；修复提交/推送状态以 Git 事实为准，不提前写入未知提交号。
- 停止条件：未知工作区改动、远端非快进、真实调用授权缺失或实际不可逆覆盖。
- 不采用子代理。审计方法为主代理提交后重新检查合同和异步边界，并用延迟响应复现；不是外部独立审计机构的结论。

## 审计范围与结论

| 范围 | 本轮检查 | 结论 |
|---|---|---|
| 业务/架构 | FunctionCenter、统一页、七字段、设置 owner、Host/Sidebar 公开边界 | 首模板为已确认的权利要求书；两个来源共用界面；真实来源未启用，合成标识保留 |
| 数据/兼容 | generation/workbench contract、Domain、Repository、v3→v4 和旧哈希 | 显式迁移；旧任务不改标 Skills；Host 运行/产物字段不能由草稿覆盖；同项目最多一个未结束合成运行 |
| 生成生命周期 | create/edit/stop、requestKey、快照、CAS 发布 | runner 在队列外；先持久化 prepared；迟到结果不改 stopped；未知结果不自动重发 |
| 客户端异步 | store 的响应应用、保存排队、版本切换、conversation bridge | 发现两项 P2，见下；均通过真实 Store→RPC→Host 的定向复现后修复 |
| 审阅/文件 | 不可变修订版本、重新审核、无覆盖保存、saved-file RPC、Workspace 路径解析 | 相同规则；路径由已保存记录解析，拒绝跳转/跨项目；当前文件不是固定审核正文 |
| 原生能力 | native scope、empty composer、InputActions.setDraft、safeFilePreview | 不调用 submit；不覆写非空草稿；安全文件不与普通 tab 去重合并 |
| 渲染/装配 | Desktop frame、native Markdown、Web 内嵌 Markdown、Sidebar source/lib 和装配脚本 | 精确版本/输入哈希匹配，不近似打补丁；无能力时纯文本；安全模式不自动渲染图片/原始 HTML |
| 证据/分发 | 构建产物、包白名单、隔离 Desktop、受保护目录前后基线 | 不把旧截图当作新修复的行为证明；新加载脚本及对话草稿单独复验；没有提交 Profile、缓存或完整 Desktop 副本 |

## 发现与修复

### S3-A1 / P2：生成响应覆盖另一任务的未保存材料

- 位置：`packages/oasis-professional-service/src/client/workbench-store.js` 的 `runPageOperation` / `applyAuthoritativeReplacement`。
- 触发：任务 A 生成响应尚未返回时，编辑同 Workspace 的任务 B；A 的整份权威记录直接替换客户端状态，B 的未保存文字在界面变为空。
- 红灯证据：新增 `a generation response preserves an unsaved sibling draft instead of replacing it`，修复前实际值 `''`，期望值 `必须保留的未保存材料`；命令退出 1。
- 修复：记录本地编辑代数；操作期间出现本地编辑则保留客户端草稿，停止尚未提交的自动保存并进入既有显式 revision 冲突流程，不静默合并/覆盖。已发出的保存响应不得把冲突重新标成 ready；迟到较旧权威记录也不能倒退覆盖当前状态。
- 验收：材料保留、冲突显式可见、Host 原运行仍为 completed，不重新生成。

### S3-A2 / P2：切换结果版本后，晚到资料仍可插入对话

- 位置：同文件 `useInConversation`。
- 触发：请求已审核版本 1 的对话资料，在 RPC 返回前切换至版本 2；旧实现只检查原生会话/草稿，未重新校验当前业务版本。
- 红灯证据：新增 `late conversation preparation cannot insert after the selected version changes`，修复前 `Missing expected rejection`；命令退出 1。
- 修复：插入前再次验证 ready 状态、revision、当前任务、当前运行及审核状态。任何变化均不调用原生插入；原有空草稿、唯一 Workspace/Session 归属与禁止发送保护继续保留。
- 验收：切换后插入次数为 0；正常同版本准备草稿仍可用，非空后重复入口禁用。

## 遗漏反思

原开发验收覆盖了跨 Workspace、Host 延迟结果和原生会话草稿变化，但没有覆盖“同 Workspace 的另一任务本地编辑”及“RPC 返回期间业务版本变化”。本轮在现有业务测试中补足这两个交错，不新增诊断工具或修改全局 Skill。此为本项目的异步响应应用缺口，尚无跨项目复现证据，不上升为共享治理规则。

## 字段生产者与消费者合同

| 生产者 | 必需字段 | 消费者与约束 |
|---|---|---|
| generation draft | source、inputSchemaVersion、七字段 formValues | 同表单与 Host 校验；切换不自动请求 |
| prepared run | requestKey、source、inputSnapshot/hash、状态、版本 | CAS 发布与冲突检查；不接受输入/来源暗改 |
| completed result | artifact/body/hash、contentStatus、riskAssessment、questionAssessment | 同一结果页与审核；合成结果明确 not-assessed，不用空数组代表无风险 |
| conversation response | workspaceId/taskId/runId/artifactId/text | 严格 schema 与身份一致；客户端提交前再次校验当前选择；原生仅 setDraft |
| saved-file response | 前述身份、writebackId、absolutePath、current-file | 由持久化保存记录解析；native scope 再校验；不当作固定审核版本 |

## 新鲜验证证据

以下命令均使用 cmd，包内命令工作目录为 `packages/oasis-professional-service`。

1. 开发提交前根目录 `node --test tests/desktop-frame-patch.test.mjs tests/native-markdown-policy.test.mjs tests/sidebar-safe-file.test.mjs tests/web-markdown-policy.test.mjs`：8/8，退出 0。修复未改变这些补丁。
2. 修复前 `node --test test/unified-generation-service.test.mjs`：5 成功、2 失败，退出 1；失败均为上述断言而非环境错误。
3. 修复后 `node --test test/unified-generation-service.test.mjs test/unified-generation-client.test.mjs test/panel-persistence-ui.test.mjs`：14/14，退出 0。
4. 修复后 `npm.cmd run verify`（`.dsh-test/stage3-safe-verify.cmd` 调用同一脚本）：构建成功、328/328、pack dry-run 59 项，退出 0。没有重装依赖或清除 modules。
5. 隔离 Desktop 新启动后 `node .dsh-test/stage3-audit-smoke.mjs`：退出 0。通过 CDP 检查实际已加载插件脚本包含修复；已审核本地合成版本 4 正常放入原生草稿，重复入口禁用，未发送。
   - 精简证据：`output/playwright/stage3-20260907/audit-fix-runtime.json`，包含构建 SHA-256。
   - 本次截图操作曾超时，未继续修环境；不声称取得新修复截图。此前 C2 宽窄/设置截图只证明未改动的布局，修复行为由本轮测试与实际 Desktop 操作证明。
6. 关闭验证：CDP close 因目标关闭返回退出 1；独立进程/端口检查退出 0，`DesktopProcesses=0; IsolatedPortListeners=0`。
7. `node .dsh-test/stage3-baseline.mjs after audit-fix`：两个真实保护根目录前后 `changes=[]`，退出 0。基线保存在未入库的 `.dsh-test/stage3-audit-fix-baselines`，不提交个人 Profile 快照。
8. 只读 GitHub `git ls-remote origin refs/heads/main`：退出 0，远端为 `398e2b5b5cf31d8c8c3d96f094942e39fb1b3ec2`。只允许后续非强制快进，不改写已有历史。

## 余留范围与远程测试判断

- 本轮两项可行动发现均已修复；不宣称无法再发现任何缺陷。
- 阶段 3 是统一交互与合成证据，不是专业生成质量、真实 API/Skills 或完整产品交付验收。
- G-SKILL 保密边界与真实 API 绑定/授权仍未通过；**不建议现在调用真实生成服务**。这些属于后续阶段的门禁，不以测试数量替代。
- 固定二进制补丁仅覆盖明确基线；上游升级须重新核对并装配，不能自动跟随 latest。未进行用户安装包发行/升级回滚验收。
- 当前文件是可变资料；路径解析时的校验不是抵抗设备所有者并发修改文件系统的绝对保证。
- 冲突保留草稿使用既有人工重新载入机制，不新增自动合并，更不自动重发生成。

下一步：提交上述定向修复、审计报告和精简运行证据，然后按已核对的 origin/main 非强制推送；最终以本地/远端提交 SHA 一致为依据。
