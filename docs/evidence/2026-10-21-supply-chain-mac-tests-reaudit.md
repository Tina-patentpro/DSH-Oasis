# 供应链验证与Mac测试适配复审

日期：2026-10-21。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支 `mac/continuity-v2`；HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。单代理审计，对象为本轮供应链恢复、3份旧Windows测试、Mac安全预览补测、输入助手及收口声明。以前轮报告、执行清单和实际文件为输入，重新运行验证，不沿用旧通过数作为本次证据。

**结论：主包F5供应链与干净恢复结论成立，3份Mac适配及安全预览断言通过；未发现本范围新增P0/P1产品回归。但发现1项P2测试覆盖与状态分类遗漏，故不能沿用“本轮无新增P1/P2、两项跳过受2.0.17缺件阻塞”的完整结论。** 正式主包仍为905项、903通过、2跳过；本次独立探针证明这两项合同可在Mac执行，未修改正式测试来消除跳过。

本次只新增审计报告、前置当前状态摘要及忽略目录中的审计材料；未修改产品、正式测试、lib、主包manifest/lock、活跃依赖、准入、应用或Profile。未启动Desktop、调用模型/API、登录、上传、发送对话、提交/推送或发布。原报告及失败材料保留，新的分类以本报告为准。

## 一 审计发现

### A1 / P2：两项可独立运行的合同仍被旧路径跳过，误列为恢复件阻塞

位置：[native-offline-runtime.test.mjs:13](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/native-offline-runtime.test.mjs:13)及同文件23行。

两项测试都用 `.dsh-test/stage2-desktop` 是否存在决定skip，并在执行体中继续使用这个Windows阶段路径；而当前Mac产品环境判定的明确允许路径为 `.dsh-test/mac-dev/home`，见[unified-fixture-environment.js:9](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/unified-fixture-environment.js:9)。恢复旧目录既不是执行这两个测试的必要条件，也不能直接满足当前Mac环境判定。

第一项只核对精确隔离Home和三个开关组合，第二项只导入Host模块并读取四项inject声明。它们不启动应用，不执行插件apply，也不调用真实原生服务。因此前轮收口末段和当前状态中“2项stage2真实离线运行材料仍跳过”的说法不成立。这是正式覆盖遗漏和阻塞分类错误，不是已经复现的生产运行故障。

本次在当前真实Mac规范隔离路径下，用独立子进程执行原三项开关断言及原四项注入声明断言，共7项全部通过。探针禁止fetch，未调用插件apply；证据 `offline-skips-probe.mjs/json`、`skipped-contract-probe.log`。探针通过不计入正式905项，也不替代真实Host运行验收。

后续修复：将这两个正式测试适配到当前平台批准路径，明确构造空的合成隔离目录所需前提，保留精确路径/开关和四项服务声明断言；不得创建假Desktop运行回执或放宽产品环境门禁。重跑全量并将跳过数降为0，同时保留本次与前轮历史证据。本次按审计范围仅记录，未代为实施。

## 二 新鲜测试、构建和拒绝路径

所有命令实际由zsh发起，Node24.21.0、pnpm11.8.0、固定npm与tsdown0.22.14；使用私有HOME/cache、空npm配置及受限网络环境。完整argv/cwd/退出码见 `.local/supply-mac-reaudit-20261021/commands.jsonl` 和安装result.json。

