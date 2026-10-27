# F跨Document租约与固定装配v4独立审计

审计日期：2026-10-27。审计席位：用户指定的GPT6.1 Max独立审计代理，单人完成，未派生代理。工作目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh。审计只读源码、具名原件及冻结证据，在新系统临时目录运行无网络探针；工作树仅新增本报告。没有启动Desktop、Host、Contender或浏览器，没有执行实际Profile seed/clone、读取或迁移认证、真实上传、原生retry/Send、模型/专业API/费用操作，也没有Git暂存、提交、改HEAD或推送。

## Strengths

- 租约只包装已有v3 binder，独占域准确绑定同浏览器分区/同源的workspace＋session；没有把内容hash当权限或引入业务数据库改造。未获锁、缺Web Locks及请求拒绝均在底层binder之前停止，原生编辑和传输接口不被租约替换。
- `dispose()`先停止订阅，再等原队列排空才释放租约；不确定drain保持租约至Document销毁。独立探针使用实际v4 helper、官方Controller/Store和待完成的`store.put`复核了该时序，超出了只用假binder计数的验证。
- v4转换依赖固定官方client的SHA与v2/v3精确转换，实际Controller区域与v3逐字相等；开发入口对checkpoint3/4显式选一，核版本、完整编译字节及实际物化，入口导入的v4源码在legacy选择下也进入必需pin集。历史v2/v3、失败及旧准入保全。
- 返回准确披露浏览器夹具失败和R2本地接收的不确定性，没有把srcdoc Documents称为两个实际DSH Renderer，也没有用R1重启给R2补签。

## Scope、输入身份与计划对照

**Base / 当前Head均为 `36048e352d4aed8ceb3f1625505e6240761678a9`，审查范围为该BASE上的未提交F增量。** 已读取根与项目AGENTS全文、协同README及登记表，按`dsh-oasis.progress_sources`核定两个current_entry，读取本批计划、当前剩余表及相关当前入口。此次是既定计划审计，没有另定计划或据中心文档产生执行许可。

| 冻结输入 | 独立复算SHA256 / 结果 |
|---|---|
| `docs/plans/2026-10-27-f-renderer-lease-assembly.md` | `457855950d2886083a1933bef0151ede155c52fb2561dd37b2e22f0b870afce9` |
| `docs/evidence/2026-10-27-f-renderer-lease-return.md` | `84a1f13731ab678202b989d4dba345319a881b4d1da04d1954f8ca130475e464` |
| `docs/evidence/2026-10-27-f-renderer-lease-execution.json` | `2bc7508e32743d5f9401185abb66a72f5a26264392117865911d9cb2de30d65d` |
| 最终R2 `.dsh-test/f-renderer-lease-20261027-r2/evidence/f-assembly.json` | `15434c315bc2cf0a1db421d5184a1b7c8de56f6dda27371360805368cb3fbdb0`；42573字节，198pin全部一致 |
| 本批执行单152成员 | 全部bytes/SHA一致，0缺失/0漂移 |

本批计划所列租约包装、不同key、授予前编辑/归属/dispose、失败关闭、排空后释放、精确v4及显式装配均有实现和定向证据。实际浏览器完成的是同源独立Document helper层；R2重启零重传未获接受，实际多DSH Renderer/强杀/全写入方发行及完整F仍开放。计划冻结时的未勾项、待审措辞由本报告接续，不改原计划和返回。

独立核对`.local/f-renderer-lease-20261027/planning-inputs.json`中的14项当前原件与快照SHA，均与执行单相等；这证明本批输入身份保持，不声称重新审计了全部跨项目业务。协同1.2.1、整体规划1.3.1 NS1/R1及既有DS-04/F、IC-ARTIFACT边界没有被本批缩减。

## Issues

### Critical / P1（Must Fix）：0

未发现本批增量中有证据支持的P1缺陷。

### Important / P2（Should Fix）：0

