# F-IN-A01单文件修复独立复审

2026-10-29，Asia/Shanghai；同一独立审计子代理，按用户指定GPT6.1 Max接续。项目根为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，基底仍 `main/f01aa95f5af161ad9efe666685b7f2b485964cd8`，本批尚未提交。

**结论：F-IN-A01/P2在本次单文件差异范围关闭；新增Critical 0 / P1 0 / P2 0 / Minor 0。** 结合首轮已核验且本轮保持不变的生产代码与运行证据，接受具名R3随包受支持入口、离线目录安装候选及同根自有checkpoint3→4→原3子集。**完整F继续OPEN。** 本报告只接续首轮A01处置，不改写首轮FAIL或补签旧GUI/发行接受。

## 1. 准确输入与前置范围

本次重新读取根AGENTS全文、协同约定及项目AGENTS，重新解析登记表/独立索引中 `dsh-oasis` 的准确master_plan、NS1-R1及 `PLAN-PROGRESS-REFRESH-20261028-P28`。整体与项目计划P28章节已定向重读；首轮实际读取的相关合同/状态入口与治理文件完整字节均未变化，继续沿原IC-ARTIFACT身份/保全、无真实调用及限定子集范围。本次仅复审测试来源修复，不重开旧计划或建立新的执行许可。

本轮新前置记录为 `.local/f-installed-layout-audit-A01-20261029/execution-preflight.json`，SHA256 `ab8a62aee3e6c764bfa5dd5b4af23536b97859a5817f4907556756f130e12d64`；内含绝对路径、原/现hash、读取范围、父文件及锚点、批准基线和无新增治理差异结果。整体规划仍1.3.1、协同1.2.1，本项目master_plan仍 `docs/plans/2026-10-25-dsh-oasis-master-plan.md`，执行计划仍 `docs/plans/2026-10-28-f-installed-layout.md`。

| 输入 | SHA256 |
|---|---|
| 首轮独立FAIL报告 | `f24c463d342732782b6812a1a0ced488c8522e05ed4306d5a0ea1af07099d783` |
| 原326成员执行单 | `537d149205190b7285ae58204fad77ab227d9929d4e34a584e4a6e5df070ff28` |
| 修复执行单 `docs/evidence/2026-10-29-f-installed-layout-A01-repair-execution.json` | `58c42ba15c7f7b8618e1d333ad3c5bb5234085177d5cef318a10f73854ce6779` |
| 修复返回 `docs/evidence/2026-10-29-f-installed-layout-A01-repair-return.md` | `26c55e7dfc8125d0a380f09fa92d1b3d26ba6acb0887295608fd6401214522af` |
| 旧测试原字节归档 `docs/evidence/2026-10-29-f-installed-layout-audit-original-runtime-test.mjs.txt` | `cde772700df176b42ee546626cacd8b309c99848eb67261ad18c23c07528ed5a` |
| 当前修复测试 | `6dcd0f47f680a3f7a08d9b36538fa45e969c0a50381072664595ab19a448b354` |

## 2. A01关闭依据

[f-installed-runtime.test.mjs:20](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/tests/f-installed-runtime.test.mjs:20)只将读取路径从 `.local/f-process-recovery-20261027/extension-r3/index.mjs` 改为已跟踪的 `patches/storage-json-single-owner/index.mjs`。

独立逐字节比较确认：当前测试恰好等于旧测试进行上述一次替换后的字节；没有断言、模拟边界、失败预期、超时或其他代码变化。两份provider原件仍逐字节相同，均1475字节、SHA256 `9d1c8da0ed70accc2b679bccbfc72c9a353f96573155fbef0951ff4df5c71bdc`。测试不再要求交付被忽略的历史运行目录。

本审在全新 `.local/f-installed-layout-audit-A01-20261029/clean-source` 中仅复制五份必要源码：controller、lease、ownership、tracked provider、修复测试；该源码副本内没有 `.local`、旧运行夹具或node_modules。完整文件身份保存在 `clean-source-members.json`。工具Node24.21.0和实际随包Electron Node24.18.1分别执行：

```zsh
node --test --test-reporter=tap scripts/tests/f-installed-runtime.test.mjs
```

