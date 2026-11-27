# M06实际归档与零生成入口验证 R1

2026-11-06，Asia/Shanghai；Codex，单代理。接续[装配与验证范围R1](../2026-11-06-m06-notice-packaging-r1/assembly-and-validation.md)的AV01、AV02限定部分及AV04同版身份。本轮从声明核对推进到实际本地归档和归档内模块验证，**未发布、未安装到Profile、未启动Desktop或实际DSH Host应用，未真实生成。**

## 实际归档结果

使用工程已有固定Node24.21.0／npm11.19.0执行本地`npm pack --offline --ignore-scripts`。显式关闭audit、fund及更新提示，使用本次空user/global配置与独立缓存；没有安装依赖、构建客户端或执行生命周期脚本。准确参数和退出码见[pack-command.json](pack-command.json)。

| 项目 | 本次实际结果 |
|---|---|
| 本地归档 | [oasis-professional-service-0.0.1.tgz](../../../.local/m06-offline-package-proof-20261106-r1/oasis-professional-service-0.0.1.tgz)，775221字节 |
| SHA256 | `c476b1f091b483d4ca2342f68cccb350d4af217f6d916cd8e59866f1084690c5` |
| npm完整性 | 实际归档字节与npm报告的SHA512 integrity相同 |
| 实际成员 | 134个常规文件，逐件路径/bytes/SHA256与[既有本地候选](../2026-11-06-m06-notice-packaging-r1/local-package-candidate.json)相同；解包总字节3217010 |
| 通知随件 | THIRD-PARTY-NOTICES.md、licenses/cn-patent-drafting-MIT.txt、licenses/zod-4.4.3-MIT.txt均实际存在；完整原字节相同 |
| 排除检查 | 未包含node_modules、test、.local或.dsh-test目录成员；未按整个仓库打包 |
| 包状态 | 仍0.0.1／private=true／未声明license，默认入口未改；不是正式首发版本或已授权公开包 |

归档详单见[npm-pack-result.json](npm-pack-result.json)，tar路径安全/类型及逐成员比对见[archive-inspection.json](archive-inspection.json)。未出现绝对路径、路径穿越、软/硬链接或重复成员；只在新建、Git忽略的专属目录按常规文件解包，没有执行归档脚本。

npm的`bundled=[]`仅为其依赖打包报告字段，不表示客户端没有捆入第三方代码；原客户端内Zod事实与通知仍适用。路径层排除也不表示全部内嵌文稿可公开：M06容器中两项operator历史资格及本机来源路径原样保留，其公开范围、其他第三方及权利链仍待逐项确认。该tgz仅留本地验证，不作发布物。

## 从归档加载的入口验证

本次通过归档自身package.json的exports解析并加载普通入口与M06受控入口，所有被验证的项目模块/资源来自实际解包副本。依赖复用工程现有node_modules，未安装、复制或手写依赖link元数据；其准确版本/路径/hash在[runtime-dependency-binding.json](runtime-dependency-binding.json)记录。外部Workspace、settings、credentials和连接服务由既有隔离harness提供，SDK为本机固定版本；这是**归档源码＋已装依赖＋合成外部服务**验证，不是实际Host加载器或独立机器安装验收。

一次执行[package-entry-proof.test.mjs](package-entry-proof.test.mjs)，实际5项通过、0失败。准确命令及退出码见[entry-proof-command.json](entry-proof-command.json)，完整输出见[entry-proof.stdout.tap](entry-proof.stdout.tap)。

| 项目 | 实际验证 |
|---|---|
| 自身exports | 普通入口与受控subpath均解析到归档副本；受控apply等于归档index的applyM06ControlledCandidate013，并与普通apply区分 |
| 固定资源 | 归档加载器验证M06 0.1.3容器原pin；8生成载荷组成正文，2项operator资格不进正文；内存篡改字节被拒绝 |
| 受控候选与准备 | 内存注册路由只给Flow-2-6／m06-claims-draft 0.1.3候选；catalog整体dispatch仍false；准备只读，状态逐字段相同，run记录新增0 |
| 普通入口拒绝 | 普通入口没有candidate prepare/run及run/create路由，也不声明M06候选 |
| 缺上下文拒绝 | 缺sessions时在注册路由及读取凭据前拒绝；没有自动回退到其他来源 |

