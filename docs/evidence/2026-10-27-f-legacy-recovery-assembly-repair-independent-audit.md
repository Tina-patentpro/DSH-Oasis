# F旧附件/固定装配R3：首轮P2修复独立复审

日期：2026-10-27，Asia/Shanghai；最终只读核验 `2026-10-27T09:26:43Z`。同一用户指定 GPT6.1 Max 独立审计子代理；未参与修复，未另开代理。

**结论：F-LA-A01、F-LA-A03在具名R3无模型开发合同内关闭；F-LA-A02尚未关闭，剩余必改P2=1。当前P1=0、Minor=0。整体装配准入暂不接受。** 接受v3所修复的“无关Store通知误拒恢复”路径及R3这一次首次冷进入A、A/B与正常重启的具名恢复事实，不外推跨平台/全部冷启动可靠性，也不改写R2首次失败。

首轮报告SHA `163bc998622a4366b378fe231e148ff7268117a5b91b2f1898adbfa1f384b18b`保持原字节；本报告仅接续修复，不把旧失败改签为通过。完整F、原FH-A01、原receipt、真实传输/模型/API UNKNOWN及发行继续开放。

## 1. 冻结身份与复审范围

根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh，`mac/continuity-v2`；BASE=HEAD=`035fe82b3f97b983bb561fbefff9ae1ea9d42862`。仍审具名未提交增量，不归并整个既有脏树。

| 对象 | 本轮独立SHA256 |
|---|---|
| 修复返回 `2026-10-27-f-legacy-recovery-assembly-repair-return.md` | `7d9415e1e9db02d78d3ae9f00fa2c7655a13d7f4387bc629edf8b1359eb7b337` |
| 修复执行单 `2026-10-27-f-legacy-recovery-assembly-repair-execution.json` | `0ee5084bca33b19e4b7a244928b149f7297abb4c2b0a8b9a3f9bd6799876868f` |
| 当前 `scripts/f-development-assembly.mjs` | `6449ff6a00bb2b65f9ec060b96f08f9ab6c23ed649b6ace14d6b21b3989f7536` |
| `patches/f-host-assembly/legacy-draft-seed.mjs` | `3d28172ad0264692c88694467cd9d11caae433acadbf4f72825a8bf0724ad63b` |
| `conversation-draft-checkpoint-3.mjs` | `b077af0b1b4b9ef1cdb2c663948089d94c7901703c1d1e6d03bbfe5ab6f0be57` |
| 旁置conversation3实际client | `cd934e1bb56e052fead53ec89ba79a9e0f2312abdf77d33fb0230c247682ff2d` |
| 临时proof3实际client | `25ab2ed6d306ae645428032d4dbfbb72f1fe4757cd0e520d214be96f6aabcf02` |
| R3最终196pin准入 | `a97f71acd50bd9d9c734e7853a7c8da38942109b9a712d3dff19a71975f947e2` |

沿首轮已读根/项目AGENTS、current_entry及本批计划/历史失败的范围复审；14份规划输入重新核身份，根/项目规则和其余10项共12项未变。另两项中心导航变化的准确差异见第7节。本轮不制定或修订计划。

只新增本报告，没有改代码、测试、冻结清单、历史报告或运行Profile。没有启动Desktop、Host、浏览器，未执行clone、实际seed或contender；没有认证读取/迁移、模型/API调用、上传、发送、费用、提交/推送/发布。测试和独立反例仅在进程内或新临时目录；固定pnpm只离线、锁冻结/忽略脚本物化临时正例。Electron均设置`ELECTRON_RUN_AS_NODE=1`。实际Desktop resolver只用于纯模块解析，没有加载业务Host或调用backend。

## 2. A01关闭：实际执行来源重新绑定

[f-development-assembly.mjs:103](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-development-assembly.mjs:103)现明确要求App、Node、base准入SHA、基础版本与conversation版本对应固定来源；composition又要求精确v3产物，缺件不能降级v2。之后才检查pin并生成启动规格。

本次新鲜装配16项包含App/Node变造拒绝、缺v3拒绝、完整v3选择及首轮guard/stock重签反例；两解释器全部通过。该修复针对实际选用路径，已消除首轮“验证原App却启动另一个App”的具名问题。CLI仍要求当前解释器等于固定Node；源码/签名被任意替换的通用防篡改承诺不在此裁定内。

