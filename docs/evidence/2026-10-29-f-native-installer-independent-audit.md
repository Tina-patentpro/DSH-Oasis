# F原生安装器与升级失败恢复独立审计（首轮）

日期：2026-10-29，Asia/Shanghai。审计执行者：独立子代理 `/root/audit_f_native_installer`；按用户指定的新上下文审计要求执行。基线：`main / 0b05f1cbed61446bed9c22f4e3d4dbe21170dc90`。作者增量尚未提交，符合先审计、后分批本地Git的顺序。

**结论：FAIL，新增 Critical 0 / P1 0 / P2 1 / Minor 0。** 原生PKG的固定资源运输、既有三次故障证据和历史保全可以复核；显式恢复尚不能获得本轮限定接受。F-NI-A01修复并独立复验前，不把本轮恢复增量登记为接受。原有随包入口子集接受及完整F OPEN保持原范围。

## 审计基线与执行边界

重新读取根/项目AGENTS、协同约定、登记表及独立计划索引的准确dsh-oasis项；沿NS1/R1及current_followup解析P28，核本项目master_plan/path/anchor、当前入口最新F前缀、相关IC-ARTIFACT身份/保全合同及兼容矩阵。本轮计划是 `docs/plans/2026-10-29-f-native-installer-failure-recovery.md`，未声明独立版本号，以完整原始字节hash绑定。16项输入均与作者本轮EXEC-R2快照一致，未发现入口漂移。具体路径、hash、读取范围和授权绑定见 `.local/f-native-installer-20261029/audit-independent/execution-preflight.json`；这份复核不新增运行或发布许可。

本审计没有启动日常App/Profile、读取或迁移认证、访问网络/账户、安装/升级冻结新根、启动GUI/SDK、调用真实模型/API、上传、Send、产生费用、修改实现或提交/推送Git。实际App二进制仅以 `ELECTRON_RUN_AS_NODE=1` 运行合成测试。没有用本次解包冒充一次新的系统安装。

## F-NI-A01 / P2：旧失败事务可覆盖后续已成功版本的状态

位置：`scripts/f-installer-transaction.mjs:100-104`、`:122-126`。

`prepareInstallerRecovery`只在 `checkFInstallation` 成功时比较新current与事务beforeCurrent。Profile无效时，检查异常被吞并，`restoreProfile=true`，即使 `installation.json` 已属于另一个后来成功的版本，仍生成恢复计划。`applyInstallerRecovery`随后直接回填旧 `before-installation.json` 与Profile。观察hash只能证明当前现场没有再次变化，不能证明这个现场属于所选旧事务。

独立探针执行以下顺序，全部使用本轮实际controller/transaction实现及公开夹具：

1. 安装初始版本A；事务T1升级到B失败，保留B的部分候选及T1。
2. 通过实际 `upgradeFInstallation` 合法成功升级到另一版本C，实际 `checkFInstallation` 确认current=C。
3. 新事务T2再次升级失败并留下无效Profile，状态仍登记current=C。
4. 使用T1的准确路径、原transaction hash及新生成计划hash调用prepare/apply。

实际结果：prepare接受；apply返回 `F_INSTALLED_CANDIDATE_CHECKED`、current=A；C的目录仍在，C的 `installation.releases` 登记被旧前像删除，`RECOVERY_REQUIRED` 不存在。业务JSON逐字节未变。本发现是错误的程序/Profile恢复和版本登记回退，不宣称已经损坏业务JSON。

两解释器独立复现一致：初始A为 `dc53fb8c1e5ea8202dfe5b196c5cc9dde6e1c5c1e7883ed77775e41fab2426a9`，后来成功C为 `85882cf071acddd827d0135cf06640a77cd92efb5edc916101b5fd2192c91b29`。这两个是公开夹具ID，与真实R3包ID分别记录。

可复现源码：`.local/f-native-installer-20261029/audit-independent/stale-transaction-probe.test.mjs`。两份逐步观察是 `stale-transaction-observation-tool.json`、`stale-transaction-observation-app.json`；对应日志 `stale-transaction-probe-{tool,app}.log` 均为预期安全断言失败、exit1。签名/pnpm及升级子进程退出由公开夹具替身提供；状态变更、版本升级、恢复资格判断、恢复写入和最终检查均调用实际实现。未在冻结真实安装根重演此缺陷。

