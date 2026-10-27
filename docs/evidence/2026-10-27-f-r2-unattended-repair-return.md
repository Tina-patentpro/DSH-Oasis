# R2无干预复验：首轮P2修复与追加证据

本记录接续[原返回](2026-10-27-f-r2-unattended-return.md)及[109成员执行单](2026-10-27-f-r2-unattended-execution.json)，不改其字节或原准入；首轮独立审计报告另行保持。用户要求完成后由GPT6.1 Max独立审计，再本地提交，不推送、不新增真实模型/专业API/费用。

## 修复事实

审计发现F-R2-A01/P2：v1测试观察器在HTTP诊断订阅中直接解析new URL；POST `http://[` 无观察器可200/handled，开启后两个固定解释器均异常退出1。畸形query还可能出现在Node错误stderr。作者独立重跑原探针得到exit1，首轮反例保留于 `.local/f-r2-unattended-20261027/audit-independent` 与 `repair/author-confirm-original-P2.log`。

新增 `scripts/tests/fixtures/recovery-upload-observer-2.mjs`；v1源码/原测试只保留冻结历史，版本说明明确禁止新消费。v2捕获URL解析失败，记录unclassifiedRequests而不输出异常对象/原始target；证据writer失败也被捕获并记录evidenceWriteFailures，不影响原HTTP处理。任一非零、缺订阅或dispose或没有实际事件均不接受“零上传”。不增加路由/正文/凭据访问，也不改变产品默认组合。

新增两条回归先在v1行为上RED：畸形地址使子进程exit1；writer抛出使实际HTTP处理异常。修复后GREEN；query marker验证不进入stdout/stderr，正文/响应保持。最终完整scripts在工具24.21.0及实际内置24.18.1均99/99、exit0，日志分别 `repair/tests-final-tool.log`、`repair/tests-final-embedded.log`。这是测试夹具修复，不是原生恢复产品bug；业务代码、依赖及v4均未改。

## 修复版实际观察

新根 `.dsh-test/f-r2-unattended-20261027-repair`，新三文件fixture、198pin，沿同一维护入口离线物化/seal/实际启动。没有改签原Profile或原fixture；公开输入/原Workspace与Session身份及v4组件与首次复验相同。首次A原18字符/2error，47HTTP、0binary、0unclassified、0writerFailure，正常退出0。

同Profile重启后没有点击界面控件，仅初始/末尾AX/png读取及最后super+q；13:51:40.604Z订阅至13:53:31.841Z dispose，共111.237秒，35HTTP、0binary、0unclassified、0writerFailure。原A Session、18字符哈希、2待重试附件、禁用发送均保持；seed未在活跃目标运行。两份IDB File前后96/449990字节及SHA与原件相等，Host没有attachments目录，退出0。

归档路径误差如实保留：构造新fixture时JSON转义的绝对目录替换未命中，因此新index中**明确固定的证据输出目录仍是本批first Profile的evidence目录**。两个新ledger使用新的Host PID82347/82444及UUID，不覆盖原109中的两个v1 ledger。首次收集只在repair Profile目录找，得到空列表的 `repair/dwell.json` 保留，未当作零请求；之后按198pin中的准确index输出路径读取两份实际v2 ledger。准确路径、首末时间、计数与原字节见 `repair/observation.json`。这里新增的只是证据文件，原109成员及旧历史152成员未修改；不按目录名推定运行归属，不把空列表当计数0。没有修改既有源材料或认证。

原first四次启动与修复版两次共6次退出0；最终57583关闭、三份root启动锁释放。无真实模型/专业API/费用、原生retry/Send或Host文件接收。无夹具195pin开发装配与两草稿恢复沿首轮证据保留，未混入observer或seed运行；其准入包含legacy seed源码只作装配器校验输入，不等于运行加载。

## 审计与范围

首轮独立报告、FAIL和正常流量记录全部保留；新增修复证据由追加执行单固定。按用户最终独立审计要求，拟由同一Max对**仅新增P2修复与追加证据**作范围内处置，不重跑首轮109全审或启动Desktop；最终是否接受以具名独立处置为准，不由作者的GREEN补签独立通过。

结论只覆盖两个公开附件、当前配对、正常退出后的无人工重试重启观察及无夹具开发装配。不是历史R2 Profile升级迁移、永久不上传保证、原receipt恢复、真实Host重传/模型消费、多个实际Renderer、跨平台或发行升级回退；完整F仍OPEN。业务实现和依赖没有缺陷证据，因此本轮不制造无关修复；范围裁定的成本是尚未验证的旧Profile/发行差异继续存在。
