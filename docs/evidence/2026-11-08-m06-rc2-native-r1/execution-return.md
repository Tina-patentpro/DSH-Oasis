# R5／P4：rc.2原生合成业务恢复验收回执

2026-11-08，Asia/Shanghai；Codex单代理。结论：**准确组合的原生合成恢复主路径已验证，保留UI空状态入口缺口，不作首发无缺陷接受。** 无真实模型、专业API、上传、支付、发送、WorkBuddy投递、提交/推送或发布操作。

## 批准与准确对象

最新“同意进行下一步”承接上一轮最终交接，批准[准确P4范围](../2026-11-08-m06-native-business-recovery-installed-r1/native-acceptance-scope.md)；原文件“未批准”是编写时点，原字节保持，后发批准单独见[authorization](authorization.json)。沿已批准V0.1，不设计新界面或修改候选。

- 根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1`。
- bundle：`25f5498507f4d7c0b6ae6117f9034da32c6523d4624bdf2a5a57279b49898600`；125成员业务归档：`0.1.0-rc.2`，`836f658e658988a224880a249a65afdc7b5a2c32b18a578035a20d691f8368ac`。
- 控制器：`6cc7d4f37f3d0dc1c9f568196bbd42f09257bbec19c655811577e14e624be77a`。固定Desktop 2.0.17／DSH 0.2.0-rc.2／Sidebar 0.24.1／Cordis 4.0.4／Node 24.21.0／pnpm 11.8.0及checkpoint 3保持。
- Workspace：`e74001f3-dfd7-42e6-a5d3-6c05a4d527a6`，任务`native-recovery-dc9cb9c8-9400-4a39-a2a5-bfad2f482566`，run `v340-1170eecf-f429-45a1-bd15-ade8815857d0`。同一旧completed synthetic run接续，没有重跑或创建新业务run。

## 实际原生路径

所有UI操作通过本聊天CUA完成；仅在controller已产生目标PID后以准确App路径绑定窗口。原生文字/截图在聊天工具回执，配套[ui-observations](ui-observations.json)为执行者摘要，不冒充自动导出的完整AX日志。

1. 第一次PID **68310**，官方本地首用引导选择跳过；无需输入认证、额外认证命令、旧认证迁移或外部账户登录。通过宿主工作区选择器选择既有A，打开绿洲，恢复两版结果、固定审核状态和旧保存回执。
2. 在既有版本2开启核心Markdown编辑，追加具名`RC2_NATIVE_RECOVERY_R1`工程标记。草稿revision12已落业务存储；关闭任务视图，经功能中心“重新打开”恢复同一草稿，使用窄任务选择，不创建业务任务。
3. 保存为版本3，界面明确“待审核”（revision13），未沿用旧审核；核对新增稿及全部11条open警示后，仅作工程用途确认审核。保留`completed_with_warnings`／`not_recommended_for_filing`及未专业/用户接受说明。
4. 准备保存→核对项目/固定版本/新文件名→本次确认，无覆盖另存。版本3：`revision-f87ff184-abf4-4b04-94ab-5253f4c70ce7`，SHA256 **4392ed1e7e4520a215487ab9ef347c96cd2137bbe1dc1fe64f36462299b573c4**。文件`claims_20261108144502_f87ff184.md`，另有同名`.oasis.json`；回写ID `writeback-8e613400-f280-4a1f-bc01-7ce6f0799d54`。
5. 使用原生安全文件页打开新MD；工作台提示“读取时与固定审核版本一致”。“使用固定审核版本”仅把准确版本/hash及材料放入DSH对话输入框，明确“尚未发送”，没有点击发送；再次准备被既有草稿占用提示阻止覆盖。
6. 第一次通过App菜单“退出DSH Desktop”正常退出，code0/signal null。第二次为范围内唯一正常重启，PID **69081**；恢复同一业务任务、版本3已审核/回执、原生文件页和未发送对话草稿。结果/输入子标签首次回到输入材料，手动选择“查看结果”后可见上述状态，不声称子标签自动恢复。
7. 第二轮选择旧版本2并打开原已变动MD，原生界面正确提示“文件内容已变化，原审核结论不适用于当前文件”。返回版本3并打开其新MD，提示一致；没有修改旧文件。第二次同样通过App菜单正常退出，code0/signal null。CUA最终清单不运行、两原始exit回执、PID/端口不存在及双租约锁消失共同确认退出完成。**启动2／正常退出2／正常重启1／失败启动重试0**；无第三次启动。

## 新鲜核对与状态变化

- controller `--check`启动前、两轮之间、最终均exit0；未重建、重装、改Profile配置、依赖、资源pin、guard或代码。上轮19项合同测试直接复用，不虚报为本轮新跑。
- 主业务记录revision **10→12草稿→13未审新版本→15审核并保存**；第一次退出、第二次退出及当前业务JSON逐字节一致。最终JSON SHA256 **ea5d5e2f294e5d19f269684438b23993e2f95b6caf4c4ef45115d189c6becca8**。旧run字段/输入、旧两版本及其审核/回执原值保持，仅增加本次版本、活动版本及被消费的核心草稿状态。各版警示数为 **7／9／11**，不是原15警示固定稿的接受移授。
- 旧项目MD和sidecar不覆盖，新MD/sidecar准确匹配新回执/hash；33项受保护原件保持。业务及Workspace前快照原字节另存，没有以新hash替换旧证据。
- 应用运行时SDK第二writer被`F_INSTALL_BUSY`拒绝，未打开业务后端；最终退出后installed lease＋JSON ownership可重新取得并释放，未打开业务后端，业务字节保持。合作writer协议证据不推及任意旧writer。
- 宿主正常创建会话使**本根workspace.json发生变化**：初始默认B与随后选择的A各增加一个sessionId和updatedAt，原UUID/path及其余字段保持。经固定官方SessionPersistence `open(id,'read')`核对，A有4条、B有3条预设/沙箱/审批/seed事件，无用户/助手/工具/模型事件。不是业务生成，不删除这些历史记录；不称Workspace文件原字节未变，也不称只初始化A的宿主会话元数据。[准确增量](workspace-native-delta.json)及[只读会话观察](native-session-observation.json)。
- 原始日志留本隔离根，选定致命模式计数为0；[诊断](selected-launch-diagnostics.json)不复制或打印认证信息，也不冒称全机网络/模型/费用监控计数。

[business-native-result](business-native-result.json)、[验证脚本](verify-native-facts.py)及其exit0[日志](verify-native-facts.log)给出可复核事实。两次观察器假设失败保留：最初误认为Workspace字节不变、随后误认为空会话总事件数为0；核对公开接口后改为准确的元数据增量及事件类型断言，没有重启App或重复业务动作来制造通过。第一次退出观察器误取不存在的prefix字段，改由已具名recordPath定位原exit回执；不构成启动失败/重试。

## 保留缺口及后续接点

**UI-RC2-01（待修复）：** 关闭全部任务页后显示“请新建任务页”和可用外观的“从网站导入”，任务栏“新建任务页”也没有禁用。功能中心内相关入口正确禁用，但空状态/任务栏不一致；本轮没有点击禁止入口。源码复核确认PanelPages空态未加恢复模式禁用，PanelChrome按钮只按canPersist禁用，Surface在恢复模式已不传onCreatePage；后端11接口及客户端派发拒绝的同版离线证据复用，不能据此称这些原生按钮已点击验证。

后续先在已批准V0.1边界内补齐现有空态/任务栏的禁用和“重新打开已有任务”引导，覆盖无任务视图的定向负例，保持同页/接口/写入合同；不新增界面或生成能力。修正应形成另版候选并重新绑定包/bundle/控制器/guard，旧25f54985/836f658e及本回执不改。先本地实现及离线验证，新候选原生启停仍另办，不续用本轮已消费的两次启动预算。

本次只关闭已实测的P4原生合成恢复主路径；UI完整性缺口、跨重启时**未提交结果编辑草稿**的恢复未由本轮覆盖（草稿经关闭/重新打开已验证，并在第一次退出前消费成新版本）。原生对话未发送草稿的跨重启恢复已观察。专业/用户对新稿的接受、同版真实生成、完整发行/升级、法律专业复核、PREP2/G0、第二Host及发布各沿原门，未由本回执放行。
