# 第三批修复后复审

日期：2026-09-02。状态：STATIC_ONLY。**本地 F1–F5 反例均被关闭；未发现本次修复新增 P0–P2。不能据此宣称真实服务验收通过。**

## 范围、依据与方法

目标对象：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

唯一业务 API 权威来源：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA-256 `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`。按 5.6 流水及 8.5 create、8.7 queryprocess 的已验证边界审查；query 附加 ID/完成结果并非扩展出的权威契约。未新增端点或请求参数。

基线：本次修复前的 dirty 工作树，而非 HEAD 的全部第三批差异。审阅 8 个源码的逐次 diff，结合历史审计与已批准目标合同；新建安全断言，不改旧漏洞复现脚本，不导入注册测试的模块。

本复审由同一代理完成，独立性指新安全需求断言和单独证据目录，不代表独立审计员。实际 adapter、Host service、Domain repository、RPC handler、Client wrapper 和两阶段回写器参与端到端正控；storage backend、fetch、时钟和输入为合成夹具，真正写出的只有本地新目录文件。React 只检查 element tree，不是浏览器。

复审资产：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\safety-probes.test.mjs。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\artifact-checks.json。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\scope-and-inputs.json。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-remediation-2026-09-02\implementation-report.md，含逐项红绿记录、最终命令及退出码。

## F1–F5 逐项结论

| 项目/原严重性 | 原反例 | 修复后观察 | 复审依据 |
|---|---|---|---|
| F1 / P1 | 白名单 origin 下 userinfo、token query、fragment 进入 Markdown/metadata | adapter 上传/生成拒绝；旧 Domain 的结果/上传字段拒绝且原输入不变；直接回写入口拒绝、目录为空、错误不含合成标记。普通多文件结果可批准后安全回写 | A1、A2，F1 红绿，三层同一纯函数 |
| F2 / P2 | A 环境创建/B 环境查询，同号误作 observed | 完成后的观察及 prepared 的 continue 均在首次远端请求前拒绝，调用数组为空，Domain 字节不变 | A3，环境不匹配错误 |
| F3 / P2 | 畸形未命中项被跳过而返回普通未观察到 | raw/normalized 整页均先验证，一个正确匹配不能掩盖另一个坏项；total/items 冲突、金额错误、非法 ID/type/time 被拒绝；同号消费+退款多候选报歧义。负数有限金额不擅自禁止 | A6、A7，F3 红绿 |
| F4 / P2 | create90/query91 覆盖 ID，query-only 冒充 create 来源 | 同号90正常候选；冲突保留90并失败、无新完成结果；query-only保持空锚点、零流水请求；旧缺少 source 同样不可验证；错 key/非法 receipt ID 不落锚点 | A4、A5，F2/F4 红绿 |
| F5 / P2 | 移除 Workspace 时 pending 结果晚到，恢复后 busy 卡死 | 移除立即 abort/清理；旧成功/失败/finally 不覆盖新观察；关闭/dispose 后不重建页面；未保存标题、另一 Workspace 状态保留；普通错误可重试，并发重复调用被拒绝 | A8、A9，F5 红绿 |

关联项：A10 检查三种状态均有“关联未验证/不代表结算”说明；流水读取不显示停止，professional-run/continue 仍显示。Client 对错 runId、缺少 required marker、item/recordId 和 total 矛盾拒绝。

## 关键源码位置

- URL 安全纯函数：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-origin-policy.js，第 34–54 行。
- adapter 完整页及白名单：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js，第 266–291、309–320 行。
- 环境/身份/来源/候选：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js，第 28–48、233–300、492–496、566–576、591–633 行。
- Domain/观察合同：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js，第 345–348、414–453、464–505、530–535 行。
- 请求 runId 绑定：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-remote.js，第 123–135 行。
- 观察生命周期：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-store.js，pendingObservations、invalidateObservation、syncWorkspaces、observeRunningWater、dispose。
- 候选/停止按钮：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js，第 153–177 行。
- 出口安全与五字段投影：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\writeback-service.js，第 216–238 行。

## 生产者 → 消费者字段合同

