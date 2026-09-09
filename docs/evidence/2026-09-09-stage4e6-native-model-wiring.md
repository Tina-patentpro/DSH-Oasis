# 4E-6 真实模型接线：离线验证记录

日期：2026-09-09。授权：用户“确认”，对应 docs/plans/2026-09-09-stage4e6-native-model-wiring.md。

## 结论

**STATIC_ONLY**（4E 整体验收）。本批代码接线与固定原生服务替身集成已完成；未调用真实模型、API 或上传，未形成新版实际 Desktop / 真实起草质量证据。不能将 native-model 的测试记录身份理解成真实提供方已调用。

## 本批交付

- DSH 原生设置增加 `localModelEnabled`，默认 false、重启生效；保留原生模型/凭据的唯一 owner。缺失原生服务不阻止工作台、历史资料和 RPC 使用。
- 独立 `native-model-runtime.js`，通过 Cordis 公开动态 inject 获取 llm / 会话 / 模型能力，仍由 Host 装配正式 `flow-2-6/0.2.0`，一次 llm 调用，不注册 Skill、不创建 Agent、不降级到替身。
- 同一四选项卡：先“核对模型与材料”，显示提供方、模型、推理选项、文本量、已选上游全文、内置 Skill 外传和可能费用；用户勾选后“确认并生成”。没有第二份材料表单。
- Host 确认摘要绑定 Workspace、任务、会话、revision、输入/上游/模型/资源指纹。提交重新读取并比较，模型或材料不一致时不调用。输入、来源、上游选择及配置刷新清除界面旧确认；迟到预览按编辑/配置代次和会话再核对。
- `native-model` 仅接受合同 2 正式资源，贯通持久化、结果、编辑后再审、无覆盖保存和固定版本对话资料。保留 native-offline 与原历史哈希算法，不改正式 Skill 原字节。
- 未确认拒绝、未知/超时不自动重发、旧请求不二次调用；真实结果不标为离线合成。过时保密门禁提示已替换为原生设置启用提示。

## 验证账本

命令执行器：`cmd.exe`。包命令工作目录：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service`。

| 检查 | 本轮结果 | 边界 |
| --- | --- | --- |
| 新增测试首次执行 | 默认开关未定义、未接通确认，2 个预期失败，退出 1 | TDD 红灯 |
| UI/Store 新增测试 | 首次仍直接提交被 Host 拒绝；实现后通过 | React 静态渲染及 Store/RPC，不是实际窗口 |
| 配置刷新旧确认反例 | 初次失败，定向清除确认并增加迟到代次检查后通过 | 本批修复 |
| 定向 `node --test test/native-model-service.test.mjs test/oasis-runtime-config.test.mjs test/host-tool.test.mjs test/host-runtime.integration.test.mjs test/oasis-connection-settings.test.mjs` | 31/31，退出 0 | 包内 Host/客户端/设置 |
| 根目录 `node --test tests/integration/stage4e6-native-model.test.mjs` | 2/2，退出 0 | 实际 Host 入口动态依赖；固定 DSH llm dispatcher + 唯一测试提供方 |
| `npm run verify` | 构建成功，375/375，pack dry-run 79 项，退出 0 | 一次最终全包验证，无发布 |
| `git diff --check` | 退出 0 | 有既存 CRLF 转换提示，没有空白错误 |

完整 verify 输出：`.dsh-test/stage4e6-verify.txt`。构建有 `deps.onlyBundle` / zod 打包建议，不是失败；未借本批调整依赖或打包策略。

固定原生集成从已隔离 Desktop 目录加载 `dsh-llm 0.1.2-rc.1`。仅注册 `stage4e6-test-only`，覆盖全局 fetch 为禁止联网的断言；测试提供方核对完整正式指令、模型、四字段和 upstream_snapshot、无 tools。一次替身调用后完成审核、编辑再审、真实临时目录无覆盖写回及对话资料准备。未插入/发送原生会话，未启动 Desktop。

正式资源 assembly SHA-256：`163422ff13f4cf4b92b47ba6b696ca49fa22f2bbfa0edb3299ad7924faf7660d`。本批未改四资源、manifest 或原编写目录。

## 保全与未完成项

- 保留开始时既有阶段 4 大量未提交修改；只在本批接点增量编辑，没有 staging、commit、push 或清理旧文件。
- 未启动真实或隔离 Profile Host 进程、未改真实 Profile/凭据，未声称本轮重新完成此前 20533 文件的哈希对比。
- 没有新增诊断器、监管器、自动审计或系统隔离设施。本轮为单代理自检，不是独立审计。
- 正式 Skill 仍保留编写期状态说明（例如 SKILL.md 第 113 行“合同 2 尚未接入…G-SKILL”），与当前工程状态不一致；本批遵循 4E-5 的原字节 pin 保全，未静默改正文/版本。真实起草验收前应单独核对并明确修订版本/指纹，不恢复已取消的保密门禁。
- **4E 尚待**：授权后的实际隔离 Desktop 真实模型生成与专业质量验收、当前构建的最终同页业务闭环验收。执行前明确模型、非敏感测试材料/上游、调用次数或预算及外传；没有这些授权不点“启用”或执行调用。专业 API、真实 Profile 安装和发布另属后续范围。
