# F-UR-A01修订独立复审：shell前导与R2生命周期

**F-UR-A01／P2在本修订范围关闭。限定接受新冻结版本的普通用户持久恢复入口、R3原生新装／成功升级／回退及已发布升级失败的明确恢复子集；新增Critical／P1／P2／Minor必改项均0。完整F仍OPEN。** 首轮FAIL不改签；R1初装ENOSPC仍为保留的失败，不算初装中断恢复通过。

复审者：同一独立审计代理`/root/audit_f_user_recovery`，接续用户指定的Max审计任务。日期：2026-10-29，UTC／Asia/Shanghai；准确时间、argv、环境及退出码见各JSON。没有启动GUI、执行真实Installer或恢复写入、修改实际安装根、读取认证、发起业务模型/API/上传/Send/费用、提交或推送。复审夹具、日志和验证器仅新增于`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent`。

## 1. 输入、规则及源码绑定

- Git基线：`main`／`57e8edf2fe29341546caaf663558ae454c1756c2`，候选未提交。
- [新冻结执行包](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-29-f-user-recovery-A01-repair-execution.json)：**`0497bc938f1cd6c6c22a26da0118f75b2eb80df1da128368d099d0bcf0ecbe1b`**，433个普通文件＋14条符号链接。
- [修订回执](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-29-f-user-recovery-A01-repair-return.md)：`1e9d33993ac30e0133717b6f5b7c7541dc921f425c3807e00bd200730c4f1ef0`。
- [首轮独立FAIL](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-29-f-user-recovery-independent-audit.md)：`8fce619f722d180b6c889405ef9bed23d8a5e8f3e7cd2dbb6aea928fab5d4e7c`；原334/14包`4139d900c4524aa8496951294f375ec71d60c0cc5c1672d7e449db7edae85c3e`及两份原失败源码归档字节均复核未变。

按EXEC-R2重新读取根／项目AGENTS全文和协同README，重新解析登记表、独立索引、`progress_sources.role=current_entry`及整体／本项目NS1-R1、P28的准确path/anchor，重读相关计划、身份/保全合同和F范围。协同1.2.1、整体规划1.3.1继续有效，16项完整原始字节输入相对首轮独立审计无漂移；无关历史及补充章节仅核身份，不冒充全部正文已重读。实际读取范围、hash、快照、适用理由、差异和审计授权边界见[execution-preflight.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/execution-preflight.json)。本次是原Task3的问题定向复审，不由规划、复核或报告产生新的运行/资金/发布许可。

| 程序／测试源码 | 最终SHA256 |
|---|---|
| `scripts/f-user-recovery.mjs` | `f024f823dfec2dadacc3d87d628ffc22273ec568567e0e54d558992bd192d049` |
| `scripts/f-native-installer.mjs` | `37eb5e87693d03b5c57a82a0a9b4f4f5758a48a37f9ae2404cfda1e7f72ffe2f` |
| `scripts/f-installer-transaction.mjs` | `4b2ed96e43ddbe10c752003cf814485dba325fd45837240d6524367162442264` |
| `scripts/f-installed-runtime.mjs` | `31eab06e52103868f8a60bf4d19e0238fcfcaa1b29ad7a164c8afc9dedfd4ed5` |
| `scripts/tests/f-user-recovery.test.mjs` | `0b6a45b5058b3d16b15bca3083be3f673f428fe98eb58552be70ddf302c44345` |
| `scripts/tests/f-native-lifecycle.test.mjs` | `0d2333025d361f5e2ea3b4bb005529807570ef444cd7b47dfe1351b8bda3c352` |
| `scripts/tests/f-shell-entry-environment.test.mjs` | `55ec93d6149c7a6394a490268eb81a6124bdc6d8c91739a253eab8ce26303697` |

以上七项的live、frozen-source、R1/R2构建前记录一致。固定runtime、租约/provider和transaction恢复资格没有再次修改；两个旧测试保持原字节。逐字节diff确认本次实现增量仅为两个shell前导先固定并export PATH，再使用绝对`/usr/bin/dirname`，另加两项回归；没有更换旧expected hash。见[source-diff-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/source-diff-independent.json)。

## 2. A01关闭依据与独立测试

修订的[持久入口第29行](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/frozen-source/scripts/f-user-recovery.mjs:29)和[原生postinstall第23行](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/frozen-source/scripts/f-native-installer.mjs:23)均在第一个外部命令前固定PATH并调用绝对dirname。原Node字节校验、helper导入前校验、Node预载清理和`env -i`均保留。

