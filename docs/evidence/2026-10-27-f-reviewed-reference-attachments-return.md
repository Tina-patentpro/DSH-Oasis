# F 固定审核版本引用与新草稿附件恢复返回（送审冻结稿）

日期：2026-10-27，Asia/Shanghai。用户本轮指定优先固定审核版本引用/附件恢复，禁止新增真实模型、专业API或费用，完成后由 GPT-6.1 Max 子代理独立审计。本稿送审时待审，后续结果由独立报告和当前入口接续，不回填改写本稿。

## 本批增量

新增 `patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs` 与精确字节转换器 `conversation-draft-checkpoint.mjs`，以及两份定向测试和补丁说明。固定 DSH 的原生文本 store 只保存 draft 字符串；引用 occurrence、attachmentId、File/预览和 Host receipt 原为内存态。本补丁在宿主原生生命周期内部保存有界 IndexedDB checkpoint，使用 Workspace/Session 身份键、同步 generation fence 和恢复 revision 检查。不在绿洲业务插件建设第二个聊天存储，不替换原生结构单槽。

恢复图片只重建本地预览；通用文件保留原字节并进入既有“需明确重新上传”的错误/重试状态。**不保存或沿用旧 receipt，不自动上传/发送。** 用户后改草稿、归属变化、未提交 generation、损坏/超限快照均不覆盖输入；错误可见。明确重试仍沿宿主原上传机制，本轮实际 Desktop 未重传文件；Node 重试特征测试仅使用本地假传输。

保留当前分支/HEAD、全部已有 M06 源码、主锁/活跃lib、R47业务client与旧准入/FAIL。固定 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及既有UI补丁不升级。新旁置 conversation 包采用自有修订 `0.2.0-rc.2.oasis-draft.1`；没有改写签名 App、日常 Profile、提交、推送或发行。

## 实际装配与保留的失败

R1—R3 候选同版本 link 没有被客户端选中，原生图片仍丢失，保持失败。固定 Desktop `package-overlay-Ca250500.js` 的同版本选择优先安装副本；R3临时公开 Slot 探针确认 `patch=false`，而 Workspace API、binding、归属正常。R4以明确自有补丁修订让 overlay 选中候选，探针 `patch=true`，新 IndexedDB 物化。R2显式行定位没有单独解决版本选择，不能报其恢复通过。

首轮物化遗漏原 manifest 的运行依赖覆盖，离线 lock 命令失败，无冻结锁的后续安装也失败；原日志保留。改用固定安装包的 schemastery 精确 link 后，固定 pnpm11.8.0/私有HOME/缓存/离线/冻结锁/忽略脚本物化通过。未新增下载、升级或手写包管理元数据。

R4原生图片/结构化引用正常重启通过。R5补入 randomUUID 异常可见处理，正常恢复/文件重建接线未改变；R5初启实际仍恢复原图片与两引用，再验证固定普通稿。**最终R6与R5全部产品文件相同，只把临时公开观察组件的长JSON拆成短字段，便于无截断取证。** R6两次实际启动/正常退出验证长稿。所有准入版本、原始失败、九次实际启动/退出记录均保留，最终 R6 共183个pin新鲜核对通过。

探针只在 `.local`，以已枚举的 `conversation.input.right` 列表槽读取公开 useInput/useWorkspaces，不读取原生私有 store。其浏览器 Blob 特征验证使用独立 Cordis Context/实际原生 Controller 和本补丁自己的 IndexedDB测试键，不发送给 Host。没有新增产品界面或自动业务调用。

## 固定审核版本交付

两个公开合成结果由实际固定 SDK/JSON后端/业务服务写入隔离库，synthetic executor 共2次；不是实际 Skill/模型/API 生成。实际工作台先显示“合成验收/待审核”，经本批合成测试的明确审核按钮后，调用既有“使用固定审核版本”，仅准备原生草稿；不是用户专业接受。

| 对象 | 正文SHA256 | 原生草稿字符/UTF8字节 | 草稿全文SHA256 |
|---|---|---|---|
| 普通 | `6905220170ebf0e9a8c2d1acfac2c0c4dc47008d6b3b19e97c6b75619fec7432` | 6797 / 8161 | `a9cd61a86507b7bf3dda507bb7bfbbcaaabfb8e84e15c6d67cca4161ccc6ef58` |
| 长稿 | `a35c47e9c259a8e5f6e18f2420b572f00b639a5276d630d17526a2db54c4c19b` | 126692 / 127894 | `1ea283cfda8194abe88ab5c2667af0bf596f79696509538974ea24bf38cc85e2` |

