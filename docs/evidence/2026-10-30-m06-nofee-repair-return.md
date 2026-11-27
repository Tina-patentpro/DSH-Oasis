# M06 本地失败与项目302关联：无费用修复返回

日期：2026-10-30（Asia/Shanghai）；执行者：Codex，单代理。范围沿用[任务1/2计划](../plans/2026-10-30-project-completion-and-next-development-plan.md)，本轮仅执行用户最新要求的无费用排查与最小修复。[EXEC-R2复核](2026-10-30-m06-nofee-repair-preflight.json)保留原计划、P30、整体合同及98项已有改动快照；未新建实施路线。

## 实际结果

- **项目302关联已实际保存并经重启恢复。** 在独立R2 Desktop中，账户33读取项目、核对302归属，未勾选记录5271或其他文件；原生界面返回“项目关联已保存”，0项保存、0项失败。正常停止并重启同一候选后，界面仍显示当前关联“DSH-Oasis-Flow2-6公开合成校准-20261026（账户33）”。原生设置记录同时绑定Workspace、路径、固定origin、账户33和folder302。
- **本地调用前检查及失败显示已修复。** 原生公开SDK的凭据描述返回当前模型引用 `DEEPSEEK_API_KEY` 的 `configured=false`；仅检查描述，不解析或读取密钥。`prepareCall`能解析所选模型，但并不证明凭据可用于实际请求。新增元数据检查在准备确认、准入及派发前执行；实机点击“核对模型与材料”即给出凭据不可用提示，没有提供生成确认，也未新增运行。安全的`MODEL_UNAVAILABLE`/`MODEL_LIMITED`不再统一丢失为`EXECUTION_FAILED`；旧失败结果明确显示失败及不自动重试。
- **原失败未改写或重发。** 原run `v340-1e49d8b0-1f88-4b09-9730-29dd97b50ded`、requestKey `24b815ee-922c-4d91-b83f-44bc04301340`、failed/EXECUTION_FAILED及空正文全部保持；当前Workspace revision仍12、runOrder仍仅1项，3份公开材料哈希不变。原记录没有保留下层错误或usage，不能把当前凭据检查追认为原失败的确定原因，也不能据此断定原请求未执行或费用为0。

## 根因与最小改动

关联保存的剩余根因位于原生配置入口身份：隔离Profile插入项使用绝对文件路径，Loader协调后给configEditor的同一项名称成为规范化`file://` URL。SDK生成的覆盖项名称与插入项不相等，原生合成器跳过覆盖项并在写入前报“overridden by a home patch or command-line overlay”。失败前后Profile字节相同；问题不需要Dify或后台登录。

仅将隔离候选 `oasis-m06-workarea-live-013` 的名称统一为指向**同一源码文件**的规范化file URL。固定SDK未改；原生设置owner、CAS、origin、账户与项目归属检查均保留。固定SDK真实合成器的反例/修复例/同文件断言3项通过。临时观测入口已卸下，没有加入业务包或分发。

业务代码仅修改现有五处边界：`v340-native-model.js`检查凭据描述，`v340-runtime-service.js`保留安全失败代码，`v340-runtime-contract.js`扩展失败枚举，`workbench-store.js`传递安全状态，`V340GenerationPage.js`显示明确失败/前置条件。新增4项定向回归并重建既有客户端；未改模型资源、输入语义、固定依赖、SDK或业务流程。新旧失败记录均由当前构建读取；未宣称旧客户端支持新增失败枚举。

## 新鲜验证与证据

以下私有证据统一位于 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-nofee-repair-20261030/`，不进入分发；[结构化核验](2026-10-30-m06-nofee-repair-verification.json)记录路径与哈希。

| 验证 | 本轮结果 |
| --- | --- |
| 新增回归RED→GREEN | 缺少凭据仍提供确认、错误码丢失、失败页空白及安全反馈均先失败后通过；4项 |
| 受影响16文件测试 | 固定Node24.21.0；292/292，fail0、skip0，退出码0；`final-targeted.log` |
| 客户端构建 | 固定pnpm11.8.0、私有HOME/cache、无安装/升级，退出码0；`client-build.log` |
| 原生SDK身份合同 | 3项断言通过、网络请求0；`settings-name-contract-proof.json` |
| 原生模型核对 | 凭据描述不可用，生成确认前拒绝；`native-model-preflight-blocked.png` |
| 原生项目保存 | 零文件成功回执；`project302-saved.png`、`project302-saved-settings-delta.json` |
| 正常重启恢复 | 原生界面显示当前关联；`project302-restart.png`、`project302-restart-ax.txt` |
| 原失败显示/保全 | `original-failed-ui.png`明确失败；原运行对象、revision、材料哈希未变化 |

Profile变更分两次独立记录：名称规范化前后的旧字节与哈希保留；随后原生设置保存302产生合法新哈希，另存settings delta和重启准入，不覆盖先前准入。当前Profile SHA256为 `005876e07eef78927fd0ae15cde9fcdf1c59847b8f89569baf7c65d665345efa`。

## 未关闭事项与接续边界

本轮模型生成、上传、Fast39创建均0，未自动重试原请求，未登录Dify/后台，未修改日常DSH/Profile或固定组合。原生账户保持登录，不再要求重复登录。未提交、推送或发布。

项目302保存阻塞已解除；当前原生凭据引用不可用仍阻止真实本地文字闭环，模型目录的可见选择不代表该引用可用。本轮按无费用要求停在调用前检查，不新增付费校准。原单次本地许可已使用，后续真实新运行应另记录可用的原生凭据状态及新的明确一次调用范围，不重置原预算。Fast39受限校准、审核/保存/对话及完整双来源验收未完成，专业/用户接受、G0和发行门仍开放；PDF/DOCX及实验范围本轮未扩展。
