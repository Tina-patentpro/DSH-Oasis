# F原生安装器A01修复独立复审

日期：2026-10-29，Asia/Shanghai。执行者：独立审计子代理 `/root/audit_f_native_installer`。基线仍为 `main / 0b05f1cbed61446bed9c22f4e3d4dbe21170dc90`，修复尚未提交。

**结论：F-NI-A01在本次准确修订和受控伴随入口范围内关闭，限定接受。新增 Critical 0 / P1 0 / P2 0 / Minor 0。完整F仍OPEN。** 首轮FAIL及其复现保持原字节，本报告不覆盖其历史结论。

## 复审对象与前置复核

- 修复执行包：`docs/evidence/2026-10-29-f-native-installer-A01-repair-execution.json`，SHA256 `54571ced32458aa6b687a54d670815a69fd7038f404c2be51b964d1ae718d616`；185文件、14符号链接独立重算，错误0。
- 新伴随脚本：`scripts/f-installer-transaction.mjs`，SHA256 `f5eaa81c14b6c28eae6d6c2419ef5d0f46bff7784f8fcc3b4e3f6b47af61e09f`。
- 新三项回归：`scripts/tests/f-installer-recovery.test.mjs`，SHA256 `c8a6c3856717f2f389d35bd63a7d88e8b0565775f654defa16ea23b92b764c1b`。
- 首轮失败实现完整归档于 `docs/evidence/2026-10-29-f-native-installer-audit-original-transaction.mjs.txt`，仍为 `1a809bf26e00c9ffef0fed83ed07f7c19c0ec92f2e880656530155e8405793a4`。首轮报告仍为 `272e0d7b9306c97cb5b4687afe4ccba423a5955384874e21debe21e2d2a9f1e7`。

重新读取根/项目AGENTS、协同约定、准确登记和独立索引的dsh-oasis项、NS1/R1/P28接续、相关当前F入口及身份/保全合同。原16输入身份无漂移，本轮沿既有F范围只复审A01修复，不产生新调用或发布许可。路径、hash、读取范围和未扩大范围见 `.local/f-native-installer-20261029/audit-repair-independent/execution-preflight.json`。

本次全部新输出只在 `audit-repair-independent` 和本报告；没有修改旧审计输出、实现、冻结运行数据或Git。未安装/升级冻结根、启动GUI/SDK、读取认证、访问网络、调用真实模型/API、上传、Send或产生费用。精确App二进制仅以 `ELECTRON_RUN_AS_NODE=1` 运行公开合成测试。为避免占用磁盘，不复制或完整展开大包。

## A01关闭依据

代码差异限定在伴随脚本：

1. `prepareInstallerRecovery`在Profile检查前，始终要求current等于事务beforeCurrent，且installation.json完整原始字节SHA等于beforeStateSHA256。Profile无效也不能跳过资格判定。
2. `applyInstallerRecovery`取得安装租约和SQLite所有权后，再比较状态、Profile、候选目录和marker等全部非锁观察。自身新租约替代旧锁，不拿锁记录变化伪造现场漂移。
3. 资格或接管前漂移只拒绝并释放自身租约；开始恢复操作后的异常仍进入原阻断处理。受影响旧测试覆盖活owner、活进程组、复制失败marker、旧原像、单次派发和成功事务拒绝，均重新通过。

独立保留首轮原序列：T1升级失败→C合法升级成功→T2失败损坏Profile→选择T1准确路径/hash恢复。修订现在在prepare处明确报 `installer transaction superseded; current state changed from before-image`。C的current、完整installation状态及release登记、原业务字节和失败候选保持；不生成旧事务恢复结果，不补写marker，不偷偷修复另一事务的Profile。两固定解释器均1/1、exit0。新探针为 `stale-transaction-refusal.test.mjs`，逐步观察为 `stale-transaction-refusal-{tool,app}.json`，未修改首轮失败探针。

另独立在prepare结束与租约取得之间分别改变Profile、失败候选内容和marker，三例均被持锁后的复核拒绝。介入者字节和原状态保持；候选不被隔离、Profile不被归档、不生成恢复结果，自己的两锁释放。marker介入例保持原marker，其余例不新建marker。两解释器分别3/3、exit0，见 `non-lock-drift.test.mjs`、对应日志和六份观察JSON。作者新增的同current状态变化及状态接管间隙负例也在本次31项内重新通过。

## 实际命令与结果

干净副本由 `git archive --format=tar HEAD` 流向 `/usr/bin/tar -xf - -C <新clean-source>`，两个进程均exit0；只复制准确10份本轮未跟踪源文件/文稿，测试前没有.local输入。没有复制忽略材料或依赖。完整绝对argv、cwd、env、版本及退出码在以下同名JSON；命令均由zsh工作区内Python subprocess以独立argv调用。

| 本次实际验证 | 结果 | audit-repair-independent证据 |
|---|---|---|
| 工具Node24.21.0 `--test` 六份受影响测试 | 31/31，exit0 | `affected-tool.json/log` |
| 精确App内置Node24.18.1运行同六份测试 | 31/31，exit0 | `affected-app.json/log` |
| 两解释器 `--test stale-transaction-refusal.test.mjs` | 各1/1，exit0 | `independent-a01-{tool,app}.json/log` |
| 两解释器 `--test non-lock-drift.test.mjs` | 各3/3，exit0 | `non-lock-drift-{tool,app}.json/log` |
| `python3 verify-r3-package-stream.py`，最终流式版本 | exit0 | `r3-package-stream-r2-exit.json/log`、`r3-package-stream-verification.json` |
| `python3 verify-space-retention.py` | exit0 | `space-retention-exit.json/log`、`space-retention-independent.json` |
| 工具Node运行 `verify-repair-failures.mjs` | exit0 | `repair-failure-retention-exit.json/log`、`repair-failure-retention-independent.json` |
| `/usr/sbin/pkgutil --check-signature <精确R3升级PKG>` | exit1，no signature | `r3-signature-independent.json` |