| 生产者字段 | 下游消费者 | required / 确定性处理 | 校验/证据 |
|---|---|---|---|
| create `key`、可选 `id` | Host execution.requestKey/recordId | key 必须一致；ID 缺失不推断，有效 create ID 才标记来源 | A4/A5；错 key、负数、非整数拒绝 |
| execution.recordIdSource | observe Host | 兼容旧记录为 optional/null；非 create 时确定性 unverifiable、零请求 | A4；不回填历史数据 |
| execution.apiBaseOrigin / run.providerSnapshot.apiBaseOrigin | continue/observe | 持久化字段 required；active 必须相等才请求 | A3；Domain 本已有 provider 关联校验 |
| normalized page.total / items | Host filter | required，所有 items 必须合法；total>=items.length | A6；不先跳过坏项 |
| item.id/linkId/type/money/balance | candidate / Client / UI | required；ID 非负 safe integer，type 非空有界，金额有限且不强转 | A6；无退款正负语义猜测 |
| item.createTime | observation | raw 缺省 → normalized null；normalized 缺省默认 null；提供字符串必须非空且<=100 | A6 与 schema；raw 显式 null 非字符串拒绝，不推断日期格式 |
| observation.status/associationStatus/scope | Client/Panel | required；三态、固定 unverified、current-page | A7/A10；缺 marker 拒绝，不升格为结算 |
| observation.runId | Client/Panel | required 且必须等于请求；Panel 只展示 active run 相同者 | A7 |
| observation.recordId/total/item | Client/Panel | keys required、按状态 nullable；observed 匹配 item.linkId 且 total>=1；not-observed item=null/total 合法；unverifiable 全 null | A7、定向 schema 测试 |
| run.mode/executionId/providerSnapshot | 预览/回写/Host 记录 | remote run required；与 completed execution 的 key/input/provider 关联，不能从 editable draft 注入 | 全量 Domain/repository/RPC 回归；A1 |
| run.result.answerText/fileUrls/fileStatus/responseSha/artifact | 预览/metadata/文件 | required；URL 三层拒绝不安全组成部分；fileStatus 固定未下载未验证；保留各自 hash 验证 | A1/A2；artifact 与正文等价性历史缺口见下 |
| metadata.provider | 输出文件消费者 | 固定 apiBaseOrigin/apiId/apiEndpoint/apiProcess/folderId 五字段，不 spread 扩展 | A1 及 writeback 定向测试 |
| run.review.status / expectedRevision | prepare/commit | required；未批准拒绝，revision 变化不发布 | A1 |
| confirmationToken / manifest.files | commit / 人工确认 UI | prepare 返回 required；token 单次使用、时效；目标新建、文件大小/哈希绑定 | A1；现有 writeback 全量回归 |
| pending entry identity / AbortController | Store success/error/finally | 纯临时字段不进 Domain；必须当前 entry、注册 Workspace、页面存在且 store 未关闭 | A8/A9；非当前丢弃状态更新 |

## 本地验证与构建/保护

- 全量 271/271、聚焦 102/102、原 in-process Host 集成 1/1、新安全探针 10/10；均 exit 0，最终全量在重建后运行，测试集合有重叠，不相加冒充总测试数量。
- 10 个探针是 test 顶层数量，A2/A4/A5/A6/A9 内含多组反例和正控；并非仅 10 个输入。
- A1 使用真实本地文件写出，批准/修订/单次 token/已有目标拒绝均有效，发布文件 SHA 与 manifest 一致，普通多文件 URL 未下载但保留于结果。
- 构建两次 exit 0；client.js 字节一致，map 除 sources 相对路径外一致。dry-run pack exit 0，43 项，原白名单范围，无证据、测试、Profile、依赖目录混入。
- 完整 `git diff --check` exit 2：仅 bundle 第 2082、2090、2125、2133 行依赖模板字符串空白；源代码/测试 diff-check exit 0。已按方案保留标准产物，未改字符串或 Git 配置。
- 基线 2506 文件：批准范围 17 个改动，其余 2489 个不变；权威文档、旧审计/方案、依赖/锁、无关 dirty 文件未变化；HEAD 未变、暂存 0、新文件仅两个新证据目录。冻结摘要见 scope-and-inputs.json。
- 首次独立探针错误仅是新用例预期错误码名称不符，实际单次 token 拒绝一直有效；修正预期后 10/10，保留首轮日志，不修改旧审计。

## 剩余限制和远程测试建议

**暂不建议直接进入真实远程运行测试。** 本轮只完成已授权的本地修复/复审，不自动扩展 Profile 或远程权限。

1. URL 策略故意不支持携带 query/fragment 的签名文件链接；这是插件的保守限制，不是权威 API 文档的禁止条款。若服务实际需要签名链接，应另行确认安全展示/存储策略，不能静默去参数。
2. 旧记录含不安全 URL 会拒绝加载，不迁移、不删除、不覆盖。旧 ID 缺少 create provenance 不参与关联候选；需要独立人工恢复/迁移方案时再授权。
3. API 文档未证明 create.id 与 runningwater.link_id 的跨接口唯一业务关系，queryprocess 的额外 ID 也非权威来源。现在仅给出未验证候选；不能由 observed 推断扣费/结算/退款或资金锁定。
4. 原有 Host 存储 artifact 正文与预览 answerText/fileUrls 的等价性缺口仍在：各自 hash 正确不等于彼此对应。新产生结果通过同一构造函数并已在 A1 验证正常输出；未证明所有历史记录，也未建立公开 RPC 可利用的持久化篡改路径。本轮按已批准范围不作格式迁移/全面完整性重构，不将它列为已修复。
5. 无真实 DSH Host/隔离 Profile 启动记录、无浏览器交互与截图、无真实 API/资金流水证据；in-process 和 element tree 不可替代这些层。未评判专业服务生成内容是否达到专利代理业务质量。
6. AbortController 取消的是本地观察生命周期/等待；不宣称可取消服务端已经开始的流水读取，更没有新增远端取消接口。

下一步如拟联调：先单独确认上述适用契约/历史数据前提，再制定隔离 Profile、新建测试 Workspace、合成输入和授权非生产端点的最小验证计划；凭据只在产品 UI 配置，不进入命令、日志、文件或聊天。既有远端文件/仓库/部署仍禁止覆盖。
