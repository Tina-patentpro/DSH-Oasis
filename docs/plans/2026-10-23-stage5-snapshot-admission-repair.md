# 阶段5长稿快照准入修复计划

> 实施方式：按项目规则单代理在当前保全工作区执行，使用systematic-debugging、test-driven-development及verification-before-completion。当前用户已明确授权修复和回归，不再次索取同范围批准，不提交或推送。

目标：合法长稿保存后可进入相邻节点内部合成运行，消除准备对象重复全文导致的2MiB准入拒绝，保留历史数据及实际容量保护。依据：[本轮复审](../evidence/2026-10-22-stage5-five-p2-reaudit.md)。

方案：输入快照原完整格式若在2MiB内则逐字段保持；超限时使用显式可选`preparedEncoding=values-v1`，prepared存一份已经读取/校验的完整values及完整准备对象的SHA256。Host从该冻结值重建receipts、warnings、upstream与inputHash，比对摘要后供完整性校验、执行器及累计组装使用，不重读项目文件。输入hash仍覆盖实际持久化对象；旧对象不迁移、不重算hash。去重表示仍须通过原2MiB、文件1MiB、输入合计2MiB及Workspace8MiB上限；不能表示或超限则写盘/派发前拒绝。

受影响文件：新增Host模块`src/v340-input-snapshot.js`，修改`v340-runtime-contract.js`、`v340-runtime-integrity.js`、`v340-runtime-service.js`；新增正式`test/v340-snapshot-admission.test.mjs`。不改共同UI、实际来源/路由、锁/依赖/Profile/活跃lib/安装包。

- [x] 正式测试先复现双来源817KB保存→相邻createV340Run失败，并覆盖重开、输入/产物hash、审核/保存及旧运行保持。
- [x] 最小实现显式编码、冻结值重建和严格完整性分支；运行新测试及既有V340/B1/结果组。
- [x] 补充去重后仍超2MiB、文件超1MiB、Workspace超8MiB、坏编码/额外派生字段/值与hash漂移的拒绝回归；不得写盘或派发。
- [x] 复审派发时完整prepared与不可变快照一致、文件变化后不重读、未知请求无重放、旧prepared/unknown/failed原件及新旧混存恢复；私有撤回反例核查回归有效性。
- [x] 新鲜主包981/981、Mac26/26、旁置构建/候选合同9/9及120成员清单验证（增加一个Host模块）；冻结起点文件，核对限定变更与旧状态后缀，记录命令/退出码和未执行范围。详见本批收口报告。

不启动Desktop/实际DSH，不新增真实模型/API、登录/认证、上传/费用/对话发送；不装依赖、不改pin/应用/准入、不提交/推送/发布。阶段5整体不因本次合成回归完成而关闭。
