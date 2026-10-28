# F受控Profile生命周期独立审计（首轮，FAIL保留）

日期：2026-10-28，Asia/Shanghai。审计者为本轮新派发的独立Codex代理 `/root/audit_f_profile_lifecycle`；本次 **GPT6.1 Max** 的明确派发配置为 `fork_turns=none`、`model=gpt-6.1-sol`、`reasoning_effort=max`（父执行者返回的实际spawn参数）。服务端工具未额外回传运行时identity，派发配置与运行时身份证明分开。审计基底为 `mac/continuity-v2`、`41d22c4f49f3b35abd527cfd1c40c6b64f3734a9`。

**首审结论：FAIL，新增 Critical 0 / P1 0 / P2 1 / Minor 0。** F-PL-A01尚未关闭，不能接受“所有本入口支持的writer均具有完整路径准入保护”。固定无模型Profile物化、两锁排他、具名同根v3→v4→v3、原数据保全及失败关闭的下述子集可限定接受。完整F与全writer发行强制接续继续OPEN。

## 本轮范围与执行前复核

只读审查作者源码/送审证据，运行无模型定向测试及本人私有公开夹具；未启动Desktop、未读取/复制认证或credentials、未发真实模型/专业API/费用请求，未提交、推送或发布。作者源码、冻结证据、既有Profile及数据根均未修改。唯一新增正式文件为本报告；审计脚本、日志与新私有Profile全部位于：

`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-profile-lifecycle-20261028/audit-independent/`

已按当前根/项目AGENTS的EXEC-R2，在实质测试前重新读取根规则全文、协同约定、登记表，解析整体规划1.3.1／NS1-R1／P28、独立索引与本项目master_plan/path。整体`next_steps_supplement.current_followup`已按同对象followups绑定为 `PLAN-PROGRESS-REFRESH-20261028-P28`；本项目同ID的path/anchor为总计划的 `oasis-plan-progress-p28`。两处`progress_sources`的`role=current_entry`用于当前状态；历史FAIL、未知、限定接受和未验边界保留。

实际时间、绝对路径、原字节SHA、快照及逐项读取范围见 [独立执行前记录](../../.local/f-profile-lifecycle-20261028/audit-independent/execution-preflight-audit.json)；决定前身份重核见 [最终身份记录](../../.local/f-profile-lifecycle-20261028/audit-independent/final-identity-check.json)。前者SHA为 `4803de46d8567d3164a0993af0594a0ecb7f86a60ada60719818f33bef944325`。正文选段、仅身份核对和未重读的旧正文已分别标明，没有把目录/摘要/hash当作全文已读。整体/本项目NS1与P28均绑定父文件完整字节；旧研究补充的职责/来源边界部分适用，其旧项目数与迁移观察由当前登记/P28接续；11类接口草案不提升为已签收标准。

与作者R2追加记录可比的15项身份相同；本轮初次独立复核没有旧独立批准基线，不补造“历次均无差异”。作者初始15份快照与Task1–2之后的 `execution-preflight-r2.json` 分开保留：静态快照证明当时字节身份，不能独立证明作者在并行EXEC-R1/R2插入前读过后插入的全文。本次不追认该历史读取时点，不因治理记录变化要求重跑旧GUI或产生新调用许可。预存总计划P28与并行AGENTS修改保全，排除本批提交。

## 被审准确对象

