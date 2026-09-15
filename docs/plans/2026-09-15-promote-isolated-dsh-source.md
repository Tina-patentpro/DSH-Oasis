# 已验收隔离适配同步至主项目：已批准执行计划

2026-09-15 用户“同意进行”后完成本计划源码同步。验证及已知限制见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-15-source-promotion.md。以下“待确认/尚未同步”描述保留为计划形成时的历史状态，不覆盖本条。

## 目标与当前状态

先结束双源码状态，再继续已批准 API 接入第 3 片。只同步已验收的 DSH 适配及可复现补丁，不借机设计新界面或开放实际调用。

源：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\source。

目标：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

本轮只读清单在隔离候选 evidence\source-promotion-inventory-20260915.json：主包 157 个快照文件无漂移，选定源码/构建/元数据/测试共 29 项差异。未同步代码、未安装或发布。实际主包仍 0.1.2-rc.1 peer/dev 组合，候选为 0.1.5-rc.1。当前 API 空占位兼容、技术交底文档映射和线上模式基础接线已存在，不重复实现。

## 实施边界

1. 执行前重验主包 157 项与清单中的双方哈希、Git diff。出现新变化只停止冲突文件，不覆盖、不 reset/stage/commit。备份到新的本地旁路目录并记录每项前后哈希；不修改当前已验收安装包或任何 Home。
2. 仅同步 7 个运行源文件：src/client/ConversationInputRegistration.js、src/client/native-composer-input.js、src/client/panel-host-coordinator.js、src/client/workbench-remote.js、src/index.js、src/unified-fixture-environment.js、src/workbench-connection.js。业务表单、API/client-policy、运行记录、审核/保存合同、业务 Skill 正文均保持。
3. 同步 package.json 和 pnpm-lock.yaml 的候选固定组合；只变开发目标，不改全局 CLI、日常 DSH 或用户设置。保留 fixture 对既定 isolated-dev Home 的限制，不将它改成任意目录可开启，不为测试扩大生成权限。
4. 同步清单内通用适配测试。五个依赖具体 Sidebar/Markdown 安装、备份或 ASAR 的测试（connection-target.integration、sidebar-target-contract、s3c-native-markdown-policy、s3c-sidebar-safe-file、s3c-web-markdown-policy）不直接混入主项目常规测试：作为固定候选集成用例单独保留及记录入口，禁止以缺测试材料时静默跳过冒充通过。既有旧 stage2 条件跳过如实保留。
5. 将候选 source/patches 中本次 Sidebar 0.19.1 safe-native-files-2 和 DSH 0.1.5-rc.1 Markdown 策略补丁按其现有目录结构新增到主项目 patches；旧版目录不覆盖。保留原输入 SHA、补丁 revision、受影响文件清单和已安装输出 SHA。EXE/ASAR 配对构建使用既有已验证过程及证据，不复制大二进制进主项目，不关闭 Electron fuse，不生成新的安装包。本地绝对验收路径写入使用说明，不把验收备份当分发依赖。
6. lib/client.js 与 map 从受控构建输出取得：在新建构建副本使用固定依赖和隔离 Home/cache/temp，不原地重装主项目 node_modules。只在构建结果与批准候选哈希一致时同步这两项；不一致则停止调查，不悄悄替换已验收构建。
7. 在当前项目 AGENTS 固定基线段中区分“开发组合目标”和“全局 CLI/日常安装未由本任务修改”，保持最新用户版本决定，不修改范围之外的规则。更新开发 Skill 相应版本/原生 keyed Sidebar 合同，保留安全、凭据及人工授权要求；不顺带重写 Skill。

## 验证与停止点

- 先跑受影响的 composer/Connection/Sidebar/Host/结果保存/现有 API 回归；再在固定隔离构建副本跑一次完整 verify 和 pack dry-run，记录命令、退出码、跳过项。
- 逐项确认改动严格落在清单/补丁新增范围；API、业务 Skill、旧记录和主项目其他既有变更保持；同步前后包内源文件与候选相等。
- 用主项目补丁对固定原始输入重放并比较已安装输出；只读核对原候选 pins，不重复安装或消费 UI/生成预算。若输出改变，旧 UI 验收不得当成新输出的证明。
- 同步完成仅代表源码与已验收组合一致，不代表实际 API 可用或发布。

## 后续业务入口

源码统一后继续 docs/plans/2026-09-13-stage5b-controlled-online.md 第 3 片：账户/Workspace/folder 显式绑定、配置及上传回执快照冻结、既有四字段文档映射接线。先给出字段级实施合同并进行离线测试；实际服务是否接受 TXT/字段省略仍未证明。真实登录配置、上传、生成和费用须按具体目标取得相应授权，不复用历史许可；不再修改后端。

本计划涉及此前隔离范围以外的主项目源码/开发基线变更，等待用户确认后实施。本轮没有开始上述同步。
