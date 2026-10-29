# F-UR-A01修订：shell前导环境与新R2安装生命周期

本回执接续[原执行返回](2026-10-29-f-user-recovery-return.md)及[首轮独立FAIL](2026-10-29-f-user-recovery-independent-audit.md)。首轮报告SHA为`8fce619f722d180b6c889405ef9bed23d8a5e8f3e7cd2dbb6aea928fab5d4e7c`，仅F-UR-A01/P2：持久入口和native postinstall在净化环境前使用继承PATH中的`dirname`，独立夹具实际执行了该命令。原334文件/14链接包SHA`4139d900c4524aa8496951294f375ec71d60c0cc5c1672d7e449db7edae85c3e`、原包及原失败源码保持；两份源码另存`…-audit-original-entry.mjs.txt`和`…-audit-original-native-installer.mjs.txt`，没有换原expected hash。

## 改动与验证

仅在两个shell前导先固定并export `PATH=/usr/bin:/bin`，再用绝对`/usr/bin/dirname`；原Node/helper导入前校验、净化Node环境、回执/计划与完整state/current资格、持租约再复核均保持。新增`scripts/tests/f-shell-entry-environment.test.mjs`两真实shell回归，先RED2（恶意dirname marker已写）再GREEN2（marker不出现）。最终22脚本测试文件在工具Node24.21.0和实际签名App内Node24.18.1分别168/168、exit0；准确argv、环境和日志在`.local/f-user-recovery-A01-20261029/final-tests.json`。新R2包与最终源码的七项hash完全对应，不重用旧候选当作修订版运行证明。

## R1初装空间失败保全

修订R1三包构建均exit0，但新装实际遇ENOSPC，Installer明确exit1，留下`RECOVERY_REQUIRED`，没有取得安装成功回执。工作目录`.local/f-user-recovery-A01-20261029`，失败根`.dsh-test/f-user-recovery-A01-20261029/public R3 A01 R1 ' root`。准确包ID的系统日志、唯一安装dispatch/exit、三whole PKG及部分程序/marker均保留；没有在该根重试、补签成功或清marker。这不是“初装盘满恢复通过”，初装中断恢复仍OPEN。

为继续验证，先在准确比对后将完成审计的源码副本及测试程序重复文件改为APFS写时复制：字节、模式、链接目标与nlink1不变，旧U1完整根还在维护租约内执行并通过check/codesign；R1失败根的全文件/链接树前后相等，marker不变。没有改旧C解释器根、用户数据、冻结源码或包。各次映射与前后证明分别在R1工作目录的`*COW*`、`cow-*`、`scratch-cow-deduplication.json`；不声称inode、时间或扩展属性等价，不将写时复制说成硬链接。原失败字节仍可按原路径读取。

## 新R2实际验证

唯一新根：`.dsh-test/f-user-recovery-A01-r2-20261029/public R3 A01 R2 ' root`；证据目录`.local/f-user-recovery-A01-r2-20261029`。安装和升级均先记录空间余量，串行执行实际Installer，不与另一包构建争用空间。

| 动作 | 新R2包SHA256 | 实际Installer |
|---|---|---|
| 新装v3 | `bd81cd14cf6f6319182615bed53bd3e370a1d3d6ef9e85cbc81905b2b4ecfa64` | exit0、UID501 |
| 成功升级v4 | `cee76a00a15fc24f97ebdc95d9b2c077dba3810b20eb1f29769dda70e059932e` | exit0、UID501 |
| 回退v3 | `46fada7cafb57406e5b7849a7099e53ee2825e4ed386ef3b4ccaef8b9be2b0b6` | exit0、UID501 |

三次持久工具身份均为`1b9a7869939f11cfc9640786e7919eaff72c3abb99407bf3a4aec5cbe1b93d48`。安装根真实`.command --list`在恶意PATH及NODE_OPTIONS下exit0、恶意dirname marker未出现。每次新程序物化后只对与原固定payload完全相同的程序副本做COW去重，完整程序树字节/模式/链接、签名、安装JSON及业务JSON保持，再运行原check；所有证明另存，不修改controller/provider或原v3/v4 manifest。

新装界面建立公开技术交底、用户指令及`F-USER-R3-A01-R2-UNSENT-KEEP`；升级前后九公开文件逐字节相等。升级后新增`V4_EDIT_KEEP`和业务编辑，回退前后九文件再次相等，实际重开看到两项新增编辑。一次输入工具超时后重新读取确认内容已全部保存，没有盲目重复；该超时记录也保留。

之后使用安装根自身companion，向新公开故障manifest `e87c567c600cb00df211d380c27862fe4eb9fbe2ceff72463c6ccb8e40234cca`派发一次升级；它只增加故障标签，原v4的27,174文件/14链接及原manifest不变。核对准确自有进程组后SIGKILL，结果`FAILED_OR_UNKNOWN_NO_RETRY`，check1/Profile失配；组ESRCH后才进入恢复。这次故障由安装根companion派发，与上表系统Installer成功升级分别记证，不冒充另一轮PKG失败调用。

真实PTY仅执行安装根`.command`：选1、预览、回车取消，27,850文件/链接身份不变；再选1、预览、输入“恢复”，子进程退出标记0。确认记录绑定完整计划`d31fa8f0799df3c44b5a08c196438efe7aa3e275feaa5d5c49c67ec6775947b5`，原两锁/失败Profile/候选树hash核对一致，九公开文件原字节保留。候选程序在恢复核验后全量归档、流式核对原字节/模式/链接，再退休其展开副本，准确映射在`public-failed-candidate-archive-manifest.json`；原事务、失败Profile、锁及确认记录仍现场保留。

恢复后再次实际重开，两类草稿和v4新增编辑均在。四次App正常退出0，最终原check0、57593关闭、两启动锁及marker无；两业务任务没有run或remote execution，公开合成UNKNOWN的dispatches仍0。AX/PNG、原始终端记录、请求/源码/计划指纹与九文件快照均另冻结。

## 本轮边界

旧九包加本轮首334成员包共十包、五份195pin准入、17原公开文件、另一工作树86、旧Mac分支与远端引用均重新核对。16执行输入没有漂移；本次属于原Task3的重要问题定向修订，原执行读取范围、批准与当前连续修订绑定另记，不伪称新增全篇读取或扩大执行许可。

独立复审结果另记，不能由本回执自授接受。完整F仍OPEN：旧未受控writer、工具版本迁移、初装/回退/恢复自身再次中断、任意盘损、真实UNKNOWN/附件/产物消费、签名公证/许可分发及专业/真人用户接受均未关闭。没有新增业务模型/API/上传/Send/费用、认证迁移、日常安装更改或推送发布。
