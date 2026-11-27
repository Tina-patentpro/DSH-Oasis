# 任务 1、2：原生登录、单次运行与设置归属修复

2026-10-30，Asia/Shanghai；Codex 单代理。接续[已批准计划任务 1、2](../plans/2026-10-30-project-completion-and-next-development-plan.md)和[上一轮授权接续](2026-10-30-m06-tasks12-authorized-resume-return.md)。不访问 Dify/后台、不升级固定组合、不提交/推送/发布。

## 本次实际进展

1. 独立候选 `127.0.0.1:57607`／Desktop 2.0.17 中已实际确认 workarea **账户 33 登录成功**。用户补充确认模型已设置；撤回仅凭密钥编辑框空白就认定未配置的判断，不再要求重复配置或认证，也未读取凭据。
2. 公开 R2 三文件及四文本逐项重新核对，准备 hash 保持 `a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b`。原生“核对模型与材料”实际返回 `deepseek-official / deepseek-flash`，随后仅点击一次已授权的“确认生成一次”。[调用前意图](2026-10-30-m06-native-single-call-intent-r1.json)与原生持久请求/快照先于执行留存。
3. 原请求终态为 **failed／EXECUTION_FAILED，result=null**，未取得正文。runId=`v340-1e49d8b0-1f88-4b09-9730-29dd97b50ded`，requestKey=`24b815ee-922c-4d91-b83f-44bc04301340`，2026-10-30T12:51:24.487Z 创建、12:51:24.541Z 完成。原生凭证纯校验通过，但现有运行层将底层失败归并为通用代码，未保留提供方响应/usage；不能据 54ms、模型选择或通用失败代码推定有无外部执行、扣费或凭据错误。详见[原结果回执](2026-10-30-m06-native-single-call-result-r1.json)。没有重新生成、切源或重派旧请求；本地一次意图额度已使用。
4. 原生“读取网站项目”最初失败。固定 SDK 的 `settings.describe()` 用实际 Loader entry id 作为 ns，而此独立入口 id 为 `oasis-m06-workarea-live-013`，业务服务原先写死 `oasis-professional-service`。两个回归在修复前分别复现 `IMPORT_SETTINGS_UNAVAILABLE`／设置不可用；原失败日志保留。
5. 仅在既有设置接点新增可信 `settingsNamespace` 注入：Host 从原生 `ctx.fiber.entry.options.id` 取得 owner，导入与远程绑定的读取、CAS 写入和解除均用该 owner；默认 owner 不变，不从 RPC 接收 ns，不改变账户、origin、folder owner、schema 或 revision 校验。增加一项已认证受控 Host 装配验证，保持远程生成禁用。相关 9 文件 **119/119、exit 0**，源码 `git diff --check` exit 0。
6. 保留原运行后按已有 launcher 身份正常退出 **exit 0**，另立修复后的 admission 再启动同一隔离根；原 admission 和失败运行不改写，未重试本地生成。实际 UI 随后成功列出账户 33 的六个项目；选择公开项目 302 后，既有客户端已通过 `folderdetail` 的 `owner_id===33` 校验，并读到旧记录 5271。旧记录未勾选、未下载、未充当本轮结果。

## 仍未解除的关联保存阻塞

仅关联项目、勾选零文件的保存操作未返回成功，UI 显示通用操作失败。没有第二次提交。随后只读重新打开原生关联入口，没有出现“当前关联”；私有 Profile 的 patch hash 仍为 `5ef86435a378380b591d490c223beb6d9ac01d95529f0639fe4639dad358694b`、无 `websiteProjectLinks`，Workspace 仍只有原三份公开 MD，没有导入 journal。准确结论是**当前没有已证实的持久关联**；原保存操作没有充分错误分类/回执，不能写成绑定成功。

固定 SDK 的设置 Forms 纯离线合同探针可以接受同形关联 patch；这只排除了该形状在该局部边界的拒绝，不能代当前原生 ConfigEditor 的实际保存通过。没有手改 Profile 伪造关联、关闭 CAS、重算旧包 hash 或绕过认证。没有为了排错重新提交未知保存。查看过原生诊断导出提示后取消，未导出包含内存转储的整包。

因此 **Fast39 的上传和 create 仍为 0，最多 3 元受限校准额度未使用**。用户已批准的材料包 R1／项目 302／一次 Fast39 范围保持，但不能越过未完成的原生关联。现有服务字段/报价沿上一轮实际 200 响应观察；再次派发前仍须定向重核当时报价。

## 交付与限制

- 源码改动只涉及 `src/index.js`、`src/website-import-service.js`、`src/oasis-remote-service.js` 和三项相关测试；未改 UI、生成资源、依赖锁、PDF 组件、原 F 安装或日常 App/Profile。
- 本次验证只证明设置 owner 接点修复、对应回归及实际项目只读读取恢复；作者自审，不冒充独立专业审阅或用户接受。
- 任务 1 的真实正文、七字段／累计 MD、审核／编辑再审／保存／引用闭环仍缺；任务 2 的持久关联和受限 Fast39 实际结果仍缺；G0 不关闭。不得把 failed 原记录改为 success，或以旧 5271 代本次运行。
- 后续先补现有运行／原生设置保存的安全失败分类和可核回执，绑定原 run/requestKey 与 owner／revision；只读核原状态。需要新的真实模型校准时，须以修复后的具体输入与新单次范围办理，不复用本轮已使用的意图额度。

具名材料：本轮[EXEC-R2 接续](2026-10-30-m06-native-login-resume-r2.json)，本地 `settings-owner-r2/` 内原失败运行、119 项日志、重启 receipt/admission 与 stdout/stderr，以及 `authorized-resume-r1/settings-owner-red.log` 中两项 RED。原始错误和历史报告保留。