| 对象 | SHA256 |
|---|---|
| `scripts/f-profile-lifecycle.mjs` | `23a36db2906d9bea430bd75c21e4351cb9c98edfd45d1df911271aa23d6a1395` |
| `scripts/tests/f-profile-lifecycle.test.mjs` | `e02ee22fb468fb4503dc62f2bbeda82d037adb247762b980d372b826492a8841` |
| `scripts/tests/fixtures/managed-profile-writer.mjs` | `e6ecbd1941a0ff3185aa2967ceab210a4813e5c5ab1b7b0fad165c70e52bfe3e` |
| `patches/f-host-assembly/2026-10-28-profile-lifecycle.md` | `e1fb9472a7127df8bb5798cf5400c2a264862b7b9a69ca4a86e21e7e1d66e342` |
| [本轮计划](../plans/2026-10-28-f-profile-lifecycle.md) | `600f7940969f8c33691aa6906b09844d70a297e63218bad475d12caedc2431cb` |
| [作者返回](2026-10-28-f-profile-lifecycle-return.md) | `9d9683bf92597cfd0b5c9145d4a899c415485bf8c8279f32d450c5b9cbdeb6b7` |
| [131成员执行单](2026-10-28-f-profile-lifecycle-execution.json) | `40a7a194477dd9096d308c59f5c58ba697619e6820164573e67cb74380698a30` |

旧装配器/补丁/产品及依赖未由本增量改动；控制器还校验固定源和pnpm身份。新源码与原准入均在送审身份下评判，不使用修复后的字节回签本报告。

## F-PL-A01 / P2：通用writer准入允许存储根链接，受保护SDK可写出管理根

