# R5 原生业务恢复 V0.1：本地实现与离线验证回执

2026-11-08，Asia/Shanghai；Codex单代理。用户明确同意V0.1并要求先验证官方Workspace无App/Host离线装配；[准确批准](authorization.json)绑定原方案SHA256 `501bd8771ae147c6153cb0de988eaf4a98764a2fb9629fcd407f64d8020876ae`。原方案、R5、采用/固定稿及历史回执不回写。

**本轮完成P1及P2，并交付新合成夹具、本地构建候选与实际归档离线证据。P3的新版bundle/控制器/安装组合尚未装配，P4原生启停未授权、未执行。** 不将SDK、React静态渲染或编译注册当作App/Host/UI验收。

## 实际结果

| 范围 | 本轮实际证据和边界 |
|---|---|
| P1固定运行时 | 在批准的新根仅物化061d/a7cf冻结运行时，官方离线安装exit0；未启动App/Host，旧根不覆盖 |
| 官方Workspace | 真实WorkspaceRegistry＋真实JSONL SessionPersistence＋固定DomainFacility/installed JSON/writer，以公开create取得A/B UUID；相同规范路径复用ID；独立进程冷重读保留ID，workspace.json SHA256一致；不是get测试替身 |
| P2服务端 | 新增窄task/select，只改activeTaskId及框架revision/updatedAt；11项恢复接口精确注册并在handler二次拒绝其他动作；跨项目、宽状态替换、生成、账户、导入均拒绝 |
| 可信组合 | 独立`./m06-native-business-recovery`入口不注入credentials/llm；安装策略、实际租约、根/guard配对验证后才开放。模式互斥；恢复Host组合不构造模型执行器、账户、导入或专业服务；缺策略不回落正式模式 |
| 客户端 | 复用结果页；输入/来源只读，保留任务可重新打开，窄选择进入原队列；关闭再打开及重新载入store能恢复任务/run；目录确认恢复模式后不刷新账户/专业bootstrap。不是浏览器或原生UI接受 |
| 新权威夹具 | 在A的真实UUID下仅一次新派生synthetic run，沿公共服务建稿/修订再审/保存，原7条及修订9条警示保留，not_recommended_for_filing不改；只属工程合成，不继承旧15警示稿接受 |
| 归档代码＋真实存储 | 实际rc.2归档代码与本根官方Workspace/Domain/JSON/writer组合，窄选择后record revision10；另一进程冷重读保留相同任务/审核/保存回执及业务JSON SHA256，0新增执行/网络。该组合使用固定rc.1安装运行时，rc.2业务包尚未安装为新组合 |
| 当前/固定稿 | 新派生保存文件追加具名合成标记后matchesReviewed=false；固定资料仍绑定审核hash，不含磁盘追加标记；仅生成资料文本，未插入真实会话、未发送 |
| 本地候选 | private的0.1.0-rc.2，125成员。源码工作包仍0.0.1，只新增受控子入口；无固定宿主/依赖/资源pin升级。候选不是已公开发行物或已安装组合 |