修复要求：恢复资格须绑定所选事务的完整installation前像和beforeCurrent，在Profile无效分支也拒绝不属于该事务的当前状态；取得安装租约及JSON所有权后、任何Profile/状态恢复写入前再次复核相关非锁观察。不能以重新算旧expected hash或只删除失败候选绕过。至少补T1失败→C成功→T2失败→T1恢复拒绝，以及同current但状态字节/已知release集合已变化的负例；保留首轮源码、FAIL、冻结包和复现。

锁归档至接管的空窗亦不能只依赖接管前的观察。目前没有新增第二个经独立复现的竞态发现；本报告不把未复现的时序推测计为独立缺陷。

## 实际命令与验证结果

命令均由zsh工作区中的Python `subprocess` 按独立argv执行。完整绝对argv、cwd、版本、env及退出码在同目录对应JSON，避免长路径/单引号被shell重解析。

| 实际验证 | 结果 | 本次独立证据（均在audit-independent） |
|---|---|---|
| `git archive --format=tar HEAD`，再只复制本轮8份未跟踪源文件到clean-source | exit0；初始没有忽略目录.local输入 | `clean-source.json`，archive SHA `bd068ead9e2e7bdce666689d01f10f4e47f41654a955ae7ea724b67a786585cb` |
| 工具Node24.21.0 `--test`：f-installed-bundle、f-installed-runtime、installed-writer-lease、f-installer-transaction、f-native-installer五份测试 | 28/28，exit0 | `affected-tool.json`、`affected-tool.log` |
| 精确候选App内置Node24.18.1，以同五份测试运行 | 28/28，exit0 | `affected-app.json`、`affected-app.log` |
| 两解释器 `--test ../stale-transaction-probe.test.mjs`，cwd=clean-source | 各0/1，exit1；复现A01 | `stale-transaction-probe-tool.json`、`stale-transaction-probe-app.json`及日志/观察 |
| 两解释器在clean-source对全部 `scripts/tests/*.test.mjs` 运行 | 各139项、89通过、50失败，exit1 | `clean-tool-node.json/log`、`clean-actual-app-node.json/log` |
| `/usr/sbin/pkgutil --expand-full` 精确R2安装PKG到独立scratch | exit0 | `pkg-expand-r2.json` |
| 工具Node运行 `verify-package.mjs`：全bundle文件/链接、companion、请求和包hash；固定原App codesign验证 | exit0；27174文件/14链接 | `verify-package-exit.json`、`verify-package.log`、`package-transport-independent.json` |
| `/usr/sbin/pkgutil --check-signature` 精确R2安装PKG | exit1，明确no signature | `pkg-signature-independent.json` |
| 工具Node运行 `verify-failure-retention.mjs` | exit0；三故障候选全树、原锁、失败Profile、九公开数据hash复核一致 | `verify-failure-retention-exit.json`、`failure-retention-independent.json` |

clean-source全scripts失败来自未改变的历史测试依赖本机忽略材料，例如 `.local/f-reference-attachments-20261027/admission-R7.json`、旧Desktop mounted运行时和test-runtimes。两个旧测试文件导入失败使可枚举用例少于作者本机147项；这些失败不能隐去，也不是本轮新增13项测试的忽略目录依赖。28项受影响测试和本轮新增夹具在干净源码可运行。作者本机147/147的旧日志被保留；本审计只对以上实际命令作新鲜结论。

## 源码、原生包及执行证据身份

冻结执行包：`docs/evidence/2026-10-29-f-native-installer-execution.json`，SHA256 `aace8909db3eae7c05648639d41a0d64ad036807d0187a6532cfad3d0063b71b`。独立重算270文件、21符号链接、8份当前源码/文稿与frozen-source-r2原字节，错误0；结果为 `frozen-identity.json`。

