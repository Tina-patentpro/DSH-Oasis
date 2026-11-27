# M06隔离依赖与完整Profile配置配对 R1

2026-11-06，Asia/Shanghai；Codex，单代理。接续AV02／AV04，本轮在全新本地目录实际物化固定依赖链接，并使用已安装DSH的真实boot/include配置函数核对新归档的Host与客户端配对。**未启动Desktop或Host应用，未调用模型/API，未发布。**

## 先纠正裸包与最终Profile的范围

前轮RLS04对裸包的描述——`cordis.patch.yml`默认选择普通根入口——本身正确；但没有同时核对已存在的最终Profile覆盖层，不能据此认为原安装缺少M06受控入口。

本轮读回[10月29日原装配回执](../2026-10-29-flow26-controlled-profile-r2.json)及其完整配置补充，核得原Profile已经禁用普通业务Host，选择`oasis-professional-service-m06-controlled-013`受控实例。原回执的8份具名原件hash均匹配。该原装配结果直接复用，**不重新称为本轮修复的产品缺陷**；原回执、旧范围报告及失败/接受均保留原字节，本文件接续范围说明。

本轮新增任务是把11月6日的新归档与安装层/当前Profile两层解析准确配对，不能把旧装配成功直接填为新归档安装通过。

## 实际完成的隔离物化

源安装清单有597项本地`link:`，源Profile有7项本地`link:`。在[本次专属目录](../../../.local/m06-profile-archive-binding-20261106-r1/)生成安装依赖视图及Profile副本，只复制来源配置，不复制`.env`、凭据、账户、会话、Workspace或运行数据库。

两个清单中的Oasis均指向上一轮SHA256为`c476b1f091b483d4ca2342f68cccb350d4af217f6d916cd8e59866f1084690c5`的实际归档解包原件。其余602项逻辑目标保持原地址；相对link声明为适应新目录转为准确绝对地址。其他清单字段、依赖名称与Profile的bundle列表不变，详见[candidate-manifest-diff.json](candidate-manifest-diff.json)及[来源目标表](original-link-targets.json)。

| 作用域 | 固定工具实际操作 | 锁文件结果 |
|---|---|---|
| installation-view | pnpm11.8.0先offline／ignore-scripts／lockfile-only，再offline／ignore-scripts／frozen-lockfile物化链接 | `d52b5d047035e489b9138b5a6be69cf5640b36a5c06dc1108a588aee6656505e`，物化前后相同 |
| profiles/desktop | 同样两阶段操作 | `29509ce3f3d6d790cb030efc86feb9e0940b96068b692cdeb014404d6d36565f`，物化前后相同 |

四次pnpm进程均exit0。每次lockfile-only后检查尚无node_modules；真正链接物化只发生在冻结锁阶段。关闭包管理器自动管理下载、自动安装peer及全局虚拟仓库；独立空用户/全局配置和专属store，不写日常HOME。未手写任何node_modules或包管理器link元数据。准确命令、时长、锁摘要及原始输出见[pnpm-commands.json](pnpm-commands.json)。

这是真实的本地依赖链接物化，不是“仅声明”；也不是原生安装器执行、整套宿主复制或可跨机器分发的安装包。固定宿主文件与其他组件继续从原受控安装只读复用，新Oasis依赖来自本地校验归档。

## 使用真实配置函数取得的结果

读取固定安装中的`dsh-app-boot.loadProfileDirectory`及`cordis-plugin-include.applyEntryPatches`原实现；没有调用`boot()`、插件apply或应用启动。实现对bundle先按安装锚点解析、再按Profile回退，因此必须同时绑定两个锚点，不能只改一个Host路径而让客户端留在旧包。

实际执行[check-profile-binding.mjs](check-profile-binding.mjs)，exit0，结果见[profile-binding-result.json](profile-binding-result.json)，命令及原始输出见[binding-command.json](binding-command.json)、[binding.stdout.txt](binding.stdout.txt)。

