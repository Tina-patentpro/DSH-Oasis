# F受控Profile写入与安装升级回退实施计划

> 以superpowers:executing-plans单代理实施，完成后GPT6.1 Max独立审计，再分批本地提交。用户已明确此执行范围，不重复索取计划批准。

**Goal:** 在新的私有管理根完成同数据根Profile干净安装、v3→v4→v3及失败恢复，统一受支持写入入口的排他准入。
**Architecture:** 复用固定F装配器、startup.lock及JSON根所有权，不改原冻结模块。新脚本只管理固定no-model开发Profile的元数据/依赖装配；版本化快照与回执不覆盖。运行数据原地保留，不复制认证或旧userdata。
**Tech Stack:** 固定Node24.21.0/内置24.18.1、pnpm11.8.0离线冻结锁忽略脚本、Desktop2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1。
**Spec:** 用户本轮要求、原剩余表DS-04/F、`docs/plans/2026-10-26-dsh-oasis-follow-up-development-plan.md`。不是签名App安装器、上游大版本升级或发行许可；目标中这些未验项不删除。

## 整体与范围核对

2026-10-28重新读取整体 `/Users/tinadong7036/Documents/开发项目/docs/superpowers/plans/2026-10-25-independent-projects-and-compatibility.md` 1.3.1/NS1-R1/P28、根/项目AGENTS、协同1.2.1、登记/独立索引、兼容矩阵/合同及本项目当前入口。15份准确路径/SHA/原字节见 `.local/f-profile-lifecycle-20261028/planning-inputs.json`。登记master_plan与索引一致，当前P28只选未验F场景、不重做已接受GUI；本批作为一个Profile生命周期场景联验。IC-ARTIFACT的准确版本/归属/保存边界继续，不改业务资源/API合同、U1/D1或G/H。

基底41d22c4；预存总计划P28修改保持原字节并排除本轮提交。复用195pin装配及已审v3/v4，不重跑111秒附件观察或旧GUI审计。缺件：签名发行/所有旧写入方强制遵循、安装器/跨平台与上游版本兼容仍未取得；不影响私有Profile验证。

## Global Constraints

- 零新增真实模型/专业API/费用、外传、retry/Send、推送或发布；不读迁认证、不改日常HOME/Profile/签名App。
- 原195/198pin、FAIL/UNKNOWN及历史源码/审计保持；新root、新回执绑定实际hash，活动准入复制件可切换，每版原件单独只写一次保存，不重签历史。
- 同一个runtime/home与userdata贯穿升级/回退。只变profiles/desktop与活动准入；业务JSON、会话、附件、原生IDB/fence不迁移或重算。
- 所有本脚本支持的desktop/SDK/recovery/maintenance入口先持有管理锁与runtime启动锁；维护另外取得原JSON根排他，拒绝已活跃的旧受保护SDK。崩溃遗留锁拒绝自动接管，不基于PID猜测删除。
- 旧任意Host/直接文件writer可绕过合作协议，不宣称OS强制保护或全writer发行关闭；保留实际反例及缺件。

## Task 1: 固定Profile生命周期入口及定向验证

Files: 新增 `scripts/f-profile-lifecycle.mjs`、`scripts/tests/f-profile-lifecycle.test.mjs` 及窄进程夹具。不改旧装配器/补丁/依赖。
Interfaces: `installManagedProfile({root,spec})` 返回明确current release；`checkManagedProfile(root)`；`withManagedWriter(root,role,callback)`；`upgradeManagedProfile(root,{spec,expectedCurrent})`；`rollbackManagedProfile(root,{releaseId,expectedCurrent})`；`startManagedProfile(root)`。只接受无fixture、明确已审checkpoint3或4。

- [ ] RED：干净安装必须固定物化及保存不可覆盖版本回执；busy时SDK/recovery/maintenance回调为0；维护与已有JSON owner互斥；v3→v4→v3保留真实KV值/UNKNOWN哨兵；失效目标或实际pnpm失败恢复原准入/原Profile；过时current、缺pin/被改快照、链接/越界与遗留锁拒绝。
- [ ] GREEN：共用现有启动锁/JSON锁，固定pnpm执行；快照只复制Profile的规定文件和node_modules（不解引用链接）；活动准入与current用原子替换，失败恢复上版，恢复失败须拒启动。
- [ ] 命令：固定两解释器运行本文件，预期0；集成后既有scripts全集，预期全部通过，不重跑不变业务/解析器。

## Task 2: 实际固定Desktop生命周期场景

Consumes Task1接口。新 `.dsh-test/f-profile-lifecycle-20261028` 私有根，不消费日常数据。
- [ ] 实际物化/干净安装v3，创建公开原生未发送及Flow-2-6业务指令草稿；不触发准备/生成。
- [ ] 活跃时尝试受支持SDK/recovery/upgrade/rollback，确认进入业务/文件写入前拒绝；受控公共SDK/原JSON owner另作真实互斥，不冒充阻止旧无保护writer。
- [ ] 正常退出，明确expectedCurrent升级v4，重开两草稿；本地编辑公开标记，正常退出后精确回退v3，再重开仍保留升级后编辑。依赖解析/组件实物与版本回执一致。
- [ ] 保留正常/拒绝/失败回滚证据与所有退出码，关闭自有进程/端口。

## Task 3: 冻结、独立审计与本地分批

- [ ] 精确成员/配置/版本/SHA、预存改动保全、读取身份差异、限定返回；新上下文GPT6.1 Max审计（无真实调用），保留首轮FAIL；必要修复先RED后GREEN。
- [ ] 原当前入口只加本批结果前缀，旧字节保留；源码/测试与证据两批本地提交，排除预存P28总计划，不推送。

## Review Focus

维护和Host启动窗口竞争；parent/Host被杀后遗留锁不能自动偷取；快照链接/路径不能变为跨项目读写；真实物化失败后不能留下可启动半安装；回退不得回退用户数据或删除UNKNOWN/审核；全部writer声明只限明确接入的合作入口，不能把旧stock JSON绕过藏起来；活动准入与immutable回执身份不混；不因开发Profile成功宣布发行安装升级完成。
