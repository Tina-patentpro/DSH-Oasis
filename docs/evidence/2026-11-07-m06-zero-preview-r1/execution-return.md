# M06零生成只读预览 V0.1 本地实施及离线验证

2026-11-07，Asia/Shanghai；Codex单代理。用户对call_07febab57258412a99862e0a47a70d0e第0项明确答复：“同意V0.1，进行本地实现和离线验证”。本件接续[原方案V0.1](../../business-baseline/m06-zero-preview-ui-proposal-r1.md)，其原“待确认”是提案时点，原文件字节保持；本答复仅授权本地实现/离线验证，不授权新包启动、真实调用或发布。

## 实施结果

原1c5b/6f2f实际M06入口要先创建任务，撞到零生成只读门。本轮保留四项RPC白名单，改由Host目录返回可信`nativeZeroGeneration:true`；M06入口打开本次视图内的预览。它没有taskId/revision，不进入业务序列化或保存队列。复用原八输入与来源组件；来源锁定本地，明确勾选本项目材料读取范围后，仅调用已有`workflow/v340/prepare`。结果只呈现输入hash、读取收据与警示，不伪造生成正文、审核或保存状态。

生成/API、导入、任务新建/切换/关闭写入和账户请求在零模式受限；账户设置先读Host模式，跳过账户初始化和凭据读写。嵌入面板的隐藏/打开仅改变本地视图状态。独立面板入口在Host目录返回前先等待能力，避免早点击排入业务持久化；没有Host远端的既有本地store路径及已知正常目录仍保持原行为。正常模式继续原业务任务流程，未新增来源、Provider、Agent循环或存储。

输入变更使读取确认和准备结果失效，忙时锁输入/防重复提交；关闭取消、Workspace移除、目录变化及迟到响应均有失效检查，不自动重试。`workbench-store`只负责上下文核对和转交只读RPC，预览正文始终在组件内存。

## 文件范围及裁定

- 12个已有源码变更、2个新增客户端模块，完整列表/增量见[changed-source.json](changed-source.json)及[source-increment.diff](source-increment.diff)。前12个原件保全于`before/src/`，新代码为`client/v340-zero-preview.js`及`client/V340ZeroPreview.js`；另新增11项测试的`test/v340-zero-preview.test.mjs`。
- 按实际接线新增传输、账户设置、PanelPages/Chrome及WorkbenchEntry文件，属于V0.1获准行为所需适配。八输入共享原组件；原生成结果组件依赖真实任务/版本，不适合只读准备，因此呈现明确“未生成”的准备结果，避免伪任务/版本。没有重做正常业务界面或修改业务资源/pin。
- 执行前根AGENTS/中心/登记/followup/BM1/本项目当前入口等复核见[preflight.json](preflight.json)；14项输入在收口前无漂移，见[input-recheck-before-closeout.json](input-recheck-before-closeout.json)。主R3原hash及V0.1提案保持；当前入口以追加接续更新，不回写旧失败或旧权限。
- 按项目单代理规则执行，已逐项自审源增量、白名单、输入/Workspace/取消、设置、正常模式及打包边界；没有独立复审人，不将作者自审称独立审计。

## 验证与故障保留

1. 新增用例先RED：Host能力、预览/传输、共享UI等缺口分别记录在`red*.log`。集成用例另复现面板初始化尝试写面板状态/查询专业服务的问题；按可信零模式跳过并使用本地视图状态。原失败日志保留。
2. 项目移除后又恢复的迟到响应最初未被拒绝，`affected-source.log`保留137/138及“Missing expected rejection”。原因是原store保留同一个runtime和catalog；新增只读预览本地epoch，移除时失效。下一轮失败为测试错误假定原仓库没有页面，改为比较原页面字节，而非删除既有页面。`affected-source-final.log`保留该失败。
3. 自审补查独立入口提前点击，先留`red-early-entry.log`，再核Host能力后开放。首次改变同步时序导致原本地store入口回归失败，`affected-source-final-r2.log`保留；保留无远端/已知目录的原即时路径后，源码最终**139/139，exit0**，见[affected-source-final-r3-command.json](affected-source-final-r3-command.json)/[log](affected-source-final-r3.log)。覆盖11个新增用例及Host零生成、表单、材料权限/路径、设置、store、面板、并发/续接等受影响合同。
4. 固定Node24.21.0/tsdown0.22.14及现有依赖旁置构建成功，未安装依赖或写原`lib`。离线npm pack、ignore-scripts，未发布；准确命令/退出码见[构建](client-build-command.json)、[归档](pack-command.json)。主包依赖、锁和固定工具未升级，未运行物化。
5. 实际解包源码同样**139/139，exit0**，见[affected-archive-command.json](affected-archive-command.json)/[log](affected-archive.log)。证据loader只映射源码URL，禁止回退工作区src，观察到99个归档源码模块，14个新增/变更文件全部实际加载；依赖仍解析既有固定ancestor peers，不等独立安装。
6. 实际归档的编译客户端在VM完成模块加载与插件注册/处置，RPC为0；源码图逐字节匹配本次改变的客户端源码。原生Markdown renderer为明确空测试注入，没有DOM/App/Host启动，不等视觉或原生验收。首次VM缺TextEncoder是测试环境缺浏览器全局，原日志保留；补齐标准全局后exit0，见[compiled-client-smoke-final-command.json](compiled-client-smoke-final-command.json)及[结果](compiled-client-smoke.json)。

## 准确私有候选及保全

归档：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-zero-preview-20261107-r1/archive/oasis-professional-service-0.0.1.tgz`。

SHA256：`5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785`，140成员；[完整成员/解包指纹](package-member-inspection.json)。从d2b9a4b7/138成员父归档旁置衍生，只替换12个源码及同次客户端、增加2个源码；包仍private/0.0.1，许可元数据/第三方通知沿原内部候选，不代表Community License正式采用或首发投影。

[protected-after.json](protected-after.json)核对原6f2f归档及已安装c3的134个成员逐字节相同；原d2b9归档、M06业务资源JSON、原R3批准文件、合成UNKNOWN JSON和18250e4c固定审核稿hash均保持。四项RPC白名单原行逐字节相同。没有更换/重签1c5b安装物或修改日常Profile。

## 未验范围及后续

本轮结论为**本地实现与离线合同/归档验证通过**。新候选未安装、未启动App/Host、未作浏览器/原生视觉检查；原1c5b/6f2f的M06输入页失败继续保留，不能据此关闭完整R3-03。没有真实模型/API/上传/费用、业务消息发送、WorkBuddy导入/投递、源CI/B/A、提交/推送或发布；未重测未改变的Fast39/PREP2/PDF链路。

下一步先基于准确5160c4e9归档，在既有固定组合旁置准备新安装候选及旧/新指纹配对，保持原1c5b/6f2f和全部证据。准确安装物可审后，另就该组合办理零生成启停/输入预览验收；不得沿用旧组合已消费的启动许可或把静态包hash当安装物身份。真实调用/发布继续各按原边界。Tina D对原固定稿MC01—04及保留15条警示受限草稿的接受仍有效；新UI证据不扩大其接受范围，不关闭G0、正式许可/公开投影或其他R3缺件。
