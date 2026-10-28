# F受控Profile干净安装、同根升级回退及写入保护返回

日期2026-10-28，Asia/Shanghai。基底41d22c4；保持mac/continuity-v2。用户授权无需真实调用的F接续、GPT6.1 Max独立审计后分批本地提交，不推送、不新增模型/专业API或费用。本报告为作者送审观察，独立结论另记，不以测试数量关闭完整F。

## 实现及范围

新增 `scripts/f-profile-lifecycle.mjs`、9项定向测试与一个窄进程夹具。复用原F装配器、startup.lock及JSON根所有权，未修改旧模块/业务代码/依赖/固定组合；不扩大通用安装框架。支持私有Profile install/check/start/upgrade/rollback，SDK/recovery/maintenance消费方共用gate；每版Profile/准入/回执原件不可覆盖，活动准入明确切换，不改历史冻结准入。

管理锁覆盖整个受支持操作；runtime启动锁同时接续旧F CLI。维护需再占JSON根，拒绝旧受保护SDK。源码/准入、活动release revision、完整Profile快照先核对；别名路径、坏快照和过时current拒绝，未开始变更时不重写有效Profile。失败时恢复上版；恢复不完整/进程被杀遗留锁时拒绝后续自动进入，不猜测删锁。此保守停止不等于自动崩溃恢复。

**全写入方仍未闭合：** 四角色只是本入口明确接入的合作调用；SDK仍需使用固定guard。未受控stock JSON/旧Host或直接文件writer可绕过，不冒充OS强制保护。已在独立公开夹具实际运行stock后端：持有JSON guard元数据锁时仍成功写global，保留 `old-writer-bypass.json` 的 `FAIL_UNCOOPERATING_STOCK_WRITER_CAN_BYPASS`。不能据受支持入口成功宣布“全writer发行强制接续完成”。

## 实际生命周期

新管理根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-profile-lifecycle-20261028`。同一个runtime/home、userdata和Workspace贯穿，无旧Profile/userdata/认证复制。固定App2.0.17/DSH0.2.0-rc.2/Cordis4.0.4/Sidebar0.24.1，两个已审自有组件：

| 动作 | 明确release/current | 实际证据 |
|---|---|---|
| 干净安装v3 | `fb52fc94-f399-4fea-97c6-0467d1d84c35` | 固定pnpm物化/195pin，实际Main49842退出0；原生未发送 `F-LIFECYCLE-20261028-UNSENT-V3`，Flow-2-6公开业务指令草稿 |
| 正常退出后升级v4 | `83d0b087-e88a-4b5a-989b-1f0263a75cae`，expected原v3 | 同根195pin/实际Main50201退出0；原两草稿保持，原生追加PUBLIC-EDIT-AFTER-V4、业务追加“保留V4后新增编辑。” |
| 正常退出后精确回退v3 | target原v3、expected上述v4 | Main50441退出0；原生/业务的v4后新增编辑仍保持，回退没有回退用户数据 |

升级及回退前后即时，`workspace.json`、`oasis_workbench.json`、通过实际guarded JSON KV保存的 `f_lifecycle_public.json` 三文件均逐字节不变，准确SHA在data-before/upgrade-data/rollback-data证据。UNKNOWN是公共KV合成记录 `F28-PUBLIC`、dispatches=0，不是0.1.3真实模型/API原运行恢复。各版本Profile快照、完整输入/实际元数据及immutable回执另有195pin校验，不能按截图标题冒充版本。

实际v3运行时独立进程尝试desktop/sdk/recovery/maintenance和upgrade/rollback，均F_PROFILE_BUSY、回调进入0；原F CLI在runtime锁上EEXIST、退出1；实际公共Cordis/Storage SDK第二Host得到DSH_STORAGE_ROOT_BUSY，json后端未注册。已正常关闭全部3自有应用，57583关闭，两启动锁释放，未点准备/核对/生成/Send或上传，不读取认证。

## 验证及失败保全

固定工具Node24.21.0与实际Electron内置24.18.1各运行完整受影响scripts **108/108、exit0**。9项本批覆盖实际固定pnpm、同根数据保存、进程竞争、JSON owner、安装进程边界ENOSPC故障注入、快照/过时版本、SIGKILL遗留锁及路径别名。ENOSPC是Node测试的进程边界故障注入，无产品故障注入开关，不冒充真实磁盘满/断电验证。不重跑不变业务/解析器，不把旧verify失败改签。

实现期RED保留：接口尚缺8失败；坏rollback目标触发不必要恢复导致有效Profile inode改变，补markMutating后先拒绝；数据根别名曾在外部测试目录创建锁，补canonical路径检查后在创建前拒绝。RED与GREEN日志都保存为本批开发历史，不删除反例。

执行误差保留：首次KV unit名用了连字符，被实际API以malformed-medium拒绝，backend在finally关闭、没有发布；原脚本R0/错误记录保持，改为下划线后实际KV与stock反例均取得。原生窗口引用短暂失效，最新AX核对及一次重新绑定后恢复，无认证/系统设置修复；未把失败点击当作完成。

## 并行文档与交接

本轮开始前已有总计划P28修改；另有AGENTS并行EXEC-R1→R2修订。两者均保全、排除本轮提交。初始15份规划原字节保留；R2出现后按新规则定向重读/解析NS1-R1、P28及登记锚点，见 `.local/f-profile-lifecycle-20261028/execution-preflight-r2.json`。该记录区分正文读取与身份快照，不追认并行R1插入前已读其全文。变化只影响执行记录字段，无固定包、API、数据或费用合同漂移，继续按原用户明确范围交付，不重签旧证据。

旧109/54/152成员与17原公开件保全以执行单为准。完整F、任意未受控writer强制接续、签名App安装器、上游/跨平台升级、强杀/断电自动恢复、双存储故障、真实Host重传/模型消费与真实UNKNOWN仍OPEN；E映射/U1/D1/G/H/发布亦不由本批关闭。实际范围是私有开发Profile安装和已审自有v3/v4的同数据根兼容，不缩减原目标。
