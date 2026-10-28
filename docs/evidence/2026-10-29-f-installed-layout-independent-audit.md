# F随包入口与离线安装布局独立审计

审计日期：2026-10-29，Asia/Shanghai。执行者：本批独立审计子代理，用户指定 GPT6.1 Max；未另派代理。基底为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis` 的 `main/f01aa95f5af161ad9efe666685b7f2b485964cd8`，本批送审源码尚未提交。

**结论：FAIL，新增 Critical 0 / P1 0 / P2 1 / Minor 0。** 必改项 F-IN-A01 是新增控制器测试依赖未跟踪历史目录，干净源码副本无法复现该组测试。未发现第二项应阻本批具名运行子集的缺陷；已核验的 R3 离线目录安装、受支持随包入口及同根 checkpoint3→4→原3 数据保持证据成立，但本增量在 A01 关闭前不作无条件接受。此结论不关闭完整F。

## 1. 审计对象与执行前复核

本次只审当前新增六份源码/测试、计划、执行返回、交接及精确执行单，未展开旧 GUI 全审或业务包1480项回归。用户明确决定为“接受随包入口子集，完整F仍开放”。该决定允许本批限定接受，不要求本批强制约束任意旧stock程序，也不产生正式发行、日常安装、费用或真实运行许可。

重新读取根AGENTS、项目AGENTS、协同1.2.1及登记，按登记表和独立索引解析整体规划1.3.1／NS1-R1／`PLAN-PROGRESS-REFRESH-20261028-P28`；本项目准确计划仍为 `docs/plans/2026-10-25-dsh-oasis-master-plan.md` 的 `oasis-next-steps-ns1`、`oasis-plan-progress-p28`，本次执行计划为 `docs/plans/2026-10-28-f-installed-layout.md`。本项目两个 `current_entry` 的相关前缀、原剩余表及适用 IC-ARTIFACT 身份/保全合同已定向读取。未定稿 ARTIFACT V0.3 的 AR3/AR7 仅核其来源/边界，不升为新的运行接受或共同启动条件。

实际绝对路径、完整原始字节SHA256、读取范围、版本/锚点、首次审计身份与授权边界记录于：

- `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-installed-layout-audit-20261029/execution-preflight.json`，SHA256 `4231165e2011fb1eee11fb4c4d00ec4522f4f7881ba3ced44b813ee03daff3bb`。
- 整体计划 SHA256 `12ad32e7d9aeeed8453682dcb8da7d67c865b8bcb7ddbbffa19c4ab76329fa4d`；本项目总计划 SHA256 `750f7d84c5755b9eda8bb66c5a2f44b6028f1a90ff0bb7f89b535326694b4992`。
- 原作者前置记录及其中心导航漂移追加已比对；本次审计开始至最终核验，上述输入无新增字节变化，未补造“已批准”或重新签署历史结果。

准确执行单为 `docs/evidence/2026-10-29-f-installed-layout-execution.json`，SHA256 **`537d149205190b7285ae58204fad77ab227d9929d4e34a584e4a6e5df070ff28`**。初始、末次均逐项验证 **326/326成员的完整字节数与SHA256一致**。八版大清单仅按原忽略目录中的整文件成员核验，未复制进Git。R3两个包另做实际payload完整复核；旧失败包未按新代码重新签名或重建。

本次六份送审源码身份如下，均与原执行单一致：

| 文件 | SHA256 |
|---|---|
| `patches/storage-json-single-owner/installed-lease.mjs` | `90529eaf2be95ad04da4a73289ce12c7893a85f08220edef844d33ee74eeafe7` |
| `scripts/f-installed-runtime.mjs` | `31eab06e52103868f8a60bf4d19e0238fcfcaa1b29ad7a164c8afc9dedfd4ed5` |
| `scripts/f-installed-bundle.mjs` | `edcb7bb70d2a576d75c2d42b0cec1c92f993d2e67d2a316d75478b694be7e881` |
| `scripts/tests/installed-writer-lease.test.mjs` | `970e364d7eeef0a508d3572c01cc79575afbf9dbdfe675de5a1dfb239a04d2bb` |
| `scripts/tests/f-installed-runtime.test.mjs` | `cde772700df176b42ee546626cacd8b309c99848eb67261ad18c23c07528ed5a` |
| `scripts/tests/f-installed-bundle.test.mjs` | `d02f91670ecb6180c4b26ebdd0622b58e93f34029d05298090fdd8fa862fbd94` |

计划SHA256 `ed2a7503e846c693e808a428b8e03243b49c5bdd1d900c0fcdf2ef06347716c4`，作者返回SHA256 `fece13d0458dc17707976484e0f992f4dff594bd540f1f732f50640db8894d33`，交接SHA256 `f2efc58cbd6eb0e1c890e2ee1ae53df4a91c0e95377b3a0f7d18493bbaa222ca`。

## 2. 必改项

### F-IN-A01 / P2：控制器合同测试依赖未跟踪历史夹具，干净检出8项全失败

位置：[f-installed-runtime.test.mjs:20](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/tests/f-installed-runtime.test.mjs:20)，影响其 `bundle()` 夹具和全部8项运行时测试。

该行从 `.local/f-process-recovery-20261027/extension-r3/index.mjs` 读取旧provider，目录被Git忽略且不随本批源码交付。因此当前机器虽然两解释器测试通过，干净检出没有该文件时，8项在构建夹具阶段全部以 `ENOENT` 失败，尚未触及应验证的安装、互斥、升级、回退和失败恢复合同。这是本批新增测试的可复现性缺陷，不是要求把旧运行目录纳入Git。

已独立确认：当前已跟踪的 `patches/storage-json-single-owner/index.mjs` 与该历史文件逐字节相同，SHA256均为 `9d1c8da0ed70accc2b679bccbfc72c9a353f96573155fbef0951ff4df5c71bdc`。在新审计目录复制原始四份必要源码/测试，未复制任何旧.local，运行：

```zsh
cd '/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-installed-layout-audit-20261029/clean-checkout-original'
'/Users/tinadong7036/Documents/开发项目/DSH-Oasis/tools/node-v24.21.0-darwin-arm64/bin/node' --test --test-reporter=tap scripts/tests/f-installed-runtime.test.mjs
```

实际 **0/8通过、8失败、exit1**。原样副本继续保留，源测试SHA与送审相同。日志为 `.local/f-installed-layout-audit-20261029/clean-checkout-original-repro.log`，独立argv/退出码/源hash为同名前缀JSON。

另一个仅属于审计目录的副本，将这一读取改为已跟踪provider，并携带其原字节后，**8/8、exit0**，日志为 `clean-checkout-proposed-fixture-only.log`。此处只证明最小修复方向可行，未修改送审测试或将副本结果冒认为原输入已修复。

建议作者仅修该测试来源，保留本FAIL、原执行单和原326成员；以单独测试delta与新hash交回复核。此项不改变三份生产源码、R3包字节、GUI候选或既有安装/回退证据，无需为该测试缺陷重演旧GUI或重建发行候选。

## 3. 已核验的代码与运行子集

租约机制属于协作入口协议。[installed-lease.mjs:66](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/patches/storage-json-single-owner/installed-lease.mjs:66)在backend构造前校验根、current、gate、双锁相同记录、nonce、owner PID/启动时间及存储路径；builder固定provider原hash及投影后hash，注入位置位于原JSON所有权与backend构造之前。[f-installed-runtime.mjs:151](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/f-installed-runtime.mjs:151)让四角色共用两层准入；维护还取得原JSON根SQLite排他。恢复失败保留 `RECOVERY_REQUIRED`，不会自动删除遗留锁或重新派发UNKNOWN。

独立探针直接导入R3包内实际provider，在全新公开临时根证明：无租约/错误nonce时backend构造0且不创建存储根；有效租约仍保持原SQLite第二backend排他，成功drain后才可再次构造；owner进程已退出但锁文件仍在时拒绝构造且保留锁。两解释器均 **3/3、exit0**。这不是任意未受控旧SDK或OS级排他的证明。

builder从明确source2 release及195pin接续，排除旧node_modules/运行数据，重写已知本地依赖映射并拒绝未绑定路径/资源链接；安装时在最终release及Profile路径由固定pnpm先生成锁、再离线冻结物化。代码没有静默回源码或日常App的备用分支。`checkFInstallation`实际复核controller/node、program/receipt/profile-snapshot、最终pnpm元数据、组件与包映射，并拒绝配置覆盖和数据根别名。所选安装根含空格及单引号，按独立argv处理。

本次只读完整复核结果：

| 对象 | 实际结果 |
|---|---|
| R3 v3 manifest `f926b6857e23fbbcdb5dbd18ba2b26d0afe12b38452b6701c201021e493d9dd1` | 27,174文件/14链接完整匹配；source2 release `724ec489-d9db-4256-8eb1-fa1dde091f1f` |
| R3 v4 manifest `dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9` | 27,174文件/14链接完整匹配；source2 release `c5c61a34-3999-429f-8ab3-e448766c2245` |
| 当前安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-installed-20261028/accepted r3 root ' public`；只读check退出0，current为原v3，v3/v4两receipt均存在 |
| 两版安装App | 实际 `codesign --verify --deep --strict`及Team `UM3Z9G5DNH`要求退出0，版本2.0.17；只证明vendor App完整性 |
| 升级前→v4未启动；v4新增编辑→回退v3未启动 | 两组各三JSON＋六IDB，9/9逐字节一致 |

