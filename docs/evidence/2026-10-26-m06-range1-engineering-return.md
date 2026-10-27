# M06范围1工程返回：来源资格、受限编辑与旧兼容

任务`DSH-M06-RANGE1-EXEC-20261026-01`，2026-10-26，Asia/Shanghai；承接`PD-M06-RANGE1-HANDOFF-20261025-07`、复审`PD-M06-RANGE1-REVIEW-20261025-08`及明确修订的v0.2.0交接/工程计划。属于[本项目后续计划](../plans/2026-10-26-dsh-oasis-follow-up-development-plan.md)的现有Host消费边界维护；用户本次已要求持续推进及GPT-6.1 Max子代理审计。

**这是范围1机械证据返回，不是全部后续计划完成，也不是新业务Skill、真实Host或14节点双来源接受。** [机器返回](2026-10-26-m06-range1-execution.json)逐45原子断言列明原预期、选定部分状态、实际测试标题/日志及源/夹具摘要，供[独立审计](2026-10-26-m06-range1-independent-audit.md)最终复核；原S/C目录未回填。S05专业语义NOT_EVALUATED，S24完整事务、S25真实消费、正文/表/来源完整同步及结构删除仍开放。

## 改变与保护

- `src/v340-document.js`新增Host内部精确来源分类，新M06技术updates拒绝user_input、可识别历史指令ID及歧义ID；同SHA但不同无歧义材料仍可引用。指令逐字审计保留，使用既有excluded_from_formal_text，不新增公共schema/第九输入；旧source_fact条目只读不迁移。
- 新装配及核心修订增加绑定本次UID的Host限制警示；模型占保留前缀、继承目标精确ID无论何种状态均拒绝当前新产物，不换UID绕过。其它历史UID的resolved/accepted警示保留，本次open不会被旧去重掩盖。
- 核心修改仍只改核心正文，新版本再审；表/来源/旧版本保全。页面持续显示同步/删除能力限制，即使目录缺失、旧版本没有本次警示、父子版本切换或只有历史编辑清单也可见。固定原文不为界面提示重签。
- 两个生产文件之外只补测试及fixture计数/配置；未改资源包、旧golden、锁/pin、schema、运行常量或活跃lib。真实来源与生成入口继续禁用。六载体许可及未解析规则依赖未因本次工程关闭。

## 新鲜验证

工作目录为实际DSH-Oasis根或其业务包，执行shell为zsh。固定Node来自tools/bin/node；产物构建/pack使用私有HOME/cache，未安装进日常Profile。

| 验证 | 实际证据及结果 |
|---|---|
| 生产前失败 | m06-red.log：4项目标失败，退出1；ui-red.log：缺持续能力提示，退出1。修复对应源码后通过，不以绿测替代红证据 |
| 最终定向 | `tools/bin/node --test --test-name-pattern='M06 R1'`加workflow/client/results/native-candidate四文件；m06-audit-evidence-final.log，13/13，退出0，无跳过 |
| 最终全包 | 在业务包运行`../../tools/bin/node --test --test-concurrency=1 test/*.test.mjs`；full-suite-audit-fixed.log，1438/1438，退出0，无跳过 |
| 历史兼容与普通原生交接 | 全包含旧v1/values-v1、旧候选/审核/回执、unknown及native-handoff；审计者另有128项独立C/D回归和13项带网络拦截的目标运行。只证明相应机械合同 |
| 精确边界 | 1024警示/1025拒绝、1MiB文稿/多1字节拒绝；有无材料的来源准入；M06 RPC文稿超限后草稿、旧审核和原版本保留；合法显式替换、T4前缀与同对象无伪修订 |
| 保存恢复 | 文件已发布后索引失败返回原恢复错误，实际文件SHA/manifest产物身份一致，回执未成功；publish=1，首次consume=1，显式重用已消费token后consume=2但publish仍1，生成增量0 |
| 旁置构建/包清单 | build-private.log退出0；同字节src与旁置client配对，npm离线/ignore-scripts pack dry-run退出0，122成员，无test/node_modules/Profile/.local；活跃lib未覆盖 |
| 旧能力台账 | source-mapping.log退出0；14/28/136/114原台账和来源禁用保持 |

所有日志和5份公开合成夹具的raw/text SHA、UTF-16/UTF-8长度、receipt及prepared摘要见机器返回。测试中的替身调用与真实网络分列：普通fixture生成1次；原生拒绝测试prepare/stream各1次；保存不增加生成。审计者对R1合成测试额外拦截fetch/socket，四个进程0尝试。本批后续经用户授权读取网站真实服务元数据另行记录，不能把“合成测试网络0”扩大为整个开发会话未联网。

## 保留的失败与未验

默认并发的较早full-suite-final.log出现1项长输入候选失败，1433/1434、退出1；相同测试单独运行1/1通过，串行后1434/1434及最终1438/1438通过。失败原日志保留，生产超时/限额未提高。当前证据支持该路径在串行环境通过，尚不能声称默认并发稳定性已修复；不要把偶发失败从结论中删除。

补充测试夹具初次存在JSON键序导致非规范原文、保存草稿命令多给versionId、前端投影未必有resultVersions的编写错误，均在固定测试夹具/调用层纠正，失败日志保留；没有因此放宽生产校验或覆盖旧golden。

`tools/bin/node scripts/macos-development-launch.mjs --check`实际退出1：Invalid Mac admission。只读核对发现旧root虽解析到同一当前目录，仍有8个pin路径DRIFT/MISSING，包括已变化的日常Desktop；未重算pin、替换签名应用或启动Host。此处不把`--check`或旁置client构建当实际Desktop/重启/跨进程接受。

## 全目标继续项

材料首批任务1—4已由GPT-6.1/max审计在准备层接受。范围1最终接受看其独立报告，不能代DS-02真实资源、逐格式U1/D1、E/F/P1/U13、G0→G1—G5、H及阶段6。用户新授权下正在本地定位并补装具体DSH执行依赖，同时使用实际网站已登录会话核对真实服务/schema；这些新增工作不会改写本返回的测试范围或补造调用/专业/用户接受。

本次无提交、推送、发布或日常Profile写入；对话只准备草稿，不自动发送。
