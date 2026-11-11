# DSH-Oasis · 绿洲慧写

DSH-Oasis 是 DSH Desktop 内的专业工作台插件。当前公开的 DSH NEXT 源码预览包含 Flow-2-6「权利要求初稿」及两套可切换的本地 Skills。

## 2026-11-11 · DSH NEXT 双 Skill 更新

插件版本为 `0.1.0-rc.5.next.6`。已验证的组合为 DSH NEXT `2.0.22-next`、DeepSeek Harness `0.2.2-rc.1` 和 Better Sidebar `0.30.1`。

1. 打开 DSH NEXT 的 **设置 → 绿洲工作台 → 本地 Skills 套件**。
2. 选择 **绿洲慧写**或**中国专利 Skill（第三方）**。默认使用绿洲慧写，选择对后续本地生成生效。
3. 在工作台打开「权利要求初稿」，选择「本地 Skills」，核对模型与材料后确认生成。真实生成使用当前 DSH 会话所选的模型，可能产生费用。

两套 Skill 已使用同一份公开校准材料分别完成一次真实生成，并保存了各自的初稿和运行记录。离线联调使用合成数据验证了生成、保存和预览。两份产物属于待专业审核的初稿。

[双 Skill 源码预览](https://github.com/Tina-patentpro/DSH-Oasis/tree/codex/dsh-next-dual-skills) · [版本与归档校验清单](https://github.com/Tina-patentpro/DSH-Oasis/blob/04c2f07ecf8a3b3166784e4106550ecd06d45d83/SOURCE-PREVIEW.json)

## 2026 年 10 月 Mac 开发记录

2026 年 10 月迁移时的开发根目录是 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，Git 分支为 `mac/continuity-v2`。源码及 `.git` 已从迁移候选提升到此处；提交历史和既有未提交内容保留。

绿洲是 DSH Desktop 内的专业业务插件。首模板为 Flow-2-6 权利要求初稿，两种来源共用输入、结果、审核、保存和对话草稿流程。完整14节点、实用新型、全部文件通道、当前真实双来源和正式发行仍需后续验收。

先阅读：

- [AGENTS.md](AGENTS.md)：当前约束及末尾 Mac/root 补充。
- [项目说明](项目说明.md)：固定组合、构建命令和当前验证边界。
- [开发目录与恢复映射](docs/development-layout.md)：活跃开发、归档、依赖和回退的位置。
- [后续开发路线](docs/plans/2026-10-13-oasis-development-roadmap.md)：阶段0及后续顺序，含功能验收后的界面优化。
- [阶段0证据](docs/evidence/2026-10-13-stage0-root-relocation.md)：保全、目录提升、离线依赖准备和本轮验证。
- [当前状态](docs/project-current-state.md)、[2026-10-11收口](docs/evidence/2026-10-11-program-functional-closeout.md)、[单次调用结果](openspec/changes/upgrade-dsh-test-20261007/local-model-test.md)：流超时追溯入口。
- [当前业务基准](docs/business-baseline/ACTIVE-BASELINE.md)、[V3.4.0差距](docs/business-baseline/COMPATIBILITY-GAPS.md)。

实际业务包在 `packages/oasis-professional-service`。当时固定组合为 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及已审本地补丁；不自动升级。

阶段0不包含 Desktop 启动、账号认证、真实模型/API调用或发布。`--check` 只核对准入，不代表 GUI 或提供方运行通过。

原 README 的第三周 Windows 开发说明已完整保全于 `.archive/pre-root-20261013/candidate-source/README.md`，作为历史参考。
