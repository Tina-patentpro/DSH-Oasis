# F存储单所有权与进程恢复独立审计

**结论：接受本次R3同配对候选的本地JSON根单所有权、实际公共SDK/业务服务合成UNKNOWN进程恢复及无模型Desktop正常重启子集；未发现阻止这些限定子集接受的新增P1/P2。完整F和全目标未完成。** 原无保护后端双写反例继续FAIL；旧Host仍能绕过该协作式元数据锁。原生模型/API的UNKNOWN、附件完整冷恢复、固定审核内容交付和发行保障未接受。

模型配置按本轮既定调度声明为 **GPT-6.1-sol / max**，没有切换模型，也不从输出推断后端。审计者未参与实现；仅新增本报告，不修改实现、状态、pin、作者原件或既有独立审计，不提交或推送。

## 1. 范围、读取与输入身份

工作根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`。依据[本轮计划](../plans/2026-10-27-f-storage-process-recovery.md)、[设计](../superpowers/specs/2026-10-27-storage-json-single-owner-design.md)、[返回](2026-10-27-f-storage-process-recovery-return.md)及[执行清单](2026-10-27-f-storage-process-recovery-execution.json)，本次只审新增四个旁置包成员、定向测试/子进程夹具、R3配对与相应进程/GUI证据；具名R31—R47只接续交付进展，不重审其他项目全量。

首读时间为`2026-10-26T23:59:46.055364Z`；97项/174pin/3529基线比对为`2026-10-27T00:01:46.975741Z`；主文稿最终重读为`00:07:14.764129Z`，身份未变。以下SHA均为SHA-256：

| 输入 | 字节 | SHA |
|---|---:|---|
| `docs/evidence/2026-10-27-f-storage-process-recovery-return.md` | 7779 | `13965b5964709cb86bc684ee619b64f74220c2524f4bc85c2c28286bed2a5890` |
| 同名`-execution.json` | 100957 | `58e48d28c3710d5a9051a3f796e1ab096e5feeed733d173b7256440e3435e214` |
| `docs/plans/2026-10-27-f-storage-process-recovery.md` | 4186 | `05251409ef551628dd2a3a28925ccd7ee9671a5c909191e4031f2f40fd45a3b7` |
| `docs/superpowers/specs/2026-10-27-storage-json-single-owner-design.md` | 3869 | `abfdc48e0f03deca190af37f6667f6b8146ec8c3393eb4361f211cfa47d53f52` |
| `patches/storage-json-single-owner/ownership.mjs` | 1902 | `a20aab2a54f321ca4947d8a9f6210e1c568f80b05c7921f481a97690fcbbedab` |
| 同目录`index.mjs` | 1475 | `9d1c8da0ed70accc2b679bccbfc72c9a353f96573155fbef0951ff4df5c71bdc` |
| 同目录`package.json` | 551 | `93d345e12046679171a22f9e126fe1d13caf4ea65e028f8552f527fd39b8bbbc` |
| 同目录`cordis.patch.yml` | 181 | `31615b60872e71f2e4e729e0929da02ec35d6b5ce3543cb763a02382ec6b4cd9` |
| `scripts/tests/storage-json-single-owner.test.mjs` | 5709 | `b9c66cc18c1a8492617991eab6d4c7bd08e72839bc8de33dae6872976f8f92e2` |
| `scripts/tests/fixtures/storage-json-owner-child.mjs` | 452 | `62eace1782db431b92628b0d9b3b53484f6e4798c28cbf434cff7946db4e3d01` |
| 私有`f-host-admission-R3.json` | 63286 | `f839f347f035ee00b15f953338936fa49207b0acec98e8dd751605493db1e094` |
| 私有`launch-R3.mjs` | 2952 | `54e12774cda058a819386ae74c1c4dce4f12055f974ee8d0e8795a818d1f7904` |

私有证据根为`.local/f-process-recovery-20261027/`。独立读取执行清单全部**97/97 members**，实际大小和SHA均匹配；新准入全部**174/174实际文件**匹配。未把作者的accepted布尔值作为唯一证据。

本审计执行的测试仅创建并清理自己的临时目录/子进程。没有运行作者会写回私有原件的run/worker证明脚本，没有启动Desktop GUI或DSH Host，没有安装、模型/API/外部上传/发送或读取凭据。Electron仅按获准的`ELECTRON_RUN_AS_NODE=1`运行测试。GUI结论来自保存的截图/AX、启动/退出文件和合成业务存储，不冒称审计者亲历操作。

## 2. 实现与边界判断

| 要求 | 代码/公开SDK与证据 | 判断 |
|---|---|---|
| 真正跨进程竞争 | `ownership.mjs:9—24`要求绝对root，mkdir/realpath后在canonical root专用元数据上持有`BEGIN EXCLUSIVE`；工具Node及嵌入Node的独立子进程竞争均拒绝 | 接受本机已验本地文件系统上的同配对writer排他，不是单进程Set或入口锁替代 |
| 业务JSON及owner保持 | `index.mjs:8—14`取得所有权后才构造固定公开JsonStorageBackend，所有kv.open委托它；patch禁用原storage-json行后使用原root配置注册json | 未另造业务存储、修改记录编码或增加第二设置owner；SQLite只承载所有权元数据 |
| 关闭排空 | `index.mjs:15—20`缓存close promise，await原backend.close后才release。实际SDK JsonStorageBackend第562行拒绝closed后的open，第583—586行等待opening及unit.close；unit关闭等待inFlight | 活跃写入/打开必须先完成排空，不能先放锁再等写入；第8项测试实际持有未完成close时竞争仍失败 |
| 异常释放 | 构造失败先release再抛出；注册/提供失败分支unregister自己的注册、close后抛出；SQLite打开/校验失败关闭自己连接 | 不因失败退回未保护后端；第9项实测构造失败后新进程可取得所有权 |
| 排空失败 | 代码明确只在await成功后release | 排空reject时故意保留所有权，直到进程退出；不能把“所有异常立即释放”作为通过条件。该分支本批为静态核对，不冒称9项测试已实测reject |
| 路径/外来文件保全 | 先wx创建、不覆盖已存在文件；lstat拒绝链接、非普通或多硬链接，打开后核dev/ino/nlink；不删除旧文件或按PID/心跳抢占 | 别名、预置符号链接及非SQLite字节保全有实际测试；多硬链接/非普通分支为代码可核，不扩写成全部恶意替换攻击实证 |
| 原owner冲突 | 固定公开BackendRegistry.register第46行在已有json时抛duplicate-backend；本包不替换注册表，catch不调用旧owner的disposer | 冲突路径静态成立，且新Profile明确禁用旧owner；不把根锁竞争测试冒称重名注册的独立动态用例 |
| 无静默fallback | builtin SQLite缺失/非SQLite/忙锁/初始化失败均抛出；原ownerdisabled，本包失败不注册json，不调用旧后端作为备用 | 接受当前候选的失败关闭逻辑 |

该协议是**协作式的**：所有同根writer必须使用此配对后端并保全其元数据。旧无保护Host根本不检查SQLite锁，仍可写JSON；有权限任意删除/替换元数据者不因本包得到强安全隔离保证。本次没有NFS/SMB/云盘、多用户对抗、所有操作系统/中间Node版本或全部发行writer强制采用的证明。普通文件权限/SQLite锁不能被描述为新的OS沙箱。

原公开JsonStorageBackend业务字节、storage/domain SDK未改。R3实际解析的Cordis/storage/storage-json包及JS成员在174项内，其SHA与固定App SDK原件对应一致；使用的是公共BackendRegistry、JsonStorageBackend和storageBackendServiceKey，不读私有store或自建Host执行器。

## 3. 独立执行的定向验证

在zsh及项目根实际执行：

| 命令 | 新鲜结果 |
|---|---|
| `tools/node-v24.21.0-darwin-arm64/bin/node --test scripts/tests/storage-json-single-owner.test.mjs` | **9通过、0失败/取消/跳过，退出0**；约435ms |
| `ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test scripts/tests/storage-json-single-owner.test.mjs` | **9通过、0失败/取消/跳过，退出0**；约845ms，无GUI启动 |
| `tools/node-v24.21.0-darwin-arm64/bin/node .local/f-process-recovery-20261027/launch-R3.mjs --check` | **退出0**；174项、NO_MODEL_PREFLIGHT_ONLY、模型/账户disabled、预算0 |
| 固定Node纯JSON/crypto复算两份R3恢复记录 | **退出0**；六阶段完整快照指纹及原运行身份相等，重开零派发，各拒绝码匹配 |
| 固定Node调用现有013资源verify/load函数 | **退出0**；8生成资源、2个operator-only附件、bundle及生成body身份见第7节，未派发 |

前两命令是两个具名解释器的9项断言：同根独立进程拒绝、正常释放后新进程取得、SIGKILL后OS释放、canonical链接别名竞争、不同根并行、预置符号链接目标字节保全、非SQLite原字节保全、委托关闭未完成时仍持锁、构造失败释放。没有用18个计数扩大为18种产品能力。原先7项RED与后来2项生命周期刻画分开，未声称9项都先RED；历史红/绿日志保留。

保存的只读版本查询确认工具Node24.21.0与实际Electron44.0.0内置Node24.18.1、SQLite3.53.1有别。新engines为`>=24.18.1 <25`只表达兼容声明，实测只覆盖这两个解释器。未换运行时或隐去历史精确24.21.0声明。`--check`只读分支已检查，位于获取启动锁和spawn之前，不能替代GUI。

## 4. 原FAIL、R3竞争与UNKNOWN

原`ownership.json`318字节、SHA `868dac4ac1e4f11764395facdc6e3de2d2365b74e16282cd28b98e0a06cc7793`保持`accepted=false`。独立解析原events：两个进程都从revision2提交，均committed=true并返回revision3，最终标题为`SECOND-WRITER-STALE-SNAPSHOT`，第一写入丢失。探针本身执行exit0不代表安全，单所有者期望断言exit1及原FAIL仍有效。

R3原events中writer-a从revision2成功提交revision3，writer-b在后端取得阶段code1退出并报`DSH_STORAGE_ROOT_BUSY`，原业务字节未被拒绝者改动，重新打开仍是`FIRST-WRITER-PERSISTED`及同revision。代码执行顺序是后端注册成功后才装domain/业务repository，不是让第二writer打开后靠最后一次写入碰巧未变来推断排他。

两份R3恢复JSON均由实际公共SDK、当前业务repository/runtime及明确合成executor形成。独立以现有canonicalJson重算before/loaded/observed/repeated/fresh/edit各阶段完整inputSnapshot，并逐字段核runId、workflowRunUid、requestKey、Workspace、task、inputSha256：

| 窗口 | 原requestKey / runId | 完整快照SHA | 重开与观察 |
|---|---|---|---|
| SIGKILL | `public-killed-one-request` / `v340-1050bfcc-8f45-41be-8706-dd6d71ab9460` | `3beb8292450dd24ea475b206cc4d162a05d06782bf51ff67c8d7ef7e269e5a31` | loaded仍prepared，观察后unknown/INTERRUPTED |
| 正常close | `public-normal-close-one-request` / `v340-dbc1242c-5c56-470f-aff6-58d216aa2a3a` | `b25204d07b7fa911db362c35ef26c5f88e3557ff18b86f2ead92612a579d8273` | loaded和观察均unknown/ABORTED |

首次合成dispatch=1用于构造窗口；所有重开、观察、重复key及拒绝操作中的syntheticDispatches均为0。重复原key返回原run，没有创建第二运行；新key拒绝WORKSPACE_GENERATION_ACTIVE；一次同时改输入/换来源的编辑拒绝V340_RUN_UNRESOLVED；另一Workspace proof-b任务为空。没有将同时编辑这一例拆称独立测试过每种编辑组合。

**UNKNOWN范围必须分开：** 快照资源SHA仍为旧共享业务合同`6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761`，executor为synthetic；这既不是0.1.3原生模型输出恢复，也不是网站API或Desktop运行中断恢复。fetchCalls=0只覆盖该worker替换的global fetch，不能当作socket/OS级网络总量计数。本审计只读复算原件，没有重跑会写入这些证明目录的进程脚本。

## 5. Desktop R3装配与正常重启

R3的四个扩展成员、锁、脚本、配置、实际SDK、122份candidate源及paired client均按174项实际匹配；current main/src与candidate/src各122，路径集合及逐文件字节相同。配对client为578630字节、SHA `ceebb8d3db6914ac25961533402f83db1a2c7706d5c9dc836606dbb2d9ca89b5`，与R47采用依据一致。旁置extension-r3的三个实现/配置文件与根下新增包逐字节相同；私有package另含固定file依赖和pnpm声明，身份不同已单独绑定，不冒称两个manifest相同。

新Profile `.dsh-test/f-storage-owner-20261027`沿原路径桥接，明确禁用普通工作台入口并选具名M06受控绝对文件入口；模型/账户/自动生成/标题/搜索/更新/遥测十条disabled保持，端口57543。原生隔离路径、代理及禁止fixture强制开关不等于OS隔离。

| 时点 | 当前实际启动/退出 | 接受边界 |
|---|---|---|
| R3第一次 | 23:55:02.039Z → 23:55:51.666Z，code0/null | 最终R3，不混用R1/R2 |
| R3重启 | 23:55:55.597Z → 23:56:14.203Z，code0/null | 同配对一次正常重启 |

上述日期均为2026-10-26 UTC。两份退出requestedShutdown=false，与作者Cmd-Q记录一致；exit SHA分别为`203092b9c6d7feef065a905db28ad364b922a3534e7e86278fae471ae5a1895f`和`a560359e5fc6e4e310e576ee76bdc672d5939941884fb2004349ee45490e4f71`。R1/R2另有两次code0，只归各自历史候选；不能累计成R3四次成功。

R3前后PNG为同一像素SHA `2d082db3386b1fb2648d2abcab489accb85d7d713427a825526f18e63e98a22d`，两份AX同为`81cba8ea4035ff49d7e1b8532d3f469dc1e6fa3fdaf096e6fbd92b0b57195c58`，时间记录分别位于两次owned启动窗口。审计读取了对应身份及图像/AX，不以相同SHA自身证明经过了重启；不同启动/退出记录与保存状态共同支撑该观察。实际可见原生`OWNER-GUARD-UNSENT`、业务`PUBLIC-DISCLOSURE-OWNER`、`ONLY-PREPARE-NO-GENERATION`及0.1.3受控候选限制提示。

当前业务文件2523字节、SHA `89eb8d63239e9e77f3a95100436c6132e73bb851d755ccb3c2386c37b24c0b18`与Desktop竞争时保存观察一致；所选业务任务无本地/远程运行。Desktop持锁时独立SDK contender得到BUSY，未注册json、未打开domain、零业务写入；退出后SDK可取得并释放同根，原业务字节不变。这证明当前配对Desktop的根所有权，超过旧启动入口EEXIST证据；仍不能强制未保护旧Host遵守。

本次只读查询57543无监听、最终四个记录PID未见运行，启动锁已释放。未测试Desktop正在真实生成时强杀、发布更新/降级、多Host未配对混用、完整附件或固定审核内容。

## 6. R1/R2失败与元数据恢复保全

初始R1准入173项、SHA `0319a3d4487cd20efbd8cc72b0f6de0f7873c0c666dc832ed4b0aa545e29cb1e`；R2准入175项、SHA `0d3b4965420e580d031c3cffb0255fdaa1ed46c960bf25ea881c04bb072953ad`；最终R3为174项，三个对象未混签。

首次启动后的旧锁SHA为`e236edb361a3b7a8cebe6b0c8874b18fc16e30b9807ff447bd854c404586b771`。独立diff确认恢复副本与运行后锁仅`autoInstallPeers:true→false`这一项区别；恢复副本1508字节、SHA `cc3b85d024be2f4d3d0654a11c1c2af153b1920c8022c1a3bbfda6d0380f429a`精确等于R1原期望。它明确是按原hash**事后恢复**，不冒称当时备份；运行后workspace/modules快照及diff仍在97项中。原准入未改，原失败不是通过。

无TTY重物化失败、装配未完成时找不到launch-R3的失败日志均保留。原自有pnpm cache误纳准入、以及初始engines只写24.21.0的情况与R3修正区分；R3不再将非运行cache当产品输入，也没有换解释器。第一次lock-only未显式隔离HOME/相对store的事实保留；本审计不把后续私有HOME操作反签成首命令完全隔离，也不宣称全机写入轨迹已监测。

## 7. 具名新交付接续

执行清单的七份上游具名报告/收据实际bytes/SHA全部相符。R31接受可移植夹具与主目录源采用，R37接受受控入口主目录源采用，R44接受固定Host准备/取消，R46接受准确candidate-02可读性修正，R47保存五文件实际采用与最终核验收据；当前五文件SHA又与R47 proposedSHA相符。它们是不同层次的范围结论，不将其相加为业务或真实provider通过。R47初始收据中的validation-pending时态不改，由具名final-verification接续；本报告不重审其全部历史工件。

独立调用当前`verifyM06BusinessResources013`及`loadM06BusinessInstruction013`退出0：bundle SHA `26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca`，skillVersion0.1.3、frontmatter0.1.3-candidate、candidateOnly=true，8份生成资源及2份operator-only附件准确；生成指令body SHA `cf1daa43371521f7aca3ebb1e5d3e6934b429d7505e57daee0852a498131f1ac`。只作资源读取/身份校验，没有派发。不能继续笼统写“尚无新包”，也不能把资源hash通过当作正文质量接受。

提供方`provider-delivery.json`为19270字节、SHA `39a153e5516efe73ef552ad47f6391d8fe9b77fb9e14ca01af05b0b6537df27a`，仍为controlled static candidate。六原载体PENDING_EXCLUDED、18旧UID载荷EXCLUDED、RULE-08-12-001-v1.1 definition_resolved=false及原处置保持；资格附件不进生成body，试行规则非正式生效。R29较早隔离状态由具名R31/R37/R47接续，不倒改提供方原件。普通默认入口/API、真实模型消费、专业/用户、正式分发及其他目标没有因此获得接受。

## 8. 保全与最终裁定

本轮初始baseline3529项、SHA `8459862c83749c35050d76e0fcb8381b9659eee6fe4bee17d3f53a36dc80b782`。作者状态写回前记录为0缺失/0变更；本审计当前重算为**0缺失、恰3个状态文稿变化**：project-current-state、stage5-progress及follow-up-remaining，符合已说明的后续状态接续，其余初始文件未变。本批不将R31—R47此前已采用的M06代码归为本轮修改。

旧原准入SHA仍`e72814abad9fae80ee5f66ca3c9bdd84fc2669041a4900d3d330b04def6119aa`；旧147/156项准入分别仍`092da5436842c0fa020c6899d0891374aa046d30ab3d62d3a1a65c4cbd58b5e1`、`d707506979b434244cfa04dad52cf73daa9ba03c0ee482e8ac63edab143072f6`。活跃主包lib/client仍505960字节、SHA `2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`，主锁仍`903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，没有用旁置paired client覆盖它。

