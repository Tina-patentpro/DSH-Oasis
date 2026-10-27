# F业务存储单所有权及进程恢复返回

本轮按[剩余出口表](2026-10-26-follow-up-remaining.md)及[本轮计划](../plans/2026-10-27-f-storage-process-recovery.md)推进。新增旁置通用JSON后端保护，修复同配对候选的双进程写入；实际公共SDK/业务服务的UNKNOWN冷恢复和固定Desktop正常重启取得新证据。**完整F及整个计划仍未完成。** 本稿为送审输入，审计结果另接续，不覆盖原件。

## 1. 已复现的原风险与修复

固定JsonStorageBackend/DomainFacility只约束本实例双开。两个独立Node进程打开同一自有合成业务域、均从revision2提交，先后都返回revision3，第二者覆盖第一者标题。原`ownership.json`保持`accepted=false`，原单所有者期望断言退出1；不能把探针执行完毕的exit0说成原后端安全。原SDK文档也明示没有跨进程写锁，入口EEXIST不解决此风险。

新增`patches/storage-json-single-owner/`四成员，包`dsh-storage-json-single-owner/0.0.1`。通过现有公开BackendRegistry注册json，委托固定公开JsonStorageBackend处理全部JSON；新Profile明确禁用原storage-json行后装入本包。注册冲突不覆盖已有owner。root沿原`dshHomePath('storages')`配置，canonical root内的专用SQLite元数据以EXCLUSIVE事务持有单所有者，原后端close排空之后才释放。进程死亡由OS/SQLite解除事务锁，不按PID/心跳推定过期，不删除用户文件，不改变业务记录/审核/快照格式。

