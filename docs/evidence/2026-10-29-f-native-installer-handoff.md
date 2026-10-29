# F原生安装器及显式失败恢复交接

适用：用户接受的随包受支持入口子集；完整F仍OPEN。前置整体复核、固定输入与新执行计划见[本轮计划](../plans/2026-10-29-f-native-installer-failure-recovery.md)。基线main/0b05f1c；不重做或重签原R3包、不改日常安装、不推送发布。

## 新增入口

`scripts/f-native-installer.mjs --build <准确spec.json>`构建macOS arm64系统product PKG；spec显式包含bundle、expectedSHA256、root、allowedRoot、out及action。升级另有expectedCurrent。allowedRoot必须已存在且归构建用户所有，root必须为其直接子目录。候选严格限当前用户域；脚本核对实际UID，拒绝以root等其他身份替目标用户安装，不要求sudo。路径通过argv和JSON传递，覆盖空格、中文、单引号及PackageKit的/tmp别名。目标已存在时新安装拒绝；升级沿既有版本冲突检查。

包内携带原固定R3完整资源、Node/pnpm及独立伴随入口；不携带现有userdata、认证或工具缓存。原controller/provider和App签名字节不变。构建过程无下载、不运行依赖生命周期脚本；真正安装时由系统postinstall执行伴随入口，固定pnpm以offline/ignore-scripts及独立HOME/缓存物化。外层PKG当前未签名/未公证，不能作为正式分发接受。

## 升级失败接续

`runInstallerTransaction`先在原安装租约及JSON所有权下冻结Profile和installation.json前像，再单次派发原controller升级进程，记录准确argv/PID/进程组/日志/退出值和事务清单SHA。前像不包含业务JSON、IDB、附件、会话或认证；未知/失败不自动重试。原controller正常捕获错误后的恢复照实记录，不能冒充强杀后自动恢复。

恢复分两步：`prepareInstallerRecovery({root,transactionRoot,expectedTransactionSHA256})`只读生成`{plan,sha256}`；保存并核对后由`applyInstallerRecovery({plan,expectedPlanSHA256:sha256})`显式执行。必须使用准确事务路径/清单原hash，不能选最新目录或重算期望值。计划绑定旧前像、当前状态、Profile、候选目录和遗留锁的hash及inode。任何活owner/活进程组、输入漂移、部分锁对、成功升级或有效新current均拒绝，不从direct child退出推定所有子进程结束。

显式恢复仅归档已证实结束的原锁，取得原租约/SQLite后操作。损坏Profile移入事务failed-profile，失败程序移入quarantined-release；旧状态/Profile恢复原字节，业务数据保持现场，不从快照回填。恢复中失败保持RECOVERY_REQUIRED阻断，原像/失败原件保留。部分恢复或物理故障不自动接续，应另核现场，不能反复调用恢复或删除marker“解锁”。

## 保留边界

旧未受控stock SDK/Host、同一用户任意代码和OS强制保护不在已接受子集。签名/公证/许可分发、实际模型/API未知请求恢复、真实附件消费、旧根迁移、多Renderer/双存储、跨平台/上游升级、断电/物理盘满和任意崩溃恢复仍各自开放。本轮故障只是公开合成根中真实pnpm解析报错及精确拥有进程组的受控SIGKILL；不外推为自动恢复保证。

具名执行返回、冻结清单及指定Max审计另附，不将本交接文字当成验收。