裁定：**F-LA-A01关闭于当前支持入口与固定来源合同。**

## 3. A02仍开放：实际workspace与布局字段可自重签绕过

已修部分可核：[f-development-assembly.mjs:60](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-development-assembly.mjs:60)校单importer lock、直接依赖specifier与目标、pnpm11.8.0/hoisted元数据、workspace-state及package-map直接映射；99–121行强制完整pin集合并每次重核实际link。伪materialized、四份`{}`、seal后替换guard link、删除物化pin、重签直接package-map转向等首轮反例被拒绝。

但109–112行对Profile的`cordis.yml`和`pnpm-workspace.yaml`仍以**当前磁盘hash**生成expectedPins；这只能检查清单和当前文件相等，不能证明实际配置仍是受控原件。`checkMaterialization()`也未核实际workspace YAML和部分固定Desktop会消费的布局字段。

独立在新临时目录用真实固定pnpm完成物化并seal，随后分别复现两个错误接受，均未启动App/Host：

| 对原已物化对象的单独变造 | 重签范围 | 当前verify结果 |
|---|---|---|
| `pnpm-workspace.yaml`改为`packages: [.]`、`nodeLinker: isolated`、`autoInstallPeers: false` | 仅该文件pin | `F_ASSEMBLY_PREFLIGHT_ONLY`，193pin，materialized=true |
| `.modules.yaml.virtualStoreDirMaxLength`由120改为121；实际workspace仍用Mac默认120 | 仅该文件pin | 同样通过，193pin，materialized=true |

两个独立脚本均退出0，表示成功复现错误接受；193pin是无临时fixture的新临时装配，不是把当前R3的196pin改写成193。

此处有明确实际消费作用，不能归为未使用的metadata：固定Desktop `lib/profile-hhId3Pkk.js:610–630`的`reconcileProfilePnpmWorkspace()`会修改不符合的packages/nodeLinker/autoInstallPeers；`647–668`的迁移检查比较`.modules.yaml`中nodeLinker、pnpm代际、virtualStoreDirMaxLength与实际workspace有效长度。`949`传入workspace是否被修改；`lib/main.js:4689–4704`在迁移标志成立时调用`materializeProfile(updateLockfile:true)`。因此已通过check的这两种状态会进入启动期重新物化/改写，违背“启动前拒绝偏离固定装配”的目标。本审计未真的执行该迁移。

修复至少须覆盖实际workspace原件及上述有效布局比较，尤其不能只补nodeLinker而漏掉virtualStoreDirMaxLength；workspace缺省packages、autoInstallPeers、显式长度和模块中相应长度都应与固定组合相容。`cordis.yml`确由固定Desktop在每次boot重写为`[]\n`，故本轮没有把它的任意旧内容宣称为可执行插件注入；但入口若声称完整配置对应，也应核受控空root而非读当前hash自证。

这是首轮 **F-LA-A02的剩余P2**，不是再增一个重复编号。当前实际R3文件仍原值/196pin一致，不能由此关闭准入对其它状态的拒绝保证。须另行冻结修复及复审，当前159成员保持。

### 未消费package-map子字段的独立判断

实施者另指出linked entry.dependencies未限定为空。本审计确实证实自重签后新增guard子映射可通过现检查，但没有把它直接定为运行P2：固定`module-resolution-CTTB3FAS.js`/`package-overlay-Ca250500.js`使用Node解析、manifest与实体node_modules，没有读取`.package-map.json`；受控洁净环境未开启`--experimental-package-map`。

在临时真实pnpm装配安装**实际固定Desktop resolver**，把guard子条目的`@deepseek-ai/dsh-storage-json`映射改为`.`后，从实际guard anchor执行`require.resolve`，前后均精确落在原已固定extension-r3的storage-json路径，没有变化。全程没有Host。故不能把未消费字段臆断成已证明的执行旁路；本判断也不接受未来开启实验package-map模式或不同加载器的行为。A02的必改依据是上面已确认会被消费的workspace/布局字段。

## 4. A03关闭：异步校验之后检查，事务拒绝覆盖

[legacy-draft-seed.mjs:14](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/patches/f-host-assembly/legacy-draft-seed.mjs:14)在全部digest完成后重核live、最新归属和目标未活跃；存在checkpoint/fence即拒绝，await get之后再次检查。插入使用独立store的`readwrite`事务及objectStore`.add(record,key)`，失败只撤回本次仍拥有的generation fence，不删除新写入者fence。

