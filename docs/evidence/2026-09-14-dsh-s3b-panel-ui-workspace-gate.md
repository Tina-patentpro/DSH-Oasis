# S3B 用户面板截图与工作区门禁

截图来源：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-ca208d9f-ba72-4d29-8147-8ea426dcd7a8.png

## 已观察到

“研发 / 专利”入口可见，右侧原生标签中显示绿洲专业工作台及项目同步提示。内容为“请新建任务页。”；核对隔离候选 OasisWorkbenchSurface / PanelPages，这是无任务页的空状态，不据此判断加载故障。功能中心卡片、模板表单、来源切换、保存和引用尚未验收。

## 工作区门禁

只读核对候选权威记录：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home\storages\workspace.json

工作区 39e3cbf5-58ed-4742-b92b-e2d124a8c4d4 实际绑定：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test

这是包含多个开发副本的上级目录，不是约定的 workspace-a。已有 Home/Profile/进程分离证据不因此失效，也没有证据证明日常数据被改写；但业务材料/保存测试不能在这个宽范围工作区继续。

暂停该工作区的生成、材料和保存测试。不直接修改运行中的 workspace.json，不迁移或删除现有会话。需用户在开发 UI 添加/选择如下独立目录，并在其下新建会话：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a

随后打开“研发 / 专利”，点击工作台内“功能中心”并返回截图，再核对权威工作区绑定。不要点击生成或上传真实材料。

当时门禁：BLOCKED_WAITING_FOR_USER。面板显示不等于完整业务或工作区隔离验收。

## 后续回传：独立工作区与功能中心

用户截图：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-5cbcaec3-8782-4a8e-8e3f-6399787a3351.png

再次只读核对上述 workspace.json：

- 新工作区 5967c480-f400-4083-b650-9176dade70d1 指向约定的 isolated-dev-20260913/workspace-a。
- 对应会话 session-6379a4c7-291d-4a39-8a48-a6c4af76ab49 只归属于该工作区。
- 原 .dsh-test 工作区及其两条会话仍保留，未要求删除或迁移。
- 截图显示 Desktop 2.0.9、当前 workspace-a、原生右侧绿洲标签、功能中心、四个原生工具入口，以及可打开的“权利要求书生成”；“说明书生成”“申请文件检查”仍为待接入，不冒充支持。

此前选错工作区的人工门禁已解除；这里只确认记录中的正确绑定与截图中的呈现，不扩大为任意跨项目操作隔离证明。接下来验证模板表单、同页来源切换及未生成的草稿保留；不得点击生成、发送或上传真实材料。当前等待该界面测试回传。

## 后续回传：表单、来源切换与草稿落盘

用户回复“保留，正常”，对应前次要求的本地 Skills → 专业 API → 本地 Skills 切换测试。截图：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-bb61af84-0ab5-4d07-ab9f-942bee281ded.png。

- 截图显示正确 workspace-a/项目 ID，四选项卡表单及测试文字“隔离升级测试，不是真实材料”，本地 Skills 已选中。
- 界面明确显示“合成验收 · 无真实调用”和“生成合成样本”；不是实际 Skills/API 生成完成证据。
- 只读检查候选 home/storages/oasis_workbench.json：该工作区任务 98d68e38-3dc7-4060-9187-922a35d11b4a 的 formValues.disclosure_text 与测试文字完全一致，generation.source=local-skill，runs 数量为 0。因此确认草稿已落盘，但不据此声称重启恢复通过。
- 新增仅本地只读检查助手 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\inspect-ui-receipt.py；以 cmd.exe 执行 python，退出 0。安装包的 unified-fixture-environment.js、unified-generation-service.js、unified-fixture.js、client/UnifiedGenerationPage.js 四项 SHA-256 与候选源码一致。未修改运行 Profile、安装包或业务源码。

本次限定的表单/来源切换/草稿保留目标：PASS。完整 S3/S4/S5 仍未关闭。下一步人工点击一次“生成合成样本”，再切换“结果”回传截图；仍只使用当前测试文字，不选上游文件、不发送对话、不进行真实模型/API/费用调用。如出现模型/费用确认或按钮不再是合成样本，停止并回传。

