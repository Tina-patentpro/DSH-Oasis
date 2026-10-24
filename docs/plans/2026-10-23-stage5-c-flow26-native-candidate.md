# 阶段5 C首批：Flow-2-6原生模型禁用适配候选

本轮依据用户明确执行C首批的指令，以及既有A—H计划C节、B台账和V3.4.0原文实施；不重新设计界面或开放来源。此前AGENTS已被用户撤销，本计划不恢复其授权限制。沿用当前干净开发分支mac/continuity-v2及68a3264起点，使用writing-plans、executing-plans、TDD及完成前核验流程；工作记录位于.local/stage5-c-flow26-native-20261023，不另建工作树或常驻工具。

**Goal:** 让新版Flow-2-6在显式内部注入、纯替身传输下走原生流式接口→严格结构输出→共同累计产物→编辑审核保存，生产仍禁用。

**Architecture:** 复用DSH上下文解析和既有流式引擎；新增候选元数据合同，旧synthetic记录不改标、不迁移。候选运行标记native-model-candidate（不等于真实native-model证据），dispatchEnabled/realCallVerified始终false。默认Host/index不注入候选，公开路由不变。

**Spec:** docs/business-baseline/v340-source-mapping.json，14节点清单V3.4.0.md，以及2026-10-23-stage5-follow-up-plan.md的C节。B包/原文/台账保持原字节，Flow-2-6三段装配SHA256为72205d5a7cfb7b1aff85cfdeef75ed82888d38567e9d7e3d3024c47aa1ec9325。

## Constraints / review focus

- 无Desktop/实际DSH、真实模型/API、凭据读取、上传或费用；不安装依赖、不改Profile/pin/活跃lib、不提交推送发布。
- 旧schema1、完整/values-v1快照、旧审核保存保持。文稿1MiB、输入快照/材料2MiB、Workspace8MiB、字段300000等常量不扩大。
- 只支持local-skill/Flow-2-6候选；模型/资源/输入/项目会话变化使确认失效。单次预算在派发前持久化，不重发unknown或重复requestKey。
- 解析模型JSON再交现有累计组装器，不接收模型自造累计快照/文件名/运行身份；流中、停止/关闭、迟到不发布部分成功。
- 长稿还原只来自权威快照；不给执行器可变的权威对象引用。失败不复制错误原文、推理、凭据或请求正文进状态。

## Tasks

1. [x] 正式红测冻结候选API、公开合成8输入、B资源身份、上下文与确认、派发前持久化和单次预算。
2. [x] 在dsh-generation-adapter.js复用流引擎，旧入口100000字符规则不改；新增V3.4.0内部入口及严格输出解析。
3. [x] 新增v340-native-contract.js/v340-native-model.js；扩展运行schema/integrity/runtime的可选候选分支，候选元数据完整绑定输入和请求；旧记录不添字段。
4. [x] 接共同审核/保存回执的候选来源标记，补正式真实磁盘回归；不改变客户端布局、index默认装配或公开生成路由。
5. [x] 覆盖故障/停止关闭/unknown/迟到/重复请求、变化确认失效、容量与旧编码。定点、一次正式全量；包内变化仅旁置构建/离线pack与合同，不改活跃lib。
6. [x] 只读复审、必要红绿补修，记录实际证据和剩余边界，更新当前状态后停在C首批。

预检：输出schema与共同组装/写回接受的evidenceKind必须同时适配；否则会出现候选生成成功但保存拒绝。预算/模型摘要不增加到inputSnapshot，避免既有2MiB快照边界回归；独立元数据仍受8MiB记录限制。旧adapter必须保持默认snapshot与流分类，候选不能改变旧首模板行为。C首批只产候选证据，不删除B的历史gap或声称14节点已接通。

## 执行结果

2026-10-23：上述6项按Flow-2-6禁用候选范围完成；正式新增36、全量1184/1184、Mac26/26、旁置合同9/9与122成员离线pack通过。独立只读复审未确认可复现P1/P2，额外8项反例已纳入正式36；三处保护旁置撤回命中10项业务失败。初始缺实现红测及撤回业务红分别留档。详见`../evidence/2026-10-23-stage5-c-flow26-native-closeout.md`。C其他节点、真实权限/模型/API、Desktop和阶段5整体未完成；未提交推送或变更活跃lib。