未发现可复现的新增P2代码缺陷。下文R2未知观察是明确未接受的运行结论，不能算通过，也不能在缺乏因果证据时把它改写为已定位的v4缺陷或用户操作。

### Minor（Nice to Have）：0

没有影响本批限定接受的新增Minor项。

## 独立技术核验与可复现结果

| 检查点 | 文件及一基行号 | 实际结果 |
|---|---|---|
| 同key失败者不读/恢复/写 | `patches/dsh-0.2.0-rc.2/draft-checkpoint-lease.mjs:10`、`:18`、`:22` | 锁名包含workspace/session，`exclusive + ifAvailable`；无锁回调在`bind(options)`前退出。实际helper探针中失败者get/put/restore全0，失败者继续编辑亦不自动接管 |
| 不同key独立 | 同文件`:10`；`scripts/tests/draft-checkpoint-lease.test.mjs:22` | 不同workspace或session可各自进入；真实浏览器receipt中三组分别1次read/1次write，无互相拒绝 |
| 授予前编辑、归属变化及dispose | lease文件`:6`、`:20`、`:37` | 进入底层前复核fingerprint、currentWorkspace和stopped；独立实际helper三组全为get/put/restore=0 |
| 无能力、请求拒绝 | lease文件`:17`、`:33` | 只通知恢复暂停，未调用底层binder；相关两解释器测试通过 |
| dispose时仍有写入 | lease文件`:23`至`:32`、`:37`；原helper `draft-checkpoint.mjs:85`、`:134` | 实际helper待完成put期间dispose，新的同key协作者仍零底层动作；put完成后closed才结束，明确新binder随后恢复新提交的`PUBLIC PENDING` |
| 异常drain | lease文件`:26`至`:30`；测试`:42` | 拒绝的flush不释放锁，新协作者仍不能进入；这里是包装器受控异常测试，未冒充生产数据库异常实测 |
| 固定官方输入与v4实际artifact | `conversation-draft-checkpoint-4.mjs:5`至`:15`；`conversation-draft-checkpoint.mjs:4`至`:7` | 官方原client SHA受检查，重复应用/一字节漂移拒绝；独立断言生成v4与物化`conversation4/lib/client.js`全文相等 |
| Controller/人工重试守卫 | 实际`conversation4/lib/client.js:3710`、`:3721`、`:3818`；固定转换器`:13`至`:37` | 独立提取官方class region，v3/v4逐字相等；恢复为error无receipt，Store无关通知和A/B重绑定不调用假传输；显式retry才产生一次synthetic调用，随后再重绑定撤销ready/receipt |
| 准入与导入pin闭包 | `scripts/f-development-assembly.mjs:22`、`:36`、`:41`、`:65`、`:121`、`:136` | checkpoint3/4双选拒绝、v4请求拿旧包拒绝；legacy删v4导入源pin亦拒绝；最终R2只读`--check`退出0、198pin、materialized=true |

独立旧新对照使用**实际**`nativeCheckpoint3Source()`及`nativeCheckpoint4Source()`，不是只跑新增测试中的pass-through替身：旧v3同一记录两个binder均恢复，A写后B写最终为`PUBLIC B`；新v4同key后入者零get/put/restore，原owner的待提交写完成前不得接手。官方Controller以固定SDK真实class/Store执行，fileUpload仅为内存假服务，没有浏览器/HTTP/Host调用。

独立探针保存在新临时文件 `/var/folders/km/3w7qnmbn7_v95s271d713smh0000gn/T/oasis-lease-independent-audit-9wh09btd/probe.mjs`，SHA256 `a540bb80a49234c46d9cc43fd31aa229ebed428bc7e18ad96e8af23720293404`。六组分别为旧v3双写、新v4实际队列drain、授予前edit/move/dispose及恢复/通知/rebind/显式synthetic retry；两解释器各6/6 PASS，`realNetworkCalls=0`。临时文件不进入版本控制。

本次新鲜命令及退出结果（均在当前根目录，以zsh执行）：