| 验证 | 本次结果 | 证据 |
| --- | --- | --- |
| 活跃主包所有test/*.test.mjs | 905总计，903通过、0失败、2跳过；退出0 | active-full.log |
| 前轮干净树全部正式测试 | 同上；退出0 | clean-full.log |
| Mac原生Markdown、Sidebar、Web、Mac安全预览及启动合同 | 26/26，0跳过；退出0 | mac-current.log |
| 原生Markdown额外解析跟踪 | 3/3；323条已解析真实路径，81个.pnpm包目录，安装应用路径0条 | native-resolution-trace.log/json |
| 两项历史跳过合同的Mac独立探针 | 3项开关＋4项inject声明全部通过；退出0 | offline-skips-probe.json |
| 输入助手负向控制 | 未知组件、字节漂移、缺件、支持模块漂移4项全部拒绝；只改临时复制件 | guard-negative.log |
| 重新旁置干净安装 | 136项started→done，3397ms；完整安装3.79秒、退出0；包体fetched=0 | clean-install.ndjson/result.json |
| 伪tarball锁反向控制 | 136项校验failed，ERR_PNPM_TARBALL_URL_MISMATCH；预期退出1 | policy-negative.ndjson/result.json |
| 干净源码重新构建到新的审计输出目录 | 退出0，client.js与当前活跃lib逐字一致 | clean-rebuild.log、integrity-audit.json |
| 固定npm pack dry-run | 退出0，114成员，无测试/依赖/工具/运行/归档/凭据目录 | pack.log、negative-pack-audit.json |
| 主包store与测试夹具store status | 均退出0，Packages in the store are untouched | store-status.log、native-store-status.log |
| 默认及正式模式的Desktop --check | 均预期退出1，固定应用可执行文件漂移被拒绝；未spawn | check-synthetic.log、check-real.log |
| git diff --check | 退出0 | 本次命令实际输出及最终审计账本 |

前轮干净树用于重跑完整集成合同；本次另建的全新clean目录只从原manifest/lock和固定store独立恢复依赖，没有复制node_modules。没有把“使用前轮目录复测”与“本次重新物化依赖”混为一项。两者与活跃主包保持同一锁。

## 三 供应链与固定输入核验

主包锁SHA256仍为 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`。本次全新私有cache产生新的成功回执，tarballUrlBinding、resolutionShapeCheck、dependencyAliasCheck均为true，minimumReleaseAge=1440、排除为空，trustPolicy仍为null。未启用trust-lockfile、关闭政策或添加排除项；不宣称执行未配置的no-downgrade或CVE数据库审计。

活跃树与本次新物化树2737份依赖包体文件哈希全部一致；链接、shims和生成元数据不要求跨目录字节相同。临时负向锁与原锁仅差一个伪tarball字段，确实被政策拒绝，原锁未改。F5在主包供应链/干净恢复范围保持关闭，不能扩大为整套Desktop或发行通过。

固定Mac组件及补丁12项pin全部与前轮一致。测试仍读取批准的UI/Web `0.2.0-rc.2.oasis-mac.1` 和Sidebar `0.24.1`；助手缺件/漂移明确失败，没有改为最高版本扫描、缺件skip或加载2.0.18代用品。

原生测试依赖夹具的官方固定提交仍为 `639ed015397290b3745d163aafe02ffee4aa3f84`；下载归档SHA256为 `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`，上游锁SHA256为 `80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1`，本次重新核对一致。逐一对比归档的14090份文件，缺失0，唯一正文变化为已经披露的pnpm-workspace.yaml收紧年龄排除，支持库源码未换。输入助手继续校验三个支持库的输出hash。

前轮最终1685项严格政策回执与当前锁/空年龄排除一致，测试专用store完整性再次通过。这里复核的是前轮严格回执，没有声称本次重新联网校验1685项。测试夹具首轮确有786个fetched事件，主包恢复下载0不能外推为整轮下载0。测试不自动安装或联网，丢失夹具时按既有约定明确失败；忽略夹具的重放说明与证据位置已记录在development-layout.md。

本次实际解析跟踪确认原生Markdown未加载已升级应用依赖；入口、支持库和依赖与当前夹具一致。该跟踪证明本次执行隔离结果，不等同于对任意未来传递依赖链接变化的完整形式证明。原生SSR、Sidebar状态VM及Web函数VM的断言均保留，未以替代渲染器取得绿色。

## 四 仍受2.0.17恢复件缺失影响的事项

本次只读确认：指定旧恢复路径 `/Users/tinadong7036/.Trash/dsh-lab-stage0-20261013/01-desktop-2.0.17` 不存在；计划旁置路径 `.local/runtime/desktop-2.0.17/DSH Desktop.app` 不存在；当前签名应用Info.plist为2.0.18。没有按目录相似度/版本排序另选恢复件，两种check仍拒绝漂移。剩余事项如下：

| 剩余事项 | 恢复件的必要作用与后续门槛 |
| --- | --- |
| F1/R1：固定候选恢复和准入 | 取得指定2.0.17原始分发/恢复件、可信来源及原始hash/签名；旁置恢复，保全现2.0.18。核对应用、内置DSH、Cordis、Sidebar、补丁及文件配对；单独审阅新client.js绑定和路径差异，再运行两种check。恢复原件不等于已准入，不能直接重算旧pin放行。 |
| R6/F3/F4：当前Desktop实际交互 | 固定装配启动后，用现有公开/合成产物验证编辑跨版本/任务/Workspace、Tab隐藏后恢复、revision冲突及完整页面草稿找回；固定审核的确认/取消/重复/失败、键盘/焦点、长文与宽窄窗口；验证两来源共有操作、编辑再审、无覆盖保存和原生文件打开。组件测试不能代替这些安装包行为。 |
| 原生对话草稿与正常重启 | 在该固定Desktop/Sidebar中验证固定审核资料进入原生草稿并保全原composer，发送由用户决定；正常退出重开后核对既有输入、来源、运行、审核、保存与旧unknown记录。本轮内存结果编辑保全不承诺未提交正文跨进程恢复。 |
| 阶段4整体及后续发行升级恢复 | 同一固定候选完成集成与数据保全复核后，才有阶段4整体收口基础；阶段6安装包/升级/恢复/发行验证仍未执行，恢复件本身不能关闭这些后续门槛。发布仍须相应明确决定。 |

以下不能继续笼统归入2.0.17阻塞：A1两项正式测试适配；可独立完成的合同/文档工作；阶段5剩余共同页面/持久化、业务资源、各节点真实API映射与非文本能力等独立任务。它们须按各自已批准范围和前置条件推进，本审计不宣称阶段5整体完成。新增真实模型/API、上传及费用许可也不由恢复件自动恢复；旧调用预算不重置。若改为评估2.0.18，需要另有明确版本决定及整套组合重新冻结，不自动执行替代路线。

## 五 保全与审计裁定

审计前冻结3252项版本控制范围文件，含已有未提交设计、P1修复、阶段5和前轮测试适配。新报告/状态摘要之外未改原冻结文件；状态采用前置摘要，旧完整字节后缀保留。最终机器保全结果见 `preservation.json`。所有新原始日志在 `.local/supply-mac-reaudit-20261021/`，前轮 `.local/supply-mac-20261021/` 的原报告/日志不覆盖。

裁定：F5及3份Mac适配的主体证据有效；A1为未修复P2，必须补正式回归才能消除这两项覆盖空洞。当前复跑未发现新的产品P1回归，但Desktop安装包、真实交互与发行结论仍保持未验/阻塞，不能用本次905项、26项或独立探针数字替代。
