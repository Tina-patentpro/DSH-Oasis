# F旧附件具名恢复与固定开发装配：首轮独立审计

日期：2026-10-27，Asia/Shanghai；只读复核截止 `2026-10-27T08:49:55Z`。审计角色为用户指定的 GPT6.1 Max fresh-context 独立审计子代理，未参与实现，未另开代理。

**首轮结论：本批整体暂不接受。新增必改 P1=0、P2=3、Minor=0；另保留已知 P2 限制 F-LR-01。** 两份旧公开附件的具名归属、重建包与后续成功显示/重启的事实层可接受；不能接受临时恢复入口的“不会覆盖新草稿”保证，固定开发装配准入也有可独立复现的旁路。下述失败不能被43项绿色回归或当前R2实际pin一致所抵销。

原FH-A01失败、首轮/R1失败、R2首次冷加载失败、原verify失败及旧冻结原件均保留。此结论不关闭完整F、任意孤儿自动恢复、原生receipt恢复、真实Host重传/模型交付、API UNKNOWN或发行。

## 1. 审计对象与权限

根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh，分支 `mac/continuity-v2`，BASE=HEAD=`035fe82b3f97b983bb561fbefff9ae1ea9d42862`。审计的是本批具名未提交文件及准确冻结清单，不把整个既有脏工作区归为本批。

| 对象 | 本轮独立复算SHA256 |
|---|---|
| 本批返回 `2026-10-27-f-legacy-recovery-assembly-return.md` | `faf6525408e438fbe82f1b17cd7623ffa1aa8b7df512525998c18eecabc96009` |
| 本批执行清单 `2026-10-27-f-legacy-recovery-assembly-execution.json` | `1fc4211c3426c460a6167754320c7a267844e1f585aee72d63c69bf81862172b` |
| 本批计划 `2026-10-27-f-legacy-recovery-assembly.md` | `5272dce4bb069a30ddf477ab3fabaffd65db26cb3731a18cbc3e6ffa8dddd0a1` |
| `scripts/legacy-draft-recovery.mjs` | `a7e2f81d260183b2e445b7d1bb765946a97fb6ef347eb7adb2be7460feb1f6fd` |
| `scripts/f-development-assembly.mjs` | `e5c786da8b2d7feca02ce231a84b3c2bb0aac4df7b18772ee037d2b913d161eb` |
| R7来源准入 | `e9ae83ecb2abe5bf75759fceb0e4c75266d558cd9a99ab6ee254e5205167e37e` |
| 最终R2 `evidence/f-assembly.json` | `4da7c0862c923d278ada94871c55fdcc34831b2c591ac66cabfdc952092724e2` |
| 临时恢复实际 `proof/lib/client.js` | `36523141df5f4a13726d89f4b18d2a90f007d49782f099822295c4dda45df350` |

重新读取根/项目AGENTS全文、协同README和项目登记的DSH身份/状态指针、本批计划、当前F状态、R7修复复审与原FH-A01记录。项目current_entry确由`progress_sources`定位。本次不制定或修订计划；作者规划读取的14份来源快照和hash作为被冻结成员核验，不冒称本审计重新全面评审了所有兄弟项目。

审计仅新增本报告。没有修改代码/测试/历史报告/准入，没有启动Desktop、Host或浏览器，没有运行clone、seed、contender或业务执行脚本，没有安装、读取/迁移认证、上传、模型/API调用、聊天发送、费用、Git提交/推送或发布。Electron仅设置`ELECTRON_RUN_AS_NODE=1`作为解释器。反例写入均限新临时目录，或纯进程内store/fence，并已清理。

## 2. 必改发现

### F-LA-A01 / P2：准入没有把实际App和Node重新绑定到已审来源

位置：[f-development-assembly.mjs:59](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-development-assembly.mjs:59)，实际启动使用该文件95–102行。

`baseFor()`验证了R7原件，`composition()`重新推导了依赖/配置，但`verifyFAssembly()`没有要求`pin.app`、`pin.node`与R7相同。`verifyPins(pin)`只验证清单中已有条目；原App被正确验证，并不证明`--start`最终选用的就是该App。95–98行随后直接采用可改写的`pin.app/node`。

