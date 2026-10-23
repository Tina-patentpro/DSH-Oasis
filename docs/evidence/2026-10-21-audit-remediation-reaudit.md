# R2–R4修复内容与测试结果复审

日期：2026-10-21。审计对象为[修复计划](../plans/2026-10-21-audit-remediation-plan.md)的R2–R4实现、[修复收口报告](2026-10-21-audit-remediation-closeout.md)及其测试回执。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：仍有两项P1，不能确认本轮修复完整或无回归。F2因终态前本地校验中断仍错误解锁而重开；F3因冲突页面与新增草稿保护组合形成恢复死路而重开。F4在本次源码检查、节点测试与浏览器组件范围未发现新增回归，Desktop验收仍待执行。** 原收口报告及旧成功/失败回执保留为历史，以本报告作为较新的审计裁定。

本轮为按项目规则执行的单代理复审，不宣称独立评审。没有修改产品源码、正式测试、编译产物、依赖、准入、应用或Profile；仅新增本报告、本地审计夹具/日志，并在当前状态前置审计摘要。没有真实模型/API调用、上传、对话发送、Git提交/推送或发布。

## 一 发现

### A1 / P1：终态前的本地流校验失败仍错误解除未决保护

位置：[本地文本上限校验](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/dsh-generation-adapter.js:118)、[异常分类](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/dsh-generation-adapter.js:206)。属于R2遗漏，不能将已修复的ECONNRESET/正常耗尽但无finish场景推广为所有不确定中断均已修复。

触发：原生运行库已派发请求，提供方输出超过100000字符；客户端在消费text-delta时立即抛出 `INVALID_OUTPUT`，尚未读到权威finish。该异常没有uncertain标记，catch只对GENERATION_FAILED或显式truncated保持unknown，最终返回failed。finally中的本地abort/iterator.return没有提供方取消或停止计费的回执。

隔离复现使用当前固定Cordis/LLM运行库、实际adapter及Workbench服务，只有提供方和存储为公开合成替身；fetch被设置为禁止外部请求。替身先输出100001字符，后续stop没有被执行。实际结果：

```json
{
  "status": "failed",
  "failureCode": "INVALID_OUTPUT",
  "executionSummary": { "failureStage": "stream" },
  "result": null,
  "terminalEmitted": 0,
  "nativeSubstituteCalls": 2,
  "freshRequestAccepted": true,
  "externalCalls": 0
}
```

没有终态证据却允许新requestKey再次派发，违反“本地停止等待不代表后端取消、未知运行不新增请求”的合同。类似终态前包类型、索引或块数校验失败使用相同分类分支；本轮完整服务复现以字数上限为已确认案例。

遗漏原因：`test/dsh-generation-adapter.test.mjs:94` 的malformed/excessive测试仅断言code、无body、单次stream；没有断言status、权威终态证据或随后新请求的锁。R2新增的原生生命周期测试覆盖传输异常和无finish耗尽，没有覆盖本地校验提前退出。

修复方向：按“已派发＋是否取得可证明终态”分类终态前的本地提前退出；完整stop后的空正文/业务格式错误、明确认证/额度拒绝和明确max-tokens保持已知失败。不能简单将所有INVALID_OUTPUT改成unknown。补实际服务的锁定、新key拒绝及重开测试。

### A2 / P1：保存冲突后草稿保留在内存，但界面无法取回或放弃

位置：[新增reloadWorkspace草稿保护](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/client/workbench-store.js:744)、[冲突页面提前返回](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/src/client/PanelPages.js:78)。这是R3与既有冲突UI组合产生的回归。

触发步骤：

1. 编辑结果形成dirty草稿。
2. 保存新版本时Host返回revision-conflict，store进入conflict并保留正文。
3. PanelPages只显示冲突提示和“重新载入服务端版本（舍弃本地草稿）”，不再渲染编辑器、复制保全或放弃编辑入口。
4. 点击唯一按钮，reloadWorkspace又因dirty草稿拒绝，提示“请先保存为新版本或明确放弃编辑”。页面继续conflict。

