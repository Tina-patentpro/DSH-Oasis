# F-PL-A01修复增量独立处置

2026-10-28，Asia/Shanghai；由首审同一独立Codex代理复审。原明确派发配置为 `fork_turns=none`、`model=gpt-6.1-sol`、`reasoning_effort=max`（GPT6.1 Max）；服务端工具没有另回传运行时identity。本报告只接续[首轮FAIL](2026-10-28-f-profile-lifecycle-independent-audit.md)，其SHA `b056f05718bb89cf440ae753da2640206aeaff79361c292eda4652ff7e8baf1e` 保持，不改签原131成员/14链接或首轮反例。

**F-PL-A01在修订2具名入口及新根范围关闭；新增必改 Critical 0 / P1 0 / P2 0 / Minor 0。** 接受修订2的既存路径别名前置拒绝及本次固定无模型、同数据根生命周期子集；不把原失败入口或旧管理根补签为修复通过。完整F与发行相关未验项继续OPEN。

## 范围、治理与输入

本次在 `mac/continuity-v2`、HEAD `41d22c4f49f3b35abd527cfd1c40c6b64f3734a9` 上只审新增修复；未启动Desktop、未读迁认证/credentials、未作模型/专业API/费用调用，也未提交、推送或发布。独立测试只使用新建的私有公开夹具。没有重复原131全审或重跑旧GUI；原报告/清单和6项旧源码/返回身份另作有界保全核对。

恢复复审前，按EXEC-R2重新读取根/项目AGENTS全文、统一协同约定及登记路由、本项目对象，重新解析独立索引的整体和本项目`current_followup`，均仍为 `PLAN-PROGRESS-REFRESH-20261028-P28`。整体规划仍1.3.1／NS1-R1／P28、协同1.2.1，master_plan/path及锚点一致；当前状态仍从两个`role=current_entry`入口读取。其余相关原输入与首审身份相同，按相关P28/IC-ARTIFACT/恢复/权限条款定向重读，不冒充全部旧正文在本次再次全文读取。适用、仅身份核对及旧摘要未重读分别记录于 [修复复审前记录](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/preflight.json)，SHA `0bf0ebb5827e41d314aa042e9ce24be07cf2b5fbaf88f75b7c2ba63e0e33d279`。原范围授权继续有效，预存P28总计划与并行AGENTS排除本批收录。

决定前首次身份复核在两项并行文档变化处停止：独立索引SHA `3cdf54a709a7c9a05fbce61e2457f17444e95a989567833ff970004178ac5ffb` → `82b3f99921045fb6713aaf61734cff98d3ced249825540a25dee86641400172d`；兼容矩阵 `6f9e521afe6de2a23c17b42ce51afb821fd24266651206bcd06bd691183e05de` → `93a0f3ac50da3833f9491292a7f73a8bb1af14fe28a458018087bf31981c3b3c`。有界重读确认只新增`current_document_repair`及文档整改导航；原路由/计划/接续/角色依赖不变。相关ARTIFACT V0.2草案全文已读，仍未定稿、未双方签收，不覆盖既有已接受子集，也不改变本批固定源码/数据/许可。准确差异、新快照及适用理由另存 [最终治理追加记录](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/governance-final-addendum.json)，原preflight、131/109包均不改；无需重跑GUI或调用。

| 新增被审对象 | SHA256 |
|---|---|
| `scripts/f-profile-lifecycle-2.mjs` | `807010367e96630e36efc4c6e95338756c0223b3ee0bdac09ad6f7705f74ba2e` |
| `scripts/tests/f-profile-lifecycle-2.test.mjs` | `d2a77d92a8e1a9e00a2481294d3d14c95882d05d0455e468ea6562b33a71cc97` |
| `scripts/tests/fixtures/managed-profile-writer-2.mjs` | `1c6d056f764189546ecf15e3d1f95e7a402c91c2d628d6dde00fe006e318f444` |
| `patches/f-host-assembly/2026-10-28-profile-lifecycle-2.md` | `cb0b4309c3dabaccddd51524d9ed49869e2b9d3b09275a5c3a4ba48d3d117337` |
| [修复返回](2026-10-28-f-profile-lifecycle-repair-return.md) | `2a7e459270c9f91cd2c31747c929b1556d0673da350430307c10da61a71434e2` |
| [修复执行单](2026-10-28-f-profile-lifecycle-repair-execution.json) | `57f4683b89a2095ffa0695078b18d75ac28143914206b91abf60cf32b8e70d92` |

