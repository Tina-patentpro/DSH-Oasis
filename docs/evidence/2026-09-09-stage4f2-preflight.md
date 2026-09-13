# 4F-2：真实调用前核对与人工生成确认

日期：2026-09-09。当前验收状态：**FAIL**（一次真实生成尝试未取得产物，运行状态 unknown）。用户已授权 DeepSeek 4 Flash，并确认 10 元费用上限；限一次调用，合成四字段及内置 Skill 外传，不选上游、不上传附件。该授权不包含其他模型、自动重试、真实 Profile 修改或发布。

## 用户完成点击后的结果（最新）

用户回复“完成点击”后，只读核对现有运行及实际 UI，没有再次生成。原“0 次/待点击”为下文历史状态。

- 本地仅 1 条运行：`run-b467a508-73fa-412c-b204-fa6c3300d6eb`；任务 `9cb3a696-65e6-4083-8d5e-7ae7fb676dd8`。
- 上海时间 14:04:44.353 创建，14:06:44.396 本地结束等待，历时 120043ms。持久化 `status=unknown`、`failureCode=TIMED_OUT`、`result=null`，未审核、无回写。
- 实际“结果”页显示：运行状态未确认（TIMED_OUT）；已停止本地等待，不代表提供方取消或退款，不会自动重发。未解除未决锁、删除运行或替换为合成产物。
- 运行快照确认精确模型 `deepseek-official/deepseek-v4-flash/high`、正式 `flow-2-6/0.2.1` 及原 assembly 指纹。一次真实尝试授权按已使用处理，不能因没有正文或没有账单证明而再次调用。原生请求实际到达/完成情况及准确扣费仍未确认。
- 直接触发点已定位：`src/native-model-runtime.js` 使用 `createDshGenerationAdapter` 默认值；`src/dsh-generation-adapter.js:126,150-156` 对整个 prepare/流式消费设置 120000ms 总期限，到时本地 abort 并按 unknown 返回。该期限不是无数据超时；现有记录不能判断超时前是否收到推理片段、是否正在生成正文或卡在网络。不能直接认定网络故障、模型不可用或仅增加等待即可修复。
- 只读查看两份现有 Desktop 日志尾部，只有启动/原生 Skill 注册警告，没有本次请求的可用传输阶段证据；旧 LAN HTTPS 警告不足以解释官方出站调用。未新增诊断工具链、网络探测或模型请求。
- `stage4f2-result-read.mjs capture` 最终退出 0：1 条运行、9 个旧任务业务字段不变；运行快照与简要结果写入忽略目录 `.dsh-test/stage4f2-baselines/observed-run.json`、`observed-result.json`。UI 结果页检查退出 0。未修改业务源码/构建；窗口留在结果页，最终关闭与真实 Profile 后对比仍待做。

4F 起草质量无正文可评估，4G 编辑/审核/保存/恢复/对话草稿不能执行。下一步先由用户在官方平台只读核对 14:04–14:07 附近的请求/用量/扣费（若平台提供，返回时间、模型、状态、用量和金额，不含密钥）；结合可得证据制定最小超时策略修订。修改及离线定向验证不等于授权第二次真实调用；再调用必须另行授权，保留本次 unknown 原记录。未提交、推送或发布。

## 最新续验：配置已保存，停在最终生成确认

2026-09-09 13:45（上海时间）：用户保存凭据后继续。下列更新取代本文后续“尚未配置/未启用/未建任务”的历史状态，历史操作保留。

- 用户已在原生 UI 保存配置；候选当时已关闭。只读取原生普通设置，确认 `https://api.deepseek.com`，未读取、复制或记录凭据文件/密钥输入值。
- 在确认隔离 Desktop 停止后，只改原生设置的两项：`llm-deepseek.retryPolicy={mode:normal,maxRetries:0}`、`oasis-professional-service.localModelEnabled=true`，其他配置语义保持不变。原生设置前后 SHA-256 分别为 `6797aebc7aeee0e38d179c65f6b5bd748809633861a9cd43077319860fc2cad5`、`81e72f8601768f4decdce2bab564de4fd377e1e9ce5ed51798b8cb47cce0f1b3`。原生 `resolveAdapterOptions` 确认最终重试次数为 0；未另建提供方或调用连接测试。
- 复用既有隔离启动脚本重新启动，根 PID 28420，CDP 9231 / Host 43120；合成门禁均 OFF。通过原生模型菜单选择精确 `DeepSeek-V4-Flash`，确认模型为 `deepseek-official / deepseek-v4-flash / high`，不是 Vision/Pro。
- 通过正常 UI 新建 `阶段4F-真实权利要求验收`，taskId `9cb3a696-65e6-4083-8d5e-7ae7fb676dd8`，位于 workspace-a。四选项卡内容与既定合成 JSON 完全一致，共 1111 字符；输入文件 SHA-256 为 `4926d03d74c9f7dbfce3f61543b14b1c7c1384bb77ce1415044051b62f8a0ea6`；未选择上游文件。
- 点击只读“核对模型与材料”后，实际 UI 显示上述模型及 `flow-2-6/0.2.1`。当前确认复选框未选、“确认并生成”禁用；新任务运行数为 0。按计划由用户在该处完成最终生成确认，未以脚本绕过。不要点击主对话的发送箭头。
- 9 个既有任务的运行、表单、生成记录、工作流与输入引用保持一致；原生对话旧草稿逐字未变。最终真实 Profile after 比对及关闭尚未执行，窗口留给用户操作，不把部分保全检查写成完整闭环。
- 命令均使用 cmd.exe：`stage4f2-configure.mjs`、`stage4f2-launch.ps1`、UI 填写/核对以及 `stage4f2-ready-proof.mjs` 最终退出 0。UI 定位曾因必填选项卡的实际可访问名称含“待填写或修正”而超时，已按观察到的名称调整，仅影响操作脚本；没有更改业务代码或新增模型请求。核对脚本曾错误假定重试对象没有原生默认字段，已改为核对决定重试行为的 mode/maxRetries，最终通过。

