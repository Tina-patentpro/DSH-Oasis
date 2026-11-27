# M06零生成只读预览 V0.1 实施计划

2026-11-07，Asia/Shanghai；单代理executing-plans/TDD。用户已明确“同意V0.1，进行本地实现和离线验证”。依据[获准方案](../business-baseline/m06-zero-preview-ui-proposal-r1.md)，接续R3-03实际失败；不得由本计划扩大到新包启动、真实调用或发布。

## 全局约束与读取

复用当前checkout/固定Node与锁，不提交、不清理已有修改。四项RPC只读白名单、业务资源/pin、原安装1c5b/6f2f及全部历史保持。执行前已重读根AGENTS全文、协同全文并解析登记/两层followup；中心仍1.2.2、整体1.3.1/NS1-R1＋适用BM1-R1/S1/S2-R1/G1，准确原字节hash及before见[preflight](../evidence/2026-11-07-m06-zero-preview-r1/preflight.json)。其他历史正文仅身份核对，不伪造已读。

## 步骤与接口

- [x] Host/传输：`v340-runtime-contract.js`增加Host返回的可选`nativeZeroGeneration:true`及只读准备响应schema；`workbench-rpc.js`仅在可信零模式目录返回标记；`workbench-remote.js`增加`prepareV340`，校验同Workspace/node。四项白名单不变。
- [x] 预览内存：新增`client/v340-zero-preview.js`，接受固定目录、Workspace和只读prepare回调；仅保存输入/确认/准备结果，变更使确认/结果失效，忙时不重复提交，取消/迟到结果不污染新视图。无taskId/revision、存储、认证或生成动作。
- [x] 复用UI：从`V340GenerationPage.js`提取既有输入字段渲染共享；新增`V340ZeroPreview.js`复用字段及来源组件，显示预览/不持久化说明，材料读取须确认；`FunctionCenter.js`、`OasisWorkbenchSurface.js`、`PanelChrome.js`按可信能力打开预览并禁用正常任务/导入写入口。预览不进入PanelPages任务列表或业务序列化。
- [x] 原生账户设置：`product-settings.js`先核Host目录能力，零模式不请求账户；`OasisAccountSettings.js`禁用刷新/登录及说明。正常Host无标记维持既有流程。
- [x] 验证：先观察新增Host标记、预览路由/准备/取消/上下文/禁用等失败用例，再实现GREEN；运行受影响client/Host/材料/设置回归。新构成旁置构建/归档并验证实际解包源码及客户端，不启动App。保留原失败、源码增量、归档和未验范围。

## 关键验收

1. 仅Host明确零模式进入预览；正常模式仍创建原业务任务，不从URL/用户字段授权。
2. 打开/填写/关闭预览不创建任务或写业务状态；准备只调用已有只读端点，真实材料/权限/格式/容量仍原实现。
3. 错Workspace/node响应、输入变更/未确认、并发点击、取消或晚到结果分别拒绝/失效；无自动重试或来源切换。
4. UI不显示“输入已保存”或伪造审核/运行状态；来源/生成/登录/导入/保存禁用；原结果及UNKNOWN不变。
5. 新源码/包通过不等新安装/Host/UI接受，正式运行与发布继续未授权。

裁定：预览由独立组件内存承载，无需向业务store加入伪任务；实际文件范围可据既有组件关系收紧，在执行记录说明。原方案V0.1与R3原字节不改。

## 本轮收口

已按V0.1完成本地实现；源码/实际归档各139/139，编译客户端注册冒烟exit0。新140成员私有归档5160c4e9未安装/启动。材料准备结果不依赖真实生成的task/revision，因此复用原输入与来源组件并单列“未生成”的准备结果。12个已有源码及2个新模块的准确落点、期间RED/回归及修复、原件保全和未验范围见[实施回执](../evidence/2026-11-07-m06-zero-preview-r1/execution-return.md)。这仅勾本实施计划，不代勾原R3-03或其他R3任务。