```zsh
./tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap scripts/tests/*.test.mjs
# exit 0；95 tests，95 pass，0 fail/cancelled/skipped

ELECTRON_RUN_AS_NODE=1 './.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap scripts/tests/*.test.mjs
# exit 0；95 tests，95 pass，0 fail/cancelled/skipped

./tools/node-v24.21.0-darwin-arm64/bin/node /var/folders/km/3w7qnmbn7_v95s271d713smh0000gn/T/oasis-lease-independent-audit-9wh09btd/probe.mjs
# exit 0；v24.21.0，6组PASS

ELECTRON_RUN_AS_NODE=1 './.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' /var/folders/km/3w7qnmbn7_v95s271d713smh0000gn/T/oasis-lease-independent-audit-9wh09btd/probe.mjs
# exit 0；v24.18.1，6组PASS；Electron仅作Node解释器

./tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --check .dsh-test/f-renderer-lease-20261027-r2
# exit 0；F_ASSEMBLY_PREFLIGHT_ONLY，198pin，materialized=true，realCallBudget=0

git diff --check
# exit 0
```

95项中的固定pnpm正例仅在测试自建临时目录用私有HOME、pnpm11.8.0、offline/frozen-lockfile/ignore-scripts物化；没有安装或改写主依赖/日常Profile。原1480业务、54依赖及构建/pack本批没有重跑，不标成本轮通过。

## 浏览器与Desktop证据裁定

### 真实浏览器helper层

已审阅当前`renderer.mjs`、`cases.mjs`、保存的R0/R1导航夹具、回执0/1及截图/AX。receipt1的四组与源码动作一致：旧v3双恢复/最后B；v4同key失败者0读写恢复且关闭owner后不自动接管，明确新Document可恢复owner提交；不同workspace/session独立；真实IDB put请求成功但事务保持未提交时移除owner Document，等待公共锁回收后由新Document读取。

最后一组旧记录仍为`COMMITTED`、File仍为21字节`PUBLIC COMMITTED FILE`，localStorage fence为`UNCOMMITTED`；新owner0恢复/0写入并通知不可用。夹具显式构造未提交事务窗口并检查提交字节，这支持“该Document终止没有补认未提交事务”，不支持真实DSH进程SIGKILL或所有数据库崩溃模式。原导航停滞与receipt0的`document load timeout` FAIL保留；receipt0仅完成v3反例，不能算四组通过。审计没有重开浏览器，实际浏览器结论以冻结原始回执及可检查夹具为证，不称为审计现场重跑。

### R1与R2分开接受

R1首次冷A、A/B/A及正常重启的展开proof有直接Session/workspace ID：A为`session-afaffbc1-9b24-4447-a7fa-98f0daef6428` / `71120098-c4d4-4075-bddd-49e1371eb8f7`，18字符/2附件；B为原`session-0e35957c-8730-4ddd-9761-c570ab1cc6cc` / `e4d5099d-15e2-4918-9ca8-81f97a61a920`，0/0。失败待人工重试、Send禁用，R1未产生Host attachments文件。R1是旧准入保留的同版v4运行证据；其入口pin闭包后续加固另建R2，不能把R1准入改签为R2。

R2首次冷A的AX/图片支持原Session、18字符/2附件、error待重试和Send禁用。R2重启后保存的`native-R2-unexpected-ready.ax.txt/png`支持两待发送文件和Send可用，proof此时折叠，不能由这张图单独补认当时Session ID。实施者记录重启早期曾为error，但该时点没有独立保存的AX；“操作proof期间CUA提示用户改变应用”也是冻结观察记录，不能据此认定是谁触发上传。

**R2已发生两件公开文件向新隔离本地Host的接收事实，四个named/object副本均实际存在且hash相等，不能写成全批uploads=0。** 普通96字节/SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`，长稿449990字节/SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`，记录时间分别为12:01:42.527Z与12:01:43.567Z。实际固定FileUploadRuntime `lib/client.js:62`、`:179`为页面相对的`api/session/uploadFileBinary`，页面origin为`127.0.0.1:57583`；此处的本地Host接收不能升级为专业API/模型收到文件或真实费用结果。

