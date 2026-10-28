# F-PL-A01修复与新根生命周期追加返回

2026-10-28，Asia/Shanghai。本记录接续[首轮返回](2026-10-28-f-profile-lifecycle-return.md)、131成员执行单及[Max首轮FAIL](2026-10-28-f-profile-lifecycle-independent-audit.md)，报告SHA `b056f05718bb89cf440ae753da2640206aeaff79361c292eda4652ff7e8baf1e`。原131文件/14链接、原根/源码/回执不改；本记录为新增送审范围，最终独立接受以追加处置为准。

## 具体修复与验证

首轮F-PL-A01/P2：维护内部拒绝存储根链接，但通用check/writer callback前没有拒绝，实际guarded SDK可在另一个公开目录创建SQLite及业务JSON。这不同于已声明的未受控stock writer绕过，属于本入口须修复的问题，原双解释器反例保持。

新增 `f-profile-lifecycle-2.mjs` 与对应测试/窄子进程夹具。通用check在任何角色回调前验证既存内部数据根，拒绝链接/悬空链接、非目录和存储/会话/附件树下的已有链接；缺失根不创建，仅读目录元数据、不读文件正文/认证。原维护检查保留，原Profile准入/事务/快照/固定pnpm逻辑不变。控制记录source绑定新文件，原生命周期CLI对新根在source/policy阶段拒绝、回调0，不能把旧根原记录只换hash冒充迁移。

新增两条A01回归先在原行为副本上RED（未拒绝角色进入、未拒绝非目录），修复后通过；修订2的11项包括原9项生命周期合同，完整受影响scripts工具Node24.21.0/实际内置24.18.1均 **119/119、exit0**。原108、RED和首审FAIL不重签。SDK/desktop/recovery/maintenance四角色对既存、悬空及子目录存储链接均在回调前拒绝，外部目录保持空；缺失根check不创建，错误类型的原文件字节保留。

## 新私有根的实际复验

根 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-profile-lifecycle-20261028-r2`，不复制原根userdata/认证。固定底层组合不升级，仍是自有checkpoint兼容验证：

| 实际步骤 | 精确身份 | 观察 |
|---|---|---|
| 干净安装v3 | `724ec489-d9db-4256-8eb1-fa1dde091f1f`，Main55267 | 实际guarded KV公开UNKNOWN `F28-PUBLIC-R2`、dispatches0；原生F-LIFE-R2-UNSENT-V3及Flow-2-6公开业务草稿 |
| v4升级 | `c5c61a34-3999-429f-8ab3-e448766c2245`，Main55569 | 原两稿保持；原生追加EDIT-AFTER-V4，业务追加“保留V4新增编辑。” |
| 明确回退原v3 | expected上述v4、target初始v3，Main55678 | v4之后的两处编辑均保持，UNKNOWN未派发；3次退出0 |

实际v3运行时再次记录四角色及upgrade/rollback busy拒绝、回调0；原F CLI在runtime启动锁上EEXIST1；公共Cordis/Storage SDK第二Host得到DSH_STORAGE_ROOT_BUSY且后端未注册。只是这些明确接入的入口/运行事实，不声称旧F CLI离开管理入口后具有新路径防护。

为保存瞬时字节比对实物，在全部应用退出后另做一次**不启动Desktop**的v3→v4→v3：v4新回执 `281a7d48-11de-42e4-b7d7-8285e170732a`，target仍初始v3，最终3个release均保留。三阶段分别保存workspace/oasis_workbench/f_lifecycle_public原字节和SHA，完全一致；闭合原生IDB也与离线循环前快照完全一致。此额外循环不冒充前三次GUI的同时截图，准确回执见repair/offline-cycle/receipt.json。

首次原生paste后最新AX仍空，未将操作尝试记作输入成功；确认空白后按当前输入框补写一次，后续AX/png为实际成功值，未发送。R2没有新的桌面环境/权限修复。当前6次自有GUI启动（首轮3＋修复3）均退出0，57583关闭、两根两层锁释放。零新增真实模型/专业API/费用、上传/准备/生成/Send，不读取认证或改日常Profile/签名App。

## 接续边界

旧131成员/14链接及首审报告保持，旧109/54/152与17公开件延续；新增修复执行单固定当前source、3版195pin、原字节快照和119×两解释器结果。AGENTS/总计划并行修改仍排除本轮提交，EXEC-R2定向复核不增加许可。用户要求最终交付独立审计，交同一Max只处置修复增量，不重复原131全审。

原stock绕过FAIL、未受控writer、检查后非合作方改路径、签名安装器、上游/跨平台升级、原管理根迁移、真实磁盘满/断电/强杀自动恢复、真实模型/专业API UNKNOWN及完整F仍OPEN。修复范围是新修订2入口的前置别名拒绝及私有同根Profile生命周期；不删减原剩余目标。