## 后续回传：一次合成生成与结果落盘

截图：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-b92d2cdb-4ffc-4e15-bc94-5dca7f0e833d.png。正确 workspace-a 中显示版本 1、本地 Skills / 合成验收 / 待审核，正文 provenance 为 synthetic、skill_id/skill_version 为 none；不是业务 Skill 0.2.2 的真实执行证明。截图 business_version 0.2.0 是合成输出未提供真实 Skill provenance 时的既有回退值，不据此宣称实际 Skill 降级。

通过 cmd.exe 执行候选 inspect-ui-receipt.py，退出 0。只读目标工作区记录确认：

- 任务 98d68e38-3dc7-4060-9187-922a35d11b4a 仅 1 个运行：run-eee145b8-cfc6-4ba9-ae7f-dab069fb688d。
- mode=unified-fixture，evidenceKind=synthetic，source=local-skill，status=completed。
- workflowRunUid=78ffa9bf-8d57-4a5c-9645-bd815c4ebe4f，与截图一致。
- 正文 2635 字符，重新计算 SHA-256 与产物记录一致：66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74。
- 建议文件名 claims_20260914181030_78ffa9bf.md；review=not-reviewed，writebacks=0，未把正文落盘等同于 Markdown 回写完成。
- 安装包四项合成生成相关文件与已检查源码哈希仍一致。截图中的 Markdown 标记是既有 fail-closed 纯文本预览，不声称富预览能力恢复。

本次限定的合成生成/结果呈现与落盘目标：PASS。后续需用户在结果底部审核此版本，通过“项目回写”仅创建 workspace-a 内全新目录 s3b-synthetic-20260914-01，再将已审核版本放入当前 workspace-a 的空对话草稿，不发送。只读核对该目标目录当前不存在；最终仍须 UI 准备清单及无覆盖提交校验，不以此次不存在检查替代提交时校验。未修改运行 Profile、业务源、日常 DSH 或执行真实调用；完整 S3/S4/S5 未完成。

## 后续回传：审核、Markdown 保存与对话草稿

截图：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-9484f46c-ebe2-4b50-9494-93eeab5bfbae.png。

截图显示正确 workspace-a 中已有保存路径，中央输入框已有合成正文，右侧提示“已放入对话草稿，尚未发送。”；“当前对话已有草稿或正在提交；不会覆盖”是插入后可用性保护提示，不是此次插入失败。该截图不证明实际尝试第二次覆盖已被拒绝，也不证明重启后的聊天草稿持久性。

cmd.exe 执行候选 inspect-ui-receipt.py，退出 0。相同任务仍只有一次 completed/synthetic 运行，review=approved，writebacks=1；正文哈希未变。逐个解析并验证回写记录中的路径均在独立 workspace-a 内，文件实际字节 SHA-256 与记录一致：

- s3b-synthetic-20260914-01\claims_20260914181030_78ffa9bf.md：66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74，与已审核正文哈希一致。
- s3b-synthetic-20260914-01\claims_20260914181030_78ffa9bf.oasis.json：eaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187。

本次限定的合成结果审核/新目录保存/对话草稿呈现目标：PASS。没有触发聊天发送，不把截图提升为全局零网络活动证明，不把人工审核视作专业质量结论。未修改运行 Profile、安装包、业务源码或日常 DSH。

下一步需用户正常退出并通过“DSH 开发测试”快捷方式重开候选，回到 workspace-a 的同一会话/任务，观察输入、版本 1、已审核状态、保存路径及对话草稿是否恢复，同时反馈日常 DSH 是否正常；不重新生成、不重复回写、不发送。当前记录是重启前基线，不预先声明恢复通过。安全富预览/安全文件打开未恢复，完整 S3/S4/S5 仍未关闭。

## 后续回传：重开后的草稿、文件及启动记录

用户明确回复“日常 DSH正常”。截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-2f1f33d8-b5b1-49f5-9c7e-e2e822a6cae1.png 显示 workspace-a 中未发送的对话草稿，包含原 run-eee145b8-cfc6-4ba9-ae7f-dab069fb688d 和原产物 SHA-256；右侧工作台未展开，不能据此确认任务页已重新显示，也不能仅据此认定页面数据丢失。

