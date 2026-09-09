# flow-2-6 / 0.2.0 文稿实质修订记录

日期：2026-09-08。当前目标状态：**PASS（仅限本轮文稿修订与静态完整性验收）**。

这不是模型效果、合同2接线、Desktop装配、G-SKILL或阶段4E整体通过结论。只有本次明确批准的编写目标在此验收。

## 授权与范围

用户要求将ID改为flow-2-6，并按新附件补足实质内容；随后明确“同意根据计划执行修订”。执行单代理文稿修订与检查，无独立审计、真实模型/API、私有资源运行装配、提交或推送。

使用cmd.exe执行文件和静态校验命令；读取原始附件、14节点清单、旧稿、现有加载器合同及当前Git状态后写入新目录，保留旧稿。

## 本次交付

当前文稿入口：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4e-authoring\flow-2-6\0.2.0\SKILL.md

同目录仍只有四资源及manifest：

- SKILL.md：统一身份、输入边界、八步起草过程、缺项处理和执行约定。
- references/drafting-rules.md：14组通用业务规则和完整案例；包含特征提取、独权完整性、范围概括、各类限定、从权/引用/回退、表达、来源与初检。
- references/special-domain-boundary.md：计算机程序/算法、化学材料、生物、中药等必要材料检查，明确未获得原专项知识库的范围。
- assets/claims-output-template.md：完整正文、技术主线、特征/回退/T4矩阵、初检与警示的具体内容要求；十个输出字段及三项合同版本不变。
- manifest.json：skillId=flow-2-6，skillVersion=0.2.0；严格结构未增加编写状态字段，四资源指纹已更新。

源码/客户端/公开测试不包含本次私有正文。当前包不在DSH/Codex原生Skills目录。编写状态单独记录为authored_pending_model_validation，不使用版本后缀表达生命周期。

来源覆盖与案例审阅表（仅本地编写材料）：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4e-authoring\flow-2-6\source-coverage.md

附带文档只记录本次写作与静态检查，不加入运行资源或新的诊断工具链。AGENTS.md及阶段4E计划已追加当前身份/入口，旧记录没有重写。

## 内容验收

- 原附件各主要主题均有保留、条件化纠正或职责调整的对应；没有把内容压缩成几条安全约束与Schema。
- 十项完整教学草稿具有事实索引、必要特征组合、引用树、来源/回退表和具体未决问题。示例原有不充分支持的扩展已作定向整理，不靠编造新的技术事实纠错。
- 模型新增内容、缺失技术手段、术语/引用检查与未核验结论各有处理规则；不保证授权、不假装完成试验/检索。
- 流程保持技术交底→权利要求初稿→后续说明书及具体实施方式。没有把旧表单的claims必填要求恢复为业务前置。
- 法规核对采用[实施细则（2023年修订）](https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html)、[审查指南2023发布页](https://www.cnipa.gov.cn/art/2023/12/21/art_99_189202.html)及[局令第84号修改决定](https://www.cnipa.gov.cn/art/2025/11/14/art_99_202568.html)的相关条文；没有声称对整部规范或案例的新颖性/创造性作最终法律审查。详细位置在本地来源覆盖表。

以上为单代理人工编写检查，不是让独立模型使用Skill完成真实任务的结果。

## 新鲜静态验证

执行目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

| 检查 | 实际结果 |
|---|---|
| node .dsh-test\stage4e-authoring\flow-2-6-revision-check.mjs baseline | 退出0；读取2745个原有文件指纹，目标目录当时不存在 |
| node .dsh-test\stage4e-authoring\flow-2-6-revision-check.mjs finalize | 退出0；生成新manifest及编写记录；身份、四路径/顺序/指纹、UTF-8、资源上限、十输出字段与十项案例编号检查完成 |
| C:\Users\TinaD\AppData\Local\Python\bin\python.exe -X utf8 C:\Users\TinaD\.codex\skills\.system\skill-creator\scripts\quick_validate.py .dsh-test\stage4e-authoring\flow-2-6\0.2.0 | 退出0；Skill is valid!；只证明该脚本覆盖的元信息/占位检查，不证明模型行为 |
| git diff --check -- AGENTS.md docs/plans/2026-09-08-stage4e-builtin-skills.md | 退出0；AGENTS.md有Git行尾提示，无本次空白错误；未跟踪文档不据此冒充已由Git检查 |
| node .dsh-test\stage4e-authoring\flow-2-6-revision-check.mjs check | 退出0；成文后的资源指纹、旧文件保全再次检查一致；两份未跟踪计划/证据文档另检查无冲突标记或行末空白 |

补充使用git diff --no-index --check NUL检查上述两份未跟踪文档，退出1并仅显示行尾转换提示；这是新增文件存在差异的no-index返回，不将它记为退出0。未跟踪文档的格式结论以上表直接读取检查为准。

资源合计58121字节；含固定余量的组合字符上界24190，未超出现有四资源体积/字符限制。本次只用字节读取与计数核对，没有调用产品loader将私有资源组装成运行指令。

新manifest SHA-256：63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1。

编写记录（含各资源指纹）：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4e-authoring\flow-2-6-revision-record.json

原有2745个基线文件中，2743个内容不变；只有已限定的AGENTS.md、阶段4E计划追加了当前文稿定位。旧文稿、旧证据、产品源码、构建文件和公开替身保持原指纹。五个包文件均由Git忽略，不进入本次版本控制变更；没有重新打包或改包配置，亦不复用旧pack结果声称新发行包已验证。

真实Profile没有被本次命令访问或修改；没有运行DSH、启动Desktop、发送对话、生成业务运行或调用真实模型/API。本次没有重新扫描真实Profile，不把历史Profile哈希证据写成本轮新比对结果。

## 后续边界

本轮修订结束。合同2的输入/输出接入及公开替身Desktop验证仍是后续阶段4E工作；普通产品可见性与模型复述问题仍未解决，G-SKILL不因此通过。新正文不能直接替换到隔离/真实模型运行中，也未注册为原生Skill。

旧清单oasis-patent-claims及曾讨论的f-2-6只作为历史。公开样本和旧运行身份未改，不宣称旧数据已迁移到flow-2-6。
