# F旧附件/固定装配：首轮P2修复返回（R3）

2026-10-27，zsh，根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`；分支/HEAD沿 `mac/continuity-v2` / `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。本返回等待同一GPT6.1 Max独立复审，不预写接受。首轮返回/执行清单及[首轮审计](2026-10-27-f-legacy-recovery-assembly-independent-audit.md)保持原字节；三项新增P2、R2首次冷接续限制与原verify失败不改写。

## 修复及反例

**F-LA-A01：** 实际App、Node、基础版本、准入来源及conversation版本必须与固定来源/自有v3完全对应。根在临时目录先复现未审App被选择/假materialized被接受，但未执行它；新增两App/Node变造回归先RED后GREEN。只验证原App的pin不足以允许另一可执行路径。

**F-LA-A02：** 不再单独信materialized。固定单importer lock的全部依赖specifier/解析路径、pnpm11.8.0/hoisted模块状态、workspace项目及settings、package-map与全部7个实际link每次复核；完整来源/配置/物化pin集合必须存在且吻合。v3组件自己的单包解析闭包也核验。伪布尔、任意四份`{}` metadata、seal后换guard link、移除物化pin、自改package-map重签均拒绝。对这两项及相邻路径共7新增回归先RED（原7通过/新7失败），修复14绿；再以2项RED保证必须选择精确v3，最终装配16绿。物化正例实际调用固定pnpm离线冻结锁/忽略脚本，未手写元数据。

**F-LA-A03：** 恢复操作移到源码 `patches/f-host-assembly/legacy-draft-seed.mjs`。全部File校验后，再核生命周期、当前公开归属及目标是否正活跃；已经存在checkpoint或fence拒绝。持久化使用本补丁IDB的事务`add`，仅不存在时插入；输给并发写入或失败时仅移除自己的fence，不清新用户generation。临时slot读取最新render的公开session/rows，并传入effect生命周期守卫；不再用旧的absence检查跨异步digest后无条件put。7项先RED后GREEN，覆盖digest期间用户落盘、absence后原子竞争、目标活跃/销毁/归属变化、既有fence与失败兜底。实际浏览器执行的是这些同版源码嵌入后的seed/IDB add。

**F-LR-01相关误冲突路径：** 根在实际固定SnapshotStore独立复现：加载期间仅发布新queue对象，draft/rev/phase/refs/attachments不变、无用户编辑，旧helper仍报changed/不恢复。固定facade的inbox订阅确可publish新对象。此证据形成于首轮报告冻结前后，未倒认R2具体事件全因已明。

另版 `conversation-draft-checkpoint-3.mjs` 对完整固定官方client及冻结v2 helper精确转换，旧R7 helper/transformer/pin保持原字节。v3加载期间只有相关输入指纹变化才置changed；真实编辑、编辑后清空并增加revision、phase/引用/附件变化及异归属守卫不放宽。4项先RED后GREEN（实际Store无关通知、真实编辑、编辑清空、精确转换/拒绝漂移）。新私有组件 `0.2.0-rc.2.oasis-draft.3` 的Node half/其余manifest和固定依赖沿R7；构建产物逐字重算验证。基础Desktop/DSH/Cordis/Sidebar不升级。不是保证R2首次失败只有这一个原因，也不是跨平台稳定性接受。

## 当前配对与实际Desktop

新Profile `.dsh-test/f-legacy-assembly-20261027-r3`，最终196pin；R1/R2原准入和操作原件保留。该副本仍只复制两个具名公共存储及原Session文件，不复制credentials/userdata；原workspace路径/ID保持，新Host/IDB在新root。受支持装配入口必须具备精确v3 artifact，缺件不退回v2。新artifact是保留的本地交付，未变为独立发行包。

R3首次冷进入原A会话已直接恢复：session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428` / workspace `71120098-c4d4-4075-bddd-49e1371eb8f7`、18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`、attachmentCount2/referenceCount0；两卡片均需明确重传、发送禁用。B为0字符/0附件，回A同ID/原稿/两卡片；正常退出并同配对重启再次保持。`R3-first-cold-restored`、`R3-workspace-b`、`R3-a-after-b`、`R3-after-restart` 的实际AX/截图分别留存；截图已查看。

重启前及最终关闭的两份新IDB Blob分别为96字节/SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`、449990字节/SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`，仍等于原workspace/孤立存储字节。原receipt没有复用，原lastModified未知仍置0。两次R3启动/正常退出均0，连同首轮5次共7组退出0；退出0不改变R2首次恢复失败。R3持锁时第二实际SDK Host再次被拒绝、未注册后端/未开域/零业务写入。全部受控应用已关闭，57583无监听/入口锁释放。

## 验证与保全

工具Node24.21.0与实际Electron Node24.18.1各 **63通过/0失败/0跳过，退出0**：归属7、装配16、atomic seed7、v3增量4、既有checkpoint20/guard9。没有扩写业务来源，首轮原路径串行1480/1480、临时构建/127成员pack按未变业务源码和依赖复用；平铺副本原verify的77失败保留为失败，不声明变绿。

首轮172成员中4条工作路径有意修复，168条当前仍原值；4条旧值均有修复前精确备份。旧R1/R2准入中的脚本hash继续绑定相应旧版原字节，不能拿当前脚本宣称原准入全匹配。新修复执行单列关系/成员/命令/当前配对及原17文件、3554既有文件的保全。本次状态入口尚待审计后接续，不改冻结原件。

交接前重新核14项规划输入时发现2项并行导航追加：中心索引增加IS06草案引用，兼容矩阵追加明确不变更原条款的草案导航。已按差异重读并另存当前字节：移除新增导航字段后索引其余深度相等，原兼容正文逐字保留，原DSH工作包/合同/授权没有替代；没有自动采用未签收草案。其余12项未变，细节见私有`repair-planning-delta.json`，不重写首轮读取快照。

新增真实模型/专业API/外网上传/原生重传/消息/费用均0；无认证读取或迁移、日常Profile/签名App修改、提交推送发布。未知原运行不重发。

## 复审边界

请求关闭三项新增P2及具名无关通知误拒恢复路径，并接受当前R3这一首次冷/正常重启、两旧公开附件具名重建及支持入口的无模型开发子集。原FH-A01及R2首次失败保留；任意孤儿自动归属、原receipt、真实Host重传/模型收到附件、真实M06/API UNKNOWN/Desktop运行中断、全写入方发行/升级回退、多Renderer/跨平台、双存储失败/未提交事务崩溃等仍未证明。完整F、U1/D1、新版API映射、超150000固定文件引用及G/H/阶段6继续开放。
