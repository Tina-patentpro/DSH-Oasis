# F跨Renderer恢复与固定装配接续实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans；单代理实施，用户指定GPT6.1 Max结束独立审计，接受后分批本地Git，不推送。

**Goal:** 在完整F的无真实调用分支补同一会话跨Renderer checkpoint单写入保护及未提交事务中断证据，接续固定开发装配。

**Architecture:** 保留旧v2/v3字节和失败。以独立小型通用Web Locks租约包装已有v3 binder，作用域为同浏览器分区/同源下workspace+session；非等待抢占，冲突/能力缺失只拒绝本次自动恢复和checkpoint写入，不碰原生编辑/传输。租约持有至dispose后排队写入结束，实际浏览器验证两个独立Document及中断未提交事务。新v4仅在具名开发装配显式选择，不放行生产模型或发行。

**Tech Stack:** 固定Desktop2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1；公共Web Locks、IndexedDB/localStorage；工具Node24.21.0与内置24.18.1，固定pnpm11.8.0离线冻结/忽略脚本。

**Spec:** 用户本轮“继续完整F，优先无需真实调用的恢复/正式装配；零真实模型/API/费用；Max独立审计后分批本地提交”；[剩余表](../evidence/2026-10-26-follow-up-remaining.md)、[R4最终审计](../evidence/2026-10-27-f-legacy-recovery-assembly-A02-final-independent-audit.md)。

## Global Constraints 与范围选择

- 留在用户固定根目录/`mac/continuity-v2`，开始HEAD `36048e352d4aed8ceb3f1625505e6240761678a9`。初始3574文件/干净树已冻结；准确路径证据依赖该根，不另建/迁移worktree或重装主依赖。
- 不真实模型/API/上传/原生retry/Send/费用，不读取认证、不改日常Profile或签名App，不推送发布。允许本地公开合成fixture、浏览器存储和新隔离Profile的无模型Desktop验证。
- 选租约包装现有binder；不把业务恢复改为新数据库，不重做宿主/调度器；直接依赖localStorage“锁”不具跨Context原子性，不采用。复制旧Profile/关闭互斥不构成正确装配。
- 租约不是访问权限或全写入者强制保证；独立Profile/分区/不同origin和旧不守约版本不在租约域。双存储不可更新、所有平台/发行升级、真实传输/模型/API中断及完整F仍另列。
- 本轮技术选择由实施者在既有F维护范围作出，不是新增UI/业务方案。旧数据schema/人工重试/receipt失效/编辑不覆盖守卫保持。

## 整体要求读取与差异

2026-10-27重新读取根/项目AGENTS、协同README/登记表，按登记绑定整体1.3.1 NS1/R1、独立索引、本项目master_plan/current_entry，核coordination_plan/compatibility_spec及DSH路径一致。兼容矩阵、CONTRACTS1.2.1和研究补充按DS-04/F、IC-ARTIFACT有界消费；14项准确SHA/原文快照见`.local/f-renderer-lease-20261027/planning-inputs.json`。中心新增接口草案导航不成为采用/执行许可。

符合：DS-04/F可独立无模型验证；artifact身份/来源/hash/权限分层；DS-05真实G→H→阶段6不提前。缺件：Web Locks仅当前实现/同域可验，跨平台与全写入者发行缺口不由此关闭；事务中断只作本地浏览器/合成材料，不冒充模型UNKNOWN。基线已提交，不把旧“未提交”历史当当前事实。

## Review Focus

1. 第二Renderer不能读取/恢复或写同key；不同workspace/session不串锁，hash不替代归属。
2. lease授予前用户编辑/归属变动/dispose不能晚到覆盖；无能力/拒绝/异常均零底层binder动作。
3. dispose时仍有写入必须持锁，不能先释放再让新renderer读旧snapshot；异常drain不冒称安全释放。
4. 真实Document终止使租约回收，但IDB未提交结果不补认；旧fence不得让旧附件复活，也不自动重传。
5. v4须准确固定转换/物化/准入；缺件不降级。v3/R7及所有历史pin/FAIL保持；开发接受不升格日常/发行。

## Task 1 — 租约与v4转换

Files: `patches/dsh-0.2.0-rc.2/draft-checkpoint-lease.mjs`、`conversation-draft-checkpoint-4.mjs`、`scripts/tests/draft-checkpoint-lease.test.mjs`。
Consumes：v3固定转换及原生shell/conversation公共边界。Produces：`createLeasedDraftCheckpoint(bind)`包装器、`nativeCheckpoint4Source()`及`patchConversationDraftCheckpoint4(original)`。

- [ ] 先用v3复现双binder同key均恢复/写入，保留反例；租约测试RED。
- [ ] 最小实现单owner、跨key独立、dispose/drain、授权前编辑/退出、无能力/拒绝；GREEN。
- [ ] 精确v4转换，拒绝漂移/重复应用，保留v3通知/人工重传守卫；两个固定解释器受影响回归。

## Task 2 — 实际浏览器与装配

Files: 有界`test/fixtures`浏览器fixture；`scripts/f-development-assembly.mjs`及其测试/装配README增量。
Consumes：同版v4、固定R7、原单所有权/桥接/artifact。Produces：v4显式具名新装配、独立实际Document租约/IDB中断证据、新Profile无模型恢复取证。

- [ ] 两独立Document真实Web Locks/IndexedDB：同key互斥、不同key可用、释放后明确重开、新owner拒绝未提交fence。
- [ ] 在put成功但事务保持未提交窗口终止拥有者Document，核旧提交字节保持/租约回收，不认定新的事务已提交。
- [ ] 装配新增v4明确选择及能力身份，缺件/漂移反例RED→GREEN；固定pnpm新临时目录离线物化，旧准入不改签。
- [ ] 新隔离Desktop实际首次恢复/正常重启及关闭；不点retry/Send、不读迁认证。浏览器helper/原生UI证据分层。

## Task 3 — 独立审计、状态及本地提交

- [ ] 冻结具名代码、测试、命令/退出、旧字节关系、规划输入及原件保全；失败如实保留。
- [ ] GPT6.1 Max fresh-context独立审计；必改核实后修复，不覆盖首轮报告。
- [ ] 接受后更新三个当前入口，只接受可证子集；分业务源码/证据状态本地提交，不推送。最终核树/远端refs/历史SHA/端口/应用退出。

本计划承接用户明确的同范围连续执行，不另索UI设计/预算批准。审计先于本批提交；冻结时未勾项按新的返回与独立报告接续，不改历史计划。
