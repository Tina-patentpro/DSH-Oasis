# F旧孤立附件归属恢复与开发装配接续返回

日期2026-10-27；zsh；根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支 `mac/continuity-v2`，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。用户本轮要求继续完整F、优先旧孤儿附件/正式装配、保留失败、无新增真实模型/API/费用，结束由GPT6.1 Max独立审计。本返回先冻结待审实现与证据；实际审计结论另报告接续。

## 1. 旧附件的准确归属与不可恢复部分

原 `docs/evidence/2026-10-26-f-host-recovery-execution.json`、原native-attachment-recovery-gap及全部首轮/修复审计保持原字节。原Profile `.dsh-test/followup-20261026` 仍保留当时两附件芯片冷恢复失败FH-A01；本批没有启动、修写或倒签该Profile。

原workspace.json唯一成员关系为workspace `71120098-c4d4-4075-bddd-49e1371eb8f7` → session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428`，原Session元数据cwd与workspace-a相同。具名历史AX由原执行清单SHA绑定，显示所选workspace-a、`F20261026-A-UNSENT`以及两个待发送文件。原观察记录另绑定普通96字节/长稿449990字节；当前原workspace文件、原Host孤立存储的named-file及file-object字节三处均等于原SHA。

`scripts/legacy-draft-recovery.mjs` 只读核这些准确输入，不扫描其它Profile，不按同名或hash单独授予归属。错误工作区、Session缺失/多义、证据/内容漂移、链接或外部路径拒绝；返回的新包在私有 `legacy-package.json`。这是本次明确授权的公开fixture历史证据重建/具名恢复，不声称原生持久库曾记录上传归属，不能外推所有孤儿材料可自动归属。

| 恢复对象 | 字节 | 原/孤立存储/新IDB Blob共同SHA256 |
|---|---:|---|
| F-public-ordinary.md | 96 | `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357` |
| F-public-long-150000.md | 449990 | `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393` |

官方固定file-upload实现将未发送receipt存于 `WeakMap<Session, Map<receiptId,...>>`，退出即丢失，无持久恢复接口；原Session记录亦没有已发送文件消息。新恢复不制造旧receipt/attachmentId。原浏览器File.lastModified未取得，置0并标未知；恢复MIME选text/markdown用于本批文件，不声称旧元数据完整恢复。

## 2. 新副本实际恢复、重启及A/B

首个Profile `.dsh-test/f-legacy-assembly-20261027` 与加固后最终Profile `.dsh-test/f-legacy-assembly-20261027-r2` 各只复制2个具名存储和原Session文件；没有复制credentials或整个userdata。原workspace/session身份及公开fixture原路径保留，Host存储和新浏览器IDB均在新Profile，原资料未改。新root的workspace-a/b隔离目录供launcher核界，不伪称它们是原资料位置；具体映射见执行清单。

临时public slot `f-legacy-recovery-proof` 对当前公开workspace列表再次核唯一归属后，把具名包写入**本补丁拥有**的新IDB checkpoint；已有记录或fence即不覆盖。临时包仅在该具名装配测试中显式固定三文件SHA引入，默认装配没有该包。它没有读写DSH私有store，也没有native上传或发送；正常恢复仍由已审原生checkpoint控制器执行。

原候选两次实际Desktop启动/正常退出均code0。首次选回原A会话后，原生输入18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`、attachmentCount2/referenceCount0；两文件显示“上传失败，点击重试”，发送禁用。正常重启同身份/原稿/两卡片保持；B会话0字符/0附件，回A同原session及两附件保持，恢复包状态明确already-present-not-overwritten。空历史会话在未选中时按原生规则隐藏，通过原生“在workspace-a中新建会话”入口复用原session，实查ID未变；没有为显示补造用户消息。

最终R2另有三次启动/正常退出0：首次冷会话加载时触发“当前草稿已变化，未覆盖”，原18字符/两附件checkpoint保留而界面为0/0；没有断言首次恢复成功。随后正常重启从已有快照恢复18字符/两待重传附件，再次同配对正常重启继续保持，相同workspace/session/原稿SHA。`R2-first-cold-conflict.ax.txt`、before/after-final-restart摘要及截图分别保留。首次冷绑定的初始化/异步通知触发冲突的准确根因未定，列F-LR-01待审限制；没有放宽用户修改守卫或隐瞒冲突，把重启后的成功倒签到首次加载。