## A01关闭依据

源码差异限于新增共同数据根检查并在`checkManagedProfile`返回前调用，原两锁、维护JSON owner、Profile/准入、物化及切换逻辑保留。检查通过lstat拒绝既存根链接、悬空链接及非目录；对home/storages、sessions、attachments目录树的后代链接同样拒绝。它只遍历目录元数据，不读取数据正文/认证；缺根不创建。批准的Profile/node_modules链接仍按原准入处理。

独立用首轮的实际guarded SDK回调方案改入修订2，在两固定解释器分别运行：

- storages、sessions、attachments各测现存、悬空、后代链接，加userdata顶层链接，共10种公开路径状态。
- 每种状态对sdk/desktop/recovery/maintenance四角色调用；`checkManagedProfile`及writer都拒绝，40次callback全部0，实际guarded backend构造全部0，外部公开目录始终空，没有SQLite或业务JSON。若回调进入，原探针仍会用固定真实后端写入，因此没有把实际SDK负例替换成空回调。
- 缺失的三种数据根在check后仍缺失，无新增锁或目录；在正常目录中给公开数据正文读取安装失败探针，check通过且正文读取次数0。非目录原文件字节保持，四角色callback=0。
- 新控制记录含修订2脚本路径/字节，不含原入口身份；原controller对新根在source/policy阶段拒绝，callback=0、控制记录原字节不变，修订2仍可check。

结果见 [独立工具Node A01证明](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/A01-tool.json)、[独立内置Node A01证明](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/A01-embedded.json)及 [独立增量测试源码](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/independent-repair.test.mjs)。本审计没有真实Desktop启动；desktop角色结论限于共用准入回调边界。首轮source1的别名反例仍为FAIL，不能因source2修复而改写。

## 新根生命周期与证据