位置：[f-profile-lifecycle.mjs:60](../../scripts/f-profile-lifecycle.mjs#L60)、[f-profile-lifecycle.mjs:75](../../scripts/f-profile-lifecycle.mjs#L75)，对照维护专用检查 [f-profile-lifecycle.mjs:118](../../scripts/f-profile-lifecycle.mjs#L118)。

`checkManagedProfile`验证管理/runtime身份、活动Profile、版本快照、准入与固定装配，但未检查 `runtime/home/storages` 的既存链接。`withManagedWriter`在该检查通过后即进入desktop/sdk/recovery/maintenance回调；canonical检查只在upgrade/rollback内部的`directory(...home/storages)`发生。`makeLaunchSpec`检查home等顶层目录，也未检查这个下层链接。

独立反例在全新私有Profile中把 `home/storages` 链接到另一个公开临时目录；没有使用作者根或真实数据：

1. `checkManagedProfile`接受该Profile。
2. 四个role的callback都进入，各自进入时管理根与runtime启动锁均真实存在；callback次数为4，而非0。
3. sdk回调使用**当前固定的受保护JSON后端**，实际在管理根外创建 `.dsh-json-single-owner.sqlite` 和 `audit_alias_public.json`，公开global字段写入成功。
4. 同一根的upgrade维护入口随后拒绝该链接。说明原9项中的维护负例不覆盖通用writer边界。
5. 对同一公开根只构造`makeLaunchSpec`也成功；本审计没有调用Desktop spawn。desktop角色结论限于回调/launch spec已获准入，真实Desktop外写未运行。

两固定解释器均复现，探针退出1并保留为业务反例：

- [探针源码](../../.local/f-profile-lifecycle-20261028/audit-independent/alias-writer-probe.mjs)，SHA `53178b75de43229a188120ee87a1b9abb878841d67b5e7f8e82560262a687a34`。
- [工具Node结果](../../.local/f-profile-lifecycle-20261028/audit-independent/alias-writer-tool.json)，SHA `f79d60b3361a0a6163c4ed1b08cd98f5a379fd0cefd713d1ccf0475ff3b568bf`。
- [内置Node结果](../../.local/f-profile-lifecycle-20261028/audit-independent/alias-writer-embedded.json)，SHA `e2f440580a97bb9922088bc9235655c36dbe0065b4e626ad0f3c834148fe56e1`。
- [只构造启动参数的结果](../../.local/f-profile-lifecycle-20261028/audit-independent/alias-launch-preflight.json)，`spawned=false`。

这项发生在声明支持的合作SDK入口及实际guarded backend，不能归入已经保留的stock无保护writer限制。路径误指向其他项目存储时，可能修改错误项目的JSON，启动锁不能提供路径归属保证。

建议在任何受支持writer回调及启动前统一校验其既存JSON数据根为管理runtime内的规范无链接路径；只读check不应因此创建存储目录。修复需覆盖现存有效/悬空链接、父层链接、四角色callback=0、外部目录零新成员/零字节变化，以及原维护与已有JSON owner拒绝。保留本首审与反例，另版修复/复审；不只更新expected hash或重签原131成员。

## 可限定接受的子集

| 子集 | 独立核对结果与限制 |
|---|---|
| 固定物化/新根安装 | 原9项在Node24.21.0和实际Electron Node24.18.1各9/9、exit0。实际固定pnpm11.8.0离线、冻结锁、ignore-scripts，独立私有HOME/cache/store。复用195pin无模型组合，没有手写依赖元数据或注册测试fixture。 |
| 启动互斥 | 管理根与runtime锁均在正常回调前取得；独立runtime-only旧入口锁可拒绝四角色及upgrade/rollback，callback=0且失败取得第二锁后释放第一锁。原跨进程/SIGKILL测试通过；遗留锁保守拒绝，未按PID自动偷锁。此接受不覆盖A01路径漏洞，也不是OS强制阻止任意writer。 |
| JSON已有owner | 维护原测试拒绝现有真实JSON owner；独立实际Cordis/Storage SDK亦在guard拒绝时未注册json backend。另在独立公开根证实stock后端仍可绕过，保留这一限制，不作全writer接受。 |
| 同根升级回退 | 原v3 `fb52fc94-f399-4fea-97c6-0467d1d84c35` → v4 `83d0b087-e88a-4b5a-989b-1f0263a75cae` →原v3，runtime/home/userdata身份不变。版本快照/receipt未因回退重写；current冲突、坏快照拒绝，未知请求没有重派。只限已审自有checkpoint v3/v4，不是上游App安装器或版本升级。 |
| 数据保全 | 精确读取131成员内三份存储、切换前公开字节副本及即时证明。升级前后各三文件SHA一致，回退前后各三文件SHA一致；v4后业务编辑在最终存储/AX仍有“保留V4后新增编辑。”。公开IDB快照含原生UNSENT-V3与PUBLIC-EDIT-AFTER-V4的UTF-16标记，四份PNG/AX已检查。未扫描整个userdata。 |
| 失败关闭 | 原pnpm进程边界失败恢复原Profile/准入；独立把故障移至current提升阶段，已创建新release后仍恢复原current和准入，公开JSON/userdata哨兵不回退。初次物化失败无可用current；恢复复制失败写RECOVERY_REQUIRED且四角色拒绝。该注入不代表真实磁盘满、断电或自动崩溃恢复。 |
| 证据/旧字节 | 本轮131常规成员、14链接全部一致；两release各195pin一致；旧109/54/152成员及17公开原件全部一致。原FAIL、旧准入、R7及历史实验不重签。 |

两版准入的历史`runtime/home/profiles/desktop`前缀分别映射其immutable release/desktop后复算；外部source仍按原绝对路径核对。各receipt保留原相对链接，快照不作为可直接运行的新安装位置。v3准入SHA `873aeac9f780a0d55ccbdd1cfdb508d20686c00c35e6de96fb58a844fd5312b5`，v4准入SHA `4d1cd83dffe713cdf5df16b5aa3045b8b5b11f1ee3d54d1d4e2c31672f693cd4`。当前作者根仍为原v3，新鲜`--check`退出0；该通过本身不覆盖A01。

作者实际3次GUI的退出文件均为code0且原字节一致，四份AX/PNG与数据相互支持具名草稿观察；这是审查已有实际证据，本审计未重跑GUI。作者完整受影响scripts日志各108 pass/0 fail可核，本审计只独立重跑相关9项及必要反例，未把108计数当产品完成。

## 实跑命令与退出码

以下均由zsh环境调度；Python runner只负责环境/日志与退出码，不替换固定解释器。`ELECTRON_RUN_AS_NODE=1`的App二进制仅作Node解释器使用。

| 实跑命令/边界 | 结果 |
|---|---|
| `python3 .local/f-profile-lifecycle-20261028/audit-independent/run-tests.py tool` | exit0；实际固定Node `--test --test-reporter=tap scripts/tests/f-profile-lifecycle.test.mjs`，9 pass/0 fail。 |
| 同runner参数`embedded`，实际固定App二进制加`ELECTRON_RUN_AS_NODE=1` | exit0；同9 pass/0 fail。 |
| 两解释器 `--test --test-reporter=tap .local/f-profile-lifecycle-20261028/audit-independent/independent.test.mjs`（R0） | 各exit1、5 pass/1审计夹具断言失败；通过的5项保留。 |
| 两解释器 `--test --test-reporter=tap '--test-name-pattern=failed restore' .local/f-profile-lifecycle-20261028/audit-independent/independent.test.mjs`，`AUDIT_PROBE_SUFFIX=-r1` | 各exit0、1 pass/0 fail；精确恢复故障注入与拒启动出口通过。 |
| `tools/node-v24.21.0-darwin-arm64/bin/node .local/f-profile-lifecycle-20261028/audit-independent/alias-writer-probe.mjs`及固定内置Node运行同脚本 | 各exit1；F-PL-A01实际反例，不计为通过。 |
| `python3 .local/f-profile-lifecycle-20261028/audit-independent/verify-evidence.py` | exit0，精确131/14、195×2、109/54/152与17一致；[结果](../../.local/f-profile-lifecycle-20261028/audit-independent/evidence-verification.json)。 |
| `tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --check /Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-profile-lifecycle-20261028` | exit0，当前v3/195pin；输出保存于独立目录author-current-check.stdout.json。 |

独立补测首轮夹具把首次复制故障与恢复复制次数混在一起：首次copy抛错后，恢复先因目标已不存在而在rm处失败，已正确写入RECOVERY_REQUIRED；我误断言会调用第二次copy。R0源码、双exit1日志及两份私有现场均保留，未归为作者产品缺陷。修正注入为“新Profile首次复制成功→实际pnpm调用失败→恢复复制失败”，只重跑该项，两解释器均通过。详见 [harness-failure-r0.json](../../.local/f-profile-lifecycle-20261028/audit-independent/harness-failure-r0.json)、`independent-r0.test.mjs`、`independent-{tool,embedded}.log`与`independent-{tool,embedded}-r1.log`。A01则是独立于该夹具错误的新实质发现。

独立目录保留所有runner的实际argv、环境覆盖及退出码；不存在把失败输出改成通过或删除首轮反例的处理。最终时57583连接返回macOS ECONNREFUSED，两作者启动锁均不存在；本审计没有遗留运行中的fixture子进程。未改动或自动删除用于失败关闭证明的私有残留锁/RECOVERY_REQUIRED现场。

## 未验与后续交接

F-PL-A01需先修复，再独立复审其新字节与受影响路径测试；当前只有上述子集可接受。作者冻结返回/计划中的待审文字由本报告接续，不能据部分通过进行无条件F收口或接受源码批。

仍未验：任意不守约writer的OS强制保护与发行接续、签名App安装器、上游/跨平台升级降级、真实磁盘满/断电/自动强杀恢复、多个实际Renderer、双存储均不可更新、真实Host重传/模型消费及0.1.3原生模型/API UNKNOWN。公共KV UNKNOWN `F28-PUBLIC`/dispatches0仍为合成公开记录，不冒充原真实请求。完整F、E映射、U1/D1、G/H、专业/用户接受与发布继续按原入口独立开放。

本报告首审FAIL冻结后不覆盖；修复增量另建返回、清单及独立处置，保留131成员原件和这次双解释器反例。后续任何本地提交只按用户本轮既有范围与最终复审结果办理，预存P28总计划及并行AGENTS不随本批收录；本审计不执行Git提交。
