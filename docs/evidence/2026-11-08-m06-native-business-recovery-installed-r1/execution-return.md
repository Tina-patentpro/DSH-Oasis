# R5-02／P3：rc.2同版安装及离线接续回执

2026-11-08，Asia/Shanghai；Codex单代理。执行批准方案V0.1及本轮“同意进行下一步”，绑定上轮交接中的bundle／派生控制器／安装身份配对。没有启动Desktop或完整Host，没有调用模型/API、上传、费用、发送、投递、提交、推送或发布。

## 准确组合

| 对象 | 本轮身份 |
| --- | --- |
| 隔离根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1` |
| bundle | `25f5498507f4d7c0b6ae6117f9034da32c6523d4624bdf2a5a57279b49898600` |
| 业务归档 | `0.1.0-rc.2`，125成员，`836f658e658988a224880a249a65afdc7b5a2c32b18a578035a20d691f8368ac` |
| 派生控制器 | `6cc7d4f37f3d0dc1c9f568196bbd42f09257bbec19c655811577e14e624be77a` |
| 固定宿主组合 | Desktop 2.0.17／DSH 0.2.0-rc.2／Sidebar 0.24.1／Cordis 4.0.4／Node 24.21.0／pnpm 11.8.0／checkpoint 3 |

归档直接复用上轮836f658e原件，没有重建、重打包或规范化source map；实际安装125成员逐项匹配原归档清单。资源、许可、上游固定版本及禁用模型/账户/更新/市场的配置保持。当前业务恢复入口为`oasis-professional-service-m06-native-recovery`，独立entry、六项guard、准确scope、零预算及writer租约均匹配；旧零预览策略不同时启用。完整身份见[bundle-identity](bundle-identity.json)。这是本地private候选，不增加正式许可文件范围或公开发行事实。

## 问题及解决

旧控制器绑定自身字节，外部新控制器不能直接接管；旧rc.1控制器也不验证rc.2的新策略。新增窄工具`scripts/f-installed-controller-handoff.mjs`，先验证旧安装、新bundle及新旧源码身份，确认gate、ownership和Node不变，再取得既有maintenance租约与JSON单writer。事务先保存旧安装元数据及全部三项控制文件，写启动拒绝标记，再原子切换控制器和从实际文件计算的控制清单；新控制器检查成功后交还租约。失败回退原始快照；回退失败保留RECOVERY_REQUIRED。没有手工修改安装expected hash，也没有修改旧控制器原件来绕过校验。

交接及升级是两笔顺序事务：交接保留current=061d；新控制器随后调用既有upgrade到25f54985。升级使用固定pnpm的离线、冻结锁、忽略生命周期脚本及禁自动下载方式物化。仅执行Desktop公开的配置准备函数，没有App spawn、Host boot或业务插件apply。旧rc.1 release、receipt和profile-snapshot完整保留；交接原件保存在`data/evidence/controller-handoff-9e5dcb93-2287-4f2a-95a4-9e019d7dab71/before`，并与本轮前快照逐字节比对。

## 新鲜验证

- TDD先保存真实缺少交接函数的RED（exit 1），再实现；执行安装前交接／新恢复策略／旧零模式18项通过（exit 0）。覆盖错误身份、current冲突、活跃writer、元数据写失败精确回退、回退失败阻断、既有恢复标记不被清除，以及交接后升级、旧receipt/业务字节保持。收口自审另用负例复现快照读取失败时JSON ownership未释放（[RED](handoff-snapshot-red.log)），将快照读取纳入既有try/finally后，最终19项通过（exit 0，见[最终日志](handoff-green-reviewed.log)）。这是有codesign/pnpm替身的合同测试，实际安装验证另列。
- 完整bundle验证、真实签名App核验、实际控制器交接及离线升级均exit 0；没有执行签名App。实际安装控制器`--check`另进程exit 0。
- 两个独立SDK进程（PID 63248／63317）直接从实际新release加载业务实现和固定DSH公开WorkspaceRegistry、JSONL SessionPersistence、Domain/JSON backend；没有业务源码映射或替身get。两次均revision 10／相同activeTaskId，未创建新run。
- 只生成启动规格而不spawn：实际安装模块验证当前release、六guard、live lease及准确scope通过。只读state/catalog、保存文件、固定版本对话草稿可读取；输入/生成、账户、导入、观察运行、跨Workspace等越界请求拒绝。对话只是内存中的资料草稿，没有发送或建立会话。
- 35项受保护原件全部保持，包括旧SDK数据、旧安装身份/归档和本根的业务JSON／workspace.json／当前MD。旧rc.1 release整个program/profile及receipt逐项核对通过。gate/ownership/Node不变；所有writer已释放，未留RECOVERY_REQUIRED。见[preservation-result](preservation-result.json)。

复用上轮同一836f658e业务归档的源码124项、实际归档124项、编译注册0 RPC及source map对应证据，本轮不重复业务实现测试或构建。新增交接工具由本执行者自审和定向测试，未取得独立代码复审。

实际成功交接使用的辅助工具原字节另存[executed-handoff-source](executed-handoff-source.mjs)，其SHA256与冻结bundle的source.handoffHelperSHA256一致。后续所有路径释放ownership的修正仅改变工作区辅助工具；它不是bundle控制器或业务包成员。旧bundle、实际控制器及安装收据没有改签、重建或重跑；快照读取失败未发生在目标隔离根，负例仅在临时单元夹具中复现。最终辅助工具身份见verification，保留两版差异，不把后续修正虚称为已用于先前事务。

## 业务与历史边界

权威Workspace `e74001f3-dfd7-42e6-a5d3-6c05a4d527a6`，任务`native-recovery-dc9cb9c8-9400-4a39-a2a5-bfad2f482566`，run `v340-1170eecf-f429-45a1-bd15-ade8815857d0`。业务JSON仍`560f825eab3c54449b909a3bfc57ceb2c1e8d75cf0b0d7922774f2267eada4a7`。固定V1为`cbcbd328…`，当前MD为`e2a95327…`，差异被保留；7/9条警示与不宜直接申请的状态不变。只复用上轮一个明确派生synthetic run，原15警示稿的Tina D受限接受不移授本夹具。

本轮没有原生UI选择、编辑、审核、保存、正常退出或重启验收；SDK冷重读不等原生恢复。其他旧隔离根保持原状。历史FAIL/UNKNOWN、原许可采用、专业接受和发布门不重置。

## 下一接点

仅P3离线安装收口。P4仍需对本准确组合另行批准；可审范围见[native-acceptance-scope](native-acceptance-scope.md)。未批准前不启动。原生验收通过后，才更新同版业务技术事实并进入后续接受/发行决策；不因本轮离线通过消费模型/API许可或发布。

前置读取、P1108差异与授权见[preflight](preflight.json)、[authorization](authorization.json)；最终输入复核及边界见[verification](verification.json)。两处current_entry只增加本轮前缀，旧全文保持。
