# F原生安装器与升级失败恢复

> 单代理使用superpowers:executing-plans；同范围直接续接用户指定F，最后使用指定GPT6.1 Max独立审计，再分批本地提交。原固定安装布局及历史证据保持。

**Goal:** 交付可实际检查的macOS原生PKG安装候选，并用真实固定controller/pnpm的失败和受控中断证明显式恢复只切程序/Profile、不回退用户数据。
**Architecture:** 原R3 runtime/builder/provider不变。新增安装事务伴随入口，先在原锁下冻结Profile/installation前像，再用原controller独立进程执行；失败保留回执。显式恢复请求绑定事务清单、当前状态/锁/失败目录hash，仅在原owner已结束且输入未漂移时归档遗留锁/失败程序并恢复前像。PKG携带固定包、Node和伴随入口，使用系统Installer标准流程，目标严格限定在本轮私有测试根。
**Tech Stack:** 既有Desktop2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1及R3两个包；Node24.21.0/内置24.18.1、pnpm11.8.0不升级；系统pkgbuild/productbuild/pkgutil/installer。
**Spec:** 本轮直接用户指令、原剩余F、[R3最终限定复审](../evidence/2026-10-29-f-installed-layout-A01-repair-independent-audit.md)。新增运行在新私有根，不向已冻结R3根写入。整体/本项目1.3.1/NS1-R1/P28、16准确输入及3633已跟踪基线见`.local/f-native-installer-20261029/execution-preflight.json`。

## Global Constraints

- 无真实模型/API/上传/Send/费用；不读迁认证、不改日常Profile/App/权限，不推送发布。全F仍OPEN，用户已接受随包入口子集。
- 原R3控制器、包、回执、326/39执行单、首轮FAIL/原测试/历史17份等字节不改。不能为修复重算旧expected hash。
- 本机只读签名身份查询得到0个Developer ID Installer；可以构建未签PKG，不宣称签名/公证/发行接受。管理员安装、签名身份/最终分发许可仅阻相应出口，不能用解包冒充系统安装成功。
- 采用系统现有Installer流程，不新增业务UI或修改宿主核心。备选目录复制已验但不足原生安装器；自定义安装App引入新UI/签名成本，暂不采用。
- 快照仅程序/Profile和安装状态，不备份/恢复用户JSON、IDB、会话、附件或认证。失败目录/锁/marker先归档，恢复必须有精确当前状态与输入hash；活owner/漂移拒绝，不自动清锁/重试。
- 所有测试故障只在新公开合成环境：真实pnpm读取故障、精确拥有进程组中断；不外推断电/物理盘满/任意损坏、上游/跨平台或非合作writer。

## Task 1: 显式安装事务与有界失败恢复

Files: 新增`scripts/f-installer-transaction.mjs`和`scripts/tests/f-installer-transaction.test.mjs`。
Interfaces: `runInstallerTransaction({root,bundle,expectedSHA256,expectedCurrent,transactionRoot})`；`prepareInstallerRecovery({root,transactionRoot,expectedTransactionSHA256})`产出可审计划；`applyInstallerRecovery({plan,expectedPlanSHA256})`验证、归档和恢复。普通失败不自动恢复或重派，原controller自己的异常恢复证据照实记录。

- [x] RED→GREEN：原像/单次派发/持久状态；活owner和输入变化拒绝；同数据根保留新增编辑与UNKNOWN；显式死owner锁归档；恢复失败保持阻断；当前已成功新版本不得误判失败回退。
- [x] 两固定解释器运行受影响测试，日志/exit保存。测试替身仅进程边界；后续真实验证另列。

## Task 2: 原生PKG与真实失败验证

Files: 新增`scripts/f-native-installer.mjs`、对应定向测试及具名私有操作材料。
Consumes: 原R3两个精确manifest及Task1伴随入口。Produces: native PKG +完整构建/解包/原签名核对、限定根安装尝试和真实失败/显式恢复记录。

- [x] RED→GREEN：包/目标范围固定；拒绝外部目标或输入漂移；使用独立argv；PKG不得含旧userdata/认证或改签App。
- [x] 实际pkgbuild/productbuild，pkgutil展开后与原资源逐文件/链接核对；保留正式Installer调用原结果，权限或签名阻断不绕过。
- [x] 新根实际固定runtime安装及公开数据；真实升级失败恢复、精确进程组中断后显式恢复；核数据字节、UNKNOWN零派发和失败目录/锁原件。恢复后实际check，必要GUI只验本次恢复差异，不重演原三次生命周期。

## Task 3: Max审计与本地交接

- [ ] 冻结源码/包/请求/事务/回执/失败/恢复与旧成员保全清单；明确未执行/权限阻断/签名缺件。
- [ ] 新上下文GPT6.1-sol/max独立审计；保留首轮FAIL，必要修复另记精确差异。
- [ ] 三状态入口只加前缀，源码/测试及证据分批本地Git；其他工作树86文件和远端引用保持，原分支不改写。

## Review Focus

- 前像失配、有效新版本、并行写入或活owner：拒绝恢复，不从文件名/mtime猜身份。
- 归档锁与接管之间owner变化、部分归档、恢复中断：失败阻断且原字节可核，不能丢唯一数据/失败记录。
- 原生PKG解包不等Installer执行；签名App不等外层PKG签名/分发授权，管理员/正式发行独立。
- 子进程退出未知：先读原回执；故障只终止本轮拥有的准确进程组，不影响日常DSH。
