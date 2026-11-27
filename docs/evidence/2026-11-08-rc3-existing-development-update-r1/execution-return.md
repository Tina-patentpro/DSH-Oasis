# 现有开发业务安装原位更新rc.3回执

2026-11-08，Asia/Shanghai；Codex单代理。**已在用户指定的现有rc.2业务安装上原位更新至rc.3，同版离线核对完成；应用未启动。** 没有新建环境、复制业务或迁移认证。

## 准确目标与结果

用户在更新请求后进一步明确“已有 rc.2 业务安装：原位更新至 rc.3，保留 revision15 数据”。[目标绑定](target-binding.json)接续此前只读盘点中的PENDING状态，原盘点原字节保留。

| 项目 | 实际身份 |
| --- | --- |
| 原有开发安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1`；保留历史路径名，不另建安装根 |
| 当前业务包 | `0.1.0-rc.3`，125成员；归档SHA256 `b54454a5de8d18851288e73aae7d186c5e4562f029674f0f7ef615f430fa60b6` |
| 当前bundle | `f03100c7f31b5100e886374e61aac07132421a5107365cfc2baa38996bec58bc` |
| 当前控制器 | `0398b0c882b3a78186239ab43872a3b67944d65fa60b886a84a27cf3b23fa085` |
| 保持的宿主组合 | Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0／checkpoint3 |

用户目录的Desktop2.0.18／DSH0.2.1-rc.2／Cordis4.0.5未被选中，没有修改或降级其App、Profile或依赖。实际更新的是上表已承载rc.2业务及revision15数据的安装。

## 更新与保全

先核旧安装、完整rc.3 bundle和125成员；采用已审辅助工具`cd0f4694…`，在现有maintenance租约与JSON ownership下交接控制器6cc7d4f3→0398b0c8，保存原控制文件/installation.json及事务回执，再由新控制器调用既有离线upgrade。固定pnpm物化使用离线、冻结锁、禁生命周期脚本和禁自动下载方式；只执行原有Desktop配置准备函数，没有App spawn、完整Host boot或业务插件apply。[实际更新脚本](update-to-rc3.mjs)／[更新结果](upgrade-result.json)。

交接原件保存在本根`data/evidence/controller-handoff-5e27a023-c071-4800-9adc-a70587391da9/before`，与本轮before快照逐字节一致；[交接结果](controller-handoff-result.json)记录精确旧/新身份和实际辅助工具hash。原位更新保留rc.1 **061d3e6e**及rc.2 **25f54985**的完整release、receipt和profile-snapshot，逐文件hash/mode/link核对通过。没有替换旧expected hash、改签历史证据或执行实际回滚。

业务记录仍为**revision15**，活动任务、原run、3版结果及活动版本`revision-f87ff184-abf4-4b04-94ab-5253f4c70ce7`保持。业务JSON SHA256仍为 **ea5d5e2f294e5d19f269684438b23993e2f95b6caf4c4ef45115d189c6becca8**。Workspace、两份宿主会话、旧/新Markdown与sidecar均保持原字节；各版7/9/11警示、未专业/用户接受及不宜直接申请状态不变。48个具名受保护文件保持；gate/ownership/Node不变，writer均释放，未留RECOVERY_REQUIRED。见[preservation-result](preservation-result.json)。

## 同版离线核对

- 旧控制器更新前check、新控制器更新后check均exit0；实际交接和upgrade均exit0。新Profile/manifest、独立恢复入口、精确scope、六guard、零预算及125成员与原b54454a5归档逐项匹配；包和发行元数据均为rc.3。没有重建或重新打包候选。
- 用实际新release代码及固定公开WorkspaceRegistry、JSONL SessionPersistence、Domain/JSON单writer完成一次SDK只读接续，无替身get、源码回退、任务选择写入或新run。revision15、活动任务/版本、3版结果、两个会话均可读取。
- 旧版固定审核hash cbcbd328与当前文件e2a95327仍不同；新版固定审核4392ed1e与新文件一致。固定版资料只在内存格式化，不放入/发送原生对话。跨Workspace及state/replace、生成、账户、导入、观察运行等越界RPC拒绝，业务字节保持。
- 实际安装的PanelPages空态离线渲染为现有FunctionCenter/保留任务，导入禁用；PanelChrome创建禁用且没有handler。该项为**SSR检查**，不是原生UI复验。
- 仅生成启动规格而不spawn：实际安装模块对当前release、scope、guard和live lease验证通过。检查进程的网络/禁止进程计数均0，不能扩大为全机网络或费用监控。

见[实际安装只读核对](installed-readonly-result.json)及其[脚本](verify-installed-readonly.mjs)。同一b54454a5归档此前源码46项、实际归档69项及编译source map/注册0 RPC证据按准确字节复用，不重跑无关测试、旧业务生成或完整原生验收。单代理执行核对，不冒充独立代码复审。

## 边界与下一接点

本轮启动数0、业务run新增0；没有真实模型/API/上传/费用、消息发送、WorkBuddy投递、提交/推送或发布。UI-RC2-01保持`FIXED_OFFLINE_NATIVE_RETEST_PENDING`，尚未取得rc.3原生界面复验；旧rc.2原生结论不移授。真实业务、专业/用户接受及发行仍按原门。

后续如办理入口原生复验，只需[本组合一次针对性零生成回归](next-native-ui-retest-scope.md)，不重做整套业务、修订/保存或重启验收。本轮没有执行该启动范围。

执行前规则、P1108、用户开发安装决定及目标绑定见[preflight](preflight.json)；最终输入/历史/版本与未执行范围见[verification](verification.json)。两个状态入口只增加本轮前缀，原历史全文保留。
