# M06首发范围与技术事实包 R1

2026-11-06，Asia/Shanghai；Codex，单代理。接续[11月6日计划](../../plans/2026-11-06-project-summary-and-next-plan.md)任务1／P1及任务6的事实准备部分。**本轮完成本地首发审阅材料，不形成发行包、现行许可或发布结论。**

## 本轮交付

| 审阅件 | 本轮完成内容 | 准确边界 |
|---|---|---|
| [逐文件范围](release-scope.json) | 当前package.files声明目录、实际存在的常规随件及package.json共131件、3211311字节，逐件路径/bytes/SHA256；其中src126件、lib2件 | 静态文件清点，不是npm pack结果、最小可运行闭包或正式发行白名单 |
| [M06内嵌范围](embedded-scope.json) | 当前0.1.3容器内8个生成载荷和2个operator-only资格的JSON位置、bytes及hash | 未抽换资源或更新原pin；操作历史资格不进入模型上下文 |
| [第三方通知审阅件](review-only-notices/NOTICE-PLAN-DRAFT.md) | 七项cn-patent-drafting方法片段的既有MIT范围，以及客户端内Zod4.4.3；两份许可全文原字节附上 | 仅两个已观察组件，不是全部Host/依赖/资料的许可闭包 |
| [公开示例输入审阅件](demo-inputs-draft/README.md) | 复用公开自编R2的3文件及4文本；[逐项来源](demo-provenance.json)绑定原hash | 无新生成、不含模型答案、Profile、运行回执或evaluation_only；未获发布批准 |
| [同版技术事实](technical-facts.md) | 资源、Host、已验操作、内容限制、费用和未验能力逐项给出处 | 内部事实交接材料，不是运营文案；未向WorkBuddy投递 |

## 新发现与处置

### RLS01：客户端随附第三方通知仍需补齐

当前`lib/client.js.map`包含64个source与对应sourcesContent，其中47个项目源码、17个Zod4.4.3源码。实际逐项与本地现存源码比对，64项均相同；当前`lib/client.js`未包含MIT标题或copyright标记，当前M06的THIRD-PARTY-NOTICE仅列cn-patent-drafting方法片段。不能用该Skill通知覆盖客户端中打入的Zod。

已准备Zod实际安装包所附MIT全文（1072字节）和cn-patent-drafting既有MIT全文（1090字节），并固定原文hash。后续真实选包时将适用通知随包加入及复核；本轮没有修改lib、package.files或现行NOTICE。具体证据见[third-party-evidence.json](third-party-evidence.json)。source map核对只是现有构建的来源一致性子证据，不是重新构建、编译链认证或安装验收。

### RLS02：现有打包范围大于“首发一个M06”的业务范围

当前`files=[src,lib,docs/api/oasis-professional-service-baseline.json,cordis.patch.yml]`会覆盖多套资源：builtin flow-2-6的0.2.0/0.2.1/0.2.2共15件、public-claims-v2共5件、旧M06 0.1.2、当前0.1.3及14节点目录。它们存在于包声明中，不等于全都成为首发功能或取得统一许可。

不能现在直接删除旧资源：受控M06入口重用index.js，v340-native-model静态引入0.1.2及0.1.3加载器，并在模块初始化读取14节点目录；旧0.2.2的资源根也有现行literal引用。已对Host受控入口与客户端入口作保守字面引用清点，共93个JS模块、5处literal文件URL；相对import目标在本次扫描范围内均存在。计算式加载、动态资源、实际执行和tree shaking未验证，清点不充当安全裁剪方案。

后续选定实际发行构成后，应明确保留兼容件的权利与不可用状态，或在另行明确的工程范围内缩减装配并定向验证。**本轮不删历史文件、不改路由或扩大首发承诺，也不把整个src默认为纯自有可发布成果。**

### RLS03：来源排除与资格文件不能被统一许可抹平

原NOTICE记六载体许可PENDING，R27明确为`PENDING_EXCLUDED`。准确含义是继续排除这些内容，不是新设“六载体不全就禁止一切独立M06受控使用”的门。本轮不重新采用它们、不关闭来源缺件，也不宣称其受到社区许可覆盖。