独立反例：在临时目录调用`createFAssembly()`，仅把新`f-assembly.json`中的`app`改为另一个临时`wrong.app`，原R7、配置、依赖及所有pin完全不改，`verifyFAssembly()`仍返回`F_ASSEMBLY_INPUTS_ONLY`。另一个临时反例把App设置为包含假`Contents/MacOS/DSH Desktop`文件的目录，检查仍接受，`makeLaunchSpec()`选中的可执行路径正是该未审文件；没有执行它。

影响：支持入口允许检查了一个固定App、实际选择另一个App，违反固定组合和启动前拒绝漂移的合同。CLI的“当前process.execPath等于pin.node”同样不能证明该Node属于R7。

修复要求：从已审来源重新推导并严格核对所有影响实际执行的身份字段和必需pin，不能只追加可由本地清单自行选择的hash。保留当前R2准入，不重签旧对象。

### F-LA-A02 / P2：物化冻结只信布尔及文件存在，实际解析可以偏离

位置：[f-development-assembly.mjs:73](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-development-assembly.mjs:73)、同文件76–88行。

`requireMaterialized`只读取`pin.materialized`；seal只确认四个metadata文件存在、记录其hash，并在seal当时检查三个强制依赖的realpath。后续verify没有要求完整物化pin集合、metadata结构/固定解析闭包或当前依赖link目标仍正确。

三个独立反例，均未调用pnpm或Host：

1. 新建inputs-only装配，把`materialized=true`写入清单，不生成任何物化metadata，`verifyFAssembly(root,{requireMaterialized:true})`仍返回`F_ASSEMBLY_PREFLIGHT_ONLY`，179pins。
2. 新建装配，四个metadata文件内容全部写成`{}\n`，只建立三个强制依赖到真实来源的symlink；`sealFAssembly()`成功，183pins。这不是有效的固定pnpm物化结果。
3. 在第2例seal之后，把`node_modules/dsh-storage-json-single-owner`的symlink换到空的`unreviewed-guard`目录；不改变冻结文件，verify仍返回`F_ASSEMBLY_PREFLIGHT_ONLY`。

这些反例脚本退出0表示成功复现错误接受，不代表产品通过。当前实际R2的metadata/pin未发现漂移；缺陷是维护入口不能可靠拒绝另一种物化状态，不能从“本次作者装对了”推出“入口已强制装对”。

修复要求：输入/物化状态必须由可验证实物推导；核完整metadata集合、语义及固定manifest解析关系，重复检查所有实际依赖目标，拒绝删除pin、伪造布尔及seal后解析漂移。原R7、当前R2和失败反例保持原件。

### F-LA-A03 / P2：临时恢复slot有检查后覆盖窗口

位置：[recovery-client-template.js:13](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-orphan-assembly-20261027/recovery-client-template.js:13)，15–21行；实际`proof/lib/client.js`中的同一seed代码。

seed在13行检查checkpoint/fence为空，随后逐文件异步计算SHA，21行直接写fence并`store.put()`。异步期间产生的新草稿checkpoint/fence没有再次参与原子拒绝条件，可能被旧恢复包覆盖。原生checkpoint控制器自己的非覆盖保护，不能保护另一个直接写IDB的seed操作。

独立反例直接执行原模板，用实际`validateDraftCheckpoint()`、内存store/fence与可控digest Promise：

```text
seed检查无记录/无fence → 文件digest等待
另一个合法checkpoint落盘：draft=USER_EDIT，generation=USER-GENERATION
释放digest → seed写入OLD_UNSENT，generation=OLD-GENERATION
最终checkpoint与fence均被旧包覆盖，overwritten=true
```

复现退出0，无真实IDB、浏览器、Host或网络。另把实际client的嵌入helper/package段归一化回占位符，所得源码与模板逐字相等，确认不是只审到未使用模板。首个审计harness因缺少`ConversationController`桩而退出1；补齐该桩后复现，再改用实际validator复现成功，未把harness错误算作产品缺陷。