独立重放首轮受控digest窗口：digest等待时写入合法`USER_EDIT/USER-GENERATION`，再释放digest。新helper返回`present`，原稿和fence保持、add调用数0；旧模板的同类序列曾覆盖为OLD_UNSENT。63项回归另覆盖absence后竞争、活跃/销毁/归属变化、仅fence存在与失败兜底。

另以事务桩直接调用实际`createLegacyRecoverySeedStore()`，确认打开本补丁数据库/`drafts`，使用readwrite和`.add`、等待oncomplete并close，未调用put。此为适配器方法合同检查，不冒称Node内运行了真实浏览器IDB；真实R3关闭后Blob另核。源码结构使duplicate key在事务内失败，不再依赖哈希前的一次absence检查。

当前template读取最新render的公开Session/rows并传effect生命周期；目标正活跃时不seed。独立反算实际proof3：精确包含当前seed源码、v3 helper和原具名legacy-package；将嵌入段还原占位符后，其余源码与template逐字一致，确认实际客户端执行的是修复路径。

裁定：**F-LA-A03关闭于单Renderer、该具名显式fixture与有可用持久存储的合同。** 多Renderer、双存储故障、未提交事务崩溃等原限制不由此关闭。

## 5. v3误通知路径与F-LR-01的分层裁定

旧helper的loading订阅把每次state通知都标changed。v3只在`fingerprint([phase,draftRev,draft,occurrences,attachmentIds])`变化时标changed，未放宽归属、revision、非空输入、引用/附件和claimed等最终守卫。原v2 helperSHA被转换器固定；完整官方client先经原已审转换，再以精确嵌入段替换，拒绝漂移或重复应用。

独立使用实际固定SnapshotStore作新旧对照：

| 加载中变化 | v2恢复次数 | v3恢复次数 |
|---|---:|---:|
| 仅新queue对象，相关输入全不变 | 0，提示冲突 | 1，无提示 |
| draft改变但revision不变 | 0 | 0 |
| phase改变 | 0 | 0 |
| 引用改变 | 0 | 0 |
| attachmentIds改变 | 0 | 0 |
| 编辑后清空，revision继续增加 | 0 | 0 |

此独立脚本退出0。首个扩展harness有一处括号语法错误，修正后执行完整对照；未把harness错误算作产品失败。固定官方facade的inbox订阅调用publish可在原client第13525–13526行核到；作者原characterization日志也明确0用户编辑但拒绝恢复。它们证明一个实际组件可触发的误拒路径，**没有证明R2第一次事件只有此原因**。

在内存重新运行v3转换器，所得client与当前conversation3实际client逐字相等，SHA见第1节；Node half与R7相同，manifest仅version/oasisPatchRevision变为3，基础版本/依赖保持。

裁定：**F-LR-01中已证明的“无关Store通知误拒恢复”路径在v3关闭。R2首次0/0历史失败与其准确原因未定继续保留；稳定自动迁移、全部冷启动情形和跨平台可靠性不作通过裁定。**

## 6. R3首次冷、A/B、重启与字节证据

独立读取`R3-first-cold-restored.ax.txt`并查看同名截图：原A workspace `71120098-c4d4-4075-bddd-49e1371eb8f7` / Session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428`，18字符，SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`，2附件/0引用，均“上传失败，点击重试”，发送禁用。它证明本次新Profile首次冷进入原A成功；不是仅用稍后重启结果倒签。

`R3-workspace-b.ax.txt`为B身份0字符/0附件；`R3-a-after-b.ax.txt`回到同A/18/2。`R3-after-restart.ax.txt`和实际查看截图仍同A/18/2；临时观察器显示waiting只影响其报告状态，不改变完整useInput摘要和两卡片事实。

重启前和最终关闭两套IDB Blob实物均独立核SHA：普通96字节=`53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`；长稿449990字节=`159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`，与原workspace、named-files、file-objects相等。新恢复不制造原receipt，未知lastModified=0与恢复MIME规则保持；未点retry或Send。

R3两组原始启动/退出JSON逐项等于修复执行单，退出均0；加上首轮5组共7组一致。实际第二受保护SDK Host拒绝记录为`DSH_STORAGE_ROOT_BUSY`，未注册backend/未开Domain/业务SHA保持；仅复核源码/原始日志与结果，没有重跑Host。

