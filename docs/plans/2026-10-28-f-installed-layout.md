# F可迁移安装布局与随包写入租约接续

> 单代理按superpowers:executing-plans实施；用户已指定直接继续原F及Max最终独立审计后分批本地提交，不重复提出新UI/设计或调用许可问题。

**Goal:** 把已审同配对开发Profile转为不依赖源码/日常App路径的离线安装候选，并在随包JSON provider实际构造之前要求安装级写入租约，验证新安装根升级/回退与数据保持。
**Architecture:** 新builder从明确source2管理根及不可覆盖release读取，复制固定签名App和七个已审组件的发行文件，排除旧node_modules/缓存/运行数据；固定pnpm在实际安装路径生成元数据。独立安装controller负责唯一数据根、明确current、两层锁、provider租约及版本快照。复用公开Cordis/Storage配置，不改签名App、DSH核心或业务合同。
**Tech Stack:** Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1，工具Node24.21.0/内置24.18.1，pnpm11.8.0离线/冻结锁/ignore-scripts。
**Spec:** 最新用户指令、[原剩余F](../evidence/2026-10-26-follow-up-remaining.md)、[已接受source2范围](../evidence/2026-10-28-f-profile-lifecycle-repair-independent-audit.md)。当前Git基底f01aa95/main；旧mac分支/独立工作树不重写。

## 整体要求与具体裁定

按EXEC-R2重新读取根AGENTS全文、协同1.2.1、登记/索引，解析整体1.3.1/NS1-R1/P28及本项目同ID接续；相关IC-ARTIFACT身份/保全、原资源/费用/专业及用户接受门继续。15份准确原字节/hash和实际读取范围见 `.local/f-installed-layout-20261028/execution-preflight.json`；适用补充只沿明确路由，未定稿接口导航不视为新接受标准。相比上次Git交接无输入字节差异；此次是新的直接F执行授权。

发现现有三个开发组件node_modules指向日常App；新候选排除这些链接，不能把开发Profile直接复制称正式安装。安装只在新私有根，不改日常HOME/Profile/App。签名App原件仅复制并核签，未取得自有外层安装器签名/分发接受，不伪称正式发行。旧stock writer无需遵守租约，原绕过FAIL仍保留；此次只能接受随包provider和具名合作入口，任意非合作writer/OS强制保护不能靠新增包装器关闭。DSH上游版本不升级，自有安装版本升级不等于上游/跨平台升级通过。

## Global Constraints

- 零新增真实模型/专业API/上传/Send/费用；不读迁认证、不复制旧userdata，不推送或发布。
- 原source1/2、131/109执行单、首审FAIL、旧node_modules布局与R7/pin保持原字节；新projection记录原manifest与新manifest关系，不替换旧expected hash。
- 只携带具名组件代码/资源和固定App/Node/pnpm；不把2061提取候选或未批准解析器整体加入分发，不手写pnpm物化元数据。
- 同安装根data贯穿版本升级/回退，只切Profile/程序版本，不回退业务JSON、原生IDB/附件/UNKNOWN或升级后新增编辑。未知不重派，不自动清理崩溃锁。
- 留在当前Git根完成源修订，避免改写旧绝对路径pin；验证的是新安装布局的迁移，非迁移Git或其他工作树。

## Task 1: 随包写入租约与安装controller

Files: 新增 `patches/storage-json-single-owner/installed-lease.mjs`、`scripts/f-installed-runtime.mjs`、`scripts/tests/f-installed-runtime.test.mjs`。
Interfaces: `acquireInstalledLease(root,role)`返回{dataRoot,env,release}；`assertInstalledLease(storageRoot,env)`在provider构造前验证；`installFBundle({bundle,expectedSHA256,root})`、`checkFInstallation(root)`、`withInstalledWriter(root,role,callback)`、`upgradeFInstallation(root,{bundle,expectedSHA256,expectedCurrent})`、`rollbackFInstallation(root,{releaseId,expectedCurrent})`、`startFInstallation(root)`。

- [ ] RED：无租约/错误根/nonce/已结束owner拒绝且backend构造0；四角色busy回调0；包校验、别名/链接/错误current拒绝；全新安装、升级后数据编辑再回退保持；物化失败恢复旧Profile/current，恢复失败拒绝启动；source/controller drift拒绝。
- [ ] GREEN：builtin FS/crypto及既有SQLite机制；维护与JSON owner互斥；controller/source及程序回执有准确SHA，失效时不覆盖数据。测试进程边界mock不作为实际App安装证明。
- [ ] Run：固定工具/实际内置Node `--test scripts/tests/f-installed-runtime.test.mjs`，Expected exit0；RED原日志保留。

## Task 2: 固定来源安装包builder及新根实际生命周期

Files: 新增 `scripts/f-installed-bundle.mjs`、`scripts/tests/f-installed-bundle.test.mjs` 及当前接续说明。
Consumes Task1的controller/lease字节与CLI；Produces `buildFInstallationBundle({managedRoot,releaseId,out})` 的包目录、manifest及SHA。只接收准确已审source2根/不可覆盖release；包不含旧运行数据。

- [ ] RED：明确源/版本和完整文件/链接校验；旧日常App依赖不得随包；排除任意外部链接、fixture及旧root绝对执行引用；source文件漂移拒绝，原始包不修改。
- [ ] GREEN：复制固定App保持签名/内置依赖；代码组件不复制node_modules，运行时依赖只从固定App和明确原候选实物解析；新包manifest记录projection与实际固定来源，pnpm只在新安装路径物化。普通配置用结构化JSON/YAML串行化，不对用户路径裸替换shell/JS。
- [ ] 实际构建两个自有checkpoint安装版本，将包移动到具名新路径后安装；检查物化/动态模块解析没有源码/日常App依赖，核原签名App未改。
- [ ] 实际新安装根GUI写公开未发送/业务草稿，正常升级、增加公开编辑、回退再开保持；四角色及旧SDK/新provider无租约、原stock反例分别验证，不混作全writer接受；零真实派发。
- [ ] Run：受影响scripts两固定解释器，Expected全部通过；实际安装/升级/回退CLI及每次GUI退出0、端口/锁释放；新异常保留原日志。

## Task 3: 冻结、Max独立审计与分批本地交接

- [ ] 精确source/projection/物化/pin/签名/包/版本/数据及旧成员保全清单；报告全writer、正式外层签名/许可、上游/跨平台和真实UNKNOWN剩余。
- [ ] 新上下文GPT6.1-sol/max只审本增量，不重复旧GUI全审；保留首轮FAIL，修复另版/追加，不重签旧输入。
- [ ] 三个原当前入口只加结果前缀；源码/测试及证据分批本地Git，不推送，保留其他任务修改。

## Review Focus

- 安装包或release选择能否绕过固定source2/签名、外部链接或日常App：拒绝，不只更新预期hash。
- provider无有效安装租约、租约根/owner/nonce变化：打开backend前拒绝；原stock绕过仍须保留为未解决范围。
- 包路径含空格/引号、物化元数据仍引用编译目录、模块懒加载回到旧root：实际安装位置物化并核解析/启动，不据静态manifest冒充独立安装。
- 升级/回退失败、迟到writer与旧Profile：原用户数据/UNKNOWN不回退，不自动清理遗留锁或重派。
- App复制、原签名、安装candidate与发行接受混淆：固定底层版本不变；签名/许可/上游/跨平台及完整F未取得的门逐项保留。