影响只限本次显式fixture路径，默认装配没有该包；但该路径承担本批恢复，且计划Review Focus明确要求非空草稿/已有fence不能被覆盖。检查时为空不足以满足此合同。此竞态不等同于、也未证明是F-LR-01的根因。

修复要求：在文件校验后重新核活跃草稿/归属，并以事务内add-if-absent或等效原子条件拒绝新记录；同时保护fence所有权。单独再加一次非原子get不能关闭该窗口。

## 3. 具名归属、字节与恢复事实的可接受层

原workspace库只有workspace `71120098-c4d4-4075-bddd-49e1371eb8f7`拥有`session-afaffbc1-9b24-4447-a7fa-98f0daef6428`，路径是原`followup-20261026/workspace-a`。原Session投影cache的identity.cwd相同、blank=true、inbox为空、turns/steps为0。本审计只对清单具名原件读取/核hash，没有扫描其它Profile。

原2026-10-26执行清单的SHA绑定历史AX `f-native-attachments.ax.txt`；其中选择的是A，原稿为`F20261026-A-UNSENT`且有两个文件。当前原工作区文件、Host named-files、file-objects与两套关闭后新IDB Blob的字节一致：

| 文件 | 字节 | SHA256 |
|---|---:|---|
| F-public-ordinary.md | 96 | `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357` |
| F-public-long-150000.md | 449990 | `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393` |

独立只读执行`prepareLegacyDraftRecovery()`，返回对象与冻结`legacy-package.json`深度相等。该函数核canonical路径、唯一成员、具名AX/SHA、原工作区与命名孤立存储字节，不写Profile。它并未通用解析或验证任意Session历史；实际Session cache/原AX的关联由本次具名实物另行核对，不能把7个单测外推为任意孤儿可授权恢复。

本次用户明确限定公开fixture的授权、唯一成员、历史AX与原文件共同支持这一次重建。hash本身没有取得跨项目权限；新包不构成旧上传receipt。固定file-upload源码的`FileUploads.stagedFiles`确为`WeakMap<Session, Map<...>>`，Session dispose删除其记录，receipt由新UUID生成。没有可据此恢复原未发送receipt的持久映射。lastModified原值未知→0、MIME为恢复时选定text/markdown均已准确披露。

R1首次/正常重启及A→B→A的AX支持18字符、2文件/error、同A Session；B为0字符/0附件。R2后两次启动的完整AX均支持同A Session、18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`、attachmentCount=2/referenceCount=0。独立查看R1重启后与R2最终重启后截图，两卡片均为“上传失败，点击重试”，发送禁用。长AX截断处不足以证明第二文件SHA，字节结论来自具名关闭后Blob实物，未用截断JSON补认。

新Profile保留原公开workspace路径与IDs、Host/浏览器存储在新root的映射有明确记录；原Profile17文件独立全部一致。原FH-A01仍是原Profile失败，后续新副本成功不能倒签旧失败。临时slot向本补丁拥有的IDB写新checkpoint，没有原生上传/Send；A03使其普遍非覆盖保证暂不接受，但不能据反例否认本次已观察到的字节/身份事实。

## 4. F-LR-01：已知P2冷首次接续限制保持

R2第一冷加载AX第37/46行显示输入无正文、公开摘要为chars=0/attachmentCount=0，恢复状态为已seed；随后两次同配对正常启动的AX为18/2。**第一次冷接续的界面恢复失败，后两次成功不能改写它。**

作者记录当时出现“当前草稿已变化，未覆盖”；这一瞬态提示没有保存在该份冷AX中。本审计能独立确认0/0与后续18/2、相同Session及最终Blob字节，提示原文属于作者当时观察，不能冒称本审计在原AX直接读到。固定helper在changed/revision等冲突时保留旧快照的分支确实存在，但本次没有证明R2具体触发原因。

分级为P2：冷接续是恢复功能的主要可用性目标，首次无原稿/附件直接影响使用；现有证据支持保留快照并可经正常重启恢复，未见数据丢失或自动外传，因此不升P1。该限制已如实披露，接受范围可止于具名重建及两次后续恢复事实；**首次冷接续可靠性、稳定自动迁移和完整恢复层不接受**，不能只改文案将其关闭。

## 5. 新鲜独立验证与保全

实际运行下列同一五文件并集，工具Node与官方Electron内置Node均退出0，各43通过/0失败/0跳过；分别为新恢复7、装配7、既有checkpoint20、guard9：

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node --version
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap scripts/tests/legacy-draft-recovery.test.mjs scripts/tests/f-development-assembly.test.mjs scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs scripts/tests/storage-json-single-owner.test.mjs
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --version
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap scripts/tests/legacy-draft-recovery.test.mjs scripts/tests/f-development-assembly.test.mjs scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs scripts/tests/storage-json-single-owner.test.mjs
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --check .dsh-test/f-legacy-assembly-20261027-r2
```