静态核对及上述实际v4 class/Store假传输探针没有复现恢复、无关发布或rebind自动变ready；这些结果也没有排除未捕获的运行调用路径。**不把触发归因于用户、实施代理、v4代码或seed；R2本地接收触发/因果及“重启零自动重传”均维持UNCONFIRMED。** 用户是否手动retry在本报告形成时没有确认答复。原R2观察及实物必须随状态接续保留。

四个具名Desktop退出记录均code=0/signal=null，最终R2准入仍一致；只读`lsof -nP -iTCP:57583 -iTCP:57603 -sTCP:LISTEN`无输出、exit 1（无监听）。审计没有为补齐R2观察再次启动。

## 保全与差异

对`.local/f-renderer-lease-20261027/baseline.json`的3574项独立逐文件复算，仅以下三条与BASE不同，符合执行单声明：`patches/f-host-assembly/README.md`、`scripts/f-development-assembly.mjs`、`scripts/tests/f-development-assembly.test.mjs`；各自BASE字节/hash可由指定Git对象精确恢复，3571项其余文件保持。旧v2/v3、业务源码/锁、历史报告与准入均包含在该保全关系中。另按首轮旧附件执行单`originalPublicFiles`的准确17条路径重算，17/17一致；本批14项规划输入及快照均一致。未删除或改签旧失败。

## Recommendations

接续当前入口时只关闭本报告接受的代码、helper与具名装配子集；保留R2“观察到本地接收、触发未知”的独立字段，不能沿用通用`uploads=0`汇总掩盖它。用户补充操作信息或未来获准的最小运行取证可另作新记录，不回写本批冻结返回、准入和失败。没有要求为本报告另增真实传输或运行预算。

## Declined to judge

- **R2重启零自动重传及触发者/调用链：不裁定通过或已定位故障。** 有实际本地接收和ready实物，缺变化前独立AX及触发跟踪，用户答复未确认，当前纯Node探针不能恢复该次运行因果。
- **两个实际DSH Renderer/OS进程SIGKILL、跨平台、不同origin/partition/Profile、BFCache等生命周期覆盖：不裁定。** 浏览器证据是Chrome同源srcdoc独立Document，审计未启动实际运行，不能外推。
- **全写入方强制互斥、旧不守约版本及临时seed的跨Renderer安全：不裁定为已完成。** 新租约是协作binder边界，旧seed仍为已审单Renderer观察fixture，发行强制接续尚缺。
- **真实通用文件重传/模型接收、0.1.3模型/API UNKNOWN恢复、外传与费用结果：不裁定。** 本批禁止真实调用，Controller探针为内存假传输，本地Host接收也不构成这些出口。
- **双存储均不可更新、任意孤儿归属/自动迁移、干净安装/升级降级回退/签名发行、超150000固定文件引用：不裁定。** 没有对应本批具名完整验证，继续沿剩余表OPEN。
- **1480业务/54依赖、构建pack及整个F或DS-05后续出口：不重新裁定通过。** 此次只重跑受影响脚本95项和6组独立探针，未变输入的前批证据保持其原范围。

## Assessment

**Ready to merge? Yes，限定为本批无真实调用的代码与具名开发装配增量，可依既有授权分批本地提交；不授权推送或发行。** 新增必改计数：P1=0、P2=0、Minor=0。

**可接受范围：** 同源/同分区、协作v4 binder的workspace/session单owner与排空后释放；精确固定v4转换、显式checkpoint4及198pin物化准入；冻结真实浏览器独立Document/未提交事务中断helper子集；R1具名冷恢复/A-B-A/重启与R2首次冷恢复的原始事实。**R2重启零自动重传及触发因果不接受、保持UNCONFIRMED；完整F及上述发行/真实运行出口仍OPEN。** 此限定不把未知观察删除，也不要求凭未知而编造代码修复。
