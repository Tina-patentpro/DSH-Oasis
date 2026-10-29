# F普通用户持久恢复入口与R3原生生命周期

> 单代理按superpowers:executing-plans执行，最后按用户要求由GPT6.1 Max独立审计，再分批本地Git。当前基线main/57e8edf，原包、失败和审计保持。

**Goal:** 在安装根内提供无需开发目录/手写JSON的持久升级恢复入口，并用系统Installer实证R3新装、成功升级与回退。
**Architecture:** 原固定controller/provider不改；独立companion持久装配至安装根，原生`.command`使用随包Node和固定源码hash先校验再加载。升级事务在创建时发布不可覆盖的manifest哈希回执；用户选择明确事务、看恢复预览、输入绑定计划hash的确认，复用已审prepare/apply规则。新装/升级PKG携带原固定完整payload；回退PKG仅携带固定Node/companion和准确目标/current请求，消费已登记release。
**Tech Stack:** 固定Desktop2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1、原v3/v4 bundle；Node24.21.0、App24.18.1、pnpm11.8.0和系统Installer，均不升级。
**Spec:** 本轮用户直接指令及“继续”，[剩余工作表](../evidence/2026-10-26-follow-up-remaining.md)、[A01限定复审](../evidence/2026-10-29-f-native-installer-A01-repair-independent-audit.md)。EXEC-R2本轮重新解析整体1.3.1/NS1-R1/P28及本项目入口，16准确字节/读取范围/差异见`.local/f-user-recovery-20261029/execution-preflight.json`；原3649跟踪基线另存。

## Global Constraints

- 不推送/发布、不新增真实模型/API/上传/Send/费用，不读迁认证、不改日常Profile/App。仅新私有公开根执行；完整F及原未受控writer/OS强制、真实UNKNOWN/附件等出口仍OPEN。
- 原R3两个bundle和controller/provider/旧失败证据不改，旧270/185等成员expected hash不变；源码变化与新包另冻结。仅有证明可重建的重复构建副本可回收，whole PKG/来源/请求/失败/回执均保留。
- 普通用户入口采用原生Terminal文本交互（执行者实施选择，用户已要求直接继续），不新建业务Web UI/宿主槽；入口随安装根存在，先预览、明确确认；不自动清锁/挑最新事务/重试/重启App。没有发布回执的历史事务不自算hash补认。
- 只恢复程序/Profile/installation，不回填用户JSON、IDB、会话、附件。持久工具及事务回执受安装根/UID/固定Node/控制器/文件hash约束；被改helper必须在导入前拒绝，环境不得预载Node代码。
- 本轮恢复范围是已发布的升级失败事务；不声称新装中断、回退中断、物理盘满/断电或任意崩溃已支持。未签名/未公证/许可分发门仍独立。

## 方案与顺序

采用安装根内固定companion＋原生终端入口。仅保留开发者API不能满足普通用户目标；新增Electron/Web恢复窗口引入新设计/宿主改造，本轮不采用。原输入/模型/账户界面和流程不动。沿用当前独占开发根/已批准main本地收录；另一工作树86文件不参与。

### Task 1: 持久工具、可信事务回执与明确恢复确认

Files: 新增`scripts/f-user-recovery.mjs`、`scripts/tests/f-user-recovery.test.mjs`；有限修改`scripts/f-installer-transaction.mjs`。
Interfaces: `installPersistentRecovery({root,sourceRoot,expectedFiles})`；`verifyPersistentRecovery(root,id)`；`listUserRecoveries/prepareUserRecovery/applyUserRecovery`；`runRecoveryCli`。工具manifest绑定准确root/owner/node/control和源码；`.command`内固定校验器在import前验hash。事务原创建时写installer-receipts，列表只消费其原hash，prepare/apply全状态资格与持租约后再核不放宽。确认及计划证据在实际持锁恢复中无覆盖保存。

- [ ] RED→GREEN：无开发副本依赖；被改helper/Node/launcher及外根拒绝；取消/缺确认/活owner/过期计划无恢复；不能补认任意旧journal；成功显式恢复保留数据/失败/原锁。
- [ ] 单元夹具仅替身签名/pnpm/二进制边界，测试操作真实文件/租约与现有恢复实现；真实安装和用户入口另证。

### Task 2: 原生包接线与完整正向生命周期

Files: 修改`scripts/f-native-installer.mjs`及必要native请求接线，新增定向测试。
Interfaces: 新native请求schema2绑定全部companion hashes，build默认带持久入口；schema1仅保留原受限兼容，不能冒充新能力。rollback请求绑定releaseId/current，薄包自带固定Node，不依赖开发目录或全局Node。

- [ ] RED→GREEN：新包在升级前持久化工具，安装后工具可用；无授权源码/错误UID/目标/回退current拒绝；三个action边界及原API兼容。
- [ ] 新私有根：系统Installer新装v3 exit0；公开原生/业务草稿；系统Installer升v4 exit0，重开后新增编辑；系统Installer回原v3 exit0，重开保留新增编辑。每次切换九公开文件精确前后比较，UNKNOWN派发0，正常退出/端口/锁释放。
- [ ] 同新根准确升级故障，原生持久入口经真实终端交互预览、取消和确认恢复；源码/请求/事务/计划hash、用户确认、失败候选和数据保全另证。输入为公开合成，自动化操作不冒充真人可用性或正式用户接受。

### Task 3: 冻结、独立Max审计与本地收录

- [ ] 工具及真实包、所有失败/取消/拒绝/恢复、原证据保全和当前中央输入变化另单冻结；保留无权限/未验项。
- [ ] GPT6.1-sol/max新上下文独立审计；重要问题定向RED→GREEN及新修订复验，原FAIL不覆盖。
- [ ] 三原状态入口仅追加前缀；源码/测试及审计证据分批本地提交，不推送。冻结时复选框与最终结果分开留证。

## Review Focus

- 未发布/被改回执、过期计划、活进程组/owner或partial锁：只拒绝，不自动修复或重派。
- helper在模块导入前被校验；root/UID/Node/控制器与入口漂移不得被新hash“批准”，不能沿用开发目录或NODE_OPTIONS。
- 成功升级/回退不得被旧失败事务撤销；工具在坏Profile和重启后仍能运行。
- 恢复确认绑定准确事务和完整计划；确认后变化仍拒绝，程序切换保留用户新编辑及历史失败。
- 新装/成功升级/回退及普通用户入口分别给真实证据，不拿旧目录安装或operator API结果代填；发行、真人接受和完整F仍各自开放。
