# F固定候选旁置恢复与无模型GUI子集独立审计

结论：**接受本次明确限定的旁置恢复、当前配对GUI、输入/来源持久化、一次正常重启及A/B切换子集；完整F未接受，总目标未完成。** 未发现本轮恢复或业务修改新增的P1问题。确认一项完整F的P2能力缺口：待发送附件在正常重启后未恢复；普通/长稿固定审核版本引用、业务跨Host所有权和UNKNOWN原运行恢复另有缺证，不能以本次通过覆盖。

审计模型配置来自调度声明：**GPT-6.1 / max**，不是根据输出或文件内容自行推断。审计者与作者角色分离；本报告只新增独立审计记录，不修改作者源码、pin、证据或此前独立报告。

## 范围、读取时间与版本

工作根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`；旧`dsh-lab`路径仅用于解释原pin。依据项目规则、[接续计划](../plans/2026-10-26-dsh-oasis-follow-up-development-plan.md)第139行与作者[返回](2026-10-26-f-host-recovery-return.md)第3行，本批仅审任务`DSH-F-HOST-RECOVERY-20261026-01`。不扩为E、新版双来源、U1/D1、G0—G5、H或阶段6。

首读为`2026-10-26T12:33:30.512647Z`；147项机械比对为`12:39:02.704127Z`，Fast39离线复算为`12:44:00.388Z`，最终材料冻结读取为`12:45:18.759469Z`。以下是本审计实际读取的身份，SHA均为SHA-256：

| 输入 | 字节 | SHA |
|---|---:|---|
| `2026-10-26-f-host-recovery-preparation.md` | 2639 | `082f79fb132c902fbae3af2c0a4d1c1196fda9d235f95939f6b7b836a397ebf0` |
| `2026-10-26-f-host-recovery-return.md`，最终版本 | 5215 | `24977992a88bc1606d67ce59a8cdb0349ce68b393fdeffce8d4f55c62257f2ed` |
| `2026-10-26-f-host-recovery-execution.json` | 6295 | `47ef819745b81a304a8df90216a43145f7e7f6f3d39436e7db3995d9bf171b78` |
| `2026-10-26-desktop217-recovery-source.json` | 1073 | `7f933bbc469a6d1374b7327a63c3612a36f567aecc175a138ac31a78579d725a` |
| `2026-10-26-native-attachment-recovery-gap.json`，本轮补充 | 2190 | `8ba086dee1b0eee60331c074fb5ebe02616e13e28e24466703f504169e5adca7` |
| `.local/oasis-follow-up-20261026/f-host-admission.json` | 32880 | `092da5436842c0fa020c6899d0891374aa046d30ab3d62d3a1a65c4cbd58b5e1` |
| `.local/oasis-follow-up-20261026/f-host-launch.mjs` | 2949 | `b6b6257f63c3991b6e56a76528486b8cc9197b8eb0e0719a2547080b5e1c7ea8` |

表内未写目录的文件均在`docs/evidence/`。首读返回为4717字节、SHA `8eea0e2523a04d302226ad68ff9a6d459b461119a9c10ba3b1fb6600c655072a`；作者随后在未通过段加入原生能力原因与补充链接。本报告绑定最终5215字节版本，同时保留首读身份；不把后来补充伪装成首读已有。其他上表初始材料未变。

审计仅执行本地读取、哈希/字节比较、签名核验、挂载信息查询、固定Node的`--check`及纯离线schema函数；没有再次启动Host、安装、请求网站/模型/API、改pin或源码，也没有读取凭据文件、浏览器认证或接管作者浏览器。GUI结论来自作者已保存的四张截图、五份AX、启动/退出记录与本次独立读取的合成业务状态，不声称审计者另做了一次实时GUI操作。

## 固定来源与147项配对

1. **固定Desktop恢复成立。** 本地DMG为498514462字节、SHA `55680cfbfc903b5cc4b2f23ecdfb3812d36e1fdaa3663b4112b329ad1622737f`。独立重算与保存的固定资产digest及`SHA256SUMS.txt`中该文件行一致；后者1558字节、SHA `ba6c117202dd5dfd2d80b16907d19c45279add5e010bc4c8f8fe0164c36a47a2`。来源记录指向官方v2.0.17、release399328686、asset598706871、commit`838ba60fd79362087c0a0d134efee671c284786a`。本审计没有重新联网取资产元数据，来源URL/资产ID按保存记录追溯，字节身份另以旧7个app pin和现有签名交叉核对。
2. **读取的是只读恢复应用。** `hdiutil info -plist`实际返回该DMG类型`UDIF read-only compressed (zlib)`、`writeable=false`，挂载点为`.local/oasis-follow-up-20261026/desktop217-recovery/mounted`。对其中`DSH Desktop.app`独立执行`codesign --verify --deep --strict --verbose=2`退出0，显示`valid on disk`及满足Designated Requirement。未重签。读取包版本得到Desktop2.0.17、内置DSH0.2.0-rc.2、Cordis4.0.4；不以全局CLI或日常2.0.18代替。
3. **147/147实际匹配。** 逐一读取新admission的全部路径并计算SHA，7个app文件、117个candidate/src文件、23个其他文件均与各自pin相等，无缺件或漂移。7个app成员逐一按app内相对路径对照原admission，全部等于旧期望SHA；10个既有UI/Sidebar成员也在解释`dsh-lab→DSH-Oasis`路径后与旧pin相等。这里只证明被列入的147项，不宣称独立冻结了全部传递依赖或整个运行数据目录。
4. **候选与当前工程及已审client相同。** candidate与主包`src/`文件集合均为117，路径集合相同，逐文件字节相同；`package.json`、`pnpm-lock.yaml`、`cordis.patch.yml`也相同。锁SHA `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`。client为562457字节、SHA `9d97a36a94162cdadea66844e53acc176642917fa63e34a84b34c87dc1ed2f55`；map为1047507字节、SHA `778a0ac3ccacf3aac3c9641daa86ba74c180b4b1b6bc35956a275437b187f65f`，与此前M06 R1独立审计绑定一致。
5. **原准入未重签。** `.dsh-test/mac-dev/evidence/admission.json`仍为11844字节、SHA `e72814abad9fae80ee5f66ca3c9bdd84fc2669041a4900d3d330b04def6119aa`。新准入另存，不把旧8项路径/漂移问题改成通过。新launcher的`--check`输出中`originalAdmissionUnchanged`为固定布尔值，本报告对旧文件另作实际SHA比较，不用该输出代替核验。
6. **安装证据支持旁置物化，未重跑安装。** 原store误选的离线失败日志被保留；后续日志显示固定pnpm11.8.0、锁无需更新、跳过解析、`downloaded 0`及成功完成。profile仅四个本地link，实际解析到既有UI/Sidebar补丁和本次candidate。profile的锁与包清单分别由147项覆盖，不与主包原锁混淆。离线/冻结/ignore-scripts具体命令按作者执行记录追溯，本审计不把仅有成功日志推导为新的安装或供应许可。

## 隔离、运行及退出证据

新root为`.dsh-test/followup-20261026`。HOME、DSH_HOME、userdata、cache、temp、evidence、workspace-a/b分别位于该root，目录本身非符号链接。配置明确禁用`llm-pi-ai`、`llm-deepseek`、`llm-deepseek-account`、`deepseek-account`、`account-controller`、`session-title-llm`、`web-search-deepseek`、`goal-round-driver`、`desktop-updates`、`session-telemetry-otel`；profile自有`cordis.yml`为空数组。新link没有指向旧认证或业务数据库。未复制旧认证/数据库属于作者操作声明；本审计核新路径、配置与合成业务身份，没有读取凭据内容来证明凭据为空。

独立审阅launcher及其导入模块：`verifyPins`在分支前逐项验SHA；`--check`分支在`acquireLaunchLock`和`startOwnedChild`之前返回。实际执行`tools/node-v24.21.0-darwin-arm64/bin/node .local/oasis-follow-up-20261026/f-host-launch.mjs --check`退出0，输出147项、`NO_MODEL_PREFLIGHT_ONLY`、禁用模型/账户、预算0。固定Node实际报告v24.21.0，其可执行文件SHA `e4b5a3af0e05c75de2eae013904145f40fe7fc2a6e6f17510128bf45cca4e79b`在pin中。

启动规格使用清洁环境、loopback57519及阻断外部目的地的代理设置，`realAcceptance=false`，并删除仅适用于旧精确路径的`OASIS_UNIFIED_FIXTURE`。启动stderr实际记录Host采用`127.0.0.1:9`代理。**代理与禁用配置不等于内核级文件/网络隔离，也不证明所有后台网络包为0**；本批没有U1资源/访问边界实证。stderr还存在`sandbox_extension_issue_file failed ... Operation not permitted`，随后GUI可用、进程正常退出；不能将这条警告写成整套沙箱机制已通过或新的已修复项目。

| 启动记录 | 启动UTC | 退出UTC | 结果 |
|---|---|---|---|
| `launch-1793016999876` | 12:16:39.892 | 12:25:54.943 | code0、signal=null、requestedShutdown=false |
| `launch-1793017583650` | 12:26:23.653 | 12:30:16.520 | code0、signal=null、requestedShutdown=false |

以上为两次启动、一次实际重启、两次正常退出，未扩写成两轮重启。对应exit JSON的SHA分别为`d5be75ee6094430d1ce2790b648479650adf0dc2eb65fe6017c94680f4bf8f6b`及`a028d4be82c0a7f41152ce6a256f2768c1d14a14ace92b5ccb242a0872ef2a5c`。作者记录操作为Cmd-Q；code0/null及未向launcher请求shutdown与此一致。本次只读查询未见四个记录PID仍运行，`startup.lock`不存在，57519无监听。

`f-second-launch-refusal.log`实际为启动锁`open(...,'wx')`产生EEXIST，调用位置在第二个`startOwnedChild`之前，作者记录退出1。它足以支持**本启动入口拒绝第二次启动**；没有实际启动两个写同一业务存储的Host，故不证明全部writer的跨进程所有权或故障锁恢复。

## GUI与恢复完整性矩阵

执行JSON列出的18项截图/AX/日志/观察文件，其实际大小与SHA全部匹配。审计者逐张查看四张PNG，并读取五份完整AX；未只看作者结果布尔值。

| 计划/本次断言 | 独立证据与判断 | 接受边界 |
|---|---|---|
| 当前Desktop/client实际装配及GUI | AX URL为`127.0.0.1:57519`并含Desktop2.0.17；147 pin和启动exe路径一致 | 接受这组配对的无模型GUI；不是完整产品或日常安装验收 |
| M06限制提示持续可见 | A重启前、重启后、B和回A的AX均有“本版本不自动删除结构记录或撤回技术事实；正文修改后，相关表格和依据仍需核对。”；截图一致 | 补足此前机械测试之外的当前GUI提示证据，不宣称完整同步/删除 |
| 共同八输入和双来源界面 | 五份AX可核前序累计文件、交底文件/文本、附图文件/文本、撰写要求文件/文本、用户指令；来源为同一组单选 | 接受控件存在与同页切换；只填了实际记录的两个文本字段，未证明八项真实派发/无损映射 |
| 两来源禁用准确 | 本地显示“新版原生模型接线及实际验收待完成”；API显示“逐节点实际字段/结果映射与账户项目绑定待核实”；生成按钮disabled | 接受当前拒绝行为，不以选中API或模型名称显示当已启用/已登录 |
| A输入及来源持久化 | 重启前/后与回A的AX相同；业务存储独立读取相同的API选择、两项文本、空filePaths | 接受本次已填值保全；两句ASCII实际都进入交底框，未把最初计划输入当成已输入 |
| 原生普通文件打开 | `f-native-attachments.png/.ax.txt`可见原生文件Tab及96字节公开Markdown正文 | 接受独立普通文件原生预览；它不是审核后的业务artifact |
| 普通及长稿附件准备 | AX可见两项待发送附件；150000文件实际150000个UTF-16单位、449990字节；Host file-object及具名副本与原文件逐字节相同 | 仅接受未发送附件准备和字节落盘；不是固定审核版本引用，也没有测试150001或非BMP相邻边界 |
| composer原稿保全 | 前后截图/AX均有`F20261026-A-UNSENT`，重启后仍有原文件Tab | 接受此公开文本草稿恢复；没有触发业务固定版本引用来实测“已有草稿拒绝覆盖”完整交互 |
| 附件草稿恢复 | 重启前有两个chips，重启后及回A均无chips；Host字节仍在 | **不通过，见FH-A01/P2**；附件字节存在不能替代composer关联恢复 |
| A/B归属 | registry的A/B路径与ID不同；B新任务本地来源、空业务输入/空composer；回A恢复原API选择、业务文本和composer文本 | 接受本次正常切换隔离；不外推并发、晚到结果或跨Host |
| 正常退出与重启 | 两份退出记录均code0，重启后同一candidate恢复上述内容 | 接受无运行任务状态的一次正常重启；未覆盖崩溃/断电/运行中恢复 |
| 跨进程排他/恢复 | 第二入口EEXIST，仅一个Host被启动 | 入口锁有证；业务存储跨writer排他与故障恢复缺证 |
| UNKNOWN原运行保全 | 已选任务的本地/远程运行集合均空 | 本次无UNKNOWN可恢复；不能以0运行证明UNKNOWN不重发 |
| 普通/长稿固定审核版本引用 | 本批没有生成或伪造已审artifact，未调用对应业务引用链 | 缺证，完整F仍开放 |
| 新版双来源/专业及用户接受 | 没有真实生成；28个新版来源格仍禁用 | 不接受为E/F全量、G0—G5、H或阶段6出口 |

业务状态另作读取绑定：`home/storages/oasis_workbench.json`4871字节、SHA `52e69783fa389a5dfda3f06e300f89a12f206be5daa65800a0658e96cb670b72`；`workspace.json`1653字节、SHA `73a9dde5889fc7b942912079eae80cd09f03697ce3620aa49802105da960b198`。A为`71120098-c4d4-4075-bddd-49e1371eb8f7`，选中任务`503bfda5-2da2-48d2-8d07-934409a3a3c0`；B为`e4d5099d-15e2-4918-9ca8-81f97a61a920`，选中任务`b44d7ec2-78a0-4816-925b-557cea951323`。两个工作区另各有自动空白任务，不误报成整个存储只有两个任务；上述任务的运行/远程集合均为空。0运行证据与未发送操作记录支持本批未提交新生成，不能替代网络抓包或重用上一批R1的“网络0”计数。

普通文件SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`；长文件SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`。两者在原件、`attachments/v1/file-objects`和具名`files`目录间均逐字节相同。

## FH-A01 / P2：原生待发送附件关联未恢复

**定位与复现证据：** [作者返回第30行](2026-10-26-f-host-recovery-return.md)如实保留该失败。`.local/oasis-follow-up-20261026/f-native-attachments.ax.txt`含“待发送附件”及两个文件条目，对应PNG清晰可见；`f-restored-a.ax.txt/.png`和`f-a-after-b.ax.txt/.png`仅余文本，无两个chips。原件与Host副本SHA仍相同，因此丢的是待发送关联/界面状态，不能描述成原文件字节丢失。

**影响与依据：** 用户在正常退出后继续原草稿，会缺少此前准备的两个附件；本次F计划第139行要求composer原稿保全和正常重启。仅恢复文本与文件Tab不能满足附件草稿整体恢复，故该项作为完整F的P2能力缺口保留，不因作者已披露就记PASS。

**归因经过独立核对：** [原因补充](2026-10-26-native-attachment-recovery-gap.json)的4份文件大小/SHA全部匹配。固定commit源码`packages/client/ui-conversation/src/client/contract/input.ts:258`明确`attachmentIds`为runtime-only；`service.ts:160`用Map保存附件，`skeleton/DefaultConversationViews.tsx:27`只seed/mirror文本draft。这三份源码又与原固定归档对应成员逐字节相等。实际签名DMG内`@deepseek-ai/dsh-client-ui-conversation/lib/client.js:3348`为附件Map，`:16403`起仅seed/mirror文本；该编译文件716272字节、SHA `6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c`。这不是仅凭同版本号外推机制。

绿洲`src/client/native-composer-input.js:7`将公开attachmentIds映射到内部形状；`conversation-draft-bridge.js:20`在已有文本/附件/引用时拒绝覆盖，`:51`只调用公开setDraft写文本。这两份源码均在117份配对内。本轮恢复未修改该机制；证据支持固定原生接口能力边界，未发现本轮新增的业务序列化回归。

**处置建议：** 完整F保持开放；向原生维护方交付准确公共能力缺件，或待明确确认后采用既定边界内的小型通用补丁。不得为关闭该项复制通用会话/附件系统、写私有store、静默升级或改pin。若选择明确排除附件持久恢复，须有真实业务范围决定及用户可见说明；本报告不替用户作该排除决定。本次限定GUI子集仍可接受，不能因此声称完整composer恢复通过。

另有三个完整F必要缺证：固定审核版本的普通/长稿引用链、业务跨Host存储所有权/恢复、UNKNOWN原运行恢复。它们当前是未验证项，不伪装成已实测失败，也不因未测便自动加造新的生产缺陷。

## 本轮补充：Fast39旧schema兼容

此节仅追加新的当前证据，不回签或改写上一provider/网站审计。新增材料身份：

| 文件 | 字节 | SHA |
|---|---:|---|
| `2026-10-26-fast39-actual-schema.json` | 4286 | `d9c59544a4229cd3ca21f0e0814f224f5023e4f2b9cd86fdcdc011ab04f3a3c8` |
| `2026-10-26-fast39-schema-compatibility.json` | 728 | `6e1098e87919819ceba2d600b2f505da4fa6064d3ac06eabc7c82cb2d6eccafa` |
| `2026-10-26-fast39-schema-compatibility.md` | 1782 | `cecc8997629fda96c4b47da871b69006478ef0d23a6adc2df6a54f9b2afeb89b` |

保存快照自报来自已捕获响应`48954.189`。本审计不接管浏览器或重新请求，因而原响应捕获来源按作者记录追溯；对当前保存快照的字段、键清单和合同计算作独立复核。输入8项、输出1项；快照每字段与保存的原键名清单相符，均为`type/cn_name/content/en_name`，没有`required`或额外约束键。缺少required不能推断字段可选。

固定Node在阻断fetch、net/TLS socket的审计进程中动态加载当前`normalizeApiDetail`、`matchesReleasedFastContract`及`canonicalJson`，不创建API client或凭据。复算退出0，网络尝试0、真实网络调用0：

- 含观察价格3的schemaHash为`4a3fde3d22dccba44771920f15ae56bc9512f1dcd875a472d211be4962870575`。
- 去价格合同hash为`4adaf95b2e1579bf495eb9ff79966a5ae6404cd0ee89f79dde352fd97a929303`，与现有已发布Fast合同常量一致，`matchesReleasedFastContract=true`。

因此，**本次捕获快照与旧首模板已审schema相容**。这不是未来服务不会变化的保证，也不是新版M06八输入的无损映射通过。API八项为技术方案、领域、背景、效果、实施方式、附图、交底文件、用户指令；新版八项包含前序累计文稿及三组文件/文本，字段数量相同不证明语义相同。单正文`output`亦不证明结构记录或风险/问题已经评价。快照的User_input描述仅接受额外要求，不能据此将缺失的正文/材料映射塞入指令字段。

`docs/business-baseline/v340-source-mapping.json`当前SHA仍为`1b084249ab889083287ec0050e232b7a5f372581efba8e300d9da2d1efe65245`；独立读取确认`dispatchEnabled=false`、`realCallVerified=false`，14个local和14个API格全部`enabled=false`。本补充不启用任何来源，不再消费网站预算。

## 保全与全目标判断

本次独立重新计算以下旧报告，原字节未变：

| 已有独立审计 | SHA |
|---|---|
| 第一批准备/任务1—4 | `0d15d2d9e06ca4dbb93941f950ee36c81fdc2bea6007d6c871424dc0aac94acd` |
| M06 R1限定机械范围 | `a78bf1e28f21ef28875f8e6cea57bb49757f2d4e6a32892fab4b22e64cebed61` |
| provider/网站校准 | `f930896ed4408664b0deff151641f9157154f6a0904ae0a2c618156cc217cee8` |

此前各限定接受继续有效。尤其网站那一次授权请求、3元观察、结果/流水关系和质量限制仍归上一报告；本次F没有将其改成新版原生运行，也没有将其并入旧R1网络0范围。

本批把“固定候选目前能否旁置启动并显示当前界面、正常保存部分状态”推进为具名真实GUI证据，未关闭全F。U1/D1的逐格式材料与执行缺口、新版资源真实装配、E映射、真实双来源/专业及用户接受、G0→G1—G5→H→阶段6仍按原依赖接续；本批不重判未审部分。P2显式网站记录导入、P3异步、P4流式/结构化引用、150000字符以上固定文件引用、OCR/扫描混合PDF/复杂版式与新导出继续保留。**不能据此把后续全部工作缩成“本批GUI子集交付完成”，也不能给全计划PASS。**