新根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1`。本根安装身份仍为旧061d/a7cf，内有本轮新数据；`candidate-identity.json`里的rc.2独立归档不得拿这个安装身份代签。

## 准确身份及命令

- 官方Workspace A：`e74001f3-dfd7-42e6-a5d3-6c05a4d527a6`；B：`11e1a348-0248-42a1-8141-bcb6306caccc`。A实际路径为本根`data/workspace-a`；官方注册字节见[workspace-create-result](workspace-create-result.json)及[独立冷读](workspace-cold-result.json)。
- 新任务：`native-recovery-dc9cb9c8-9400-4a39-a2a5-bfad2f482566`；run：`v340-1170eecf-f429-45a1-bd15-ade8815857d0`；V1：`revision-123045ba-ecc8-4a32-8322-3c52adb596b0`；新输入SHA256 `31169e69a57ee59de796a38d8cd6226dcba31ae3efff9f3a911d58f64d7732a3`。
- 新V1审核结果SHA256 `cbcbd3286b97e351ca44d56358c01fb3c01a9dbf02da6a3df5e584857fa2193a`；当前MD SHA256 `e2a953274804fbdd226b4052f5bb38f0ccb34aaf0343bf635710eacb71f64517`。文件名`claims_20261108124209_123045ba.md`，均在本次新根内；原a18/4d稿保持。
- 窄选择后及独立进程冷读的业务JSON SHA256均为`560f825eab3c54449b909a3bfc57ceb2c1e8d75cf0b0d7922774f2267eada4a7`，record revision10。完整对象见[fixture准备](fixture-preparation-result.json)、[接续](native-fixture-continue-result.json)及[冷读](native-fixture-cold-result.json)。
- rc.2归档：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-native-business-recovery-20261108-r1/oasis-professional-service-0.1.0-rc.2.tgz`；SHA256 `836f658e658988a224880a249a65afdc7b5a2c32b18a578035a20d691f8368ac`，125成员逐件配对见[candidate-identity](candidate-identity.json)。原a7cf归档、资源容器/manifest、许可/第三方通知保持。

定向验证（zsh调用固定Node；完整argv/退出码及原输出均在本目录）：新服务端/客户端/可信安装11项先RED后GREEN；包含旧零预览、结果、原生候选、RPC/路由、store、Host模拟集成及设置的受影响源码124项、实际归档124项均exit0；安装策略/旧零模式9项exit0。未运行全仓verify或产品真实调用，按项目AGENTS第9节只验证受影响合同。

编译产物输出到新`.local`候选目录，没有覆盖工作包原lib。编译注册smoke exit0，51份自有source map内容逐字对应归档、17份Zod来源及原MIT通知保留，0 RPC；source map仍为本地构建相对路径，未办理公开规范化/最终发行接受。

## 保留的失败与修正

1. P1探针attempt1错误使用Context.dispose，遮住主错误；attempt2确认Context.set不能代provide。按固定Cordis4.0.4公开context.provide及context.fiber.dispose修正探针，attempt3与独立cold exit0。失败脚本/命令保留；未换假WorkspaceRegistry，也未创建业务run。
2. 控制器新测试的初次运行因测试helper遗漏t参数失败；修正测试后观察到真实RED（缺少拒绝/模式），再实现并取得GREEN。错误运行与有效RED分别保存。
3. 初次npm pack因user/global配置同时指向/dev/null被拒绝；改用本任务私有的两份不同空配置后离线pack exit0。未修改日常配置或重跑构建。
4. 归档SDK首次select已提交，但探针给createV340Run负例误带结果字段，严格schema先拒绝为V340_INVALID_INPUT。原命令exit1及源码保留；只读核对该record后，以合法负例负载继续既有revision10，确认为V340_EXECUTION_DISABLED。没有再次选择、创建或执行业务run；接续和冷读exit0。

这些修正只作用于新代码的TDD或本次探针，不重签旧FAIL/UNKNOWN、不删除失败、不扩大真实调用范围。

## 剩余与交接

接下来沿R5-02/P3办理新125成员包与派生控制器、可信恢复profile、bundle及实际安装身份的准确配对，并核清当前固定控制器到新策略的接续方式；不手改旧安装receipt或替换原控制器绕过版本guard。现根仍rc.1，不可直接以旧启动器启动rc.2。本轮的官方Workspace及新夹具可作为具名来源，不重复消费合成执行或静默迁改ID。

新组合离线核对完成后，P4仍需针对准确组合单独取得原生启停/本地业务写入范围。真实公开资源生成、专业/用户接受、升级/回退、完整F及发布沿原计划分别办理。PREP2/Fast39、格式与WorkBuddy不成为本地首发统一前置。

本轮按项目单代理要求自审，未进行独立代码复审；保护件/原导航/输入、实际命令及候选身份的最终核对见[verification.json](verification.json)。未启动App/Host、真实模型/API/上传/费用、源事务、WorkBuddy投递、提交/推送/部署/发布。
