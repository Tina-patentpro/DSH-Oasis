# S6 实际专业 API 服务合同核对 — 2026-09-27

后续索引：用户已选择本轮仅Fast并批准实施；本文件保留只读核对当时的结论。新的源码接线、发行pin、离线证据及安装门禁见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-27-fast-project-mapping.md；下文等待服务选择状态已被该记录覆盖，不将旧元数据观察改写成真实生成验收。

## 范围与状态

用户同意继续既有 S6 第3步。仅核对服务元数据及本地接线，不上传材料、不创建生成、不读取或导出登录令牌、不修改远端服务、原开发配置或日常 DSH。本轮只写此证据及进度索引；保留开始时的未提交变更。

当前目标状态：**BLOCKED_WAITING_FOR_USER**。已取得两项实际服务详情，但必须确认首个接线服务；Fast 与 Basic 的执行合同不同，不能自行替换。整个 S6 及真实生成均未完成。

## 新鲜证据

- 权威文档 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md 的 SHA256 仍为 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。
- 匿名 GET https://lzhxpy.oasisintwrite.com/api/apicategories/detail 返回 HTTP 401。该探针退出1，不重试、不绕过认证；不能据此断言已核验授权目录。
- 使用已有网站页面 https://app.oasisintwrite.com/workspace 的正常模型选择 UI，观察其 POST /api/apicategories/apidetail 响应。Basic 响应请求标识 51776.303、Fast 响应请求标识 51776.358，均 HTTP 200 / code 200。仅保留下表及 schema 业务字段，不保存原始响应、认证请求头或凭据字段。
- 网站初始选择为 fast，临时查看 Basic 后已恢复 fast；没有点击生成、上传或新会话。用于核对登录状态的新标签显示登录页后已关闭，不复制已有标签的凭据或会话存储。

| 项目 | Fast | Basic |
|---|---|---|
| 实际 id | 39 | 46 |
| 实际 name | 权利要求书生成-Fast | 权利要求书生成-Basic |
| api_type | Workflow | Workflow |
| is_async | 0（同步） | 1（异步） |
| price 原始数值 | 3 | 5 |
| model_name | 空字符串 | 空字符串 |
| 输出 | output / paragraph | claims_text / paragraph；claims_docx / file；report_docx / file |

price 是响应原始值，本次未单独验证计费单位，也不是本次已消费金额。正式生成前必须在 Host 认证上下文重新核对服务、价格、账户余额和项目归属。

## 输入与现有映射

两服务均返回8项输入：Technical_Disclosure_file（file），technical_solutions、technical_field、background_art_TD、beneficial_effects_TD、embodiments_TD、drawings_explain_TD、User_input（paragraph）。Fast 顺序为五章节、附图、文件、用户指令；Basic 顺序为文件、五章节、附图、用户指令。响应未提供 required 标记，不将其推断为全部必填或全部可省略。

现有 claims-document-2 映射：

- disclosure_text → UTF-8 technical-disclosure.txt → 上传回执 → Technical_Disclosure_file。
- drawings_text → drawings_explain_TD。
- claim_requirements_text 与 user_input 带明确章节标题组合 → User_input。
- 空可选字段省略。TXT与极简输入/省略其余章节已获用户2026-09-20业务确认，不重复索取相同确认；本轮元数据读取不等于生成实测成功。

当前实现只接受同步 Workflow 及文字输出。Fast 的元数据与该首版目标相符；Basic 为异步且包含两份文件，需要另外定义异步运行、正文恢复及附件交付合同，不能静默当作同步 Fast 接入。

## 本地接线缺口与待核实边界

源文件 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js 的 prepareClaimsMapping 仍要求 workspaceApiBindings；导入只保存 websiteProjectLinks。仅有网站项目关联时返回 API_SERVICE_MAPPING_REQUIRED。删除设置绑定区是用户已确认的产品决定，不恢复旧 UI、JWT或地址输入。

网站服务详情读取不是开发 Host 的认证目录/账户/项目归属联检。授权目录中的 apiId/name/process 对应、完整规范化 schema/映射指纹以及 Host 冻结运行前检查尚待接线后核验，不以历史导入成功代替。尚未选择或固化任何发行服务 pin。

## 建议的下一步

请用户决定是否先接通 Fast 同步文字切片，将 Basic 异步及两份 DOCX 留作后续独立切片。确认后再制定并实施最小接线：复用显式网站项目关联及发行固定服务映射，不增设置表单；在既有 Host 流程中检查账户、Workspace、folder 归属、目录身份和 schema 指纹，冻结输入及费用确认，漂移则拒绝且不自动切换或重发。先做受影响的失败回归与修正，再集成验证，仍仅更新原开发副本。

本轮无源码变化，因此未重复全量测试、构建、安装或旧导入/预览测试。真实上传、创建和费用需要另一次确切材料、服务及调用预算授权。未提交、推送或发布。