受控分支专业API禁用，旧本地生成/API可用标记均false。模型prepareCall被本次探针设为拒绝调用，既有harness的凭据与fetch也设为拒绝；实际记录为模型准备0、适配器0、凭据0、受控Fetch0、创建run0。原SDK与合成输入只用于入口/准备，未调用submit/create/run端点，未消费模型输出。观察原件见[registered-entry-observation.json](registered-entry-observation.json)。内存Request/Fetch路由调用不等于建立HTTP服务器或外部网络请求。

## 接续结论

| 项目 | 本轮新增出口 | 保持开放 |
|---|---|---|
| AV01／RLS01 | **ARCHIVE_NOTICE_MEMBERS_VERIFIED**：通知从本地文件和声明推进到实际tgz内原字节验证 | 完整第三方/来源闭包及正式发行构成仍待接受 |
| AV02／RLS04 | **ARCHIVE_ENTRY_PREPARATION_PROOF_PASS**：归档受控入口、资源和零生成准备可用，普通分支保持不同 | 实际DSH loader配置/插件标识、Desktop/Host/UI及真实安装接受；默认Cordis patch仍选普通根包，未静默改接线 |
| AV04／RL06 | **LOCAL_ARCHIVE_IDENTITY_BOUND**：当前134件、通知、资源和现有client字节绑定一个准确tgz | 未重新构建client、未选正式发行版本、未取得最终安装/更新/恢复配对；旧v3/v4子集不外推 |
| AV03／05／06／RL03/05/07 | 原素材、内容建议、通知与旧F证据复用 | 公开范围/社区许可正式采用、具名专业/用户、结构化内容修订、实际更新中UNKNOWN保全等不由本轮关闭 |

后续优先明确实际Host的可信受控入口装配与准确安装验证范围；若需要修改默认配置、构建或安装，则先按具体组合/位置及原合同实施。当前不重新生成样本、不重新审PREP2、不启动源B/A或真实调用，也不把此归档标成“默认安装即可使用M06”。

## 执行前复核与保全

[preflight.json](preflight.json)记录42份输入的绝对路径、版本/阅读范围、完整原字节hash和原→现差异、实际时间/时区、执行者及Git根/HEAD/分支。根/协同当前规则重新读取，登记/独立索引重新解析；整体和项目followup仍BM1-R1/S2-R1并保留S1/G1，本次只承接M06。前轮元数据和状态差异来自已留证通知批次，不重签旧包/报告。部分原件本轮只核身份复用，如实标明，不冒称重新专业审阅。

Ruling：本次“继续”承接已具名AV01—02，允许可逆的本地离线pack、安全解包与合成外部服务入口检查；不等于安装/上线或真实费用许可。本次没有产品实现变更，沿当前分支执行，不新增worktree；只新增针对实际归档的有界验证文件，不扩展通用Runner/诊断链。

Ruling：单代理完成一次分离自审，未调审阅子代理，不称独立接受。归档及解包副本保留在Git忽略位置，原源码、依赖、资源/规则pin、社区许可草案、旧FAIL/UNKNOWN及前轮证据保持原字节；两个原状态入口只前置摘要并保留完整旧字节后缀。

新鲜[verification.json](verification.json)核归档、解包、探针回执及原件/链接保全。本轮实际本地pack一次，Node入口验证一次；构建、依赖安装、Profile安装、真实Host/Desktop、模型/API/Dify/上传/费用、源登记/CI、WorkBuddy投递、提交/推送及发布均未执行。法律/专业/用户和发行接受不由本轮验证代填。
