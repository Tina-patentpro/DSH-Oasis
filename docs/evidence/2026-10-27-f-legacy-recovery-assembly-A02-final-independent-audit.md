# F旧附件/固定开发装配：A02最终独立复审（R4）

日期：2026-10-27，Asia/Shanghai；最终只读核验 `2026-10-27T09:44:32Z`。同一用户指定GPT6.1 Max独立审计子代理，未参与修复，未另开代理。

**结论：F-LA-A02剩余P2在具名R4受控无模型开发装配范围内关闭；维持A01、A03及v3的限定接受。本次新增必改P1=0、P2=0、Minor=0。** 接受当前支持入口对本批固定组合的检查/启动接续，以及具名旧公开附件重建和本次R4首次冷进入A、B工作区空白/返回A、正常重启的可核子集。完整F仍未完成，不作发行、全写入方或稳定自动迁移接受。

首轮及R3两份失败审计、返回/执行单、R2首次0/0和原verify失败均保持历史原义。本报告接续R4，不把旧对象重新签成通过。另有一处B会话证据表述限定，见第4节；本报告不补认原件没有直接证明的Session身份。

## 1. 冻结身份与审计方式

根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh，分支`mac/continuity-v2`，BASE=HEAD=`035fe82b3f97b983bb561fbefff9ae1ea9d42862`。仍审具名未提交增量，不把整个既有脏树归本批。

| 对象 | 本次独立SHA256 |
|---|---|
| A02最终返回 | `8a041231ac6a03eea17d2901b0b0097c90c61233c9eea46fa58c704974ce93b5` |
| A02最终执行单 | `4bb402f94060b1e5e4c75561ad2a43ee343e3f97dcfdddc18d5fce52fdc1ab06` |
| R4最终准入，196pin | `d59d1dd35ad1e01b1138f327f8014382ef894f3dd4f20859840fbc3b30d22cc9` |
| 当前assembly源码 | `de105671aa50dfa5fde6568794c360d4ac316f5d3acd302f676fc95d862c36aa` |
| 当前assembly测试 | `c913ee35dfe74afed5d5c49c689f084e6d1d10efb6600c8d59519e35cd19709f` |
| 当前装配README | `6a5481fe91b85a6b5df940ba896b150e5db5be4782ac395ad54156cb8cb16277` |
| R7来源准入 | `e9ae83ecb2abe5bf75759fceb0e4c75266d558cd9a99ab6ee254e5205167e37e` |

三项代码/说明之外，A03/v3及实际proof3/client的字节沿R3已审值未变，A01绑定逻辑保持；本轮又核实际hash，并以73项并集重验相邻守卫。旧根/项目规则与规划输入的既有读取及R3中心导航差异继续绑定，本次没有新建/修订计划或采用新接口草案。

审计只新增本报告。没有启动Desktop、Host、浏览器，没有执行实际seed/clone/contender，没有读取或复制认证，没有模型/API调用、上传、retry、Send、费用、提交/推送/发布。Electron只在`ELECTRON_RUN_AS_NODE=1`下当解释器；反例只使用新临时目录和固定pnpm离线物化，完成后清理。不改任一冻结旧对象。

## 2. A02修复与实际消费路径

[f-development-assembly.mjs:118](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-development-assembly.mjs:118)现直接要求Profile workspace文件等于R7同角色原字节、root配置等于`[]\n`，不再由当前文件hash自证配置。v3组件的workspace也在composition中对应原conversation角色。

61–91行的物化检查增加同角色完整比较：lock全部settings；modules除安装时间`prunedAt`、缓存位置`storeDir`外的全部字段；workspace-state除`lastValidatedTimestamp`和另行推导的projects之外的全部内容。projects必须精确等于当前manifest推导的路径/name/version。原单importer、全部直接依赖specifier/lock解析路径、package-map直接映射、全部实体link及固定pnpm版本仍逐项核验；完整pin集合仍强制存在。Profile和v3组件分别使用R7中各自角色作参考，没有把两种角色的metadata混用。

这直接覆盖了上一轮两个实际消费反例：固定Desktop会修复不符合的workspace设置，并以`.modules.yaml.virtualStoreDirMaxLength`和workspace有效长度判断是否迁移；现在改变workspace或该模块长度，即使自重签pin也拒绝。默认Mac路径长度120及其对应布局不再漏验。只排除的安装时间/缓存位置不参与前轮已查明的启动布局判定，不放宽执行目标或依赖归属。

