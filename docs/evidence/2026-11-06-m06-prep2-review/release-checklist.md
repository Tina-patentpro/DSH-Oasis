# 本地M06首发清单

2026-11-06，Asia/Shanghai；Codex。**清单已完成，当前为首发准备稿；资源和工程可复用，内容、准确发行包、公开许可及接受尚未齐备，未形成可发布结论。** 对应11月6日计划任务1、DS-01／02／05和BM-S0／S1，不改变长期14节点及双来源目标。

## 首发范围与准确载体

建议首批选一个`m06-claims-draft 0.1.3／Flow-2-6／V3.4.0范围1`本地Skill及DSH入口。按既有绿洲Host加载资源，不注册为DSH／Codex原生Skill。正式专业API后发；WorkBuddy用户插件、其他模板、PDF／DOCX、OCR与全部14节点不并入本次首发承诺。

| 载体 | 已固定的身份／清单 | 交付处置 |
|---|---|---|
| 提供方候选 | manifest SHA256 `7ec58d41d870b122f763657ab983ad0a45d9f266a466983775b8d066dc8c63b9`，30成员，原candidate目录不改 | 本轮30件hash全部匹配；生产／评价／历史材料不因开源方向整体改作首发包 |
| 生成载荷8件 | `SKILL.md`、`THIRD-PARTY-NOTICE.md`、`references/01-official-basis.md`、`02-n01-feature-and-independent-claim.md`、`03-n02-claim-graph-and-fallback.md`、`04-n03-support-terms-parameters.md`、`05-source-and-output-contract.md`、`output-schema.json` | 精确逐件hash见[m06-checks.json](m06-checks.json)，合计161209B；保持F26 V0.1.9／来源与条件，不自动换pin |
| DSH消费资源 | `packages/oasis-professional-service/src/m06-business-candidate-0.1.3.json`，179486B，SHA256 `26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca` | 内嵌8载荷逐字节对应；`candidateOnly=true`、`frontmatterVersion=0.1.3-candidate`保持 |
| 资格随件2项 | `operator/source-audit-R27.md`、`operator/history-qualification-R01.json` | operator-only-not-generation，消费／分发事实中携带其历史限定，不能进入模型提示或宣传为专业接受 |
| Host入口 | `packages/oasis-professional-service/src/m06-controlled-host-013.js`，包内导出`./m06-controlled-host-013`；实际apply来自index.js的受控候选分支 | 既有真实闭环可复用；准确首发候选的源码、lib、包、Profile及资源配对仍须冻结，不能以历史分支名或文件存在代装配接受 |
| 包元数据 | `oasis-professional-service@0.0.1`，`private=true`，未声明license；当前Git HEAD `7972fea810436c0a62e2a5192d60808d1292eb5a`且有预存未提交修改 | 这是当前工程身份，不是已批准发行版本；不本轮改private／license或发布npm |

## 接受与缺件

| ID | 核对项／当前状态 | 准确解除证据与责任 |
|---|---|---|
| RL01 | 资源身份 **VERIFIED** | 本轮30成员、8载荷、2资格检查；Codex维持版本／hash，不复制新资源包 |
| RL02 | 规则采用 **LIMITED_TRIAL** | F26 V0.1.9仍试行；维持具名采用位置、来源及例外。不能将当前V0.1.12或文稿接受写成本包工程采用 |
| RL03 | 样本内容 **OPEN** | 先处置[MC01／MC02](m06-content-review.md)，明确MC03；保留原稿／本审阅。具名专业及用户分别在准确版本签收，不能由工程approved替代 |
| RL04 | 示例公开范围 **OPEN** | 原公开自编R2题面可作为候选素材；原输出只能如实演示受限能力和缺陷。实际公开前绑定拟公开片段／派生稿hash及公开范围，不宣传“完整申请文件／回退合格／可直接提交”。evaluation_only不选入，原运行记录不整体公开 |
| RL05 | 自有及第三方公开许可 **OPEN** | 根目录未见LICENSE类文件，业务包未声明license；许可证选择仍待明确。包内THIRD-PARTY-NOTICE已含具名MIT全文和7片段用途，但其覆盖不扩至宿主、依赖、商标、其他来源或所有公开材料；首发逐包确认所选范围，不把NOTICE存在当完整许可闭包 |
| RL06 | 准确首发构建／包 **OPEN** | Codex固定发行版本、HEAD＋相关未提交清单、资源／依赖／补丁／最终包hash及安装位置。原candidate/private状态不能静默改成正式版；本轮不构建或打包 |
| RL07 | 首发安装／更新／恢复 **PARTIAL_EVIDENCE** | 复用10月29日F-UR-A01修订R2的成功新装v3→v4→v3与明确恢复、10月31日M06正常重启；旧PKG是各自固定子集，未证明最终M06首发包配对。首发只补该配对与实际阻交付场景，不重刷旧全套，不关闭完整F |
| RL08 | 用户作业与数据／费用说明 **PARTIAL_EVIDENCE** | 同页、编辑再审、无覆盖保存、固定审核版草稿、项目归属沿现合同；本地调用可能走云端模型及费用，仍须每次确认。准确版本安装／使用事实由Codex给出；WorkBuddy依事实写用户说明，双方版本一致 |
| RL09 | 宣传／发布 **NOT_AUTHORIZED_THIS_ROUND** | Frontpage复用现工程，WorkBuddy负责GitHub说明与渠道文稿；真实公开／发布按原授权及公开范围办理。本轮无投递、发文、部署、提交或推送 |

当前最直接缺件为RL03内容、RL05公开许可、RL06／07准确发行包及配对验证。它们分别作用于本地首发，不等待Fast39、源B恢复、自制后台或全部29项完成。

## 复用的安装证据

[F用户恢复A01修订回执](../2026-10-29-f-user-recovery-A01-repair-return.md)记录：新装v3 PKG SHA256 `bd81cd14cf6f6319182615bed53bd3e370a1d3d6ef9e85cbc81905b2b4ecfa64`，升级v4 `cee76a00a15fc24f97ebdc95d9b2c077dba3810b20eb1f29769dda70e059932e`，回退v3 `46fada7cafb57406e5b7849a7099e53ee2825e4ed386ef3b4ccaef8b9be2b0b6`，均为原准确环境exit0证据。本轮只定向读回执，不重新运行或重签包。这些历史包不能填为RL06最终M06首发包。

## 首发事实包边界

可据证描述：一个本地受控M06模板曾完成真实生成和审核保存／引用恢复；当前示例容缺且仍有具体内容问题。暂不能描述：正式专业质量已接受、全部14节点可用、完整F通过、PDF／DOCX正式支持、远程双来源已开放、WorkBuddy用户插件已上线。

未来首发按明确范围选入代码／8载荷及必要资格／通知；不把`.local`、隔离Profile、凭据、用户材料、历史运行原件或评价答案夹带入发布包。此为候选交付清单，未创建分发包、删改旧材料或生成运营文稿。
