# F旧附件归属恢复与固定装配接续 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans；单代理实施，用户指定GPT6.1 Max独立审计。

**Goal:** 处理FH-A01公开旧附件的具名归属及无外传恢复，将已审checkpoint/路径桥/单所有权后端纳入可复核装配入口，继续推进F。

**Architecture:** 旧原件只读保全；在明确原workspace/session及历史证据链后，生成独立恢复包，不伪造receipt或自动迁移任意孤儿文件。以新隔离Profile复用原身份、显式路径映射，恢复附件为人工重试状态。新装配入口强制已审组件及无模型配置、冻结文件与依赖，拒绝缺件/漂移；不重签原准入或写日常环境。

**Tech Stack:** Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1、原UI补丁、conversation `0.2.0-rc.2.oasis-draft.2`；固定pnpm11.8.0离线冻结锁/忽略脚本。zsh、Node24.21.0/实际Electron Node24.18.1。

**Spec:** 用户2026-10-27本轮“继续完整F，优先旧孤儿附件/正式装配，零真实模型/API/费用”；[剩余表](../evidence/2026-10-26-follow-up-remaining.md)、[原生附件历史FAIL](../evidence/2026-10-26-native-attachment-recovery-gap.json)、[R7修复复审](../evidence/2026-10-27-f-reviewed-reference-attachments-repair-independent-audit.md)。

## Global Constraints

- 保留根目录、分支及全部历史/未提交内容，不提交推送发布、不改签名App/日常Profile，不读迁认证。
- 本轮不新增真实模型、专业API、外网上传、消息发送或费用。原receipt已丢失，不重建旧回执；恢复后的文件必须人工重试。
- 归属依赖实际workspace/session和具名历史证据，hash不是权限；无证或多义拒绝，不能全盘扫描猜配。
- 正式装配在此指受控开发组合的来源化装配/启动接续；发行、干净安装/升级与全写入者执行保障另验，旧任意不守约Host仍可绕过协作锁。
- 完整F含原生模型/API中断等尚未验证层；本批不以无模型结果关闭这些出口。

## 整体要求读取与差异

2026-10-27本次重新读取根/项目AGENTS、协同README/登记表、整体独立计划1.3.1 NS1/R1、索引、兼容矩阵、交付合同1.2.1、适用研究补充及DSH总计划/10-26接续/F状态。绝对路径、SHA及读取快照见 `.local/f-orphan-assembly-20261027/planning-inputs.json`。已核索引coordination_plan/compatibility_spec与登记一致，DSH master_plan一致；current_entry按progress_sources定位。

符合：DS-04/F无模型可独立；IC-ARTIFACT版本/审核/归属/原字节；DS-05仍G→H→阶段6。没有新增业务模板或共享接口语义。缺件：旧原生未发送receipt没有持久映射，不能承诺复用；恢复包只是对用户本轮授权的两个公开旧附件按具名证据恢复，不成为任意孤儿自动归属机制。

比较：直接按hash猜配违反权限；重启原Profile覆盖历史失败不利保全；采用原件保全＋具名恢复包＋新隔离副本。该技术选择由实施者作出，符合本轮明确目标，不新开界面设计。

## Review Focus

1. 同名/同hash异项目文件不能取得恢复权限；错误会话/双重归属/证据漂移须零目标写入。
2. 源或目标符号链接、文件字节变化、非空草稿不得被覆盖。
3. 不把新恢复包制造的receipt当旧receipt；重启/Workspace切换不自动上传。
4. 装配缺checkpoint/guard/路径桥或依赖漂移必须在启动前拒绝；不能仅依赖作者改pin。
5. 新副本路径映射和失败证据与实际接受范围可核；全F、发行及真实来源仍列缺件。

## Task 1：旧附件归属与具名恢复包

Files：`scripts/legacy-draft-recovery.mjs`；`scripts/tests/legacy-draft-recovery.test.mjs`；本批私有证据目录。
Consumes：原workspace.json唯一session成员、冻结AX/观察回执、显式attachment路径/hash及目标路径映射。
Produces：`prepareLegacyDraftRecovery(spec)`返回验证后的纯恢复包，含原/目标身份、文字和文件字节；不写源或任何Profile。

- [ ] RED：相同字节不同归属、丢失/多义会话、漂移/链接及错误目标拒绝，正常实际字节形成新包。
- [ ] 最小实现并GREEN；原Profile全部非凭据业务/会话/附件字节前后保持。
- [ ] 只在新副本通过临时公开slot装入本补丁拥有的IDB checkpoint，原生候选实际恢复两个通用文件/error，原文字及正确会话；正常重启仍在、零自动传输。

## Task 2：固定装配与启动接续

Files：`scripts/f-development-assembly.mjs`；`scripts/tests/f-development-assembly.test.mjs`；`patches/f-host-assembly/README.md`。
Consumes：固定R7组件、官方App/SDK、自有补丁、guard/bridge、已接受业务候选/原UI/Sidebar的具名清单。
Produces：`createFAssembly(spec)`在新空目录生成装配描述/配置/私有包；`verifyFAssembly(path)`固定检查来源、物化及强制组件；新入口`--check/--start`复用既有受控launcher，不允许real-acceptance。

- [ ] RED：缺guard/未关闭stock backend/缺checkpoint/输入字节漂移/既有输出或链接拒绝；无错误时生成可验证输入。
- [ ] 最小实现GREEN；固定pnpm离线锁物化，冻结新配对；复用原已审算法，不重建诊断器/调度器。
- [ ] 新入口实际Desktop无模型启动/退出/重启，核正式配置选择、跨Host第二写入者拒绝及旧附件恢复；受影响测试并集及集成候选既有verify按可执行范围记录。

## Task 3：冻结、独立审计与状态接续

- [ ] 冻结准确成员/命令/退出及源保全；新返回明确历史FAIL与新恢复的关系，未取得证据保持未完成。
- [ ] GPT6.1 Max fresh-context子代理只读独立审计；必改项先核实、RED→GREEN修复，保留首轮报告。
- [ ] 接受后更新原三个当前入口/剩余表；最终新鲜hash/pin/端口/锁及无关文件保全复核。

本任务是已明确要求的范围内维护，按用户指定当前根目录单代理实施、结束独立审计；不另开设计批准/执行方式问答。计划勾选可留冻结时状态，实际完成按新返回/审计接续；不由计划产生新真实调用许可。
