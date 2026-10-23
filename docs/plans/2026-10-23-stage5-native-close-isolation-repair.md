# 阶段5关闭隔离与同步重入修复计划

日期：2026-10-23。项目dsh-lab，沿用当前未提交阶段5基线。仅修复NHP2-R1、NHP2-R2；不启动Desktop，不新增真实模型/API，不安装、提交、推送或发布。

- [x] 冻结当前文件；将真实磁盘跨项目反例、同步通知重入反例纳入正式回归，先验证业务断言失败。
- [x] 按Workspace等待其已接受V340队列后独立flush，共享原有关闭期限；同项目顺序及到期清理不变。
- [x] 在V340调用边界复核传入signal，拒绝已取消读取，允许期限内已接受写入。
- [x] 补同项目顺序、跨项目失败隔离、期限前/后摘要、零期限、容量和旧数据验证。
- [x] 执行主包、Mac静态、旁置构建/候选合同与离线pack；撤回检查及一次新上下文只读复审。
- [x] 保全原审计/FAIL与旧状态，新增收口报告与核验JSON；不将本地合成验证视为Desktop验收或阶段5整体完成。

Review follow-up: capture known and in-flight Workspace identities; two added removed-Workspace regressions failed before repair, passed after repair, and received same-reviewer targeted closure. Final new formal tests: 17.