原生公开输入摘要与冻结全文逐字哈希一致，普通R5、长稿最终R6正常重启仍一致；重复引用因已有草稿禁用，不发送。普通稿通过原保存确认落地Markdown，原件7884字节/正文SHA一致。保全原件后只修改本批合成当前文件，实际原生文件预览看到变更标记，工作台提示“原审核结论不适用于当前文件”；固定草稿仍保留原哈希。变化后当前文件SHA为 `34d9c4825909ab3137c7231ed2da08c2bdd014464d332ae0c2b5834c02217251`。

另在实际 SDK/业务服务只读复核两份固定全文，每份6种错误项目/task/run/version/hash/revision请求均拒绝，共12次身份反例，业务库字节保持。新鲜既有引用合同40项通过，覆盖准确150000投影、150001拒绝不截断、未审/旧审/编辑/未决、跨项目、同hash不提权、文件重定向、晚到响应及不覆盖；这些反例是实现合同证据，不冒称均在Desktop手工重复。**实际长稿126692字符，不把它写成150000上限的Desktop实测。**

## 新草稿附件恢复

- R4实际选择公开PNG7858字节及普通/150000字符磁盘MD；原生结果为图片1＋结构化路径引用2，无文件上传。正常退出/重启后芯片及本地图片均恢复，引用有效；B已有会话空，返回A仍保持。原生公开 occurrence 的 source/ref/offset/length/clipboardText在R5实际读取可核，非纯文本冒充芯片。
- 自有 IndexedDB 的已提交图片 Blob SHA `0785a2c47d273ca87674eebd924a53b52664d5e919729126fd59b3211e38690b` 与原PNG一致；原件和落盘副本保全。R5实际载入同一图片/引用后，本批显式移除图片并清空引用，再准备固定全文；后续重启没有复活已移除附件。
- 真实浏览器 IndexedDB＋实际原生 Controller 恢复新建无路径 Blob/File：`public-blob.md`、text/markdown、lastModified12345、26字节、SHA `9e6504737138b546d2f9ff79ca4507e0021652a1e534d90a0f35fba4da69e4ec`。公开探针报告passed、uploads=0、receiptRestored=false、manualRetryRequired=true。它是浏览器层独立特征验证，不是旧真实上传附件/后台回执恢复或真实文件重传验收。

**旧附件FH-A01保持历史失败：** 旧版本未记录的 File/occurrence/Session归属无法从裸文件补认；原字节未删除，不按文件名或hash猜配。新 checkpoint 是向后新增保存能力，不是既有孤立附件的静默迁移。

## 检查与边界

初始8项缺能力RED→8通过；后补randomUUID故障在修正测试夹具后11pass/1fail→修复；另3项实际固定包class特征验证后补，未声称所有测试均先RED。最终工具Node24.21.0及实际Electron内置Node24.18.1各15/15通过、无skip，固定字节转换完整JS语法检查通过。既有业务引用40/40通过。最终183pin、12次SDK拒绝、普通/长稿原生哈希和启动退出均见[准确执行清单](2026-10-27-f-reviewed-reference-attachments-execution.json)。未改业务源码，不重建其活跃lib或把未执行的整包verify标通过。

初始3542项无缺失，状态写回前仅AGENTS有并行文档修订，已重新读取并保持；不是本作者改动，也没有回滚。新规划必读R1的交接前补核见执行清单 planningIntake，旧规划1.3.1/NS1及IC-ARTIFACT边界一致；不伪造在新条款出现前已读。候选均已退出、57563关闭、入口锁释放，预算0：无真实模型/专业API/上传/发送/费用。Loopback内部RPC和离线合成executor不冒称真实来源；没有OS全网流量审计，禁用适配/代理不声明内核隔离。

未关闭：旧孤立附件/旧receipt迁移；未提交事务即崩溃、全部存储不可写/配额、强杀/多Renderer/跨平台或版本迁移的完整恢复；超150000投影文件引用；实际模型/API UNKNOWN及模型读取正文；普通默认入口/分发强制装配；完整F、U1/D1、新版API映射/G/H及阶段6。新能力仍为明确同配对候选，不扩大到日常安装和发布。