本次通过 cmd.exe 运行 inspect-ui-receipt.py 与新增只读 inspect-restart-receipt.py，最终均退出 0：

- 原输入文字、任务 ID、一次 completed/synthetic 运行、approved 状态及一次回写保持；正文与两份已保存文件哈希均与重启前一致。
- 开发主进程已由 4388 改为 37904，Host 25456；最新启动 runId 为 20bffb4b-fe3e-49dc-8b20-393f95447db7，startup.run.completed / renderer healthy，无该轮 failed 事件。
- 当前开发监听 127.0.0.1:43120；日常安装路径对应主进程 29972 监听 127.0.0.1:43121。两个具体可执行路径及各自端口分别核对，不沿用旧 PID/端口作为身份。
- 初版只读助手沿用旧候选端口 43121 和旧日常 PID 8880 的断言失败；随后改为按实际可执行路径识别进程并报告当前端口，未修改任何应用配置。该失败是旧观测值假设不成立，不记为应用故障，也不宣称旧日常进程持续未重启。
- 既有 isolation-20260914-a.md 样本哈希仍未变。检查时刻 2026-09-14T11:41:33.973320Z。

完整重启界面恢复目标仍为 BLOCKED_WAITING_FOR_USER：需用户点击“研发 / 专利”，返回已有权利要求任务并核对输入、版本 1、已审核状态及保存路径；不新建任务、不重复生成/回写、不发送草稿。仅草稿截图和持久化文件正确不替代工作台重新加载后的界面证据。

## 后续回传：重开原任务的输入页

截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-7a4303aa-c5f4-4278-ba4e-8f0ac6bcc26d.png 显示右侧原权利要求任务已打开，项目 ID 正确，技术交底中的“隔离升级测试，不是真实材料”恢复，本地 Skills 及合成验收标识仍在；中央原运行的对话草稿保留。任务入口及输入页重新加载证据已取得。

本次 cmd.exe 执行 inspect-ui-receipt.py 退出 0，仍为原任务、原一次 completed/synthetic 运行、approved、一次回写，正文及两份保存文件哈希一致。未修改运行 Profile、安装包或业务源码。

当前完整重启界面恢复目标仍为 BLOCKED_WAITING_FOR_USER，仅缺“结果”页实际显示版本 1、已审核状态和既有保存路径的人工证据。可由用户点击“结果”并查看至底部后一句确认三项保留，或回传对应截图；不要求重复生成、审核、回写或发送。

## 最终人工回传：结果、审核、路径均保留

用户明确回复“结果、审核、路径均保留”，补足重开“结果”页后的实际界面证据。结合前述输入页/对话草稿截图、新启动健康记录及本次重新执行 inspect-ui-receipt.py（cmd.exe，退出 0），确认同一任务的一次合成生成、审核、两份已保存文件及未发送草稿在本次正常退出重开后保留；文件/正文哈希无变化，没有新增生成或回写记录。

本次限定的正常重启恢复目标：PASS。此前该目标的 BLOCKED_WAITING_FOR_USER 已解除，不重复索取同项回传。此结论不覆盖真实 Skills/API、跨版本迁移/回滚、富预览或安全文件打开。S3/S4/S5 的剩余项继续按批准 V2 处理，不将本次正常重启替代跨版本升级或回滚演练。

## A → B → A 人工回传与会话记录说明

用户明确回复“B 独立，A保留”。随后截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-0f5017d1-5230-4f13-bae4-e53676e9c8b8.png 显示两个工作区存在、当前为 A、原测试输入与未发送草稿保留。只读 workspace.json 确认两个路径均为候选目录下的独立 workspace-a / workspace-b；再次通过 cmd.exe 运行 inspect-ui-receipt.py，退出 0，A 仍只有一次合成运行、approved、一次回写及相同正文/文件哈希。

此限定的人工工作区切换目标：PASS。不是任意路径或所有存储的隔离证明。A 未出现已发送会话记录符合本次“仅准备草稿、不发送”的验收边界；工作台运行/审核/文件记录与 DSH 已发送聊天记录是不同对象。未自动发送草稿，未以真实模型调用来补造会话。