| 对象 | SHA256 |
|---|---|
| f-installer-transaction.mjs | `1a809bf26e00c9ffef0fed83ed07f7c19c0ec92f2e880656530155e8405793a4` |
| f-native-installer.mjs | `9a391bf997810d287fcbf817e63e44fddd02c60b6c58ad32096ccd342b67b070` |
| f-installed-fixture.mjs | `8ced3c21f76b87758dc673d4558b98f8aed17d75bd1ad693b5bd233dd812d7c0` |
| f-installer-transaction.test.mjs | `21aefac1669f67d9d0509202e2f574b3463efbd52bb5ada67ff38030b03249b8` |
| f-native-installer.test.mjs | `b589eac555ee19e13b50a5b51599f8d1094458a70de7c649df7c71f2c7036b2f` |
| R2安装PKG | `7b3322e745819cc3346e442a6108e137342b710db81d4c48acff31ee6f749697` |
| R2升级PKG | `69ff4dafbbf29304afb3c0df58db165cd8f2c220e9a789bbb107ce6875cd0833` |
| 原R3 v3 bundle | `f926b6857e23fbbcdb5dbd18ba2b26d0afe12b38452b6701c201021e493d9dd1` |
| 原R3 v4 bundle | `dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9` |

R2安装请求hash为 `7093aaca80e29ce9c463b58f75ccecb53006e29dbe55e2a928cdf37a2d6f7cdb`；升级请求hash为 `fe9f90c30ef91cb30151c94e49491a6c2e83a92caf7b528c6a01622708461a9f`。源R3 controller/builder/provider等跟踪内容保持，未把新伴随入口写回旧包。

审阅并核对冻结的系统Installer argv/原stdout/退出记录、UID501原生回执、实际根与data/control归属，R2是在CurrentUserHomeDirectory执行成功、目标创建并check0的作者实际操作证据；R0仅Installer0而目标缺失、R1canonical失败均保留，不能计为安装成功。R0/R1目标当前缺失的post-freeze观察仅作当前观察，不倒签当时证明。

原生升级真实固定pnpm失败、直接pnpm失败、精确记录进程组SIGKILL三场景的原退出/事务/恢复记录保留。独立重算三个quarantined-release各27809成员的完整树digest，与原显式计划candidateSHA256一致；SIGKILL的两原锁归档hash、失败Profile树digest一致；九个原公开快照字节可复核，三份afterData逐项等于before。故障后的GUI/正常退出/UNKNOWN dispatches0属于已冻结作者运行证据，审计没有重启或操作冻结根，也没有把这些合成UNKNOWN提升为真实模型/API恢复。

独立展开树的27183文件、3582目录、14链接，共30779项，与作者expanded-r2逐文件内容、类型、链接目标及mode一致，差异0。按父任务明确的空间回收要求，只清理独立重复展开scratch；完整树清单/比对hash、独立签名/transport证明、映射和清理结果保存在 `expanded-tree-comparison.json`、`duplicate-expanded-scratch-cleanup.json`。原PKG、作者展开树、首轮FAIL/探针/日志/源码全部保留。

## 历史保全及未关闭出口

独立重算3633个跟踪基线字节，差异0；七个历史执行包131/109/109/54/152/326/39成员均保持，原326中的唯一旧测试按已审单一原字节归档映射核对，其余成员不换expected hash；历史链接共35个一致。另一工作树86个基线文件无变化，本地refs/remotes与原快照一致，没有访问远端。见 `retention-independent.json`、`other-worktree-independent.json`、`remote-ref-retention.json`。旧17公开原件的父执行包成员亦通过本次原字节核对。

本轮没有证据关闭外层签名/公证、Developer ID Installer及最终分发接受；也不关闭任意旧writer/OS强制、实际模型/API UNKNOWN、真实附件消费、旧根迁移、多Renderer/双存储、上游/跨平台升级、任意崩溃/断电/物理盘满等原出口。部分锁归档失败仍须保留现场、保持阻断，不自动清锁或接续恢复。

下一步仅对F-NI-A01另立修订、保存准确源码/包身份并定向复验；首轮冻结执行包、本报告及失败探针保持原字节。修复不能由作者声明或旧28项通过代替独立接受。完整F仍OPEN。