接受这些具名恢复和守约竞争的实际事实；它们不能补上A02对所有启动输入的强制准入，也不把原无保护Host纳入全局保障。

## 7. 新鲜命令、保全与并行导航

工具Node24.21.0、官方Electron内置Node24.18.1分别实际运行下列同一七文件并集，均退出0，**63通过/0失败/0跳过**：

```zsh
audit_files=(scripts/tests/legacy-draft-recovery.test.mjs scripts/tests/f-development-assembly.test.mjs scripts/tests/legacy-draft-seed.test.mjs scripts/tests/draft-checkpoint3.test.mjs scripts/tests/draft-checkpoint.test.mjs scripts/tests/conversation-draft-checkpoint.test.mjs scripts/tests/storage-json-single-owner.test.mjs)
tools/node-v24.21.0-darwin-arm64/bin/node --test --test-reporter=tap "${audit_files[@]}"
ELECTRON_RUN_AS_NODE=1 '.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/MacOS/DSH Desktop' --test --test-reporter=tap "${audit_files[@]}"
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --check .dsh-test/f-legacy-assembly-20261027-r3
```

最后CLI退出0，`F_ASSEMBLY_PREFLIGHT_ONLY / realCallBudget=0 / mandatoryComponents=3 / pinnedFiles=196 / materialized=true`，没有`--start`。该输出与两条剩余反例并存：现有测试没有覆盖全部启动消费配置。

原RED日志独立读取：装配新增7项先失败、原7通过；v3能力另2项先失败；seed7及v3增量4的首次RED实际为新API未实现的TypeError，属于API存在性RED，不冒称全部已在旧实现逐项复现行为。旧seed竞态和旧helper误通知行为的证明来自本轮/首轮独立对照及具名characterization，不依赖这些缺API错误。

逐字核验：159修复成员全部一致、196pin全部一致；旧172成员实查168仍原值，差异集恰为声明的4工作路径，各修复前备份均等于首轮冻结旧字节。首轮返回、执行单和审计3件仍原SHA；原公开Profile17/17、初始3554文件0缺失/0变化。R1/R2旧准入中的旧脚本hash不被当前脚本重签为通过。

业务源码/依赖和两种client层次保持：首轮原路径1480/1480、临时build/127成员pack按未变输入复用，本轮未重跑或覆写活跃lib；平铺副本77个verify失败仍为失败。

规划复核：12份原输入未变；中心独立索引当前SHA `f00ccd3fbc90f4d4eb728670bb8a413d8f81d4ae1c34f3600eaa5a809cf26020`，移除新增`interface_standard_references`后与旧索引深度相等。兼容矩阵当前SHA `6f9e521afe6de2a23c17b42ce51afb821fd24266651206bcd06bd691183e05de`，旧正文完整字节为其前缀。独立读取追加段，明确所有草案未定稿/技术签收未取得，不启动实现或调用；两新快照与当前字节相等。未把导航补充作为本批新运行或合同采用许可，旧读取快照不改。

最终57583监听检查退出1/无输出，R1/R2/R3均无startup.lock，HEAD未变。

## 8. 最终接续边界

| 项目 | 本轮裁定 |
|---|---|
| A01执行来源 | 关闭，限定支持入口/固定来源 |
| A03非覆盖竞态 | 关闭，限定具名fixture/单Renderer/事务可用 |
| A02物化/配置准入 | **仍开放1项P2**；实际workspace/布局自重签可触发启动物化 |
| 无关Store通知误拒路径 | v3关闭该具名路径，真实编辑守卫保持 |
| R3首次冷进入A、A/B及一次正常重启 | 接受本次实际证据；不倒签R2、不推定全平台稳定性 |
| 完整F/发行及真实传输等 | 未接受 |

Declined-to-judge：任意孤儿自动归属、原receipt、真实Host重新上传/模型收到附件、真实M06与专业API UNKNOWN/Desktop运行中断、双存储不可更新/事务未提交崩溃、多Renderer/跨平台/版本、日常安装、全写入者发行强制接续、升级回退、专业/用户接受、U1/D1、新版API映射、超150000固定文件引用、G/H及阶段6，不由本轮局部通过放行。

A02余项另行修复/冻结后复审；本次R3修复返回、执行单、159成员及本报告保持原字节。
