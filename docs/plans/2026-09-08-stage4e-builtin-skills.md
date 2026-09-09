# 阶段 4E：绿洲内置 Skills

授权：用户明确同意执行“文件规范＋绿洲 Host 执行约定”的方案。默认单代理，无提交、推送、真实模型/API、真实 Profile 修改或私有资源运行授权。

## 目标与实现边界

Skill 是版本化业务资源，不是 DSH 原生 Skill 注册项。首版只有“权利要求初稿”，顺序为技术交底→权利要求→说明书具体实施方式。不为遵守旧表单而要求用户预先写出权利要求。

本批落实文稿包、加载器及非秘密原生服务集成。真实文稿只在 Git 忽略的开发审阅目录；测试使用独立公开替身。现有 UI/RPC/Domain 仍是输入合同 1，不能把合同 2 文稿伪装为可直接投入现有页面。本批不修改既有表单、扩大 API 映射或生产开关。

## 确定的装配与执行合同

- 资源包包含 SKILL.md、references/drafting-rules.md、references/special-domain-boundary.md、assets/claims-output-template.md 和 manifest.json；不扫描其他路径，不递归跟随链接，不执行脚本。
- manifest schemaVersion=1；字段包括 skillId、skillVersion、inputSchemaVersion、outputSchemaVersion、executionContractVersion、resources。resources 是四个路径、role、sha256 的有序清单，次序固定为主指令、通用规则、领域边界、输出模板。
- Host 提供确定的绝对 root、独立锁定的 manifestSha256 和期待的三项合同版本。不能从业务 RPC、用户输入、同一未经信任的清单自取预期指纹或任意目录。指纹是完整性约束，不是加密或签名系统。
- 加载器读取上限：manifest 16 KiB，单个资源 64 KiB，四份资源合计 128 KiB，组合 system 不超过既有适配器的 64000 字符；拒绝非法 UTF-8、空正文、未知字段、错误顺序、跨目录、符号链接/junction。失败只返回固定错误，不回显路径/正文或底层异常。
- SKILL frontmatter 首版只接受按name、description顺序排列的两个单行标量；name为manifest skillId，description使用JSON兼容双引号字符串且解码后为非空单行文本。不支持YAML标签、别名或多行标量，不是完整YAML执行器。正文作为业务步骤说明，一次性交给模型，不逐步骤发起调用。
- 资源按固定顺序组合；output-template 单独标注为输出格式资料，不授予模板任何执行权限。模型不能自行选择加载其他文件。
- 加载结果仅交给 Host：instruction={version,body}，provenance 含 Skill/合同版本、manifest 与资源指纹、assemblySha256。正文不进入普通配置/RPC/持久化；不把整个加载结果序列化给客户端。
- 加载不发模型请求；上层完成身份/权限/费用/持久化准入后才调用既有适配器一次。保留现有审核、无覆盖保存、对话草稿、不自动重试和未知状态规则。
- root 属于未来受控 Desktop 安装资源，不能位于用户业务 Workspace 或原生 Skills 目录；当前只在临时非秘密目录验证加载函数。安装位置和普通文件入口的实际验证仍是后续独立证据，不由此纯函数宣称已隔离。

## 文件与任务

1. 文稿包：.dsh-test/stage4e-authoring/oasis-patent-claims-v0.2/。私有文稿不进入 src/lib/test/output；只使用文件读写、格式/哈希检查，不交给产品 loader 或模型。保留 v0.1，并在原审阅说明标注后续业务纠正。
2. 新增 src/builtin-skill-loader.js；新增 test/builtin-skill-loader.test.mjs。先证实缺模块的红灯，再实现最小只读加载器，验证完整性、路径、合同、快照及安全错误。
3. 新增 test/builtin-skill-fixture.mjs，只构造非秘密四资源包。生成测试目录为操作系统临时目录，不读取用户附件或私有 v0.2 内容。
4. 新增 tests/integration/stage4e-builtin-skill.test.mjs；使用已安装固定 DSH 0.1.2-rc.1 原生 llm 和会话/日志组件，一次公开替身调用，检查 system 实际包含必要资源、无工具、统一产物与原生日志不含 canary。异常/资源不匹配时不调用或不泄露；不得伪造 Desktop 或真实模型证据。
5. 使用 npm pack dry-run 检查加载器包含、资源文稿排除；不生成/发布安装包。更新本计划、证据和 AGENTS.md，仅记录合同和结果，不抄录私有正文。

## v0.2 业务合同（设计，不冒充当前 UI 实现）

