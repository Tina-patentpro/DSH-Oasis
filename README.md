# 绿洲慧写 4.0 · Mac 开发入口

当前开发根目录是 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，Git 分支为 `mac/continuity-v2`。源码及 `.git` 已从迁移候选提升到此处；提交历史和既有未提交内容保留。

绿洲是 DSH Desktop 内的专业业务插件。首模板为 Flow-2-6 权利要求初稿，两种来源共用输入、结果、审核、保存和对话草稿流程。完整14节点、实用新型、全部文件通道、当前真实双来源和正式发行仍需后续验收。

先阅读：

- [AGENTS.md](AGENTS.md)：当前约束及末尾 Mac/root 补充。
- [项目说明](项目说明.md)：固定组合、构建命令和当前验证边界。
- [开发目录与恢复映射](docs/development-layout.md)：活跃开发、归档、依赖和回退的位置。
- [后续开发路线](docs/plans/2026-10-13-oasis-development-roadmap.md)：阶段0及后续顺序，含功能验收后的界面优化。
- [阶段0证据](docs/evidence/2026-10-13-stage0-root-relocation.md)：保全、目录提升、离线依赖准备和本轮验证。
- [当前状态](docs/project-current-state.md)、[2026-10-11收口](docs/evidence/2026-10-11-program-functional-closeout.md)、[单次调用结果](openspec/changes/upgrade-dsh-test-20261007/local-model-test.md)：流超时追溯入口。
- [当前业务基准](docs/business-baseline/ACTIVE-BASELINE.md)、[V3.4.0差距](docs/business-baseline/COMPATIBILITY-GAPS.md)。

实际业务包在 `packages/oasis-professional-service`。固定组合为 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及已审本地补丁；不自动升级。

阶段0不包含 Desktop 启动、账号认证、真实模型/API调用或发布。`--check` 只核对准入，不代表 GUI 或提供方运行通过。

原 README 的第三周 Windows 开发说明已完整保全于 `.archive/pre-root-20261013/candidate-source/README.md`，作为历史参考。
