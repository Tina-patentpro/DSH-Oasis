# DSH-Oasis · 绿洲慧写专业作业入口

<!-- oasis-coordination:start -->
<!-- oasis-coordination:project=dsh-oasis -->
## 跨项目协同入口

项目ID：`dsh-oasis`。先读[统一协同约定](../docs/coordination/README.md)及[项目登记表](../docs/coordination/projects.json)，再按本项目规则与实际状态执行。当前协同版本以中心为准；本入口建立于2026-10-25。

本项目职责：主要用户作业入口，提供Skills与经后台衔接Dify的专业服务；全部用户账户管理与财务页面归workarea。

进度仍以本项目原状态入口和具名证据为准；本挂接不启动业务任务、不改变历史结论或原有运行/验收边界。

当前独立总计划（规划稿，未执行）：[本项目总计划](docs/plans/2026-10-25-dsh-oasis-master-plan.md)；[跨项目兼容目标](../docs/coordination/compatibility/2026-10-25-project-compatibility.md)。
<!-- oasis-coordination:end -->

当前执行状态读取 `docs/project-current-state.md` 及其明确引用的证据；下文阶段0说明是历史迁移范围，不能替代当前阶段与本次用户授权，也不能据旧记录宣称当前Desktop或双来源已通过。


当前开发根目录是 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，Git 分支为 `mac/continuity-v2`。2026-10-24按用户指示由 `dsh-lab` 更名，旧目录保留为兼容符号链接；提交历史和既有未提交内容保留。

**项目定位（2026-10-24用户明确）：** DSH-Oasis是两个用户前端中的主要作业入口，提供Skills与来自Dify服务器的专业服务；远程专业服务经 `绿洲慧写-后台4.0` 的API接入。`workarea` 同时提供远程专业服务，并承载全部用户账户管理和财务服务。DSH所需Skills由 `专利知识库/patent-distillery` 在WorkBuddy中蒸馏知识制作；Dify工作流在Skills基础上制作。`测试集库` 为两类执行提供测试基础和可复用规则。完整协作约定见[开发项目目录约定](../AGENTS.md)。这些是职责基线，实际完成状态仍以各项目证据为准。

绿洲是 DSH Desktop 内的专业业务插件。首模板为 Flow-2-6 权利要求初稿，两种来源共用输入、结果、审核、保存和对话草稿流程。完整14节点、实用新型、全部文件通道、当前真实双来源和正式发行仍需后续验收。

先阅读：

- [AGENTS.md](AGENTS.md)：当前约束及末尾 Mac/root 补充。
- [项目说明](项目说明.md)：固定组合、构建命令和当前验证边界。
- [开发目录与恢复映射](docs/development-layout.md)：活跃开发、归档、依赖和回退的位置。
- [原开发路线与阶段条件](docs/plans/2026-10-13-oasis-development-roadmap.md)：历史顺序和已确认局部条件保留；当前独立规划见上方总计划。
- [阶段0证据](docs/evidence/2026-10-13-stage0-root-relocation.md)：保全、目录提升、离线依赖准备和本轮验证。
- [当前状态](docs/project-current-state.md)、[2026-10-11收口](docs/evidence/2026-10-11-program-functional-closeout.md)、[单次调用结果](openspec/changes/upgrade-dsh-test-20261007/local-model-test.md)：流超时追溯入口。
- [当前业务基准](docs/business-baseline/ACTIVE-BASELINE.md)、[V3.4.0差距](docs/business-baseline/COMPATIBILITY-GAPS.md)。

实际业务包在 `packages/oasis-professional-service`。固定组合为 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及已审本地补丁；不自动升级。

阶段0不包含 Desktop 启动、账号认证、真实模型/API调用或发布。`--check` 只核对准入，不代表 GUI 或提供方运行通过。

原 README 的第三周 Windows 开发说明已完整保全于 `.archive/pre-root-20261013/candidate-source/README.md`，作为历史参考。