解释器版本分别为v24.21.0/v24.18.1；最后CLI实际输出`F_ASSEMBLY_PREFLIGHT_ONLY / realCallBudget=0 / mandatoryComponents=3 / pinnedFiles=186 / materialized=true`，退出0，没有`--start`。这证明本次实际物化对象通过现有检查，不能反驳A01/A02对检查充分性的反例。

独立复算：172成员/172一致、R2 186pin/186一致、原公开Profile17/17一致、初始3554文件0缺失/0变化。五组原始启动/退出JSON与执行清单逐项相等，R1两组、R2三组均退出0。读取实际第二SDK contender源码/日志/结果，支持`DSH_STORAGE_ROOT_BUSY`、未注册后端/未开Domain/业务SHA保持；没有重跑该Host脚本。

R1原脚本/测试/准入备份存在且归首版；当前脚本已加固，不宣称当前R1路径的旧pin仍通过。原R1本地重签guard/stock两RED保留，加固后7项绿色只覆盖其已编写断言，A01/A02仍漏验。

本审计没有重跑无关整包build/verify。已读冻结原日志，分别确认：平铺临时副本build complete后`verify`退出1，1419项/1342通过/77失败；原路径串行业务日志1480/1480通过；副本pack dry-run127成员、3186137展开字节。它们是不同命令/布局的证据，不能合并成原verify变绿。

独立计算临时重建client与实际已审业务candidate同为`ceebb8d3db6914ac25961533402f83db1a2c7706d5c9dc836606dbb2d9ca89b5`；活跃主包lib仍为`2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`。未以这次审计覆盖原包。最终`lsof -nP -iTCP:57583 -sTCP:LISTEN`退出1且无输出，两新root均无startup.lock；HEAD未变化。

## 6. 接受与拒绝判断的准确边界

| 层次 | 首轮裁定 |
|---|---|
| 这两份公开fixture的原归属/字节与只读恢复包 | 接受具名证据重建事实；原metadata/receipt缺失仍明确 |
| R1/R2后续正常重启与相同A身份下18字符/两待重试文件 | 接受实际观察子集；不倒签R2首次成功 |
| 临时恢复入口的非覆盖保证 | 不接受，A03待修 |
| 当前R2实际来源字节及受保护Host竞争记录 | 可核；仅对本次准确对象/守约入口成立 |
| 来源化固定开发装配/启动入口的强制准入 | 暂不接受，A01/A02待修；不得描述为全写入者或发行保障 |
| 首次冷接续可靠性 | 不接受，F-LR-01/P2仍开放，根因未定 |

Declined-to-judge：本轮没有实际Host重新上传、外网传输、模型收到正文/附件、原生模型/API UNKNOWN、真实Desktop运行中断、任意孤立材料自动归属、跨平台/多Renderer、双存储不可更新/未提交事务崩溃、日常安装、发行全写入者强制接续、升级回退或专业/用户接受的充分证据，不作通过裁定。U1/D1、新版API映射、超150000固定文件引用、G/H及阶段6沿原剩余表继续开放。

三项必改须另行修复、冻结新对象并复审；本首轮报告及其绑定的返回/执行清单/R2准入保持原字节。
