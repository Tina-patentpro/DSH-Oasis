# 阶段5 V3.4.0首批实施与验证

日期：2026-10-21，Asia/Shanghai。用户明确“绑定绿洲工作台 dsh-lab，执行阶段5”。聊天已绑定DSH-Oasis项目。开发根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，起点HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：公共合同、14节点目录、确定性累计组装和Host只读准备入口已实施并通过本批检查；阶段5整体尚未完成。没有把目录/合成文件当成14节点真实生成验收。**

## 本批交付

1. `src/v340-contracts.json`冻结14节点原文及公共规则：来源业务基准SHA256 `a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6`；合同包SHA256 `6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761`。没有创建或注册新的Codex/DSH原生Skills，也没有改写旧flow-2-6资源。
2. `src/v340-catalog.js`提供精确节点和前序、输入ID/单项边界及指纹核验。14节点两种来源均明确 `enabled=false`：本地等待新版运行接线；API等待逐节点实际字段、结果及账户项目绑定证据。原首模板的旧版可用性不由此撤销，也不被借作新版验收。
3. `src/v340-document.js`提供逐ID输入回执、实际正文哈希、缺件警示、前序身份/文件名检查、上海秒级时间及UUID文件名、结构化累计快照、T1–T6状态与行保全、实用新型标志、来源/补齐/人工修改及警示继承。缺表时标missing并继续输出；尚未到生产节点才标not_yet_generated。表行存在仅是结构事实，代码不代替技术语义或专业审核。
4. 每节点完整核心正文、结论及实际输入逐字保留，不依赖模型主动返回更新列表。稳定内容和表行不允许静默替换；明确 `替换：内容ID` 或 `替换：T1/行ID` 才记录前后值。模型不能伪造上游/人工确认来源、确认技术事实、关闭继承警示或占用Host保留ID。前序人工编辑、身份/结构异常时保留实际完整原文并警示，不回读旧文件。
5. 新增 `workflow/v340/catalog`、`workflow/v340/prepare` 两个精确RPC路由，经实际Workbench Host及现有Connection接通。准备入口只读用户明确指定的当前Workspace UTF-8 md/txt；支持文件/文本并存及BOM，复用既有路径、软链接、文件变化与哈希检查。错误不回传材料正文、文件路径或底层异常。

准备不会创建任务、持久化运行、启动模型/API、自动保存文件或调用对话；累计组装函数也不会派发、重试或作技术判断。PDF/DOCX/图片解析尚未接入，不用元数据冒充正文参与生成。

## 新鲜检查及结果

命令均在当前Mac、固定Node24.21.0下执行。完整日志及原始红测保存在 `.local/stage5-v340-20261021/`。

| 检查 | 结果 | 原始记录 |
|---|---|---|
| 新增合同及真实Workspace准备测试 | 13/13通过，退出0；含14节点顺序交接 | fence-green.log |
| 全业务包测试 | 899总计、897通过、0失败、2历史跳过；退出0 | final-all-tests.log |
| 启动器合同 | 14/14通过，退出0 | launch-tests.log |
| 当前client构建 | 退出0；与本批开始时的client.js/map字节一致 | build.log、保全账本 |
| npm pack dry-run | 114成员；4份新版源码/资源均包含；无test/node_modules/.local/.dsh-test/.archive | pack.json |
| 默认Desktop --check | 退出1，固定应用文件漂移 | desktop-check.log |
| 正式验收Desktop --check | 退出1，同一准入失败 | desktop-real-check.log |
| git diff --check | 退出0 | 本轮终检 |

两项历史跳过为 `approved isolated Home admits only the explicit native offline flag` 与 `isolated Host declares native services before accessing Cordis context`，不是通过。Full suite设 `OASIS_UNIFIED_FIXTURE=1`，真实提供方未执行。

实际合成14节点文件保存于本地 `synthetic-chain/`，清单 `synthetic-chain.json`。最终文件138077字节，88条警示，未丢失上游内容；仅是缺件/占位合成组装，不是实际Skill、API、Dify或专业质量通过。文稿缺失T表如实标缺，不伪造技术成果。

初次全套测试发现两处旧Host集成测试仍固定41个路由，按新增2路由更新为43，并增加实际Host新入口调用检查，最终全套通过。初次npm预览将user/global配置同时指向/dev/null而退出1；改用本批空global配置文件后退出0，未改变用户或全局npm配置。红测及失败保留。

## 保全与审查

开始时冻结3237份受控/非忽略文件哈希。除本批3份Host源码、3份路由/Host测试及当前状态新增摘要外，全部原有文件与开始时一致。原15+13张设计及批准、R2–R4源代码、旧unknown/审核/保存记录、旧Skill、manifest/lock、client.js/map保持原字节。运行数据、应用、Profile、认证及准入均未修改。未提交、推送、部署、真实生成或API上传。

按项目单代理规则由作者单独复审，非独立审计。复审关注实际正文丢失、人工修改识别、伪造来源、BOM哈希、稳定ID、内嵌代码块及重复运行UID，并以失败后通过的测试修正。没有将自审写成独立复审。

执行裁定：复用当前根目录及分支，以保留已确认设计和R2–R4修复；不另建工作树。采用已有业务spec实施公共合同及准备切片，保留旧claims运行合同；代价是本批没有把新14节点接入旧任务生成界面，不能宣称阶段5完成。

## 未完成项与实际阻塞分开

| 项目 | 当前事实 | 下一步 |
|---|---|---|
| 公共持久化/运行/草稿/结果UI接线 | 尚未实施；现有严格状态schema仍只支持旧claims | 新版本schema和兼容迁移、未决/重启保护后接入共同页面 |
| 首模板及其余13节点本地业务资源/原生生成 | 尚未接线；本批冻结的是业务合同 | 首模板新版起，按路线图分组实施资源加载、模型输出合同及运行接线 |
| 专业API实际映射 | 各新节点实际服务ID/schema、文件接收和结果语义尚未核实 | 对精确服务逐项比对；不从同名或示例推断、不套用claims绑定 |
| 全材料解析 | 本批只支持UTF-8 md/txt | 逐格式引入实际解析与来源定位；未解析材料保持不可用 |
| Desktop验收 | 两种准入均失败；既有固定Desktop原件/组合问题仍在 | 先解决F1并审阅装配，再做实际GUI；不改pin制造通过 |
| 真实模型/API/Dify | 本批均未执行，无新费用预算 | 在具体模型/服务/资料/预算明确后单列执行，不复用已消费许可 |
| 阶段4、供应链F5、发行 | 原未完成边界保留 | 不用阶段5合同测试关闭这些事项 |

后续计划见 `docs/plans/2026-10-21-stage5-v340-expansion.md`；只有本批三项任务勾选，后续运行与真实验收保持未勾选。
