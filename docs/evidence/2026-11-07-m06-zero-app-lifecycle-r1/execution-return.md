# M06现有隔离组合零生成启停验收 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户明确允许现有隔离组合的零生成启停验收，未授权真实生成/调用、上传、费用、WorkBuddy导入或发布。[授权原话及范围](authorization.json)、[EXEC-R2复核](preflight.json)另存。

## 准确对象与实际结果

现有安装根为`.dsh-test/m06-p4-unknown-update-20261106-r1`，bundle `1c5baba6844b1b9e28e3cfd0c0a8913cf68bb1857f317d68096851c0eefe4bef`，业务归档 `6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb`。固定Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／checkpoint3保持；没有重装、改pin/冻结件、复制认证或修改日常Profile。

| 检查项 | 本轮证据与结论 |
|---|---|
| 实际启动 | 冻结controller的`--start`两次均实际启动原生App，分别PID12533及13561；不是fixture或新启动器。真实客户端连接127.0.0.1:57619 |
| 当前入口/预算 | 固定配置只启用M06 controlled013，普通业务插件disabled；controller选中nativeZeroGeneration，model/api/upload/payment预算均0。原RPC四项只读白名单不改 |
| 原生界面 | 跳过可选桌面引导；在原生目录选择器选择该安装根data/workspace-a。绿洲工作台、功能中心和原生设置均实际打开 |
| 设置/账户 | 现有数据去向/费用说明可见；登录方式、手机号、验证码及登录按钮禁用，显示登录服务未就绪。没有登录、刷新登录状态或更换原生模型配置 |
| 正常退出/重启 | 两次均由该App菜单“退出DSH Desktop”正常退出，controller exit code0/signal null；第一次退出后进行计划中的正常重启，非失败重派 |
| 原生草稿恢复 | `M06_ZERO_LIFECYCLE_UNSENT_20261107`在第一次退出前及第二次启动后可见，未点击发送。它是原生未发送会话草稿，不冒充M06业务revision草稿 |
| 文件归属 | 重启后原生文件面板定位workspace-a/public-note.md，实际显示原更新前及后加文字；没有编辑/保存。不把该便笺当M06成稿验收 |
| 数据/租约/残留 | 两次退出后目标进程均无残留、57619端口释放、双startup锁不存在。原安装writer及JSON provider所有权随后可同时重取并释放（exit0）。原合成UNKNOWN业务JSON与固定M06稿hash不变 |
| 安装身份 | 启动前及第二次退出后的冻结controller `--check`均exit0，仍为1c5b。实际App/Host运行未使冻结Profile/程序身份漂移 |

[第一轮实际启动](first-launch.json)、[第一轮退出/保全](first-exit-observation.json)、[第二轮启动](second-launch.json)、[第二轮退出/保全](second-exit-observation.json)、[租约重准入](lease-readmission.stdout.json)、[controller结果](controller-checks.json)、[UI实际观察](ui-observations.json)分别保留。原生运行日志在各启动回执prefix所指安装data/evidence及data/userdata/logs下，不复制到公开包。

## 未通过项：M06输入页面

在默认项目及明确绑定的workspace-a中，实际点击“权利要求初稿 输入与结果 · 生成待接入”，均只显示：

> 新版任务创建未完成，请核对项目后重试。

没有进入M06八输入/来源/准备确认页面，不能将本轮记为该页面或完整R3-03接受。未创建新业务任务或业务稿，无法据此验证M06页面的只读准备、来源/费用确认和业务revision界面恢复；原native UNKNOWN场景按旧证据复用。

本轮源代码定向核对发现：`createV340Task`正常经`workflow/v340/task/create`创建任务；固定零生成RPC门仅允许state/get、workflow/catalog、workflow/v340/catalog、workflow/v340/prepare，前述创建在白名单外。该实现路径与观察到的失败相符。客户端catch统一显示通用消息，本轮没有取得这次请求的运行层错误码，故原因记录为**高可信静态定位，非已取得RPC错误回执**；没有修改存储以补造任务或放行写入。

后续须解决“零生成查看输入页”与“创建业务任务必需写入”的冲突，仍保留业务写入/生成禁令，沿现有表单和公开准备合同安排有界调整。不能把白名单扩大到任务创建/生成来换取界面绿色，也不能替换/重签现1c5b验收对象；新实现/新包与准确运行范围分别核对。本轮只交实际失败及定位，没有实施新的界面方案或改安装物。

## 新输入接续及仍未接受

- 权利来源/许可方按用户声明登记为OasisIntWrite，代表人Tina D，适用所询自有代码、Skill和工作流；第三方MIT及排除载体边界不变。不再将这项声明写成尚未提供；正式采用、逐件公开范围/投影、年度/日期和发行版本仍另办。
- 专业审阅人Tina D在本轮后续明确答复：“四项接受，仅接受为保留警示的受限草稿”。[准确版本的接受回执](m06-restricted-draft-acceptance.json)记录MC01—04专业结论与用户受限接受；15条警示、not_recommended_for_filing及各项技术不足保持，未重新生成或扩大接受范围。
- 本轮没有发送对话、模型/专业API生成、上传、支付、WorkBuddy投递/导入、源CI/B/A、Git提交/推送或发布；未建立或宣称新的真实调用计数器，预算/禁用与实际操作范围分别留证。

结论：**现组合原生启动/正常退出/重启、原生未发送草稿与项目便笺、安装身份及租约释放已取得限定证据；M06输入页面和完整业务UI验收未通过。** 固定M06文稿另已取得保留15条警示的专业/用户受限接受；完整R3目标尚未完成，不扩写为可申请成稿、完整业务UI或正式发行。