本地续验记录：`.dsh-test/stage4f2-baselines/ready.json`、`ready-confirmation.aria.txt`。本次真实调用仍为 **0 次**；4F 真实起草与 4G 结果闭环尚未完成。用户应在当前确认区勾选后点击“确认并生成”一次，返回终态或错误；未知/超时不重发。无新增 Git 提交、推送或发布。

## 首轮已核对（凭据保存前历史）

- 保留 4F-1 未提交工作树，未重新运行整批验证或改变业务代码。
- 固定候选包：Desktop 自有副本 2.0.5，内置 dsh / dsh-llm / dsh-llm-deepseek 均 0.1.2-rc.1；正式 flow-2-6/0.2.1 assembly 为 2bb420ecee36acfa199d47b00d87671265f6602efc48eb1b2c425da604ff7846，客户端 SHA 为 a0c04abc057a24b826360f622b617f037c22f94d852081c83f05f2eca5690b44。
- 复用隔离 DSH_HOME：.dsh-test/stage2-desktop；userdata：.dsh-test/stage2-desktop-userdata；launcher 使用 OASIS_NATIVE_OFFLINE=0、OASIS_UNIFIED_FIXTURE=0。启动前两端口空闲，无 Desktop 进程；新根进程 PID 9004，CDP 9231，Host 43120。
- 启动前保全清单已保存 .dsh-test/stage4f2-baselines/before.json：两处真实 Profile 合计 20533 条目；原两工作区任务、旧保存文件及编写目录纳入既有保全脚本。窗口仍运行供用户配置，尚无最终关闭/after 比对，不能宣称本轮零变化验证完成。
- 实际窗口原生设置→模型展示 DeepSeek / deepseek-official，默认目录含 deepseek-v4-flash、deepseek-v4-pro、deepseek-v4-flash-vision-exp；本次仅第一项属于授权。
- 原生启动弹窗提示添加 API Key，设置页未配置密钥。只点击“稍后配置”进入设置；未读取/复制真实 Profile 凭据。自定义设置 API 地址输入框预填 https://api.deepseek.com，未点击保存，未开启 localModelEnabled、未建立新业务任务、未提交生成。
- 旧会话草稿和旧业务表单仅观察，未清空或提交。后续快照须避免读取用户刚输入的密钥，不能直接转存凭据输入值。

## 费用与重试

[DeepSeek 官方人民币价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) 本轮读取：Flash 高峰输入（未命中）3 元/百万 tokens，输出 9 元/百万 tokens；上下文 1M，最大输出 384K。按 1M 输入与 384K 输出相加保守计算 6.456 元，低于 10 元，且本次实际输入远小于最大上下文。此计算仅适用于官方端点、当前官方价格、一次请求；不是账单实扣或第三方网关价格证明。调用前仍须确认实际目的地，不能用本地超时承诺停止计费。

固定原生 dsh-llm 的 DEFAULT_MAX_RETRIES=5，DeepSeek 使用其 retryPolicy。Host 不重试不代表原生提供方不重试。调用前必须将原生提供方重试设为 normal / maxRetries:0 并确认生效；目前尚未完成，不得先调用再修正。

## 本轮实际操作与限制

cmd.exe 显式执行；一次性脚本在忽略目录。启动时页面尚未就绪；随后原生 API Key 弹窗遮挡设置点击，读取当前 ARIA 后通过“稍后配置”正常关闭弹窗并打开模型设置，没有修改遮罩/DOM 或绕过 UI。

当前暂停原因仅为用户需在隔离 Desktop 原生模型页面输入密钥并保存；不是要求再次授权预算。窗口留在该页供用户操作。凭据不得发到聊天或命令行。保存后再核对端点、模型、原生重试和 localModelEnabled，并准备合成新任务；最多一次真实生成授权仍未消耗。4G 必须等待该次结果，不能用替身替代。

未调用真实模型、绿洲专业 API或上传附件；未创建/发送对话；未提交、推送或发布。