精确新根为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-profile-lifecycle-20261028-r2`；没有旧管理根迁移或userdata/认证复制。

| 新根版本 | 准入SHA256 | 独立核对 |
|---|---|---|
| 初始v3 `724ec489-d9db-4256-8eb1-fa1dde091f1f` | `9e8e5d747404fac488e2f96d7e0a57a50a41fbdd8100e014fb64e3b0de2509b7` | 195pin、版本快照/receipt一致；最终current返回该原release。 |
| GUI升级v4 `c5c61a34-3999-429f-8ab3-e448766c2245` | `74ec31acb57a91397c0338e57526fe836bf89c1b72faae27defafdeea016ce61` | 195pin、版本快照/receipt一致；不是新上游版本。 |
| 额外离线v4 `281a7d48-11de-42e4-b7d7-8285e170732a` | `226c1af6d32c1881ae26b6a0dd6c668fa1d2042338de33204432177d4dd29a1e` | 195pin、版本快照/receipt一致；只属全部应用退出后的无Desktop切换循环。 |

新增109常规成员和21相对链接逐项符合送审字节；三版历史Profile pin分别映射其immutable release/desktop核对，外部source沿原pin，未按快照物理目录错误解引用。原R7和旧准入不重签，新source2的controllerInputs与实际脚本相符。

已检查本次四份AX/PNG：v3公开原生/业务草稿，v4保持，V4之后两处编辑，以及回退v3后保留原生`EDIT-AFTER-V4`和业务“保留V4新增编辑。”。三个实际GUI退出收据均code0，属于作者已有真实操作证据的独立复核；本审计未重跑GUI。live busy记录是四角色/upgrade/rollback拒绝、callback0，原F CLI EEXIST/exit1及第二公共SDK的DSH_STORAGE_ROOT_BUSY/未注册后端；不扩大为任意旧writer保护。

额外离线循环具有独立三阶段实物，不能混作前三次GUI瞬时截图。workspace.json、oasis_workbench.json、f_lifecycle_public.json在before/after-upgrade/after-rollback三阶段逐字节相等，并与当前具名三文件一致；SHA分别为 `3e5df93fe4289d211b08a65ba1b233ce4435fe2ddd2f118c2910a23d85f64c60`、`b3efc63b83850c7fdb0669779782312850c75abae0c298dc9fea8530bba7566e`、`bb9e535f7c917127d9ccf215e244ec84cf44ca22ae785f6a9edd0a70a390381d`。公开UNKNOWN仍为 `F28-PUBLIC-R2`/dispatches0合成记录，不算真实模型/API UNKNOWN恢复。

公开IDB的6个具名快照成员也与精确live源目录逐字节一致：新根下 `runtime/userdata/Partitions/dsh-desktop-renderer/IndexedDB/http_127.0.0.1_57583.indexeddb.leveldb`。只读取这6个对应公开成员，没有扫描其他userdata/认证。000003.log包含原生草稿和V4后编辑的UTF-16标记。当前新根fresh `--check`为原初始v3/195pin、exit0；两实验根的四把启动锁均不存在，57583为ECONNREFUSED。这些结果见 [增量证据核验](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/evidence-verification.json)。

## 新鲜命令与结果

由zsh调度，以下runner保留实际完整argv/环境覆盖；固定App二进制始终以`ELECTRON_RUN_AS_NODE=1`仅作Node解释器使用。

| 命令 | 实际结果 |
|---|---|
| `python3 .local/f-profile-lifecycle-20261028/audit-independent/repair/run-repair-tests.py tool` | exit0；Node24.21.0，新2的11合同＋3独立测试，共14 pass/0 fail。 |
| 同runner参数`embedded` | exit0；实际内置Node24.18.1，同14 pass/0 fail。 |
| `python3 .local/f-profile-lifecycle-20261028/audit-independent/repair/verify-repair.py` | 最终exit0；109成员/21链接、3×195pin、三阶段三文件及6个公开IDB成员一致。 |
| 固定工具Node `scripts/f-profile-lifecycle-2.mjs --check /Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-profile-lifecycle-20261028-r2` | exit0；由证据核验器记录完整argv/输出，不启动Desktop。 |

实际Node测试argv为 `--test --test-reporter=tap scripts/tests/f-profile-lifecycle-2.test.mjs` 加本次独立 `repair/independent-repair.test.mjs`；没有重跑source1原测试或全scripts。作者新增119/119×两解释器日志与2条旧行为RED原样可核，本审计不把119计数当作全产品完成。

证据核验脚本初次使用未分区的userdata/IndexedDB位置，路径不存在而exit1；这是审计路径推断错误。取得作者精确公共partition来源后只改该源路径，最终exit0；初版脚本与 [路径错误记录](../../.local/f-profile-lifecycle-20261028/audit-independent/repair/verification-r0-path-error.json)保留，不将该查找失败登记为产品缺陷或扩展扫描认证。两套14项测试均首轮通过。

## 接受边界与下一交接

A01关闭仅限本报告准确source2、控制记录与新私有根；保留首审FAIL、原131执行单、旧source1和原双解释器反例。允许下一接收方依据用户既有范围办理该修复的本地收录，本报告没有自行执行提交或产生发布许可；预存P28/并行AGENTS继续排除。

保护仍为合作入口在检查时的路径准入及生命周期锁；未受控writer在检查后改路径、stock后端绕过、OS强制访问隔离/全writer发行保证未接受。签名App安装器、上游/跨平台升级、原管理根迁移、真实磁盘满/断电/强杀自动恢复、真实Host重传/模型消费与原生模型/API UNKNOWN、完整F及E/U1/D1/G/H仍OPEN。产品原剩余目标与原专业/用户/资金/发布门保持。
