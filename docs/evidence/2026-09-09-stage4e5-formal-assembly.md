# 4E-5 正式内置 Skill 离线装配

日期：2026-09-09。单代理实施与自检，非独立审计。

**当前目标状态：PASS_WITH_CONCERNS。** 目标仅为正式资源装配及隔离离线业务验证；4E 整体、真实模型起草质量和发布未因此完成。非阻塞限制：本轮截图不可用，正式资源保留编写时的历史部署说明。

## 最新决定

用户明确“不再考虑保护skill”，并批准继续。取消 G-SKILL 保密门禁，不宣称原保护已经通过。没有增加系统账号、服务、ACL 或诊断工具链。凭据、用户材料、Workspace 权限、安全预览、无覆盖写入与调用费用边界继续保留。

## 本批变更

- 正式资源：`packages/oasis-professional-service/src/builtin-skills/flow-2-6/0.2.0/`，manifest 加四资源，与 `.dsh-test/stage4e-authoring/flow-2-6/0.2.0/` 对应原件逐字节相同；未复制其他文稿或改写原件。
- `claims-skill-pin.js`：固定资源根、身份、合同和 manifest SHA，复用现有加载器。资源纳入本地私有包，不注册 DSH/Codex 原生 Skills，不发送或发布正文。
- `native-offline-runtime.js`：新合同 2 运行加载正式资源，仍只有 oasis-offline 提供方；旧合同 1 和公开替身文件保留。未增加真实模型入口。
- `workbench-contract.js`：将 Skill 版本白名单从只有 public-4e2-1 扩展为 public-4e2-1 与 0.2.0；不改旧记录或重算旧哈希。
- `claims-v2-result.js`：仅正式 provenance 的新离线产物标明“正式资源已加载、结果离线合成、未调用真实模型”；旧公开/合成正文保持原样。
- `local-generation-service.js`：资源不可用文案不再限定“公开样本”；缺失/损坏仍停止，不回退其他来源。
- `.gitattributes` 固定正式资源 LF；构建更新客户端产物以识别新 provenance，未引入正式资源的客户端依赖。AGENTS 和主计划更新当前决定，旧证据保留。

固定身份：

- Skill：flow-2-6 / 0.2.0。
- 合同：claims-disclosure-2 → claims-cumulative-2；single-call-cumulative-1。
- manifest SHA-256：`63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1`。
- 完整装配指令 SHA-256：`163422ff13f4cf4b92b47ba6b696ca49fa22f2bbfa0edb3299ad7924faf7660d`。

## 验证账本

命令均显式使用 cmd.exe；Node v22.19.0。下列包命令在 packages/oasis-professional-service 执行。

| 层次 | 操作 | 结果 |
|---|---|---|
| 红灯 | `node --test test\formal-claims-skill.test.mjs` | 退出 1，两项失败：实际加载 public-4e2-1、产物仍声明未运行正式资源 |
| 定向回归 | formal-claims-skill、native-offline-runtime、claims-v2、builtin-skill-loader 四文件 | 20/20，退出 0 |
| 原生集成首次 | `node --test tests\integration\stage4e-formal-skill.test.mjs`（根目录） | 退出 1，持久化 schema 拒绝 0.2.0，尚未发起调用 |
| 原生集成修复后 | 同上 | 1/1，退出 0；真实固定 DSH llm 0.1.2-rc.1 调度一次离线提供方；断言完整 system 与正式四资源装配相同、输入通道匹配、无工具/网络调用 |
| 原生集成业务链 | 同一测试 | 审核前拒绝引用、编辑后重新待审、再审核、保存字节一致、已有路径拒绝覆盖、固定版本对话草稿包含正文；模型调用数仍为 1 |
| 当前候选完整校验 | `npm run verify` | 369/369，失败/跳过均为 0，构建及 pack dry-run 退出 0；78 项，其中正式五文件全部在包内，private=true |
| 当前记录解析 | `node .dsh-test\stage4e5-final.mjs` | 所有存储工作区按当前合同可解析，正式 provenance 与装配指纹一致，保存字节与产物相同；退出 0 |
| 变更格式 | `git diff --check` | 退出 0；Git 提示已有 LF/CRLF 转换警告，未自动整理其他修改 |

