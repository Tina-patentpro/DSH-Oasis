# P2离线装配：实际Desktop配置与剩余写入租约条件

2026-11-06，Asia/Shanghai；Codex单代理。接续R2/P2与P1的NZ01—04，按用户“按计划推进执行”完成本轮离线装配。**新Profile、实际App依赖锚点/同归档配对及有效端口配置已有证据；已安装写入布局/租约仍未满足，候选继续拒绝启动。** 未启动Desktop/Host或做真实调用。

## 实际完成

| 原缺件 | 本轮新增证据 | 仍须区分 |
|---|---|---|
| NZ01 Profile为空 | 以固定pnpm11.8.0先生成锁再冻结物化7项Profile链接，另有597项安装层链接；新Profile采用Desktop实际要求的hoisted工作区配置，真实preparer判requiresDependencyMigration=false | 当前为本地新装配，尚未进入原生应用或已安装发行接受 |
| NZ02 App锚点未核 | 固定App原字节克隆到新安装目录；调用该副本的实际Desktop prepareDesktopProfile/包选择函数，App安装锚点与Profile均把Host、客户端及业务bundle解析到同一c07f归档 | 本机602项既有组件目标仍按原地址只读复用，不是自包含分发包；新App副本未运行 |
| NZ03 端口仅建议 | 实际Desktop准备结果port=57619、networkExposure=loopback，最终活动webserver配置host=127.0.0.1；同次lsof未观察到监听 | 这是配置合成和瞬时占用观察，没有监听/保留端口；实际启动前仍复核 |
| NZ04 独立writer未核 | 新独立home、原单写者组件路径/实际配置已核；实际跨进程SQLite所有权拒绝第二writer，释放后可重取 | 实际provider还强制已安装writer租约及root/data/home/storages，普通root/home与启动锁不满足，不能启动 |

## App、依赖与实际配置

新目录在P1专属root下增设`installation/App`，原App与原Profile不写回。实际APFS clone命令及退出0见[app-copy-command.json](app-copy-command.json)。[逐件核对](app-copy-verification.json)对源/副本26160个文件、14个符号链接核字节、权限模式及链接目标；原App文件与源快照一致。本轮没有重签或重跑代码签名验收，不把字节克隆等同安装包接受。

四次固定pnpm离线/ignore-scripts命令均exit0；安装层isolated、Profile层hoisted，均先lockfile-only确认无node_modules，再frozen-lockfile物化，没有手写链接元数据。锁在冻结前后保持：安装层`4ab97f3dfeea7038a14562a02f35418bbb5697bc41de793d78867c09f9507ff6`，Profile层`b4c9de92923e98202b3425c3988c8a5e8bf6f4341d3aa19b20d99fda9b9887ed`。准确命令、工具/链接模式、原始输出见[pnpm-commands.json](pnpm-commands.json)。相对旧604项视图仅两处Oasis逻辑目标换为新c07f归档，其他602项原实际地址保留；源元数据不写回。

这里补的是Desktop实际准备层，超出此前裸boot/include组合的证明范围。实际函数把Desktop自己的patch插在Web bundle层后，再合入Profile，最后生成webserver配置；已安装App内的package.json是准确安装锚点。同版本安装侧优先的规则仍保留，靠新隔离安装层绑定新包，没有改版本号或绕过overlay选择。

[check-assembly.mjs](check-assembly.mjs)实际exit0，[结果](desktop-preparation-result.json)及[最终条目](effective-entries.json)证明：仅一个原ID的M06受控业务Host，普通Host禁用；App与Profile的Host/客户端路径及Oasis bundle层指向同一c07f归档；604项realpath及manifest身份匹配；原生模型Provider、自动标题生成、goal driver、账户控制和遥测等所选危险活动项均未启用；market disabled；Profile metadata/锁/patch/workspace文件在preparer前后原字节相同。