节点测试使用实际Host/RPC/store夹具复现，随后在浏览器挂载完整PanelPages并点击实际按钮再次复现：草稿仍在、editorVisible=false、唯一按钮重新载入、reload被拒、remainsConflict=true。用户没有可见恢复路径；由于草稿只在进程内存，重启还可能丢失正文。不能把“内存保留”作为这条路径已完成恢复的依据。error提前返回页面也存在同类组合风险，本轮浏览器确证的是revision-conflict。

遗漏原因：新增revision-conflict测试只检查正文仍在、关闭被禁止；原4项DOM夹具挂载UnifiedResultPanel，未经过PanelPages的conflict/error早退路径。因此store保护和单独编辑器都通过，却没有验证二者组成的恢复流程。

修复方向：在冲突/错误态提供可访问的原草稿保全及显式放弃入口，区分结果编辑草稿与输入草稿，保持项目/任务/run/baseArtifact身份；不能通过自动清空dirty或绕过保护恢复reload。补完整页面的保存冲突→取回/复制→明确处理→重新载入测试，并覆盖其他任务存在dirty草稿的情况。

![完整页面冲突恢复复现](/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/remediation-reaudit-20261021/browser.png)

## 二 新鲜测试与构建

固定Node24.21.0；命令以zsh发起，Python包装器设置私有HOME/cache、合成标志和阻断外部代理。精确argv、cwd、时间、退出码见 `.local/remediation-reaudit-20261021/commands.jsonl`。所有新增复现文件都在忽略目录，没有修改正式测试以隐藏失败。

| 核验 | 本轮结果 | 原始证据 |
| --- | --- | --- |
| 当前主包全量node tests | 899总计、897通过、0失败、2历史跳过；退出0 | node-current.log |
| 新增遗漏合同断言 | 2/2失败；退出1，分别为草稿可访问性及unknown状态 | missing-contract-red.log、contract-red.mjs |
| 缺陷观察复现 | 2项观察均复现；退出0仅表示复现器工作，不表示产品通过 | boundary-repros.log、boundary-repros.mjs、两个repro.json |
| 原4项真实React DOM/StrictMode夹具 | 4/4再次通过 | browser-results.json、browser.ax.txt、browser.png |
| 新增完整PanelPages冲突路径 | 缺陷复现；reload实际拒绝、保持冲突 | 同上 |
| Mac启动与安全预览定向组 | 19总计、18通过、1既有跳过、0失败；退出0 | current-mac-contracts.log |
| 旁置固定tsdown构建 | 退出0；当前client.js与旁置输出逐字相等 | build-compare.log、build-package-comparison.json |
| source map核对 | mappings、sourcesContent、names相等；仅因旁置输出位置导致sources相对路径不同 | build-package-comparison.json |
| 固定npm pack dry-run | 退出0、114成员；无test/node_modules/.local/.archive/.dsh-test/tools成员 | pack-dry-run.log |
| 默认/正式Desktop准入check | 各退出1，仍拒绝应用可执行文件pin漂移 | preflight.log、preflight-real.log |
| 3个旧根目录原生/Sidebar/Web安全测试文件 | 在正确根cwd均装载失败，未进入业务断言；退出1 | legacy-root-correct-cwd.log |

原修复的final-tests.log仍为886总计、884通过、2跳过，数字与旧报告一致；当前多出的13项属于后续阶段5新增测试，**不计为R2–R4新增覆盖或旧修复的原始成绩**。当前pack的114成员相对旧110成员增加4个阶段5src文件，不能混写为原修复产物。

主包2项跳过仍依赖旧Windows `.dsh-test/stage2-desktop` 的离线准入/服务声明夹具。Mac定向组1项跳过为macos-safe-preview的patch重放测试（patchedMode=false）；实际4项Mac安全预览断言通过。14项启动合同全部通过。

