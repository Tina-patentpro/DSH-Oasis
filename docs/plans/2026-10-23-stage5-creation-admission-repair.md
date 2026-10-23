# 创建初始通知准入P2修复 Implementation Plan

**Goal:** 闭合OP-A1，初始创建通知中的同步关闭与移出不漏掉已接受创建，不遗留busy。

**Spec:** docs/evidence/2026-10-23-stage5-open-panel-replay-reaudit.md；用户本轮修复指令为执行授权。

**Architecture:** 在createV340Task中先登记原队列job，再发布v340Creating=true；返回同一job。既有异步队列、保留身份、finally复位和共享关闭期限保持，不新增后台队列或磁盘格式。已接受创建移出后继续执行，正常结束后清除busy；项目未重新加入时仍拒绝新公开动作。

**Constraints:** 当前dsh-lab/mac/continuity-v2工作区保留全部未提交阶段5成果；不另切换丢失这些成果的HEAD工作树。不启动Desktop/实际DSH/真实模型/API，不安装升级、改Profile/pin、提交/推送/发布。活跃lib保持，构建旁置；旧AGENTS已撤销，不读取。容量/旧编码/旧报告/FAIL及旧状态字节保持。

## Review Focus

- 初始通知同步关闭，实际提交前/响应后gate均在原期限内排空。
- 同步移出、重加、移出关闭，已经接受任务继续执行，busy最终复位且可再次创建。
- 未到期限不提前abort，期限到达仍取消并禁止迟到后续RPC或恢复状态。
- 同步重复创建仍拒绝busy；初始openPanel/改名、public flush与创建保持顺序。
- 原16项、原28、全部容量/历史数据保护及真实本地磁盘结果保持。

## Task 1: OP-A1

Files: 修改packages/oasis-professional-service/src/client/workbench-store.js；新建test/v340-creation-admission.test.mjs；收口报告和current-state前置摘要。
Interfaces: createV340Task签名/返回Promise保持，队列job必须在任何初始创建通知前登记；不改变其他公共入口及Host格式。

- [x] 新正式12项：初始关闭两种gate、移出/移出重加/移出关闭三种、原期限两种gate、同步busy、初始普通建页改名关闭/移出关闭、公开flush、RPC开始后关闭对照。
- [x] 在未修源码观察预期业务红测，保留对照，不用取消或导入错误作为证据。
- [x] 最小调整创建队列登记先于通知，红转绿；原openPanel16、保留写入28及关闭P2全部通过。
- [x] 正式全量、Mac静态、兼容补充、旁置构建/合同/离线pack和私有撤回；一次新上下文只读复审，重要发现先红后绿补修。
- [x] 冻结hash、保全旧数据/证据/状态后缀，报告实际验证与未验收边界；不提交发布、不清理证据。

## 同根复审补修

作者正式4项与独立复审确认输入/结果草稿初始通知也先于入队，关闭提前abort、移出丢已接受写入；同一根因纳入本轮补修。两个入口同样先queue登记再updatePageOperation，返回原job。不改Host/队列/期限。新增正式共16项；4项related-red先全业务失败，补修后并入最终定点/全量。既有1085全量/87定点和中间构建属于创建入口候选，不冒充最终候选。
