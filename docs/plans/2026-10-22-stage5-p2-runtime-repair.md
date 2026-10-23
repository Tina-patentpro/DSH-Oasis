# 阶段5运行与持久化三项P2修复计划

> 依据用户明确修复指令，使用executing-plans、TDD与verification-before-completion；沿用mac/continuity-v2，单代理实施与作者复审，不提交/推送。执行已授权的审计修复，不新增设计或真实调用。

**Goal:** 修复活跃准入被观察误判、长文稿无法持久化和长编辑稿无法保存，保留旧记录/审核/保存证据。

**Architecture:** 复用现有repository串行队列与revision。运行服务记录在途准入，观察只在串行提交时仍无本地所有者/准入的情况下标记孤儿unknown，close等待准入完成且不派发。浏览器安全合同统一主文稿/编辑草稿1MiB UTF-8；累计文稿读取与组装同限，普通材料/文本原300000字符上限保留。

**Tech Stack:** 固定Node24.21.0、zod4.4.3、tsdown0.22.14；不新增或升级依赖。

**Spec:** docs/evidence/2026-10-22-stage5-runtime-reaudit.md的A1–A3；docs/plans/2026-10-21-stage5-runtime-persistence.md中的旧记录、未决、hash/revision及证据保全合同。

## 全局约束

- 保留当前开发根、旧unknown、历史报告/失败材料、旧审核与保存回执，不改旧hash或迁移真实业务库。
- prepared/unknown继续阻止重发及新派发；停止不等于后端取消；真正重开仍只观察、不重放。
- 单草稿/输入快照2MiB、Workspace8MiB、旧字段部分1MiB、最多8运行不变；超限拒绝，不截断或淘汰证据。
- 真实来源继续禁用，无run/create RPC；不启动Desktop或实际DSH进程，不调用真实模型/API、不读取认证或修改Profile/准入。
- 按项目约束复用当前checkout、单代理，不按技能默认另建分支、派发审阅代理或提交；账本/证据保存在.local/stage5-p2-repair-20261022/，不删除。

## Review Focus

1. 孤儿观察在排队后遇到新的本地所有者，必须在mutation内复核，不能把忙的Workspace永久视为有所有者。
2. 准入写失败或关闭时不能泄漏所有者标记、派发未提交运行，或让仓库先于准入关闭。
3. 长累计文稿既要能自己存储，也要能作为下一节点前序输入；人工修改的长正文仍完整保留并警示。
4. UTF-8字节边界、普通材料字符边界、记录总量仍有效，不以字符数代替字节或降低原限额。
5. 长稿保存、明确放弃及重开仍绑定原hash/revision，不改变原产物、reviewStatus或旧审核/保存回执。

## Task 1：并发准入与观察

**Files:** src/v340-runtime-service.js、test/v340-runtime.test.mjs（均在业务包内）。
**Interfaces:** createV340Run、observeV340Run、closeV340Runtime；内部settle增加孤儿提交条件，公开签名不变。

- [x] 先追加正式失败测试：prepared落盘而create尚未返回时多次观察，最终正常completed且只调用一次；保留真正重开不重放原测试。
- [x] 验证准入失败释放标记、关闭等待在途准备后不派发、并发停止保留unknown与晚到隔离。
- [x] 最小实现并运行runtime受影响组。Expected：全部通过，原18项断言保持。

## Task 2：文稿与草稿统一容量

**Files:** src/v340-runtime-contract.js、src/v340-document.js、test/v340-runtime.test.mjs。
**Interfaces:** V340_LIMITS.documentBytes=1048576、共享v340DocumentBodySchema；result、resultDraft和result/draft使用同一字节合同；inspect与upstream文件读取使用文稿合同，普通材料原合同保留。

- [x] 先失败测试：299000字符输入的合法文稿完成、保存并重开，下一节点读取实际长文件；人工改动保留原长正文并警示。
- [x] 先失败测试：116294字符结果的完整编辑草稿经RPC保存/编辑/重开，过期放弃拒绝、显式当前放弃有效，原result与审核状态不变。
- [x] 加入恰好1MiB和超1字节的多字节边界，以及普通材料300001字符仍拒绝、合法大结果/草稿和8MiB总量保护。
- [x] 统一容量；仅累计快照中Host保留正文允许完整文稿长度，模型单项输出/普通材料仍保持原界限。Expected：所有新增及旧合同测试通过。

## Task 3：全量、审计与证据保全

**Files:** 本计划、docs/evidence/2026-10-22-stage5-p2-runtime-closeout.md、docs/project-current-state.md；构建lib/client.js及map。
**Interfaces:** 固定测试/构建/打包命令与3262项起点文件哈希清单；旧状态只前置新摘要。

- [x] 将上一轮7项独立审计探针重新执行；其中旧“inspect必须拒绝300000字符以上”的根因定位断言改为正向业务合同，保留原件与失败日志。
- [x] 重跑主包完整回归、Mac26项、固定构建与117成员pack；两种--check仅只读，预期仍拒绝漂移。
- [x] 单代理另做最终审计，确认新旧证据、未决保护、迟到/并发及字节限额；没有真实模型/API或Desktop验收替代。
- [x] 冻结变更、原断言及旧状态完整后缀；更新本批状态和仍受恢复件影响事项。Expected：无意外文件修改，原件与历史报告保持。

完成记录：新增11项正式回归，原18项主体逐字保留；主包935/935、Mac26/26、审计探针7/7，0失败/0跳过。构建、117成员pack及逐字重构通过，两种check预期拒绝漂移。补齐跨Workspace关闭、停止已落盘派发复核及固定DSH共享队列夹具对齐；红测和过渡失败保留。详见docs/evidence/2026-10-22-stage5-p2-runtime-closeout.md。