3个旧根目录测试的正确cwd错误分别为：native-markdown-policy依赖缺失的 `.dsh-test/stage3-desktop-app` 原生React；sidebar-safe-file读取同旧目录client.js报ENOENT；web-markdown-policy读取Windows `C:/...` bundle报ENOENT。它们没有被本次修复修改，不能据这些装载失败断言R2–R4引入了运行回归，也不能将其算作通过。首次扩大测试误用主包cwd，额外出现clsx解析错误；纠正为根cwd后仍是上述历史夹具缺失，第一次日志root-affected.log保留但不作为产品结论。

浏览器构建首轮因本地夹具入口位于.local而未解析React，tsdown虽退出0却有external警告；改为明确指向既有主包React/ReactDOM路径后重新构建，无未解析导入，并实际打开、执行、读回结果。这一夹具调整未触及产品依赖或源码。

## 三 覆盖、保全与边界

- 审阅了本轮6个生产源文件、2份既有测试改动，以及新增草稿/审核节点测试、共享fixture和DOM夹具；覆盖派发/终态、异常安全、保存响应竞争、跨项目隔离、dirty动作限制、固定审核身份、重复提交及旧审核调用兼容。
- 现有测试支持版本/任务/Workspace/视图切换保全、迟到保存不清新草稿、审核入口与批准分离、Esc及重复提交等局部结论；未发现本轮这些已覆盖路径的新回归。两项P1证明整体仍不满足关闭标准。
- `result-panel.browser.mjs`不匹配标准 `test/*.test.mjs`，4项浏览器结果来自显式独立执行；常规verify不会自动跑它。后续应在交付核验中明确调用，并补全PanelPages恢复流程，避免把主包绿色理解为包含浏览器流程。
- 审计开始冻结3245个版本控制范围及非忽略文件；报告写入前复核，全部字节一致，期间无并发源文件漂移。另对原修复3198项冻结文件复核：无缺失；变化仅为已记录的R2–R4源码/测试/构建、阶段5的3份Host源码/3份测试及当前状态。其他原冻结文件（含原指定业务、应用、准入与设计材料）保持。
- 当前阶段5新增内容只作为集成环境核验，没有冒充本次修复，也未对阶段5整体作完整审计结论。新报告及状态前置摘要为本审计仅有的仓库文档改动；状态原文件完整后缀与既有CRLF保持。
- 旁置构建未覆盖lib。应用、Profile、锁文件、依赖、旧unknown及原真实生成记录未由本审计改写；临时浏览器页与回环服务已关闭。精确文件清单/哈希见baseline.json、preservation-before-report.json及final-summary.json。

## 四 更新裁定

| 原发现 | 复审后状态 |
| --- | --- |
| F1 固定应用漂移 | 保持材料阻塞；当前两种check仍拒绝，未恢复或升级组合 |
| F2 不确定流错误解锁 | **重开**；ECONNRESET/截断等已覆盖修复仍通过，但A1证明保护不完整 |
| F3 编辑草稿丢失 | **重开**；普通切换及保存竞争保全通过，但A2为新增恢复回归 |
| F4 审核入口误批准 | 本轮检查范围未发现新增回归；保持代码/组件通过、Desktop待验 |
| F5 供应链/干净恢复 | 保持未关闭；旧45秒超时回执未改变，本轮未重新物化或关闭policy |
| R6/阶段4整体/阶段6发行 | 继续未完成；本轮没有当前Desktop、原生打开/对话及重启验收 |

应优先补A1的终态前本地中断保护与A2的完整冲突恢复流程，再将本轮2项失败合同纳入正式回归并复审。它们均可在不取得2.0.17恢复件、不新增真实调用的情况下修复与测试；本轮用户请求为审计，因此没有顺带修改实现。