两次实际均 **8/8通过、失败0、跳过0、exit0**。内置解释器明确设置 `ELECTRON_RUN_AS_NODE=1`，未启动GUI。随后在原项目根分别重跑三份受影响测试：`installed-writer-lease.test.mjs`、`f-installed-runtime.test.mjs`、`f-installed-bundle.test.mjs`，两解释器实际均 **15/15、失败0、跳过0、exit0**。这是本轮新鲜独立结果，不使用作者回报或首轮审计副本通过结果代填。

原8项全失败日志和首轮源字节继续保留；本次只关闭由历史夹具缺失导致的A01，没有将首轮失败改写成通过。

## 3. 历史保全与生产候选复核

修复执行单 **39/39成员完整字节数与SHA256匹配**，末次检查仍一致。原执行单自身和首轮FAIL报告hash保持不变。

原326成员按修复执行单的 `historicalMemberRelocations` 精确解析：仅原路径 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/scripts/tests/f-installed-runtime.test.mjs` 指向上述旧测试原字节归档；其余 **325个live成员均与原expected完整一致**。归档内容匹配原执行单原hash/字节数，未以新测试hash替换旧expected。另逐项验证 `frozen-members.json` 的集合和326份不可变副本，**326/326一致**。首轮审计的30份辅助材料也全部保持原hash。

三份生产源码仍与首轮相同：

| 文件 | SHA256 |
|---|---|
| `patches/storage-json-single-owner/installed-lease.mjs` | `90529eaf2be95ad04da4a73289ce12c7893a85f08220edef844d33ee74eeafe7` |
| `scripts/f-installed-runtime.mjs` | `31eab06e52103868f8a60bf4d19e0238fcfcaa1b29ad7a164c8afc9dedfd4ed5` |
| `scripts/f-installed-bundle.mjs` | `edcb7bb70d2a576d75c2d42b0cec1c92f993d2e67d2a316d75478b694be7e881` |

为确认本轮测试修复未改变既有候选，本审再次只读完整校验R3 v3/v4 payload、现有安装根/controller/receipt/Profile/最终pnpm元数据及两版vendor App签名，实际退出0。两包各 **27,174文件、14链接**，manifest仍分别为 `f926b6857e23fbbcdb5dbd18ba2b26d0afe12b38452b6701c201021e493d9dd1`、`dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9`；现有根current仍为回退后的原v3，安装候选仍显式返回 `arbitraryLegacyWriterEnforced=false`、`outerInstallerReleaseAccepted=false`。

没有重建包、安装/切换版本、启动Desktop、重演GUI或重复首轮provider3项探针；生产输入身份不变，首轮该范围的实际证据继续适用。R0/R1 UI FAIL、R2重复conversation Host FAIL/exit1、旧stock绕过FAIL、公开快照及原UNKNOWN证据均未被替换。

## 4. 本轮证据与接受边界

新材料只写入 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-installed-layout-audit-A01-20261029` 及本报告。`independent-test-results.json` 记录五条完整argv、cwd、解释器模式和退出码；`clean-*.stdout.log`、`affected-*.stdout.log` 保存四次测试输出；`preserved-R3-readonly.stdout.log` 保存只读候选检查。`input-verification.json`、`historical-resolved-members.json`、`preservation-verification.json` 和 `final-verification.json` 分别绑定新39、历史326、不可变副本/生产源/旧审计保全及末次结果。`git diff --exit-code` 新鲜退出0；本审未修改任何既有代码、报告、包或冻结日志。

A01是本轮唯一处置项，现有最小干净源码及两解释器证据足以关闭；可在保留首轮FAIL和新旧输入身份的前提下，按原用户授权继续本批限定子集的本地交接。该接受不扩大为任意旧stock或OS强制保护、正式外层签名安装器、最终许可/分发接受、上游/跨平台升级、旧根迁移、真实磁盘满/断电/强杀自动恢复、双存储/多个实际Renderer、真实附件重传/模型消费或真实模型/API UNKNOWN。

完整F、U1/D1、新API映射、G/H/阶段6及专业/用户/发布门仍开放。没有新增网络、模型/API、上传/发送、费用、认证迁移、日常安装、提交或推送。本报告不取代任何既有原始失败记录或产生发布许可。
