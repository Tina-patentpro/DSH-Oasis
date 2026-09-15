# S3A 原生对话输入适配

当前目标状态：**STATIC_ONLY**。用户已批准进入S3，本轮是原生附件接点的第一片，不代表完整S3、安装包或新UI已验收。

## 合同和范围

固定本机app.asar中 @deepseek-ai/dsh-client-ui-conversation/package.json 为0.1.5-rc.1；实际 lib/client.js 的输入compose()返回draft、attachmentIds、draftRev、phase、occurrences、queue。包声明的lib/types/index.d.ts在当前发行归档中未找到，因此依据实际已安装实现，不声称已取得该声明文件。

原绿洲conversation-draft-bridge使用imageIds作内部空输入判断；此前探针映射只作为可行性依据，不将整个探针移入业务包。最新批准计划优先于开发Skill中的旧0.1.2/BetterSidebar主容器说明。

本批只在隔离源快照的ConversationInputRegistration处正规化原生输入。新的native-composer-input.js将实际attachmentIds数组映射到现有桥的内部imageIds；不回退使用原生旧字段。附件/引用缺失或非数组、无效draftRev均保持阻断。业务bridge、Repository、API接线、业务Skill和保存格式未修改，不增加宿主版本分支、Provider框架或自动发送。

## 改动路径

根：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\source\packages\oasis-professional-service`

- src/client/ConversationInputRegistration.js：在read回调接入原生输入正规化。
- src/client/native-composer-input.js：新增最小边界转换。
- test/native-composer-input.test.mjs：与真实业务bridge合测，不调用模型、不模拟发送成功。

## 新鲜证据

执行器cmd.exe，使用候选runtime/node.exe。

先以identity转换复现：22项中18失败、4通过，退出1；有效原生空输入被旧bridge拒绝，旧字段空数组又可掩盖缺失/异常新字段。实现后，原生输入22项与既有项目解析3项合计25/25、退出0。

覆盖空输入只准备草稿、不自动发送、不修改原生输入；已有/迟到附件和引用、异常数组形状、无效revision、提交阶段、已有草稿、revision变化、会话变化、输入注销、重复插入和跨项目结果拒绝。

按source-snapshot.json逐文件比较：2,892个原有跟踪文件中仅ConversationInputRegistration.js变化，另新增转换模块和测试。package.json/pnpm-lock、API接线、业务资源及其指纹保持原样。选定日常/旧副本保护控制文件变化为空。明细和文件SHA见候选evidence/s3a-native-input.json、s3a-native-input-tests.json。

## 未完成与下一批

- 尚未加载到Desktop；本次不能证明React生命周期挂载、浏览器引用或新安装包运行通过。
- 候选源快照的依赖清单/锁仍是迁移前组合，未作虚假“整包已升级”声明；在构建批次统一锁定新组合，不先单改版本号。
- 后续S3仍需正式Connection接线（不复制探针六路由）、原生Sidebar容器和V3.1入口、必要安全预览能力/补丁、固定依赖解析及候选装配后验收。
- 本轮未安装依赖、修改运行Profile、重启实例、调用真实模型/API、上传、提交/推送或发布。后续同范围离线实现沿用已批准S3，无需重复申请执行批准；实际装配前仍须确保候选退出。