Desktop会强制启用canonical conversation。当前builder只显式插入随包Sidebar，保留标准conversation名称及版本overlay；未插入第二conversation或替换原生结构Slot。代码、两版实际profile-template、R2重复模块失败和R3成功日志相互一致。

本审读取现存R3 AX/PNG及公开JSON快照，确认v4编辑后的原生未发送草稿含 `EDIT-AFTER-V4`，回退后AX仍含该标记；业务 `user_input` 中“保留V4新增编辑。”在回退后AX和最终公开JSON中仍在。三次R3原始GUI退出码均0。此为核验原操作证据，**本审没有启动Desktop、点击GUI或重演用户操作**。切换数据字节保持不扩为“所有GUI重开前后userdata逐字节相同”。

R0/R1缺Sidebar的原FAIL、R2双conversation Host失败/exit1、旧stock绕过协作协议的实际FAIL以及更早审计FAIL均保留；作者返回明确列出这些失败，未以R3成功覆盖。公开UNKNOWN保持原requestId及dispatches0，业务生成和远端运行队列为空；只接受该公开合成对象，不称真实原生模型/API UNKNOWN。

## 4. 新鲜命令与证据

所有新日志、探针和临时路径只写入 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-installed-layout-audit-20261029`。实际argv、cwd、解释器及退出码见 `test-results.json`、`independent-probe-results.json`；内置解释器以 `ELECTRON_RUN_AS_NODE=1` 运行Node测试模式，未启动GUI。

| 本审操作 | 新鲜结果 |
|---|---|
| 三份新增测试：工具Node24.21.0 | 15/15，exit0 |
| 同组：实际随包Electron Node24.18.1 | 15/15，exit0 |
| 实际随包provider独立探针：两解释器 | 各3/3，exit0 |
| R3两整包、当前安装根及两版vendor签名只读核验 | exit0 |
| 原测试最小干净源码副本 | 0/8，exit1，F-IN-A01复现 |
| 仅审计副本改用已跟踪同字节夹具 | 8/8，exit0，不算送审源码已修复 |
| 原326成员、前置输入末次复核 | 326/326一致，输入新增变化0 |
| `git diff --exit-code` | exit0；无已跟踪原文件改动 |

作者原两解释器各134/134的日志与退出码已核，未将其声称为本审重跑134项。未修改业务包源码或依赖，因此未重复扩大到1480项业务套件。末次身份、六源码hash、输入漂移与结论记录在 `final-verification.json`。本审只新增本报告及忽略目录中的审计材料，未改原代码/证据、提交、推送或执行任何网络/模型/API/上传/费用操作。

## 5. 范围接受与剩余出口

就已核证据，可保留具名R3随包入口与离线目录安装候选，以及固定Desktop2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1组合下自有checkpoint3→4→3同根数据保持的子集结论。F-IN-A01仅阻本批源码/测试交付的无条件接受；建议最小测试修复另版后做有界复审，不重签本报告和旧包。

**完整F仍OPEN。** 任意旧stock/非合作writer及检查后换路径、OS强制隔离、外层签名安装器与最终许可/分发接受、上游/跨平台升级、旧管理根迁移、真实磁盘满/断电/强杀自动恢复、双存储/多个实际Renderer、真实附件重传/模型消费及原生模型/API UNKNOWN均未在本批获得接受。U1/D1、新API映射、G/H/阶段6及专业/用户/发布门保持。vendor App签名不代表自有组合已获发行批准。

下一交接方为本批作者：修F-IN-A01测试来源，提交准确单文件delta、新SHA与干净检出/两解释器结果，之后由同一独立审计者核对该差异。不得把本次首轮FAIL替换成通过或仅更新旧expected hash。