| 核对项 | 实际结果 |
|---|---|
| 完整配置层 | bundle无跳过；普通业务Host仍禁用，活动业务Host仅1个 |
| 实例身份 | 继续使用原`oasis-professional-service-m06-controlled-013`，没有改变设置owner或新增第二个业务Host |
| Profile覆盖 | 仅原受控insert行的name改为已有`oasis-professional-service/m06-controlled-host-013`子路径；其他配置条目保持 |
| 安装层和Profile链接 | 604项实际realpath均命中指定目标；602项非Oasis目标沿原地址 |
| Host/客户端配对 | 两个锚点均将受控Host解析为归档的src/m06-controlled-host-013.js，将客户端解析为同一归档的lib/client.js；业务bundle层也指向该归档 |
| 原件 | 归档134成员在本轮后仍与候选hash一致，旧配置/安装文件不写回 |
| 原警告 | 保留`desktop-shell`、`desktop-updates`两项“patch entry not found”警告，与原完整配置相同；本轮未整改或隐藏 |
| 不支持的重命名 | 直接用id/name改已有条目仍被原include拒绝，负例保持；本候选复用原合法insert层 |
| 副作用边界 | plugin apply／Host启动／生成均未调用，受控Fetch尝试0，无凭据读取 |

本轮只证明准确依赖目标、配置合成及模块/客户端路径一致；客户端没有执行或渲染，不把路径命中当作UI通过。上一轮5项归档入口/零生成准备证据因原件相同而直接复用，不重新pack或重刷测试。

## 剩余工作已收敛到实际运行层

- AV02的**完整配置与依赖配对**已有本轮证据；原Profile是否已有受控选择已澄清，不再安排同题“修入口”。仍需具名新组合的实际Host/UI与生命周期验证。
- AV04仍需最终发行构成/正式版本及安装器配对；本机链接视图不是自包含发布物，不把引用旧宿主文件的目录直接称新安装包。
- 后续实际启动须绑定新目录/锁/归档/固定宿主/端口及零生成预算。现有launcher默认的fixture模式会被受控入口拒绝；不能为获得原生上下文就顺带沿用旧realAcceptance调用白名单或已消费许可。启动方案与真实调用分别处理。
- AV05更新中的UNKNOWN保全、AV06产品内结构修订、专业/用户接受、来源/完整第三方闭包、社区许可正式采用及发布门保持，未从本轮机械检查推定通过。

## 执行复核、差异与保全

[preflight.json](preflight.json)记录53份输入的准确绝对路径、版本/阅读范围、原始完整字节hash、实际时间/时区、Git身份与本轮范围；整体/项目followup仍BM1-R1/S2-R1，保留S1/G1。根规则全文及当前协同/登记重新读取和解析，项目与计划/兼容/交付约束按本步骤定向读；只核身份的旧对象如实标明。上轮状态前缀与本轮新来源分列，没有以新hash重签旧接受或把未读内容当全文复审。

Ruling：用户“继续”承接AV02的本地隔离物化，采用原合法装配方式与实际固定pnpm，不新建宿主/Provider/通用诊断系统；新锁先生成并固定，再冻结物化，不以手写链接绕过原工具要求。源Profile及其认证/数据保全要求保持。

Ruling：单代理在原适合分支完成本轮配置/验证，不改变产品源码、UI、默认patch或社区许可，不另建产品实现worktree；做一次分离自审，不称独立接受。早期只读探查将旧bundle的files映射误按数组处理而出现TypeError，核清JSON类型后改用键读取；未改原件、包或业务状态，未将该探查错误说成产品失败。

[verification.json](verification.json)另核原件、冻结链、604链接、配置差异、归档及状态旧字节保全。旧报告/FAIL/UNKNOWN保持，两个现行入口仅追加本轮事实与范围纠正。未构建或重新pack、未安装/启动原生Desktop/Host应用、未写原Profile/日常配置、未真实模型/API/Dify/上传/费用、源登记/CI、WorkBuddy投递、提交/推送或发布。
