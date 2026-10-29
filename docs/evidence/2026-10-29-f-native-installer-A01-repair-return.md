# F原生安装器A01修复返回（R3）

接续同范围用户授权及[首轮Max FAIL](2026-10-29-f-native-installer-independent-audit.md)，不覆盖原报告、[270文件/21链接执行包](2026-10-29-f-native-installer-execution.json)、R0/R1失败包或R2运行结果。首轮报告SHA256 `272e0d7b9306c97cb5b4687afe4ccba423a5955384874e21debe21e2d2a9f1e7`；原伴随源码另按原字节归档为[原失败实现](2026-10-29-f-native-installer-audit-original-transaction.mjs.txt)，SHA256 `1a809bf26e00c9ffef0fed83ed07f7c19c0ec92f2e880656530155e8405793a4`。

## 修复及资格

仅修`scripts/f-installer-transaction.mjs`，新SHA256 `f5eaa81c14b6c28eae6d6c2419ef5d0f46bff7784f8fcc3b4e3f6b47af61e09f`。无论Profile是否有效，都要求当前current及installation.json完整原始字节hash等于所选事务的beforeCurrent/beforeStateSHA256；不再把“当前现场没再变化”误当作“现场属于这个事务”。取得安装租约和SQLite所有权后、恢复写入前再次核对所有非锁观察。拒绝资格或接管时漂移不修改新状态，也不添加伪恢复完成/阻断标记；开始恢复写入后的失败仍保留RECOVERY_REQUIRED。旧controller/provider/builder、旧测试、固定依赖/锁及原R3两bundle均不改。

新增`f-installer-recovery.test.mjs`三个回归：T1失败→另一版本成功→T2损坏→拒绝T1；current相同而installation状态已变；prepare后到取得租约之间状态变化。先各自RED（Missing expected rejection），后GREEN。首次绿色轮次另有一个旧错误信息正则不匹配，保留该失败日志，统一changed文案后16/16；没有修改旧测试消除失败。完整scripts在工具24.21.0、实际App内置24.18.1分别150/150、exit0。

## 新包与真实恢复

新原生升级PKG SHA256 `8aef6442b9da533576974dad3d6403f33411f22b7bbabc561fd1bfa536900258`，请求SHA256 `571d406f3892c55e63c1fbf424a9995e6cc22b3a0c3f956cbcde9d64772634c4`，事务`a5880ae1-e39e-445f-b0f1-2463ed7532e0`。payload仍为原固定v4 bundle `dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9`。未签名、未公证、不发行。

在同一本轮原生安装所得公开根C，使用系统Installer真实执行R3升级包。实际PackageKit运行中的伴随源码、请求、bundle manifest分别核对为上述新源码hash/请求hash/固定bundle hash；回执UID501。故意提供无效公开YAML触发真实固定pnpm解析失败，Installer/升级子进程exit1；原controller恢复旧版本后，用新修订显式计划归档失败候选，check通过，九公开数据文件与该次故障前逐字节一致。

再以新伴随入口、原固定包单次派发真实升级，精确核对本轮子进程及进程组后SIGKILL。未完整Profile被check拒绝；新修订只在整组结束、原两锁owner已结束且状态完整hash相同后显式恢复。原锁、失败Profile和候选保留；恢复check通过，九公开文件与该次故障前逐字节一致。两次都不自动重派。恢复后GUI再次显示原未发送草稿及原技术交底/用户指令，正常退出0；最终端口、锁、marker及UNKNOWN另由新鲜check/原始文件复核。

R3不是再次执行R2的新装；R2新装、完整展开和原签名验证保持原证据层。R3不为节省空间重复完整展开，改为核对系统实际解压执行的源码/请求/manifest及真实controller校验/运行回执，不能把R2展开报告标成R3展开通过。原生新装函数、builder及固定运行时接线未改，独立审计仍须限定其可复用范围。

## 保全与空间

磁盘空间不足以无限保留重复工作副本：R0重复展开已完整tar.gz存档，流式逐项核对30779项的文件字节、文件/目录模式和链接目标后，才回收该重复展开目录；原R0 PKG/请求/构建资源/失败日志保持。没有宣称扩展属性已验证。独立审计自己的重复R2展开也已与作者展开逐项核对后回收，原报告保留其映射。

R2升级和R3升级的已完成构建staging中，仅重复payload在对固定原payload逐文件hash/链接/文件模式核对一致后回收；准确原payload、whole PKG、bundle manifest、companion、请求、构建回执及重建来源映射均保持。它们不在原270成员中，无成员换expected hash。构建中间目录不能冒充当前完整可运行bundle；按原pin重建副本可恢复，不能重建后倒签旧证据。

原270冻结成员/21链接保持，八份原源码快照保持；实际源码只上述一份经修复变化，另加三回归。旧七包、35历史链接、17公开原件、3633原跟踪文件、另一工作树86文件及远端引用继续定向核对。新修复冻结单见[修复执行清单](2026-10-29-f-native-installer-A01-repair-execution.json)。

**完整F仍OPEN。** 外层签名/公证/最终许可分发、任意旧writer/OS强制、真实模型/API UNKNOWN、真实附件消费、旧根迁移、多Renderer/双存储、上游/跨平台及任意崩溃/断电/物理盘满出口不变。没有新增真实模型/API/上传/核对材料/生成/Send/费用，不推送、不读迁认证、不改日常安装。本文件为作者修复结果；同一Max的独立复审及本地提交另记，不能由作者文字替代接受。