本轮完整Desktop层组合warnings为空。旧裸boot/include报告中的desktop-shell/desktop-updates两项警告保持原字节；差异来自本轮调用了Desktop实际的完整准备函数及其patch层，不把它们写成已修复的旧产品缺陷或删除历史警告。全程没有调用boot()、plugin apply、模型、API、凭据或受控Fetch。

## 必须保留的真实writer拒绝

实际固定`dsh-storage-json-single-owner`不是普通JSON后端替代品。其index先调用assertInstalledLease，要求`DSH_OASIS_INSTALL_ROOT`、同一writer nonce、真实安装状态/current回执、双锁及`root/data/home/storages`；随后才可打开后端。当前P1启动器使用`root/home`，普通startup.lock也不提供这份租约。

本轮没有改provider、伪造installation.json/current/nonce，或手工替换成无租约组件。[实际负例与独占试验](storage-owner-result.json)exit0：无租约时按预期拒绝；只在新root创建SQLite**所有权元数据**，由原组件acquireJsonRootOwnership持锁，另一个Node进程被拒绝为DSH_STORAGE_ROOT_BUSY，释放后可重取。没有打开业务后端、生产数据库或原Profile数据。此项证明本次根所有权行为，不能外推任意旧writer/跨root或完整F已通过。

## 新候选和下一步

[admission-candidate.json](admission-candidate.json)是另版当前候选，P1原候选/旧归档/两组旧锁及接受证据不改。新增copied App、有效Profile/锁、实际准备与writer证据绑定；runtime_ready仍false，只余具名`NZ04-INSTALLED-WRITER-LAYOUT`。新CLI --check实际exit1且无标准输出/启动锁，见[命令](candidate-check-command.json)，这是有意拒绝，不记运行通过或无原因安装失败。

下一件沿既有`scripts/f-installed-bundle.mjs`、`scripts/f-installed-runtime.mjs`及`patches/storage-json-single-owner/installed-lease.mjs`准备**新归档的已安装布局候选与零生成启动接续**：固定新bundle/受控入口、由原控制器产生root/data布局、真实状态/回执和writer租约，保持Host/客户端同版；零生成标记和预算必须进入实际受租约控制的启动规格。先做离线/拒绝与装配检查，不调用startFInstallation或真实App；不能因模板有默认0预算就自动保证已带P1的RPC guard。

现有本机链接视图可以作为准确来源，不冒充原控制器所要求的自包含已安装包。旧安装器及F子集仍按原范围复用，不把全部F重做或用已消费真实调用许可补这项装配。P2实际Host/UI/生命周期未执行，专业/用户、内容修订、最终许可/分发、源B/A及发布门保持。

## 复核与保全

[preflight.json](preflight.json)记录23项实际读取/版本/hash、原授权接续、Git与范围；新发现的实际provider/控制器来源另记[supplemental-inputs.json](supplemental-inputs.json)，没有把晚读项伪称早已全文复审。根R1/EXEC-R2、当前BM1-R1/S2-R1及S1/G1继续，当前master/状态入口未换址。

Ruling：单代理、复用当前非main checkout；此次为实际旁置装配，不改产品代码/模式，不重跑P1的48项和归档3项。Ruling：允许本轮在专属root增设安装副本及原组件所有权元数据；原件和日常Profile保全，复制App不等运行。Ruling：按真实provider条件保留唯一writer缺件，不手写安装收据、绕过租约或仅把runtime_ready改true。作者另轮自审核对了这项限制，非独立接受。

本轮新鲜验证见[verification.json](verification.json)，只证明本地固定依赖/完整Desktop配置、App字节保全及具名writer负例。没有启动应用、读取/复制真实认证或会话、真实模型/API/Dify/上传/费用、写源CI/B/A、WorkBuddy投递、Git提交/推送或发布。以下当前状态入口只加本轮前缀，旧字节和FAIL/UNKNOWN完整保留。