121–125行还拒绝额外`home/cordis.patch.yml`、plugin-management state，及非固定desktop Profile/disabled market选择。这些路径与固定Desktop的实际准备/选层源码相符：`profile-hhId3Pkk.js`消费machine patch及Profile配置；`main.js:4188–4203`读取Profile选择和plugin-management路径；market state位于`desktop-market/state.json`。本次R4实际选择为desktop/disabled，没有machine patch或plugin-management override。检查只拒绝，不修写用户偏好。

A01的执行来源绑定、强制guard/checkpoint/path bridge、stock-json禁用、模型/账户/自动执行禁用和无real-acceptance入口均保持。该接受仍以保留的具名本地artifact为输入，不等于可搬走源码的独立发行包。

### 独立反例重放

在新临时目录用真实固定pnpm完成lock-only及冻结安装、忽略脚本，seal后先确认正例通过，再逐项变造并自重签对应pin，结果如下；没有启动App/Host：

| 变造 | 新结果 |
|---|---|
| 上一轮实际workspace `nodeLinker: isolated` | 拒绝，`reviewed effective workspace/root configuration mismatch` |
| 上一轮modules路径长度121 | 拒绝，`fixed materialization metadata/resolution mismatch` |
| 另加一个未列举的有效lock setting并重签 | 拒绝，同上 |
| 仅改变明确排除的安装时间字段并重签 | 保持通过，符合非执行字段边界 |

独立脚本退出0，表示以上断言均成立。两条旧错误接受已经在相同类型的真实物化正例上转为拒绝，不仅是读源码认为“应当拒绝”。本轮73项回归另覆盖自动peers、显式workspace路径长度、workspace-state有效settings、非空root和四类管理选层覆盖。

上一轮已核package-map未消费子字段的裁定仍保留：当前固定resolver和洁净启动环境没有启用实验package-map解析，不把未消费字段臆断为运行旁路；也不向未来实验模式或不同加载器外推。当前接受的是固定运行时实际消费的组合语义。

裁定：**F-LA-A02在本批支持的R4开发入口关闭。** 本轮未发现新的具体可复现必改P1/P2/Minor。

## 3. 新鲜验证与RED原件

实际固定工具Node为v24.21.0，官方Electron内置Node为v24.18.1，版本命令均退出0。两个解释器分别新鲜运行同一七文件并集，各 **73通过/0失败/0跳过，退出0**：归属7、装配26、seed7、v3增量4、既有checkpoint20、guard9。

```zsh
audit_files=(scripts/tests/legacy-draft-recovery.test.mjs scripts/tests/f-development-assembly.test.mjs scripts/tests/legacy-draft-seed.test.mjs scripts/tests/draft-checkpoint3.test.mjs scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs scripts/tests/storage-json-single-owner.test.mjs)
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap "${audit_files[@]}"
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap "${audit_files[@]}"
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --check .dsh-test/f-legacy-assembly-20261027-r4
```

最后CLI退出0，实际输出`F_ASSEMBLY_PREFLIGHT_ONLY / realCallBudget=0 / mandatoryComponents=3 / pinnedFiles=196 / materialized=true`，没有`--start`。

独立读取`A02-effective-config-red.log`：原16通过、新增10项全部失败；10项恰为本次有效配置/管理选层反例，不是缺API错误。当前26项全部通过。早期seed/v3“新API不存在”的RED性质仍按R3复审说明，不混成这次10项行为RED。

未重跑未受影响业务整包build/verify。原路径1480/1480、临时构建与127成员pack沿未变输入复用；平铺副本1419项中77失败仍保留为失败。73项局部通过不是整体verify变绿，也不是业务/专业进度百分比。

## 4. R4实际恢复证据及B会话限定