公开AX的单个长输出被截断，不能用截断JSON证明第二文件hash；完整字节另由关闭后新IDB Blob原件（重启前、最终关闭两套）计算，两文件均精确等于上表。已读取/保存实际截图，来源、卡片、Session及字节层分开。全过程未点重传或发送。

## 3. 正式装配接续范围

`scripts/f-development-assembly.mjs` 新增维护于源码的create/seal/check/start入口，复用原Mac隔离launcher。准确R7准入SHA固定为 `e9ae83ecb2abe5bf75759fceb0e4c75266d558cd9a99ab6ee254e5205167e37e`，逐pin核已审组件，强制checkpoint/路径桥/单所有权guard及stock-json禁用、模型/账户/自动执行禁用。只生成不存在的新root；固定pnpm11.8.0离线/锁冻结/忽略脚本物化。输入准入保留，物化后仅seal一次；未seal、缺强制组件或漂移不能启动，无real-acceptance入口。

最终R2的186pin配对包含临时恢复fixture；固定基础仍Desktop2.0.17 / DSH0.2.0-rc.2 / Cordis4.0.4 / Sidebar0.24.1 / 原UI，conversation仍 `.oasis-draft.2`。没有升级、替换签名App或改旧R7准入。新入口从已接受的明确artifact路径装配；依赖保留原本地交付目录，移动/丢失即拒绝，不把本次声明为独立发行包或日常安装接受。

冻结前自查另发现：首版只校当前pin/必需字段时，本地重算pin可换guard路径或追加stock-json启用。两反例先RED（5通过/2失败），最小加固为按已审R7重新推导强制依赖和完整配置，当前配置必须与之完全一致，重算本地pin也不能替换这组组合；7项GREEN。首版脚本/测试/准入原字节备份保留，原Profile两次操作只归首版；加固后另建R2，未重签原准入。旧R1当前工作路径中的脚本已更版，不能声称旧R1准入仍可通过当前检查。

实际Desktop持有新root存储时，第二个实际SDK Host通过同一guard被拒绝 `DSH_STORAGE_ROOT_BUSY`，未注册backend、未开Domain/写业务，前后业务文件SHA一致。保护对受支持/守约写入入口成立，任意旧无保护Host仍可绕过；全写入方发行/权限强制接续尚未验，不制造全局存储保障。

## 4. 新鲜验证与保全

新归属恢复7项、装配7项及既有checkpoint20项/guard9项并集，工具Node24.21.0与实际Electron内置Node24.18.1最终各43通过、0失败/0跳过，退出0。加固前各41通过只归首版。新测试先失败再实现；夹具语法、Mac临时目录canonical修正以及错误分支先触发文件名校验等过程日志保留，不称它们为产品修复或成功。未修改既有20/9测试或产品补丁。

整包验证另见本批执行清单：平铺临时副本的原 `pnpm run verify` 实际失败（1419项，1342通过/77失败，exit1），构建阶段成功；失败涉及原测试所需仓库相对目录缺失及隔离Home精确路径，不抹除。后续原位置同版业务测试以既有串行方式1480/1480通过，exit0；临时副本pack dry-run为127成员、3186137展开字节，exit0。这是分别取得的构建/原路径串行测试/副本pack证据，不宣称原verify失败变绿；未改测试、容量或超时。临时重建client为 `ceebb8d3db6914ac25961533402f83db1a2c7706d5c9dc836606dbb2d9ca89b5`，等于当前实际装配已审业务client；活跃lib原 `2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa` 不覆写。

原Profile17个具名相关文件无缺失/漂移；本轮起始3554既有源码/证据的保全以执行清单及状态写回前检查为准。新派发模型/专业API/外网上传/消息/费用均0；无认证读取/迁移、Git提交/推送、发布或日常Profile安装。

## 5. 完整F继续开放的出口

本批可审的是：这两份旧公开附件在原归属的新Profile副本中恢复为人工重传草稿，以及来源化固定开发装配入口。原FH-A01失败原件保留；原metadata缺失的receipt/最后修改时间、任意孤立文件自动归属、真实Host重传/模型收到附件不关闭。当前原文件/权限变化后的材料需重新核对，不能由本包普遍授权。

完整F仍缺真实M06原生模型/API UNKNOWN及Desktop运行中断、发行全写入者强制接续/升级回退等证据；双存储故障、未提交事务崩溃、多Renderer/跨平台版本等限制沿R7报告。超150000固定文件引用、U1/D1、新版API映射、专业/用户接受及G/H/阶段6继续在剩余表，不因本批部分恢复关闭。用户暂不新增真实调用/费用的边界持续有效，历史UNKNOWN不重发。