该锁是协作式的：**所有写入者必须使用同配对保护后端；未修改的旧Host仍可忽略元数据锁，不在本候选保护证明范围。** 没有升级固定组件、修改签名App或日常Profile。实际只验本机本地文件系统，不宣称NFS/SMB/云盘、各平台安装包或全局存储安全。方案及权衡见[设计](../superpowers/specs/2026-10-27-storage-json-single-owner-design.md)。SQLite事务及锁原理见[官方事务说明](https://www.sqlite.org/lang_transaction.html)、[官方锁说明](https://www.sqlite.org/lockingv3.html)，具体能力仍以本批实测为准。

## 2. 定向与实际进程结果

准确源码、SDK、命令、失败和产物SHA均在[执行清单](2026-10-27-f-storage-process-recovery-execution.json)，私有原始证据位于`.local/f-process-recovery-20261027/`。

| 验证 | 结果及边界 |
|---|---|
| 定向测试 | 工具Node24.21.0及实际Electron内置Node24.18.1分别9/9、0失败/跳过、退出0。前7项先RED；后2项补既有构造失败/排空边界的行为刻画，不声称9项全先RED |
| 所有权 | 独立进程竞争被拒绝、正常释放、SIGKILL释放、根路径别名、不同根并行、符号链接/外来元数据保全、后端排空前不释放、构造失败释放 |
| 最终R3公共SDK/业务进程 | 第二Host在后端注册/业务域打开前失败，原JSON字节及先写入的revision/标题保持。使用真实Cordis/Storage/DomainFacility及业务repository，不替换磁盘层 |
| UNKNOWN故障窗口 | 真实SDK/业务服务持久化合成prepared，SIGKILL后新进程观察原run转`unknown/INTERRUPTED`；正常close后为`unknown/ABORTED`。两类原requestKey/runId/Workspace/task/input hash及完整快照指纹保持，重开后syntheticDispatches=0 |
| 重复/新请求与归属 | 重复原key只读返回原运行；新key拒绝`WORKSPACE_GENERATION_ACTIVE`，改输入/换来源拒绝`V340_RUN_UNRESOLVED`；另一Workspace为空。没有实际模型/API/上传/消息发送 |

UNKNOWN里的executor是明确的合成停留/取消窗口。它不是原生模型、网站API、当前0.1.3模型输出或Desktop运行中断的验收。fetch计数仅覆盖验证进程中该函数，不是OS级网络计量；没有读取网站认证。

## 3. 当前固定Desktop装配与恢复

当前主目录122源和R47采用来源相符，旁置candidate逐件相同；使用R47已核构建client SHA`ceebb8d3db6914ac25961533402f83db1a2c7706d5c9dc836606dbb2d9ca89b5`。原活跃lib保持。新Profile `.dsh-test/f-storage-owner-20261027`显式选择M06受控绝对文件入口、保留磁盘路径桥接和十条模型/账户/更新等禁用项；端口57543。固定pnpm11.8.0离线、冻结、忽略生命周期脚本物化。

固定App只读版本查询确认Electron44.0.0内置Node24.18.1、SQLite3.53.1；不能拿工具Node24.21.0替代宿主。初候选的精确24.21.0 engines元数据因此保留，最终R3另声明`>=24.18.1 <25`、重新物化并实际验证；不代表该范围内所有版本都通过。

有效最终准入为**R3/174项**，前后`--check`退出0。R3两次实际启动/正常CmdQ退出code0、一次同配对重启，原生`OWNER-GUARD-UNSENT`及业务`PUBLIC-DISCLOSURE-OWNER`、`ONLY-PREPARE-NO-GENERATION`保持。实际Desktop持锁时第二个使用相同R3后端的独立SDK Host被拒绝，未注册json、未打开域、零业务写入，原业务文件2523字节/hash保持。正常退出后独立SDK可重新取得根所有权且未改业务字节。最终57543关闭、入口锁释放。

本轮总共四次owned启动/退出均code0：前两次为归档R1/R2，后两次为最终R3。首次启动由固定Desktop自动规范化Profile：锁文件仅`autoInstallPeers:true→false`，原宿主源码613/626/663行可核；R1重启准入因此失败。运行前锁字节已按原pin精确恢复成副本，明确为事后恢复而非当时备份；运行后workspace/modules原件、diff及R2前R3快照保留。后续按既有hoisted/autoInstallPeers=false策略用固定pnpm重新冻结，不改旧准入。一次无TTY重物化失败、一次在装配尚未完成时提前check/start失败、R3首次Pin构造误包含原旁置pnpm cache而缺件的装配失败均保留；最终排除非运行输入的cache后才生成R3，不能借失败记录称通过。

第一次extension lock-only调用未显式隔离HOME且store参数是相对路径；实际生成的附属store在自有extension/.local下。后续物化全部使用私有HOME/cache、绝对store与固定工具；未将首命令改写成环境完全隔离。没有据此声称全面监测过所有HOME文件。

## 4. 新资源交付接续

剩余表的“尚无新包”已落后于具名交付。已只读核对R31资源采用、R37受控入口采用、R44实际Host准备/取消、R46可读性独立接受及R47主目录采用。相关报告SHA与具名返回一致；0.1.3 bundle SHA`26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca`由生产校验函数实际通过，含8生成资源、2个operator-only资格附件。

IC-SKILL提供方记录中的R29隔离消费状态是较早时点，由R31/R37/R47接续，未重写提供方历史。六原载体仍PENDING_EXCLUDED、18旧UID载荷排除；RULE-08-12-001-v1.1未决定义及原例外保持。现在已有受控候选及准备/取消证据，不能继续笼统要求“先提供Skill包”；仍缺真实消费/专业用户接受、规则未决处置和正式分发接受。普通默认入口、API来源及完整28来源开放状态不由本批改变。

## 5. 保全与未完成

状态写回前本轮3529项基线0缺失、0变化；本轮产品改动仅新增旁置通用包和测试，没有覆写昨夜M06代码。旧10月26日准入、独立报告及历史FAIL不重签。没有提交、推送、发布、额外扣费或对外投递。

同配对候选取得排他及离线进程恢复子集，不是强制所有旧Host采用后的发行保障；原生模型/API的UNKNOWN、结构化芯片/图片/Blob/旧附件冷恢复、固定审核版本普通/长稿内容交付仍缺。U1/D1的provider硬资源资格、新版API映射、真实双来源、专业/用户接受、G/H和阶段6继续保留。独立审计待出具。
