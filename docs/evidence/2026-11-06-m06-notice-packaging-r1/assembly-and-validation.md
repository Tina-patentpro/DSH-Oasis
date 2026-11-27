# M06发行装配与验证范围 R1

2026-11-06，Asia/Shanghai；Codex。接续[首发范围审阅](../2026-11-06-m06-release-scope-r1/review-return.md)的RLS01—03与RL05—07。**本文件给出可审阅的装配候选和具体验证边界，尚非发行接受或Host配置变更。**

## 本地随件已完成的增量

业务包已增加 [THIRD-PARTY-NOTICES.md](../../../packages/oasis-professional-service/THIRD-PARTY-NOTICES.md)、两份完整MIT许可文本，并在package.files中明确加入通知与licenses目录。原131件中的130件原字节不变，只有package.json追加files条目；新增3件通知文件，当前声明清点为134件。准确逐件hash及旧→新差异见[local-package-candidate.json](local-package-candidate.json)和[元数据差异](package-files-diff.patch)。

包版本仍0.0.1、private=true、license未声明；exports、依赖、scripts、DSH配置均未改。原有未提交元数据与业务修改保留。OasisIntWrite Community License 1.0仍仅为[草案](../../business-baseline/oasisintwrite-community-license-1.0-draft-r1/LICENSE-DRAFT.zh-CN.md)，本次增加第三方许可通知不构成自有代码重新许可。

## 入口装配复核：RLS04

| 载体／代码位置 | 当前实际关系 | 发行含义 |
|---|---|---|
| package.json main与exports[.] | `./src/index.js` | 根包默认暴露普通入口，不是自动选择M06受控入口 |
| cordis.patch.yml | insert.name为`oasis-professional-service` | 未明确选择`/m06-controlled-host-013`，不能仅据此宣称默认安装已完成M06装配 |
| index.js apply | `applyWorkbench(ctx,config,false)` | 普通模式，与受控M06分支分开 |
| exports[./m06-controlled-host-013] | `./src/m06-controlled-host-013.js`，apply导向`applyM06ControlledCandidate013` | 已有明确的M06受控候选入口；后续可复用，不新增原生Skill机制 |
| index.js controlledM06分支 | 必须有原生llm/session/model上下文，拒绝旧fixture/native-offline混用；生成器固定M06 0.1.3；账号与远程执行另受分支限制 | 入口选择属于可信装配，不能改成用户RPC开关或用合成模式冒充原生可用 |
| v340-native-model与catalog | 当前仍静态引入旧/新M06加载器并初始化14节点目录 | 保留现存兼容资源，不仅因“首发一个M06”删除被引用文件；存在目录不证明全部节点可用 |

**当前准备候选：** 优先复用已存在的M06受控入口与当前完整兼容构成，业务说明限定M06及实际已证范围。当前134件只作为准确本地候选构成；其中旧Skill、目录、operator资格及其他第三方部分仍需逐项确认公开范围，不默认形成最终公开白名单。

**本轮未改变：** 默认入口、Cordis配置、能力开关、UI、资源容器及pin。未制作“精简M06包”，也未将本文件中的入口字符串作为已经核准的DSH安装/补丁语法。正式发行前需将实际加载器解析、插件标识、资源及客户端绑定为一组，并验证实际结果；不猜测宿主私有装配机制。

若后续确需修改默认装配或裁剪兼容文件，应先对所选准确构成单列工程范围与受影响合同。当前可逆通知随件工作不隐含批准该功能变化，也不以发布日/业务模板数量代替决定。

## 只针对增量和缺口的验证清单

| ID | 要解决的实际问题 | 当前可复用／已做 | 对应出口及执行条件 |
|---|---|---|---|
| AV01 | 两份MIT全文及通知是否真的列入包随件 | 本轮已核原bytes/hash及files声明；七片段条件在原资源和包级通知保留 | 本轮静态出口；最终实际pack/archive还须检出3件通知，不能用静态清点冒充实际归档 |
| AV02 | 发行装配是否实际走M06受控入口 | 旧M06工程闭环及当前明确exports可复用 | 绑定实际loader配置/解析结果、插件标识、Host/客户端/资源版本，做一次无模型装配检查；本轮未启动Host |
| AV03 | 文件是否可安全裁剪／公开 | 134件与93模块的前轮字面引用可复用；资格/来源排除保持 | 逐件采用/排除及必要许可；计算式资源另核。改资源容器须另版，不重签旧pin，不直接删历史文件 |
| AV04 | 当前包与最终安装物是否同版 | 前轮已定位10旧成员中3同7异，本轮64项map来源匹配可复用 | 对实际新包绑定源码/metadata/资源/通知/补丁/构建hash；只验证真实增量，不重复旧新装升级回退全套 |
| AV05 | 新许可随件是否影响更新／恢复与未知运行保全 | 旧F限定及正常重启证据可复用；本轮不改变任务/状态格式 | 最终构成明确后，优先选择“升级前有未完成/UNKNOWN任务时拒绝或保全并恢复”这一实际未验场景；先给拒绝/保全出口，不创建真实未知请求或重发 |
| AV06 | 内容修订是否成为正确审核/保存版本 | 已有离线建议与source-map sidecar，不重新生成 | 按实际结构化修订合同更新并再审/保存/引用，具名专业和用户分别接受；当前revise只改核心不换表，不能手写活跃快照绕过 |
| AV07 | 普通使用与真实费用／发布条件是否分离 | 原作业流程、费用提示、只准备对话草稿规则可复用 | 不真实调用、不自动发送对话、不投递或发布；真实步骤按届时准确授权另行执行 |

AV05是下一项待细化场景建议，不声称本轮已验证、已生成真实UNKNOWN或已获安装操作许可。完整F、正式API/G0、源B/A、格式U1/D1、专业/用户及发布门分别保持。

## 当前结果与接续

RLS01为 **LOCAL_NOTICE_ATTACHMENT_DONE**：已从审阅附件推进到业务包实际随件和files声明；最终包内核对及完整第三方闭包仍待完成。RLS02/03保持准确现状；RLS04明确默认根包与受控入口的差异，未静默修接线。下一步应围绕明确的最终构成、可信受控入口及AV01—06取证，而非继续重复相同清点或重刷PREP2。

原首发清单、R1范围、原哈希和安装/FAIL/UNKNOWN证据保留；本轮新hash只标识本地通知增量，不重签旧接收/安装回执。实际修改、复核与保全见[执行记录](execution.md)及[verification.json](verification.json)。