五份此前独立审计实际SHA未变：准备`0d15d2d9e06ca4dbb93941f950ee36c81fdc2bea6007d6c871424dc0aac94acd`；M06 R1 `a78bf1e28f21ef28875f8e6cea57bb49757f2d4e6a32892fab4b22e64cebed61`；provider/网站`f930896ed4408664b0deff151641f9157154f6a0904ae0a2c618156cc217cee8`；前F子集`efa50b8c07b50e5343811d08363b8184ccfdb2ca3a23c24e58f3bc96a3c62272`；路径桥接`607f33e27d529d11c96a7b7c7076cdcd045d5bbd4cea2d37555124dc58409cb9`。本次接受没有反签旧FAIL或把旧报告扩大成新源码/新Host全量审计。

**可登记：** R3同配对、本机本地文件系统、公开SDK委托JSON后端的单所有权；实际SDK/业务合成窗口的UNKNOWN身份保全及零重派；当前无模型Desktop正常退出/重启草稿保全。**继续开放：** 旧无保护writer/全发行强制采用、网络FS/跨平台、原生模型/API UNKNOWN、结构化芯片/图片/Blob/旧上传附件、固定审核版本普通/长稿内容交付、完整F、U1/D1、新版API映射、真实双来源、专业/用户、G/H及阶段6。原网站预算仍0，不授权新调用。

没有新增必须修复的P1/P2阻止上述候选子集接受；这不关闭原FH-A01/P2等既有未决范围，也不将全目标缩成此批交付。