用同一自有恶意PATH／NODE_OPTIONS夹具，分别复制并执行原／修订launcher以及安装、升级、回退三个postinstall的**原字节**。四个原版本都在最终拒绝前写入恶意dirname marker，四个修订版本均未写入；复制入口的root绑定或缺少runner使其按预期非0退出，没有调用真实安装器或写实际安装根。新R2安装根真实`.command --list`在该环境下exit0，dirname与Node preload两个marker均未出现。准确源码hash、完整argv/env和输出在[independent-shell-path-verification.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/independent-shell-path-verification.json)。这直接覆盖首轮根因，未把“脚本最终失败”误当成“前导没有执行代码”。

新建clean-source由准确HEAD的`git archive`流入，git/tar均exit0；只叠加六份最终变化文件（transaction/native/user及三测试），未复制ignored依赖或`.local`输入、未安装依赖。构成见[clean-source.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/clean-source.json)。

| 独立重跑 | 工具Node24.21.0 | 实际签名App内Node24.18.1 |
|---|---|---|
| 原八份受影响脚本＋新shell脚本 | 49/49，exit0 | 49/49，exit0 |
| 首轮十项独立用户路由探针 | 10/10，exit0 | 10/10，exit0 |

App仅使用`ELECTRON_RUN_AS_NODE=1`；HOME/TMPDIR指向复审目录。精确绝对argv、cwd、env和完整日志见`affected-{tool,actual-app}.{json,log}`、`user-route-{tool,actual-app}.{json,log}`。十项探针继续覆盖：state/Profile/candidate/marker在持租约间隙变化时拒绝且不写确认；旧失败不能撤销随后成功升级及回退登记；活自有进程组、部分锁、被改transaction/ownership模块、Node预载均被拒绝或清除。原回执/journal、明确确认、取消和不回填业务数据的合同未放宽。

作者两项shell回归的RED2→GREEN2原日志与exit1→0已核对；作者22脚本168/168×两解释器属于其实现证据，本复审没有改称自己全量重跑。原干净全scripts的ignored输入缺件边界仍保留。

## 3. 新R2包与实际生命周期证据

新根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-user-recovery-A01-r2-20261029/public R3 A01 R2 ' root`，UID501。持久工具ID为`1b9a7869939f11cfc9640786e7919eaff72c3abb99407bf3a4aec5cbe1b93d48`，三次操作一致；没有覆盖原U1工具。

| 动作 | R2 whole PKG SHA256 | 原实际Installer证据 |
|---|---|---|
| 新装v3 | `bd81cd14cf6f6319182615bed53bd3e370a1d3d6ef9e85cbc81905b2b4ecfa64` | exit0／UID501 |
| 成功升级v4 | `cee76a00a15fc24f97ebdc95d9b2c077dba3810b20eb1f29769dda70e059932e` | exit0／UID501 |
| 回退已登记v3 | `46fada7cafb57406e5b7849a7099e53ee2825e4ed386ef3b4ccaef8b9be2b0b6` | exit0／UID501 |

独立对三个包做XAR TOC／gzip／odc CPIO流式核验，没有展开大包或复制payload。安装、升级各27174文件／14链接的字节、文件mode和链接目标与原固定bundle一致；准确request、五个companion源码、bundle.json和postinstall匹配。回退薄包的runner与v3固定Node一致、target-bundle/request/source准确，没有新payload。AppleDouble单独验证头部、表项边界与对应成员，不冒充正文或扩展属性等价。见[stream-verification.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/stream-verification.json)。

系统Installer的原argv、whole包/request hash、日志、UID回执和current/check一致；三动作各有一条派发记录。四次GUI原退出均0；已查看本批四份PNG和对应AX，标记`F-USER-R3-A01-R2-UNSENT-KEEP`及新增`V4_EDIT_KEEP`、业务“保留A01-R2升级后的新增编辑”在回退和恢复后均存在。升级、回退及明确恢复前后各九公开文件（三JSON＋六IndexedDB）均独立核hash并直接逐字节比较一致。CUA输入批超时说明与其后AX的已保存字段相符；不把工具超时改成App失败，也不把记录当作真人接受。

随后故障是安装根companion派发的一次升级，**与系统Installer成功升级分开**。公开manifest `e87c567c600cb00df211d380c27862fe4eb9fbe2ceff72463c6ccb8e40234cca`仅加故障标签，不改原v4 payload。原进程组/命令、SIGKILL、FAILED_OR_UNKNOWN_NO_RETRY、故障check1及ESRCH证据一致；没有自动重派。

真实PTY取消／确认两份原记录均含`PUBLIC_RECOVERY_EXIT=0`。取消前后27850项身份相等；确认绑定完整plan `d31fa8f0799df3c44b5a08c196438efe7aa3e275feaa5d5c49c67ec6775947b5`，与journal、选择编号、同事务consent一致。失败Profile树摘要`460c8dd95d158ece0ff1259bd813ffe102be26bcc97d41e7cedd066e64343efd`及两原锁hash已直接核对。

