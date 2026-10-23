# openPanel条件建页重放修复 Implementation Plan

> **For agentic workers:** 使用superpowers:executing-plans在当前会话执行，TDD并做一次新上下文复审；不另派实现者。

**Goal:** 闭合RW-A1，保留openPanel首次执行已产生的普通建页、其后改名及显式建页对照。

**Architecture:** 普通编辑仍一条记录对应一次editGeneration。将open-panel首次执行已接受的具体效果记为有序replay actions：实际创建则create-page，随后set-panel-mode normal；没有创建则只记打开效果。使用原有每次编辑缓存的ID/时间，在成功Host响应后的权威状态重放；不改变Host/schema/磁盘格式。

**Tech Stack:** 现有JavaScript ES modules、Node原生测试、真实本地service/remote/repository临时磁盘。

**Spec:** docs/evidence/2026-10-23-stage5-retained-writes-reaudit.md；用户本轮要求构成执行授权。

## Global Constraints

绑定当前dsh-lab与mac/continuity-v2现有工作区；保留本轮前所有未提交阶段5工作，不切换到缺失这些变更的HEAD工作树。保留写入顺序、关闭期限、容量与旧数据兼容。未启动Desktop或真实模型/API。无依赖安装/升级、Profile/pin变更、提交、推送或发布；活跃lib保持，构建旁置。旧AGENTS已撤销，不读取。保留旧红测/审计/历史状态字节。

## Review Focus

- 空项目V340创建响应在途的openPanel，无后续编辑也必须落盘。
- 后续改名、settle/close/移出close均保留普通页身份及标题。
- 显式createPage对照及未建页的openPanel不能额外造页。
- 一次编辑多个具体效果不得破坏editGeneration计数、下一V340顺序或同步通知更晚编辑。
- 截止期限后无新RPC/恢复状态，容量与旧结果编码不放宽。

### Task 1: RW-A1修复及正式回归

**Files:** 修改packages/oasis-professional-service/src/client/workbench-store.js；新建test/v340-open-panel-replay.test.mjs；新建本轮closeout报告及更新current-state前置摘要。

**Interfaces:** 保持store.openPanel/createPage/renamePage/flushWorkspace/dispose签名及返回；重放记录仅为内存私有数据，不持久化。原context.edits每项仍代表一次接受的普通编辑。

- [x] Step 1: 新正式16项：建页两种×改名两种×settle/close/移出close共12，另重复open不重复建页、下一队列顺序、同步通知晚改名、期限迟到四项。断言实际磁盘、成功、身份/时间、revision顺序和计时器清理。
- [x] Step 2: 在当前未修源码执行正式新文件，观察openPanel业务红测；保留显式建页及期限正向对照。
- [x] Step 3: 在persistReadyAction记录具体effects数组；在applyAuthoritativeReplacement按记录和数组顺序重放。每条记录及环境仍对应原一次编辑。
- [x] Step 4: 新16及原28/关闭隔离/重入/P2通过，真实磁盘私有原反例转绿；撤回修复的私有副本重新业务红。
- [x] Step 5: 完成正式全量、Mac静态、兼容补充、旁置构建/候选合同/离线pack并冻结hash；一次新上下文只读复审。
- [x] Step 6: 如有重要发现先红后绿补修，最终报告验证与边界；旧状态精确字节后缀、其余非目标文件不变。按既定边界不提交/推送，不清理证据。
