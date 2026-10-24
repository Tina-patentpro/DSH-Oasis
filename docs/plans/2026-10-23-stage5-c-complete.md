# 阶段5 C批完整实施计划

**Goal:** 完成14节点本地Skills原生执行的禁用候选、正式回归和复审，满足既有A—H计划C节的全部离线交付。

**Architecture:** 沿用用户已授权的共同输入、原生流引擎、累计组装器和审核保存设计；每个候选显式绑定一个节点，默认仍为Flow-2-6，不改变公开Host装配。新增v2候选回执绑定节点及项目根目录；v1首批候选和历史synthetic只读兼容，不补写新字段，不重派旧额度。

**Tech Stack:** 当前固定Node/DSH/Cordis/zod及本地已安装工具，不新增依赖。

**Spec:** `2026-10-23-stage5-follow-up-plan.md` C节、`../business-baseline/14节点清单V3.4.0.md`、B台账、C首批收口。用户明确要求“全面完成阶段5c批”，按原设计直接执行，不重新扩大到D/E/F/G。

## Constraints

不启动Desktop/实际DSH，不新增真实模型/API、上传、网络或费用；不安装/升级、不改Profile/pin/活跃lib、不提交推送发布。全部来源及真实验证仍为false；真实权限、质量、Desktop、非文本解析分别属于后续批次。

保留B原文/台账/装配指纹、旧记录/旧审核和历史报告。文稿1MiB、材料和输入快照2MiB、Workspace8MiB、字段300000及历史完整/values-v1快照不变。复用当前开发分支和首批未提交修改，先冻结全部现状及首批v1实际磁盘夹具。

## Review focus

1. 节点之间不共享指令、准备结果或确认；默认工厂不因扩展而允许其他节点。
2. 同项目ID的根目录与session cwd一起改变也必须使确认失效；prepare期间变更阻断stream。
3. v1回执必须按旧摘要还原读取；不以新prompt重算旧hash或执行旧prepared。
4. 全部136输入按原通道无损进入实际请求，模型输出走严格schema及原组装器；没有搜索工具时不能伪造已检索证据。
5. 各节点编辑、再审、实际保存及相邻文件准入，T1—T6、人工未确认、警示及原文不丢失；故障/unknown不重派。

## Tasks

### Task 1：节点及上下文绑定

Files: `src/v340-native-model.js`、`src/v340-native-contract.js`、`src/dsh-generation-context.js`、`src/dsh-generation-adapter.js`、`src/v340-runtime-contract.js`、`src/v340-runtime-service.js`；正式`test/v340-native-all-nodes.test.mjs`及v1夹具。

- [x] 冻结首批v1实际prepared/completed文件；先红测显式nodeId工厂对14节点逐个派发、各自B指纹、所有通道、默认隔离及根目录改变。
- [x] `createV340NativeCandidate({nodeId='Flow-2-6',ctx,native,timeoutMs})`显式节点绑定；工厂暴露nodeId，确认/请求/持久化v2回执均含准确节点和根目录摘要。
- [x] 既有`resolveDshGenerationContext`仅通过可选参数返回同次读取的根目录快照，旧两参数返回保持；原生适配器接收14节点，运行合同严格匹配工厂与任务。
- [x] 原v1单独保留旧prompt和摘要验证用于读记录；v2默认用于新准入，旧prepared观察为unknown，禁止执行器直接重放v1。
- [x] 定点红→绿，首批36项与旧上下文/adapter测试保持。

### Task 2：完整结果合同与闭环验证

Files: `src/v340-document.js`（输出JSON Schema）、正式新测试与测试辅助文件；不另建执行框架。

- [x] 先红测新prompt向模型提供实际严格输出schema，节点来源/人工确认伪造仍被Host拒绝。
- [x] v2原文后附Host响应schema和证据约束，单独冻结系统摘要，不改B原文或旧v1prompt。
- [x] 正式逐节点覆盖实际磁盘编辑、再审、保存、回执及固定引用；14节点按顺序保存的文件实际进入下一候选，保留全链正文、T表/警示及人工未确认。
- [x] 全节点逐个覆盖确认失效、首包前/流中失败、停止/关闭/迟到/unknown/重复请求；补v1与values-v1跨节点、容量和副本隔离断言。
- [x] 旁置同字节撤回验证新正式测试确实捕获缺失节点/上下文/指令绑定；产品保持最终实现。

### Task 3：完整核验、独立复审和交付

- [x] 全部新增正式定点绿后，运行主包正式全量及Mac26；只在修复/新变化时重复。
- [x] 固定工具在旁置配对包构建，离线pack精确核对src/lib/白名单和sourcemap；活跃lib与B/旧测试/pin字节保留核验。
- [x] 按代码复审技能安排一次新上下文只读复审，落实有效P1/P2的正式红绿修复；不外推真实调用。
- [x] 逐项核对原C节5项和14节点交付矩阵，更新当前状态、后续计划及C完整收口；保留C首批报告及所有旧记录。只有全部证据齐全才标C离线范围完成，阶段5仍开放。

执行记录：`.local/stage5-c-complete-20261023/progress.md`及各日志。基线包含首批未提交的13项文件，不把首批成果重新算作本轮新增。所有步骤由当前会话直接实施，末尾一次独立只读复审。

## 执行收口

上述14项按原C离线候选范围完成。首批36保持，本轮新增157，C累计193；最终主包1341/1341、Mac26/26、旁置合同9/9及122成员离线pack通过。独立审查确认的2项P2经正式3红补修为绿，并通过最终全量；补修后作者复跑19探针绿，没有第二次独立无问题结论。完成审计另补逐节点确认变化和伪造确认17项，旁置撤去确认检查后14项均业务红。详见`../evidence/2026-10-23-stage5-c-complete-closeout.md`及`.local/stage5-c-complete-20261023/completion-audit.json`。C完成不外推真实模型/权限/质量、Desktop、非文本、API或阶段5整体；没有提交推送发布。
