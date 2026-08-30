# Week 3 Task 7 实施证据台账

- 日期：2026-08-26
- 范围：remote catalog、schema 原生表单、材料/运行/审核/写回右栏交互、400 ms 合并保存、任务与 Workspace 隔离、可访问性
- 明确排除：Task 8 Host1/Host2、真实 DSH Desktop/浏览器、临时 Workspace A/B 文件系统验收、网络/Dify/收费管理、专业正确性与法律结论
- Git 起点：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`；工作树包含同一 Week 3 Task 1～6 尚未提交的已验证改动
- Profile 裁决：用户已确认 `better-sidebar` 安装为有意操作；Task 7 不修改、回滚或测试该插件

| 层级 | 证据 | 当前结果 | 证明边界 |
|---|---|---|---|
| Task 7 before | `baseline/*-before.*` | PASS：source 92、Profile 13708/530 links、workspace contracts 4、toolchain failures 0 | 用户确认外部安装后的只读基线；不证明后续无并发变化 |
| Model/Store RED/GREEN | `runtime/model-store-red.txt`、`runtime/task7-focused.txt` | PASS：先出现 6 个预期缺失行为；最终 Task 7 聚焦 42/42 | catalog、表单、debounce、flush、权威结果、重试键、操作状态和隔离；不证明真实浏览器时序 |
| UI RED/GREEN | `runtime/panel-local-loop-red.txt`、`runtime/task7-focused.txt` | PASS：四个计划组件不存在时先 RED；最终组件与容器测试全部 GREEN | React 元素树、文本安全、审核/写回确认、错误聚焦、窄屏回退与单 DOM 业务树；不证明 DSH 实际渲染 |
| 静态安全审计 | `runtime/static-audit.txt` | PASS：无 HTML 注入、本地存储、Dify、收费、secret 或 chooser workflow ID 硬编码；token 仅在瞬态链路 | 源码文本与 contract 测试；不证明运行时内存或第三方依赖行为 |
| Task 7 全包验证 | `runtime/package-verify.txt` | PASS：build、171/171 tests、33 项 dry-run pack 全通过 | 本地构建、Node 测试、真实临时文件系统和打包合同；不证明 Task 8、Desktop/浏览器或生产环境 |
| Task 7 after | `baseline/*-after*.*`、`baseline/source-diff*.json`、`baseline/profile-diff*.json` | 源码 PASS：17 项变化全部命中精确 allowlist、unexpected 0；Profile 关注项：比较存在未归因会话/历史/cache 变化，未加入 allowlist | 本批源码差异已归因；由于真实 DSH 同期活动，不能用该窗口证明 Profile 全树未变化 |

## 目标合同

- chooser 卡片必须来自 Host remote catalog；选择后保持同一 task/page 标识，原位转换为工作区。
- 表单只按 catalog DSL 的四种控件渲染；字段错误可聚焦，本地草稿即时更新，400 ms 合并持久化。
- run、切换任务、关闭任务和隐藏面板必须触发待保存草稿 flush；Host 命令只能在保存 settle 后执行。
- 材料正文不进入 Client；仅显示相对路径、短 SHA、大小和“正文未读取”提示，add 需要显式确认。
- 生成按钮在保存中、表单无效、材料变化或操作进行中禁用，并显示文字原因；同一次失败重试复用 requestKey。
- 运行历史不可变；草稿偏离当前运行输入时显式提示；结果只通过 React 文本节点渲染。
- blocked 运行不能批准或写回；changes-requested 必须填写 note；批准文案不得暗示专业或法律结论。
- 写回 prepare 后显示绝对目标和两个文件 hash；必须再次勾选确认才 commit，并区分成功、冲突和 index warning。
- 有运行历史的任务关闭前必须二次确认；Workspace A/B 的瞬态状态、错误、requestKey 和 manifest 不得串用。
- normal 纵向、expanded 双列仅通过同一业务 DOM 树的 CSS grid 切换；不复制 store、任务页或 DSH 原生结构。

## 当前结论

`STATIC_ONLY`：Task 7 已形成本地实现、元素树、构建、171 项 Node 测试与 33 项打包清单闭环；尚未执行 Task 8 的 Host1/Host2、DSH Desktop/真实浏览器、临时 Workspace A/B 和网络验收。另因真实 Profile 在验证窗口出现未归因的会话/历史/cache 变化，本批不宣称 Profile 前后全树一致。

## 证据关注项

- before→after 的源码比较只有 17 项计划内 Client/UI/test/ledger/bundle 变化，全部命中精确 allowlist，unexpected 为 0。
- 真实 `C:\Users\TinaD\.dsh` 同期出现 attachment object、`input-history.json`、`llm-deepseek\files-v3.json`、session、`session_projcache.json` 与 `workspace.json` 变化；形态与 DSH 会话活动一致，但本批无法从只读证据证明具体来源。
- Task 7 的 DSH 命令全部经 `scripts\dsh-isolated.cmd`，其实现将 `DSH_HOME` 固定到项目 `.dsh-test`；代码实现、Node 测试、build 与 pack 不需要写真实 Profile。
- 未回滚、删除、清理、覆盖或把上述真实 Profile 变化加入 Task 7 allowlist；`profile-diff*.json` 保留为关注证据。

## 实现结果

- chooser 只消费 Host `workflow/catalog`；Client 不保留两种业务工作流卡片常量，选择时将完整版本化 definition 交给 reducer，同一 `pageId` 原位转为 workspace。
- 四类控件均由 catalog DSL 渲染；本地字段修改即时可见，生产默认 400 ms 合并保存，测试用可注入 scheduler；生成、任务切换、关闭、隐藏和 Workspace 清理均触发 flush。
- catalog、保存草稿、Host 权威 evidence 与每页瞬态 operation 分层；`workspaceStateToDraft` 只发送 Client 可编辑投影，不持久化材料证据、运行、token、绝对路径或 manifest。
- 材料区仅显示相对路径、大小和短 SHA，明确说明不读取正文；add 和 remove 均要求用户确认，Host 变更后以完整权威 record 回填。
- 生成门覆盖保存未 settle、表单无效、材料变化和操作进行中；失败重试保留同一 requestKey，成功后清除；运行历史通过 `activeRunId` 切换，旧快照不随草稿改变。
- 结果正文只作为 React 文本/`pre` 子节点渲染；blocked 不显示批准动作且不能写回；changes-requested note 必填；批准文案明确不代表专业、技术或法律结论。
- 回写 prepare 显示绝对目标和两个文件 SHA，二次勾选后才 commit；成功、冲突、文件已提交但索引失败分别显示不同反馈，index warning 保留仅含相对路径的恢复清单。
- 有运行历史的任务关闭前使用明确二次确认；操作进行中禁用任务切换/关闭；A/B Workspace 的 catalog、草稿、错误、requestKey、token 与 manifest 位于独立 state。
- normal 与 expanded 复用同一组件树，只切换 CSS grid；小于 760 CSS 像素（含高缩放）强制回到单列，并保留已有 Codex 显示/隐藏/展开/恢复图标。

## 停止条件

- 需要硬编码 workflow 卡片、Client 构造 Host evidence 或持久化 token/绝对路径；
- 需要复制业务 DOM 树、替换 DSH `details`/原生结构或改变已批准布局适配器；
- 需要读取材料正文、调用 Dify/收费或引入 Client 凭据；
- 预览需要 `dangerouslySetInnerHTML` 或用户文本可作为 HTML 执行；
- 保存/操作状态无法按 Workspace 和任务隔离；
- 真实 Profile 出现未归因的新变化；
- 本地元素树/Node 证据被表述为 Desktop、浏览器或生产证明。