0.1.3资源容器内两项operator资格保留HISTORY_LIMITED及旧失败说明，内容还含本机绝对路径与内部证据引用。当前加载器校验整个容器hash及两项资格pin；不能为了公开展示直接删字段、改路径或重签旧hash。后续如需可公开的资格说明，另制派生说明并保持消费方可追溯；改变消费容器需另版及对应验证。此次整份容器仍为“公开范围待确认”，没有将资格当作生成材料或专业通过证明。

## 首发清单接续

原[RL01—RL09清单](../2026-11-06-m06-prep2-review/release-checklist.md)与后续[配对核对](../2026-11-06-m06-revision-release-prep-r1/release-inputs-r1.md)保留原字节。下表仅记本次增量，不重签原接受。

| 项目 | 本轮推进后状态 | 仍待完成 |
|---|---|---|
| RL01/02 | 同版资源身份与试行边界复用 | 不换规则pin、不把制作可见规则全部改为正式规则 |
| RL03 | 离线修订建议及逐项来源已具备 | 产品内结构化修订/再审、具名专业与用户接受；原文稿不改 |
| RL04 | **EXAMPLE_INPUT_REVIEW_COPY_READY**：已固定3文件+4文本的本地审阅件 | 实际公开片段/说明的范围、质量主张及发布接受；未准备可提交专利范文 |
| RL05 | **SCOPED_NOTICE_DRAFTS_READY**：社区许可草案和两项第三方全文审阅件具备 | 正式采用、实际许可主体/授权链、最终所选文件/组件的权利及随附通知闭包 |
| RL06 | **DECLARATION_CENSUS_AND_MAP_MATCH_READY**：131件静态范围及64项map来源相同 | 实际发行版本/构成、同版构建及最终包hash；旧10成员配对差异继续沿原记录 |
| RL07 | 旧F限定及正常重启证据直接复用 | 最终M06包安装/更新配对及所选未验场景；完整F不关闭 |
| RL08 | **TECHNICAL_FACTS_READY_FOR_LOCAL_REVIEW** | 最终安装/使用说明需对应真实发行版；WorkBuddy成稿与消费另留回执 |
| RL09 | **NOT_AUTHORIZED_THIS_ROUND** | 实际发布及渠道条件；本轮不投递、不发文、不部署 |

## 执行与验证记录

[preflight.json](preflight.json)绑定实际时间/时区、Codex、准确Git根/HEAD/分支、25份整体/本项目/适用补充与实际输入的绝对路径、完整原字节hash及阅读范围。整体与项目followup仍为BM1-R1/S2-R1，保留S1；G1清单全文已读，本次只承接M06，不改变首批顺序或制作29项。根/项目规则、协同/索引及适用BM1、兼容/交付条款均按当前入口核对；身份未变部分复用，前轮新增许可草案状态前缀与旧字节保全单列。

Ruling：沿当前分支做文档/只读清点，不新建实现工作区或TDD任务；无产品实现变更，原执行记录作为本次ledger。若错把这些材料当成可直接安装的发行物，会遗漏真实选包/安装及权利接受，因此所有产物均明确标为审阅件。Ruling：遵循项目单代理要求进行分离的一次自审，不调用技能中的分支审阅代理，不把自审称独立接受。

一次性清点脚本首轮因假定所有literal文件URL均位于包内，对隔离fixture HOME引用计算相对路径时报ValueError；尚未生成清点/示例/通知文件。已追到`src/unified-fixture-environment.js`，改为记录外部fixture引用、排除读取和复制，再执行成功。失败事实保留于release-scope.json的attempt01；没有改业务代码或把该引用当真实Profile使用许可。

新鲜验证见[verification.json](verification.json)：核逐文件/内嵌身份、许可全文原字节、示例来源、map对应、文档链接及本轮前后保全。只证明文档与静态清点范围，不证明法律可执行性、功能/运行、专业/用户或发行通过。未进行模型/API/Dify/上传/费用、源登记/CI、构建/安装/部署、WorkBuddy投递、提交/推送或发布。