独立查看`R4-first-cold-restored.png`及`R4-after-restart.png`，读取配对完整AX。首次冷进入A即有原`F20261026-A-UNSENT`、两个具名待发送文件/error卡片、Send禁用；正常重启保持。由AX中的实际输入文字独立计算为18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`；返回A的AX亦相同。

R4的Legacy proof折叠，AX没有直接展开Session JSON。审计没有伪称读到该JSON：另只读新Profile的公开workspace实体，A唯一成员仍是`session-afaffbc1-9b24-4447-a7fa-98f0daef6428`，workspace仍为`71120098-c4d4-4075-bddd-49e1371eb8f7`、原公开fixture路径，与原件及具名包一致。A的唯一成员关系、原件/新包及按身份取checkpoint的已审代码共同支持这一次关联；UI与磁盘层分开说明。

**B证据限定：** `R4-workspace-b.ax.txt`支持B工作区空白、没有附件，返回A仍为原文/两文件。当前R4的B实体同时有新`session-18ad19c3-50dc-4c0e-bbc8-c9ea932a17ac`和原`session-0e35957c-8730-4ddd-9761-c570ab1cc6cc`；该AX没有直接Session ID，不能区分选中哪一个。因此最终返回中“B原会话”的过强表述由本段限定接续，**只接受B工作区空白/回A保持，不独立补认具体B原Session**。原返回保持，实施者已接受此限定，未为补证重启。此限定不阻断A02准入修复，也不是新代码缺陷。

两套具名关闭后IDB Blob（重启前及最终关闭）逐字核验，普通96字节/SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`，长稿449990字节/SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`，与原workspace/named-files/file-objects相等。原receipt未恢复，未知lastModified仍置0，MIME为恢复时选定值；没有retry/Send实传接受。

两组R4启动/退出JSON与清单逐项相等、退出0；连同前两轮共9组均一致且正常退出。实际第二受保护SDK Host的原始竞争记录支持`DSH_STORAGE_ROOT_BUSY`、未注册backend/未开Domain/业务SHA保持；审计没有重跑该Host。

接受R4这一次冷进入A、B工作区隔离观察及正常重启，不把R2首次0/0倒签为成功。v3的已证明无关Store误通知路径保持关闭；R2具体事件全因未定及全面可靠性未验的边界保持。

## 5. 新旧字节与保全

独立核验62最终成员全部一致、R4 196pin全部一致；R3修复159成员中156当前仍原值，仅声明的assembly源码/测试/README三条变化，其`before-A02-final-fix`备份逐字等于R3冻结旧值。首轮172成员与其4条修复前映射仍按前报告接续，没有把当前脚本改签到旧R1/R2/R3准入。

前两轮返回/执行单/报告共6件均复算原SHA：首轮报告仍为`163bc998622a4366b378fe231e148ff7268117a5b91b2f1898adbfa1f384b18b`，R3复审仍为`ba476a95089cf13b5ce9d5ea0bf852dfbb4ea727fd96fb228eda15afd13fc2ab`。历史FAIL及未勾计划保持原字节；当前接受由本报告接续。

原公开Profile17/17一致、初始3554文件0缺失/0变化，业务源码/依赖、活跃lib及旧R7原件保全。中心两项导航增量沿R3具名快照/限定，其余12项未变，不由草案扩展运行授权。

最终57583监听检查退出1且无输出，R1/R2/R3/R4均无startup.lock，HEAD未变。R4两次启动后再次check和当前196pin实物一致，支持本次没有发生前轮反例那种配置迁移；不因此宣称任意外部写入方均被强制约束。

## 6. 最终接受边界

| 对象 | 裁定 |
|---|---|
| A02剩余有效配置/布局旁路 | 在当前R4固定开发支持入口关闭 |
| A01/A03与v3已修路径 | 维持R3限定接受，没有放宽真实编辑/归属/重传守卫 |
| 这两份旧公开fixture的具名重建、R4可核恢复/重启 | 接受；B具体原Session不补认，原receipt/旧metadata缺失不伪造 |
| 原FH-A01、R2首次失败、原verify失败 | 历史保留，不重签 |
| 完整F及发行/真实来源等 | 继续开放，未接受 |

Declined-to-judge：任意孤儿自动归属、真实Host重传/模型正文或附件参与、0.1.3真实模型及专业API UNKNOWN/Desktop运行中断、双存储不可更新/未提交事务崩溃、多Renderer/跨平台/跨版本、全写入方发行强制接续、日常安装、升级回退、专业/用户接受、U1/D1、新版API映射、超150000固定文件引用、G/H及阶段6。

最终计数仅对应本轮范围：**新增必改P1=0、P2=0、Minor=0；A02关闭，当前具名开发子集接受，完整F未完成。**