六份受影响测试是 f-installed-bundle、f-installed-runtime、installed-writer-lease、f-installer-transaction、f-native-installer、f-installer-recovery。作者两解释器150/150及三负例原RED/初次错误信息不匹配日志均被原字节保留；本次没有重跑依赖本机忽略目录的历史全scripts，也不重写首轮干净源码139项/50失败的既有记录。

## 新PKG身份与真实操作证据层

R3升级PKG SHA256 `8aef6442b9da533576974dad3d6403f33411f22b7bbabc561fd1bfa536900258`；请求SHA256 `571d406f3892c55e63c1fbf424a9995e6cc22b3a0c3f956cbcde9d64772634c4`；固定v4 bundle manifest仍为 `dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9`。独立流式读取现存whole PKG的XAR目录、gzip/odc CPIO，核到包内新companion f5、请求571d、manifest dde6及原controller/lease/ownership源码，均与准确源字节一致。

流式检查的27174个payload正文文件SHA、14链接目标、27174文件mode与固定原payload一致，未落盘展开。包内另30775个AppleDouble元数据成员单列，核其magic/version、entry边界及对应主成员存在，不混入正文分母，也不声称源扩展属性等价。最初两个流式校验器运行把AppleDouble当作普通正文额外项，诊断/exit1日志保留；修正格式分类后的r2运行exit0，包及产品源码未因此改变。这是流式成员检查，不是R3再次完整pkgutil展开或新签名验证。

冻结的 `native-upgrade-r3-executed-source.json` 记录实际PackageKit进程父PID/执行路径，核实际执行companion f5、请求571d、固定bundle dde6；与本次直接包内核对、系统Installer原argv/退出记录、UID501回执互相一致。该批实际结果是系统Installer升级触发真实固定pnpm解析失败，Installer/child均exit1，再由准确新companion的显式API恢复并check0。另一场景是准确记录进程组的SIGKILL，check1拒绝不完整Profile，新API显式恢复后check0。审计没有重演这两次实际操作。

两次新的quarantined-release各27809成员独立完整树digest与原计划一致；强杀场景的两原锁、失败Profile树digest保持。新guard接受的原观察current/stateSHA也与各自transaction前像一致。两次afterData与各自故障前九文件hash逐项相等；独立重新散列保留的准确九文件原快照，匹配两次故障前hash。最终真实根的九文件又与repair-public-final-closed原快照一致，UID501，两个启动锁及marker均不存在；全程仅只读。新GUI草稿/正常退出0、端口关闭和UNKNOWN dispatches0继续归于已冻结作者实际操作证据，不提升为真实模型/API UNKNOWN证明。

**接受范围是私有候选的独立operator伴随API。** Native PKG携带该模块，实际恢复从保留的准确companion副本显式调用；root/control继续保持原固定版本。本轮计划明示companion和prepare/apply API，未要求新增用户UI，因此该边界不构成A01修复遗漏。普通用户的持久恢复入口/自助流程没有验收。R3本轮不是新装、系统Installer成功升级/回退，也不是签名发行证据；R2新装/完整展开/原App签名保留各自原层次。

## 保全及空间映射

首轮执行包仍为 `aace8909db3eae7c05648639d41a0d64ad036807d0187a6532cfad3d0063b71b`；原270文件/21链接、八份frozen-source-r2字节均保持。当前八份原源文件仅伴随脚本按本修复变化，其余七份不动；首轮FAIL及旧audit-independent成员保持。原controller/provider/builder、旧测试、固定依赖/锁未改。

独立流式核R0重复展开tar.gz的30779成员：文件字节、目录/文件模式和链接目标均符合其保全manifest；archive SHA `5d67f7a727925923ad64d30495dc444b6fd940e7eb11937506d86f03a1a050ae`。扩展属性未验证，不冒称等价。原PKG、请求、构建资源及失败日志仍在；该重复展开不属于首轮270成员。

R2/R3升级构建staging的payload确已retire，不能再称当前完整bundle。两份映射的whole PKG、manifest、请求、companion及准确原v4 payload保留；独立重算原payload各27174文件/14链接、全部文件模式和对应whole PKG hash，与映射一致，原270成员无迁移/换expected hash。没有重建副本或倒签历史证据。这个处理保留了可复核来源和完整包，属于有界重复工作副本回收。

另独立复核3633跟踪基线、另一工作树86文件、17旧公开原件、七个旧执行包131/109/109/54/152/326/39及35历史链接，均保持；原326唯一旧测试继续按已审原字节归档映射核对。refs/remotes与原快照一致，未访问远端。结果见 `historical-retention-independent.json`、`packet-identities.json`。

本修订可在用户已接受的随包支持入口/私有候选范围收录，A01关闭不使首轮FAIL失效。外层签名/公证/最终许可分发、普通用户持久恢复装配、任意旧writer/OS强制、真实模型/API UNKNOWN、真实附件消费、旧根迁移、多Renderer/双存储、上游/跨平台和任意崩溃/断电/物理盘满等原出口继续OPEN；完整F未完成。