- inputSchemaVersion=claims-disclosure-2：upstream_snapshot（Host 从当前项目精确选定前序文件取得的正文和来源元数据，未接通时明确缺失）、disclosure_text、drawings_text、claim_requirements_text、user_input；均分开表达，不把技术交底塞入旧 claims/embodiments 字段。完整文件通道按14节点清单未来逐项接入，材料哈希不等于正文已读。
- outputSchemaVersion=claims-cumulative-2，executionContractVersion=single-call-cumulative-1；对应一个具有文档信息、核心结论、核心结果、下游读取区、风险与待确认事项的累计Markdown。模型一次返回summary、draftMarkdown、featureMatrixMarkdown、fallbackMarkdown、supportMatrixMarkdown、snapshotUpdates、warnings、modelCompletions、workflowStatus、deliverableStatus的JSON对象，Host校验并成文；完整类型说明在文稿包输出模板中。该返回格式仅已定义，当前v1适配器不会自动解析此JSON或合并累计快照。
- 主结果为权利要求初稿、特征矩阵、回退层级和 T4 权项侧初版。未生成的说明书定位保持待形成，不虚构支持段落。模型补齐逐项登记来源、依据、假设、置信度、影响和人工确认状态；技术风险不触发自动回流。
- 技术层失败/取消/超时/无有效响应不包装为业务 completed_with_warnings。业务 workflow_status 与 deliverable_status 独立于既有运行 status，不能靠匹配一段 Markdown 猜测分类。
- 运行时间、UUID、文件名、输入哈希、前序归属、完整继承等由 Host 冻结和组装；不得让模型猜测或改写。大型前序快照超过模型上下文时不静默截断、不强行发起调用。
- 上述新增正文、状态与累计产物需要后续输入/输出适配设计和定向实现；本批 loader 通过预期合同校验拒绝把此包投入旧 v1 adapter。公开集成替身明确使用旧 1/unified-text-1/single-call-text-1，以验证资源加载与一次调用接点，不作为合同2上线证据。

## 验证、停点与证据

- cmd.exe：包内 node --test test/builtin-skill-loader.test.mjs；根目录 node --test tests/integration/stage4e-builtin-skill.test.mjs。
- 定向回归仅既有 dsh-generation-adapter 与 local-generation-service 测试，不反复整批 verify。没有修改客户端，不为增加测试数字而重建界面。
- 单代理复核不称独立审计。正文从普通产品路径暴露、调用可能外传、出现跨根目录或错误资源时立即停对应路径；不清日志、不绕门禁。
- 当前文件/原生服务证据不能关闭最终安装包、Desktop 普通文件入口或 G-SKILL；私有包装配与真实调用仍另行授权。

## 执行记录

2026-09-08 后续 4E-2 已按授权接通四选项卡及合同 2 公开替身，并取得隔离 Desktop 的本地生成/编辑再审、两来源保存、重启恢复及对话草稿证据。上游累计材料保持 missing，未开放私有 Skill 或真实 API/模型，4E 整体仍未完成。此更新取代下文历史记录中“合同2尚未接入”的当前态含义；具体范围、回写修复及关注项见 `docs/evidence/2026-09-08-stage4e2-contract2-integration.md`，实施合同见 `docs/plans/2026-09-08-stage4e2-contract2-integration.md`。

- [x] v0.2 文稿包与执行/输入输出合同（文稿，不是运行装配）
- [x] Host 加载器红绿测试：7/7
- [x] 公开替身原生服务集成：1/1，包含一次成功业务调用及错误/复述两个对照
- [x] 包清单、保全检查和证据收口：64项dry-run，旧四运行/保存正文与九项源文件哈希不变
- [ ] 后续：合同2统一输入/输出接入与受控 Desktop 资源可见性验证

当前阶段4E未整体完成。报告为docs/evidence/2026-09-08-stage4e-builtin-skills.md。原生服务离线集成不是Desktop装配证明；模型复述对照证实当前通用文字适配器会返回指令标记，不能仅靠装配或保密声明关闭G-SKILL。没有放入真实私有资源，后续不擅自把指令正文换入生产/隔离模型运行。

## 2026-09-08 追加：flow-2-6 / 0.2.0 文稿修订

用户已明确批准按修订计划执行：统一节点ID，并按新附件补足实际起草内容。此追加为当前文稿定位，前述旧目录、旧测试与运行事实保留为历史，不重写其哈希或身份。

- 当前文稿目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4e-authoring\flow-2-6\0.2.0。
- 当前skillId=flow-2-6，skillVersion=0.2.0；文稿状态另存于编写记录，不写入严格manifest的未知字段。
- 主指令补齐八步起草过程；通用规则包括主题/必要特征/概括/各类限定/独从权/引用/表达/回退/来源及初检，保留完整修订案例；领域资料明确已给出的检查方法与尚缺专项知识库；输出模板扩展内容要求但保持既有十字段与三项合同版本。
- 原例中未经交底支持的扩展改为有依据表达或具体待确认项；不新增案例技术事实来弥补漏洞，不让教学案例成为当前项目事实。
- 编写验收：原附件主题覆盖、案例逐项来源/引用人工核对，当前身份与资源指纹、格式、体积、Git忽略及旧文件保全检查。不扩展诊断工具，不修改产品代码，不导入生产加载器读取私有文稿，不发模型调用。
- 当前包仍固定四资源及manifest。外层来源覆盖和一次性编写记录不纳入装配，不公开私有正文。旧稿保留不删除，不为本次命名重跑旧Desktop整批验证。
- 证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-08-stage4e-flow-2-6-authoring.md。

阶段4E余项仍为合同2接入和非秘密Desktop装配/可见性验证；文稿完成不是该阶段整体完成，也不能解决既有模型复述反例。
