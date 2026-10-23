# 阶段5 B批收口：14节点来源证据与映射冻结

2026-10-23用户“同意执行下一批”后，按B计划完成本地证据台账、单次离线校验、正式回归及作者复审。阶段5整体未完成；本批没有进入C/E执行器接线。未启动Desktop/DSH、浏览器或loopback，未登录、联网查询服务、上传、新增真实模型/API或费用操作，未安装/升级、改Profile/pin、提交/推送/发布。

## 授权、起点和范围

- 仓库：`/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支`mac/continuity-v2`；HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。
- 执行前冻结3318个已有非忽略文件的SHA256及Git状态，见`.local/stage5-b-source-mapping-20261023/baseline.json`与`status-before.txt`。已有大量阶段5未提交改动均为起点，不归为本批新增实现。
- 用户本次重新提供的AGENTS规则生效，覆盖旧计划“AGENTS已撤销”的历史描述；采用单代理。计划原文保持，下方状态文件以新前缀说明执行结果，不改写旧结论。
- 按最新单代理规则，本批执行作者只读复审；**没有独立代理或独立新上下文复审**。本报告的“复审”仅指本批作者检查，不复用先前独立审查者背书。
- 本批新增根文档台账、根离线脚本及包内正式测试，不改包内生产src/lib、资源、依赖或发布白名单，因此未重复构建/pack、未运行会改活跃lib的verify，未重跑无关Desktop静态检查。

## 台账结论与交接

[人工可读台账](../business-baseline/v340-source-mapping.md)与[机器台账](../business-baseline/v340-source-mapping.json)登记14节点、28来源格、136个输入项、8项明确证据及旧0.2.2的4个资源。

14个本地格核对固定V3.4.0包、common→节点instruction→tables装配、各段/装配/输入schema哈希；静态资源存在，原生派发与真实调用未完成。14个API格逐输入登记待核实映射，实际服务坐标、方法/路径、schema指纹、输出正文及账户项目归属均为null/未核实；旧接口合同不冒充实际服务。所有来源禁用，真实可执行格0。

114项缺口为14×2项本地、14×6项API、2项全局，不是114个新增缺陷。旧Flow-2-6/0.2.2版本及4项资源保持历史身份，不能冒用为新版8输入合同。

C可使用新版Flow-2-6三段资源、8输入及装配指纹准备禁用原生适配候选；**本轮不实施C**。E目前0个节点满足完整实际证据，14格均不进入接线。补证清单已在台账集中列明：脱敏逐节点服务详情、必需输入/输出schema、逐字段无损转换或禁用原因、含正文的结果/错误/未知夹具、权威Workspace及origin/账户/folder/服务/schema归属。D非文本、F当前候选Desktop/重启、G真实调用及H收口仍未完成。

## 离线校验及正式回归

实际执行方式为zsh调用仓库固定`tools/bin/node`，未调用包管理器。日志均在`.local/stage5-b-source-mapping-20261023/`。

| 命令/证据 | 实际结果 | 说明 |
|---|---|---|
| `tools/bin/node --test packages/oasis-professional-service/test/v340-source-mapping.test.mjs`，feature-red.log | exit 1，1失败 | 明确断言缺少导出功能；未把未捕获导入异常当业务红测 |
| 同上，business-red.log | exit 1，45失败 | 可导入未实现边界，失败原因为MAPPING_NOT_IMPLEMENTED/无CLI摘要；与下面真实拒绝反例分开记录 |
| `--test-name-pattern='non-manifest repository files'`，manifest-admission-red.log | exit 1，1失败 | 自查新增反例：完整清单JSON放到credentials.json时未拒绝，实际复现Missing expected rejection |
| 最终新增正式文件，mapping-green-final.log | exit 0，46/46，无跳过 | 包含上述补修、实际资源漂移、缺/重节点、错通道/单项边界、旧版冒用、schema/必需字段/URL结果/归属/启用伪称、路径与符号链接、CLI行为 |
| 受影响v340及binding/API定点，targeted.log | exit 0，365/365，无跳过 | 首轮包含新增45项；随后入口补修由最终46及全量覆盖 |
| `OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`，full.log | exit 0，1135/1135，无跳过 | 原1089+新增46；含旧正式16/16/28。fixture为离线验证，不是真实模型/API |
| `tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json`，mapping-summary.json | exit 0 | 14节点、28格、114缺口、dispatchEnabled=false、realCallVerified=false |
| 旁置mutation-copy撤去清单比较，mutation-red.log | exit 1，11通过35失败 | 原测试同字节；35个虚假映射/声明被放行的反例实际变红。只撤旁置副本，当前脚本未回退 |

定点完整命令为：

```sh
OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/v340-*.test.mjs packages/oasis-professional-service/test/oasis-workspace-binding.test.mjs packages/oasis-professional-service/test/oasis-api-contract.test.mjs packages/oasis-professional-service/test/oasis-api-detail-legacy.test.mjs packages/oasis-professional-service/test/claims-api-*.test.mjs
```

校验器只接受本批冻结快照，未知坐标如实保留缺口可通过；未来填入实际映射必须新增证据与复审，不是通用schema就绪认证。资源路径来自固定白名单，不跟随台账指定的任意文件；清单入口在读取前也限定路径，拒绝非清单文件、越界和符号链接，不回显输入/资源正文。

## 作者复审与保护边界

检查版本/节点/输入归属、三段装配、API证据范围、缺口与禁用声明、实际磁盘漂移及路径入口。发现并补修清单入口过宽，先正式1红再最终46绿；未确认本批范围遗留P1/P2。此结论限离线证据台账与校验器，不表示所有文件系统并发组合穷尽或专业内容质量合格。

静态原文与机械hash核对、专业语义审阅、服务实际部署/账户归属、Host/Desktop和真实运行验收分别保留。未以来源台账或测试数字替代产品能力进度。

收口文档更新前，3318个原有文件全部原字节保持；最终仅对4个状态/计划文档加执行记录前缀，原文作为完整后缀保留，其余3314个文件不变。store、容量常量、历史草稿/unknown/审核/保存、旧资源、原正式16/16/28及活跃lib均保留。最终SHA256、日志摘要、保全结果见同目录`verification-summary.json`与`preservation.json`；不将忽略的本地运行证据加入发布包。
