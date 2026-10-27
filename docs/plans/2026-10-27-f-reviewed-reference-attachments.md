# F 固定审核版本引用及附件恢复实施计划

> 执行方式：单作者，完成后由用户指定 GPT-6.1-sol/max 独立审计。使用 executing-plans、systematic-debugging、test-driven-development 与 verification-before-completion；不提交或推送。

目标：在固定 Desktop2.0.17/DSH0.2.0-rc.2 的旁置候选补足固定审核正文交付与新草稿附件冷恢复证据，不新增真实模型/专业 API/费用。

## 已有合同和技术选择

固定审核引用走现有 `result/conversation-draft` 与公开 inputActions.setDraft，绑定 Workspace/task/run/version/SHA/review/revision；当前文件变化不改变固定正文，超150000投影继续拒绝并保留完整复制/导出。

附件根因在宿主：文本 store 只存字符串，occurrences/attachmentIds/File 与 Host receipt 为内存态。只做通用宿主补丁，不把恢复业务塞进绿洲插件，不替换原生单槽/读私有 store。考虑过复用旧 receipt（重启已失效，拒绝）、外挂插件直接接管原生内部对象（非公开边界，拒绝）；选择固定字节补丁，在原生 shell 生命周期内部使用 IndexedDB 存一份有界 checkpoint，保留文本镜像作为历史兼容。

checkpoint 以权威 session/workspace 身份分区；存文本、引用的必要投影和附件 File/Blob，恢复异步晚到不得覆盖用户输入。图片重建 object URL；通用文件恢复为已有错误/重试状态，不恢复旧 receipt、不自动上传。旧草稿从未存过归属元数据时不能按孤立文件猜配。原生提交/发送仍由用户决定，本批禁止触发。

候选增添自有 draft-recovery patch revision，顶层版本与已审 UI/Markdown 补丁不升级，签名 App/旧 Profile/旧 pin/主 lib/主锁保持原件。存在异步写入尚未提交即崩溃的窗口，不承诺每键击同步落盘或配额/磁盘失败下必恢复；错误须可见，不能静默回退为“已保存”。

## 任务与验证

- [x] 保存本批初始清单，核对原生源及固定包锚点。
- [x] 固定审核引用：普通6797/长126692字符在实际原生草稿完整交付与重启hash一致；超限、不覆盖、跨项目及旧审核不可转移按40项定向/12次实际SDK身份反例验证，不创建真实运行。
- [x] 附件恢复：初始8项缺能力RED→GREEN；后补randomUUID故障11pass/1fail→修复，另3项原生class特征验证。两解释器各15通过；未把所有后补特征测试声称先RED。
- [x] 新隔离Profile实际恢复结构化引用/图片，浏览器实际原生Controller＋IndexedDB校验新Blob；审核正文正常重启。本批不重传真实文件，旧附件缺归属保持缺口。
- [ ] 固定实现、命令退出码、pin/截图/输入与字节清单，送 GPT-6.1-sol/max 审计；修复必改项后复核，更新剩余表。

所有测试为公开合成资料；Loopback Host 内部接口不代表专业 API 调用。主包已有业务代码本批优先不改；本批单独覆盖受影响合同，集成候选按现有 verify 流程有界验证。完整 F、U1/D1、0.1.3 真实模型/API 及分发强制接续不因本批完成。

## 2026-10-27 交接前规划输入复核

本轮执行期间 AGENTS 出现并行文档修订，初始3542项仅此既有文件变化；保持对方字节，不回退。发现新增规划必读R1后，交接前重读根AGENTS/本项目新增条款、协同入口、登记/独立计划索引、规划1.3.1及NS1/R1、本项目总计划的10-26明确接续、相关兼容矩阵/IC-ARTIFACT合同和两 current_entry。准确路径、读取时点/hash及符合/差异/缺件写入本批 execution 的 planningIntake；不伪称这些新条款在初始计划前已存在或已读取。

结论：本批是 DS-04/F 的无模型原生引用/恢复候选，符合 IC-ARTIFACT 的项目/固定版本/hash与审核后文件变化边界。没有采用新的业务规则/Skill、后台接口或账户财务页面，不增加其他项目统一前置，不改 G→H→阶段6顺序。旧1.2补充中的迁移状态仅历史，不覆盖1.3.1和实际当前进度。

作者裁定：绿洲业务源码/锁/活跃lib及R47业务client均未改，不对这些原件运行会覆写lib的 `verify`；当前通用补丁的构建是固定字节转换＋完整JS语法检查，配套两个解释器15项、既有业务40项、实际SDK/真实GUI的局部集成验证。未把该候选称为新的整包发行或完整 verify 接受。
