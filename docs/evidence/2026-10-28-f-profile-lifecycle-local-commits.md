# F受控Profile生命周期本地分批收录

2026-10-28，Asia/Shanghai。执行用户“无需真实调用F接续→GPT6.1 Max独立审计→分批本地Git”的明确要求。保留 `mac/continuity-v2`，基底 `41d22c4f49f3b35abd527cfd1c40c6b64f3734a9`，不推送、合并或发布。本文是本地保全记录，不关闭完整F或新增运行许可。

## 分类与两批

| 分类 | 本次收录与边界 |
|---|---|
| 工程源码/测试/接续说明 | 第一批8个新增文件：两版生命周期脚本、对应两版合同测试/窄进程夹具、两版Profile接续说明。当前可信入口为修订2；原入口保留首轮F-PL-A01失败身份，不推荐用于新根。未改业务包、DSH核心、旧冻结装配器/补丁。 |
| 依赖清单 | 主包manifest/锁文件及固定依赖版本均未修改，无依赖提交。实际物化仍固定pnpm11.8.0离线、冻结锁、忽略生命周期脚本、禁止自动下载，使用私有HOME/cache/store。 |
| 规划/审计证据 | 第二批包含具名本轮计划、两份作者返回、两份执行单、首轮FAIL/修复独立处置、本记录及三个当前状态入口的新增前缀。旧入口原字节为完整后缀，不改旧结论。 |
| 排除与保全 | 预存P28总计划、并行AGENTS修改不暂存/提交。工具二进制、node_modules、App、私有Profile、缓存、userdata及运行数据不入Git；准确公开证据留原私有路径，原FAIL/RED/UNKNOWN、旧pin/哈希不删除或改签。 |

第一批实际提交：`d01581f9117ad5f65f851da7fc5b3f06db5fd1ef`，标题 `feat: manage fixed Profile lifecycle with preflight writer guards`，8文件/592新增行。

第二批标题：`docs: preserve Profile lifecycle recovery and independent audits`。它的完整身份以本文件所属实际Git提交及 `.local/f-profile-lifecycle-20261028/final-closeout.json` 为准，避免把提交自身hash写入自身正文。两批只在本地，不新建/重置远端引用。

## 验证与独立接受

[首轮执行单](2026-10-28-f-profile-lifecycle-execution.json) SHA `40a7a194477dd9096d308c59f5c58ba697619e6820164573e67cb74380698a30`，131成员/14链接保持；[首轮独立FAIL](2026-10-28-f-profile-lifecycle-independent-audit.md) SHA `b056f05718bb89cf440ae753da2640206aeaff79361c292eda4652ff7e8baf1e`，P2/F-PL-A01保留。修复没有改其源码/根或只更新expected hash，而另增source2和新管理根。

[修复执行单](2026-10-28-f-profile-lifecycle-repair-execution.json) SHA `57f4683b89a2095ffa0695078b18d75ac28143914206b91abf60cf32b8e70d92`，109成员/21链接、3×195pin；[同一GPT6.1 Max增量处置](2026-10-28-f-profile-lifecycle-repair-independent-audit.md) SHA `fe89eb0dc7a4488fcf90a1821a0c6b19989716b1deb06b403561de8b16955b7f`，A01在修订2/新根范围关闭，新增Critical/P1/P2/Minor均0。两解释器作者各119/119、独立各14/14/exit0；独立实际guarded SDK的10种链接状态×4角色均callback/backend构造0，外部目录空。

私有新根完成实际干净Profile安装及已审自有v3→v4→原v3，保留v4后原生/业务两稿新增编辑。额外不启动Desktop的同根切换有即时三阶段三JSON原字节和六公开IDB成员一致证明；公开UNKNOWN仍为合成、dispatches0。首轮＋修复6次GUI退出0，57583关闭、启动锁释放。实际busy拒绝四角色/upgrade/rollback、旧F CLI及公共受保护SDK；原未受控stock writer绕过FAIL仍在。

提交前作者重新运行精确成员/hash/链接/映射pin/17公开原件保全核验、修订2绝对根`--check`与`git diff --check`，exit0。3601既有受控文件仅并行AGENTS及三处已声明状态前缀变化；预存总计划字节未动。作者未无故重跑不变全套业务测试或旧GUI；当前源码与本轮GREEN日志/送审pin完全一致。三处状态旧字节后缀及远端引用另作实际比对。完整命令、原始日志/失败尝试、读入快照和最终两批SHA留 `.local/f-profile-lifecycle-20261028/`。

## 具体裁定与成本

- 本轮安装/升级/回退只覆盖私有Profile和同固定底层组合的自有checkpoint3/4。签名App安装器、上游/跨平台升级及旧管理根迁移仍需各自验收；不把未验项目从剩余目标删除。
- 故障测试采用Node进程边界注入，保留ENOSPC/恢复失败/遗留锁拒绝的实物，不设置产品注入开关。实际磁盘满、断电、强杀自动恢复成本未支付，继续OPEN。
- 原controller1/131/首审FAIL完整保留，修复新增controller2/新根。成本是原管理根迁移未取得，不能只改hash冒充通过。
- 用户要求修复后最终独立审计，因此同一Max仅处置修复增量，没有第二次全131审计或旧GUI重复。额外成本限于新增11合同＋3独立探针、109/21/3×195及相关公开数据核验；审计路径推断错误原日志保留。
- 并行EXEC-R1→R2及最终IS03-06未定稿文档导航被身份重核捕获。作者/审计各自有界重读并另存追加记录，不追认插入前已读全文、不重签原包、不产生新运行授权。原读取范围的历史限定保持。

零新增真实模型/专业API/费用、上传/准备/生成/Send，不读取/迁移认证、不改日常Profile/签名App。全写入方发行强制保护、非合作writer检查后改路径、旧stock绕过、真实Host重传/模型消费、真实UNKNOWN、双存储/多个实际Renderer及完整F、E/U1/D1/G/H继续OPEN。
