# M06 公开发行候选同版构建与离线验证 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户明确授权“先完成公开发行版本、资源整合与同版构建及离线验证，暂不启动应用、真实调用或发布”。

## 交付与准确范围

[发行说明](../../release/m06-public-0.1.0-rc.1/RELEASE.md)及[123 成员配对](../../release/m06-public-0.1.0-rc.1/release-manifest.json)对应本地归档：

`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-public-release-20261107-r1/oasis-professional-service-0.1.0-rc.1.tgz`

SHA256：`a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3`。包版本0.1.0-rc.1，private=true，许可字段SEE LICENSE IN LICENSE，原采用全文及接续采用说明、两份MIT原文随包。未将主工作区0.0.1/private元数据改作公开状态。

原已采用111件源码/合同/patch中109件原字节复用；另2件仅在派生发行副本显式将原生消费/材料校验import接到新公开加载器。新增加载器和两个JSON整合已采用的10件公开便携投影，资源版本0.1.3-public.1、新容器e06aa152、新manifest254a685f；原producer/容器/投影关系保留，新消费凭证绑定派生manifest，旧pin未变。正文8件参与生成，operator2件不进模型；HISTORY_LIMITED、旧失败、来源排除与规则试行保持，无模型/专业新接受推断。

20件旧兼容资源、两个原混合容器、API基线、旧内部元数据不进新归档；其余新增件为许可/通知/发行身份和本轮编译客户端。Profile、依赖树、运行/评价/客户资料、固定输出稿和六外部载体正文排除。源码中的旧加载器保留旧pin，在本包被显式调用时准确拒绝，不回退；普通及其他入口保留导出不等全部旧能力可用。离线已验路线仅为受控M06入口，不能当全版本迁移承诺。

## 实际验证

- [RED命令](resource-red-command.json)：2项新增资源测试因加载器尚缺而失败；[GREEN命令](resource-green-command.json)2/2通过，验证载荷/资格隔离和篡改/旧容器拒绝。
- [装配命令](assembly-command.json)与[构建命令](client-build-command.json)exit0。固定Node24.21.0/pnpm11.8.0/tsdown0.22.14、已有冻结依赖、私有HOME/缓存，无安装或升级。客户端原图谱来自同版主工作区；[注册与map核对](compiled-client-smoke.json)证明51件自有源码逐字等于归档源，17件Zod来源及MIT分别保留。map仅作[定位符便携化](client-map-portability.json)，JS/来源正文不改。
- [pack命令](pack-command.json)offline/ignore-scripts exit0；[实际123成员检查](package-member-inspection.json)逐件等于装配目录，无链接/越界成员和本机绝对路径。归档实际解包后[141项定向合同](affected-archive-command.json)通过，主工作区业务实现回退被禁止；固定peer只从现有依赖解析，不创建node_modules链接/元数据。
- [合成消费接线](public-native-seam-command.json)1/1通过：独立旧源码子进程仅准备原确认、未派发；新归档拒绝旧确认且计数0，新确认仅合成派发一次，消费e06aa152并排除operator正文。[回执](public-native-seam.json)明确真实调用0，不把合成provider称原生模型验收。
- [四类排除入口](excluded-resource-command.json)准确拒绝；[编译客户端冒烟](compiled-client-smoke-command.json)exit0，注册原扩展槽且RPC0，无App/Host/DOM启动。
- 最终覆盖断言发现API材料适配模块未在上述零生成测试加载，保留[首次检查未通过记录](final-verification-attempt1.json)；未改产品或重新打包，补[实际归档材料校验](adapter-resource-binding-check-command.json)exit0，新资源接受、旧资源和folder漂移拒绝，仅本地构造正文且请求发送0。不将该合成校验当真实服务绑定或后端接受。

## 复用、裁定与剩余条件

[EXEC-R2](preflight.json)绑定32项输入，重新读取根AGENTS/协同全文、解析登记和整体/本项目followup，现协同1.2.2、整体1.3.1/NS1-R1＋适用BM1-R1/S1/S2-R1/G1。原R3-02、专业/用户受限稿接受及法律未复核、发布关闭分别承接。历史正文未全文重读部分只记身份，不伪造加载或接受。

Ruling：用户已明确要求本发行切片，且没有新UI/业务设计，不重开已采用许可。独立新容器/加载器接线代替改旧expected，分支和主工作区原111源/资源/运行pin保留。构建包组成确有变化，所以只旁置一次产品构建/归档；旧139项GUI准备结果不转移，实际解包141项＋合成接线单独留证。

Ruling：原package verify命令会写主工作区lib并覆盖无关完整开发测试范围；本轮依项目“只跑受影响合同/保全原包”约束，在旁置候选执行其对应构建、定向测试、pack及实际消费验证，不声称原完整verify或全旧版本兼容已通过。不重跑旧诊断工具链、不添加新Runner，不创建worktree、不提交、不派发子代理；作者自审，不称独立代码/专业/法律复核。

最终[verification.json](verification.json)与[保全后记录](protected-after.json)记录本轮结果。**本轮公开发行候选、资源整合、同版构建和离线验证完成；新候选未安装/启动，原生UI/安装升级/恢复、真实生成/API、独立法律复核及正式发布仍分别待办。**无调用/上传/费用、WorkBuddy导入/投递、提交/推送/部署/发布；不自动请求或消耗下一阶段授权。