首次包 verify 在持久化修复前也通过，但未涵盖原生正式资源准入；不以其充当最终集成证据。最终证据采用修复后的 verify-final 和 native-fixed 日志。

## 实际隔离 Desktop

复用项目内 Desktop 2.0.5 / DSH 0.1.2-rc.1 / Sidebar 0.18.0，DSH_HOME 为 `.dsh-test/stage2-desktop`。正式资源只进入本机离线调用，没有真实模型/API 调用。

1. 新建“阶段4E5-正式Skill离线装配”，使用现有四选项卡与本地来源。
2. 选择当前 Workspace 内原有公开上游累计文稿，填写公开技术交底，生成一个离线运行。
3. 实际结果显示 skill_version 0.2.0、正式资源已加载和无真实调用；包含完整上游、T2 内容及 W-UPSTREAM-01。审核前对话引用禁用。
4. 审核后保存到全新目录，实际点击原生文件打开；保存文件正文与 artifact 字节一致。
5. 关闭并重启同一隔离 Desktop，正式运行、审核状态、保存记录和继承风险恢复；没有再次生成。原生会话已有草稿保持不变。
6. 本轮没有为新产物再次创建会话或插入原生草稿。服务层的正式版本草稿已实测，原生对话桥沿用 4E-4 已有 UI 证据，不混称为本轮新 UI 插入。

实际身份：

- Workspace：`a4571242-cc92-44ae-8904-e85533dc6e48`。
- 任务：`5b7571d0-e4c4-4d46-8ffd-47870252de2d`。
- 运行：`run-65d1fd21-81ee-4158-a420-6167285f6f4d`；仅一个运行。
- 文件：`.dsh-test/stage2-workspaces/workspace-a/stage4e5-formal-20260909/claims_20260909083818_d2239740.md`。
- 正文 SHA-256：`ce9e3a82a6c40aad244cb07a34a2c2abdc88a425b08425a1ed627313ca44d76f`。
- 上游 SHA-256：`da281670dea37e44d34aad3825686f2ff9d4c7c3f348fa8c727016d74be3fe1e`。

操作限制如实记录：初次连接发生在 Host 页面就绪之前，未找到页面；就绪后只读重连成功。建页脚本在来源异步保存完成前立即检查按钮得到 false，未重复建页。随后生成只提交一次，业务断言成功并保存 generate.txt，但截图超时令脚本退出 1；保存、打开与重启恢复脚本退出 0。后续截图同样不可用，停止截图排障，保留实际 UI/ARIA 与持久化证据，不声称取得新视觉截图。

## 保全与产物

- 两处真实 Profile 共 20533 条目，前后内容比较 0 变化。
- 8 个原任务的运行、表单、来源、历史、材料不变；原编写资源及旧 4C 保存正文哈希不变。
- 两次候选启动/关闭，最终 Desktop 进程和 9231/43120 监听均为 0，关闭检查退出 0。
- `output/playwright/stage4e5-20260909/` 保存 generate/save/open/restore.txt、原会话 draft-before.txt、formal-assembly.json、preservation.json、native-integration.log、verify.log。截图未取得。
- `.dsh-test/stage4e5-baselines/` 保存保全原始清单；一次性辅助脚本留在忽略目录，没有扩展永久诊断平台。

## 尚未完成

本轮只证明完整正式指令可装配并进入原生离线调用；离线提供方返回预设业务样本，不执行真实模型推理。因此不能宣称正式 Skill 已产出合格权利要求。

4E/阶段4 后续仍需：复用现有适配器完成真实 DSH 模型入口与真实证据类型接线（不能放宽 native-offline 伪装真实生成）；明确模型、资料外传和调用预算后运行一次公开材料真实起草；人工核对权项全文、特征/支持矩阵、回退与累计内容，并完成对应最终业务验收。真实 API 属后续 API 阶段，未在本批调用或验收。

0.2.0 文稿中保留了编写时“合同 2 尚未接入”等部署说明；当前实施状态以代码和本记录为准。这不影响本批字节装配验证，但正式模型内容验收前应做版本化文稿整理，不将旧说明当作当前运行事实。

未提交、推送、公开分发或安装真实 Profile。
