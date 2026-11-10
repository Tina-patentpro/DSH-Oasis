# WorkBuddy用户入口技术准备 R1

日期：2026-11-07，Asia/Shanghai。当前交付为技术资料及一个私有静态适配候选包；实际可导入性与行为尚未验证。

本轮执行用户明确同意的[R3计划](../../docs/plans/2026-11-07-project-summary-and-remediation-plan-r3.md)第R3-07项，采用其中已有的本地原生Skill准备路线，实施归属`dsh-oasis`，目录`DSH-Oasis/packages/oasis-workbuddy-user-entry`，执行方Codex。具体绑定以中心[planned_components](../../../docs/coordination/projects.json)为权威，本目录不登记为新项目，不使用内部WorkBuddy会话桥接作为用户入口。

目标公开元数据为`/Applications/WorkBuddy.app`，bundle ID `com.tencent.workbuddy.mac`，version/build均`5.9.3`；Info.plist SHA256 `9b44d180ae2a40a561da66faf9eac8fef8152aedba51a2e1a4853d441e508cb3`。这是本轮只读观察的候选目标，不代表版本兼容或安装签收。

官方说明本地包通过“添加技能→上传技能”导入；根SKILL.md使用YAML元数据，补充资料可经`@references/…`引用。仅以这些公开规范作为准备依据，没有使用隐藏目录、私有store或自动配置。[技能结构](https://open.workbuddy.cn/docs/skill)、[本地导入与会话规则](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)。

本地M06与收费专业API分别处理。后者的官方MCP Connector仅为后续评估方向，本轮没有选择服务、建立MCP配置或改变账户财务归属。

文件职责：

- [source-binding.json](source-binding.json)：精确来源、资源角色、共同八输入、七输出及目标元数据；不含正文或评价材料，不作为运行配置。
- [consumption-contract.md](consumption-contract.md)：消费差异、可复用范围、缺失的机械保证及可判定出口。
- [candidate/SKILL.md](candidate/SKILL.md)：另版原生入口0.1.0-prep.1，显式引用原字节来源，未通过目标Host行为验证。
- [build_private_package.py](build_private_package.py)及[test/test_private_package.py](test/test_private_package.py)：仅离线生成/测试私有归档，不进入Skill运行包，无安装或调用能力。
- [本轮执行记录](../../docs/evidence/2026-11-07-workbuddy-m06-consumption-r1/execution-ledger.md)：原始输入身份、采用解释、未完成任务及验证。

本次唯一私有归档位于`.local/workbuddy-m06-native-preparation-20261107-r1/oasis-m06-claims-draft-0.1.0-prep.1.zip`（相对项目根），SHA256 `806dee0f6238ef7a8102f3a3200eea138ee24dc67cf01b8ce0d91ba8d8d5b6bf`；10成员/显式引用/原字节/排除项和CRC检查已核，[实际归档记录](../../docs/evidence/2026-11-07-workbuddy-m06-consumption-r1/package-inspection.json)。4项打包边界测试先RED后GREEN，只证明打包器行为，不证明Skill模型遵循、法律内容或WorkBuddy兼容。包装包未取得公开发行权利结论，内部路径/历史限定没有擅自清洗，禁止将该ZIP直接作首发公开件。

下一步实际适配须逐项实现/验证合同中的硬条件；任何未具备能力都如实限制该入口，不能靠改宣传文字或降低验收把它标成DSH等价。业务规则生产仍归patent-distillery，消费适配不另造一份专业规则权威。当前未启动应用、导入、派发、安装或发布；用户要求零真实调用，因此Skill行为压力测试仍未执行，不拿本轮静态测试冒充。