新失败候选归档31417成员（27179文件、630链接、3608目录）全部流式比对原路径/字节/mode/link映射，重建原JS树摘要`9a669185a9e31140c5eb282bae2b75a574acaf16f609633e4194cc10f58e674a`，与原plan中的candidateSHA256一致。whole归档SHA256为`60664c3f2614430f1ca1c56ea9c22fbe19967f4c7b1794b2a48fced53ac1bed3`；展开副本退休不等删除失败字节，原Profile、锁、事务和确认仍在。

复审新运行R2与旧U1的只读check及两根各两份vendor App签名验证，共六条命令均exit0，签名约束包含固定Team ID。R2真实恶意环境列表另已exit0。当前R2九公共文件匹配最终关闭快照；两业务任务run/remote/generation均空，合成UNKNOWN dispatches=0；57593关闭，两启动锁和marker均无。R2根63545项元数据（含mode、uid/gid、inode、size、mtime/ctime、链接目标）复审前后相等。见[data-and-runtime-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/data-and-runtime-independent.json)及同目录只读命令JSON。签名通过仅证明原vendor App，不代表外层PKG已签名或获正式发行批准。

## 4. R1空间失败、COW维护与历史保全

R1实际初装Installer exit1与准确包ID的系统ENOSPC日志一致；没有成功安装回执，`installation.json`仍不存在，原`RECOVERY_REQUIRED` SHA256为`fa4096bc7a24b29c7bebce4d84cf15d6432ba0635dabde0dea485ba04bdccbd6`。原部分安装20824项文件/链接树逐项匹配保全记录；三whole PKG、原派发/退出/系统日志保持。后续使用新R2根，不把R1失败补签成成功或初装恢复验证。

对独立维护记录与当前原路径作有界全量核对：

| COW保全对象 | 独立检查结果 |
|---|---|
| 三份旧审计clean-source | 747个映射文件字节/mode/nlink一致 |
| 旧U1大程序副本 | 134个映射一致；原inode退休后的文件仍按原路径保留同字节 |
| U1／R1 control Node | 2个文件与固定来源同字节、nlink=1 |
| 旧U1其余程序与完整根 | 54180个映射一致；当前55924项文件/链接符合保全树，仅已释放的两维护锁按明确范围排除 |
| R1部分安装 | 20818个映射一致；完整20824项失败树及marker保留 |
| 新R2 v3／v4程序 | 各27826项程序文件/链接全树符合维护前记录；27158／27157个准确来源映射一致 |

所有映射目标及source均为普通文件、nlink=1，inode彼此不同；字节与mode核对一致，不是硬链接替代。R2各维护阶段公开JSON与相应准确阶段快照一致；后来合法GUI编辑没有被误当维护漂移。维护脚本中的Mac `cp -cRp`／`clonefile`调用及租约包装已审阅，当前旧U1/R2 check和固定签名也重新通过。没有独立读取物理extent映射，不声称共享率、inode/时间/扩展属性等价。旧首轮只读区间早于这些另记维护；不能跨区间把旧inode快照当作本轮“完全未变”的证明。本复审自身R2只读区间则有新鲜前后元数据记录。详见[cow-and-r1-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/cow-and-r1-independent.json)及独立验证器。

维护后独立复核旧九包全部131／109／109／54／152／326／39／270／185成员、首轮334/14和新433/14。旧326只用原A01已登记的一项历史副本映射，其余原路径；旧十包84条链接及新14条链接目标保持，expected hash未改。五份195pin仅按两份准确生命周期包scope解析；17个旧公开原件、另一工作树86文件及其变更集合、旧Mac分支和远端引用均一致。原3649跟踪基线仍仅两个既有脚本变化，新文件另列；原失败报告和两份失败源码归档一致。见[retention-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-A01-r2-20261029/audit-repair-independent/retention-independent.json)。

## 5. 接受范围与未关闭出口

本复审仅在上述源码、0497冻结、准确R2根及受支持入口范围关闭F-UR-A01，接受相应私有受控子集。普通用户入口仅处理有原发布回执的升级失败，先预览、明确确认，再按完整state/current和持租约后复核恢复；不自动派发、清锁、回填业务JSON或启动App。

完整F、初装／回退／恢复自身再次中断、工具跨版本迁移、任意磁盘损坏、未受控旧同用户writer及OS强制隔离、真实模型/API UNKNOWN、附件/业务产物安装后恢复、双存储/多个实际Renderer/跨平台、完整许可/签名公证/正式分发、专业与真人用户接受继续OPEN。R1 ENOSPC不关闭任何这些出口。没有由本报告新增真实调用、推送、发布或费用许可；后续本地Git收录沿原授权另记，不反向改变本报告受审身份。
